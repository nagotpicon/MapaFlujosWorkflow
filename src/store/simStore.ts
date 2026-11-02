/**
 * Estado de simulación: resultado actual (invalidado solo cuando cambian datos
 * relevantes), reproducción paso a paso y por iteraciones. La velocidad de
 * reproducción es solo visual: nunca altera el cálculo.
 */
import { create } from 'zustand';
import type { ProjectDoc } from '../core/model/schema';
import { runEngine } from '../engine/client';
import type { Diagnostic } from '../engine/diagnostics';
import type { HeatMap } from '../engine/heat';
import { simulationFingerprint } from '../engine/scenario';
import type { SimulationResult } from '../engine/types';
import * as repo from '../persistence/repository';

export type PlayState = 'stopped' | 'playing' | 'paused';
export const SPEEDS = { lenta: 1600, normal: 850, rápida: 350 } as const;
export type SpeedKey = keyof typeof SPEEDS;

interface SimState {
  result: SimulationResult | null;
  heat: HeatMap | null;
  diagnostics: Diagnostic[];
  fingerprint: string | null;
  status: 'idle' | 'running' | 'ready' | 'error';
  error: string | null;
  /** índice de iteración mostrado (0-based) */
  cursor: number;
  /** paso dentro de la iteración (índice en el orden de procesamiento); -1 = iteración completa */
  step: number;
  play: PlayState;
  speed: SpeedKey;
  live: boolean;
  set: (patch: Partial<SimState>) => void;
}

export const useSim = create<SimState>((set) => ({
  result: null,
  heat: null,
  diagnostics: [],
  fingerprint: null,
  status: 'idle',
  error: null,
  cursor: 0,
  step: -1,
  play: 'stopped',
  speed: 'normal',
  live: true,
  set: (patch) => set(patch),
}));

let reqSeq = 0;
let debounce: ReturnType<typeof setTimeout> | null = null;

/** Recalcula si los datos relevantes para la simulación han cambiado. */
export function requestSimulation(doc: ProjectDoc, opts: { force?: boolean; immediate?: boolean; save?: boolean } = {}) {
  if (debounce) clearTimeout(debounce);
  // la huella se calcula dentro del rebote: arrastrar no cuesta un JSON.stringify por fotograma
  const run = async () => {
    const scenarioId = doc.project.activeScenarioId;
    const iterations = doc.project.settings.simulation.iterations;
    const fp = simulationFingerprint(doc, scenarioId, iterations);
    const st = useSim.getState();
    if (!opts.force && fp === st.fingerprint && st.status !== 'error') {
      if (opts.save && st.result) void persistRun(doc, st.result);
      return;
    }
    const id = ++reqSeq;
    useSim.setState({ status: 'running' });
    try {
      const { result, heat, diagnostics } = await runEngine('simulateWithHeat', doc, scenarioId, iterations);
      if (id !== reqSeq) return;
      const cur = useSim.getState();
      useSim.setState({
        result, heat, diagnostics, fingerprint: fp, status: 'ready', error: null,
        cursor: Math.min(cur.cursor, result.iterationCount - 1),
      });
      if (opts.save) void persistRun(doc, result);
    } catch (e) {
      if (id !== reqSeq) return;
      useSim.setState({ status: 'error', error: (e as Error).message });
    }
  };
  if (opts.immediate) void run();
  else debounce = setTimeout(() => void run(), 220);
}

async function persistRun(doc: ProjectDoc, r: SimulationResult) {
  const last = r.iterations[r.iterations.length - 1];
  const first = r.iterations[0];
  try {
    await repo.saveRun(doc.project.id, {
      id: `${r.id}_${Math.random().toString(36).slice(2, 7)}`,
      scenarioId: r.scenarioId ?? 'none',
      configuration: r.configuration,
      iterationCount: r.iterationCount,
      initialState: first ? { result: first.result, ledger: first.ledger } : null,
      finalState: last ? { result: last.result, ledger: last.ledger } : null,
      metrics: r.metrics,
      events: (last?.events ?? []).slice(0, 200),
      warnings: r.warnings,
      executionDate: r.executionDate,
    });
  } catch { /* registro opcional */ }
}
