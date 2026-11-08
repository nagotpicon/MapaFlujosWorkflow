/**
 * Estado del modo fácil: el último análisis del camino (calculado en el Web
 * Worker) y lo que la Brújula ya ha preguntado en este mapa.
 */
import { create } from 'zustand';
import type { ProjectDoc } from '../core/model/schema';
import type { KidAnalysis } from '../engine/kid';
import { runEngine } from '../engine/client';
import { simulationFingerprint } from '../engine/scenario';

interface KidState {
  analysis: KidAnalysis | null;
  /** cambio de «llegan» tras la última edición (para enseñar +2 / −1) */
  delta: { value: number; at: number } | null;
  skipped: Set<string>;
  projectId: string | null;
}

export const useKid = create<KidState>(() => ({ analysis: null, delta: null, skipped: new Set(), projectId: null }));

const KEY = (id: string) => `mdf.brujula.${id}`;
function loadSkipped(projectId: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY(projectId)) ?? '[]') as string[]); } catch { return new Set(); }
}
export function saveSkipped(projectId: string, s: Set<string>) {
  try { localStorage.setItem(KEY(projectId), JSON.stringify([...s])); } catch { /* sin almacenamiento: solo dura la sesión */ }
}

let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;
let lastFp: string | null = null;

/** Lo que cambia el análisis: lo mismo que la simulación, más textos, papeles y marcas (no las posiciones). */
function kidFingerprint(doc: ProjectDoc): string {
  const extra = Object.values(doc.nodes).map((n) => [n.id, n.title, n.hidden, n.metadata.custom]);
  return simulationFingerprint(doc, doc.project.activeScenarioId ?? null, 1) + JSON.stringify(extra);
}

/** Pide el análisis del camino (agrupa cambios seguidos). */
export function requestKid(doc: ProjectDoc) {
  const st = useKid.getState();
  if (st.projectId !== doc.project.id) { lastFp = null; useKid.setState({ projectId: doc.project.id, analysis: null, delta: null, skipped: loadSkipped(doc.project.id) }); }
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const fp = kidFingerprint(doc);
    if (fp === lastFp && useKid.getState().analysis) return; // arrastrar no recalcula nada
    lastFp = fp;
    const my = ++seq;
    try {
      const a = await runEngine('kid', doc);
      if (my !== seq || useKid.getState().projectId !== doc.project.id) return;
      const old = useKid.getState().analysis;
      const diff = old?.listo && a.listo ? Math.round((a.llegan - old.llegan) * 10) / 10 : 0;
      useKid.setState({ analysis: a, ...(Math.abs(diff) >= 0.1 ? { delta: { value: diff, at: Date.now() } } : {}) });
    } catch {
      /* el análisis es una ayuda: si falla, el mapa sigue funcionando */
    }
  }, 160);
}

export function setSkipped(next: Set<string>) {
  const id = useKid.getState().projectId;
  useKid.setState({ skipped: next });
  if (id) saveSkipped(id, next);
}
