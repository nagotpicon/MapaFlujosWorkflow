/**
 * Resaltado contextual: búsqueda, filtros por etiqueta/comportamiento,
 * rastreo hacia delante/atrás, modo enfoque. Los elementos que no participan
 * se atenúan (no se eliminan).
 */
import { createContext, useContext, useMemo } from 'react';
import { trace, type TraceResult } from '../engine/analysis';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { qty } from '../engine/packet';

export interface Highlight {
  active: boolean;
  nodes: Set<string>;
  edges: Set<string>;
  inactiveEdges: Set<string>;
  trace: TraceResult | null;
  maxFlow: number;
  /** conexiones que pueden llevar partículas (presupuesto de animación) */
  particles: Set<string>;
}

const EMPTY: Highlight = { active: false, nodes: new Set(), edges: new Set(), inactiveEdges: new Set(), trace: null, maxFlow: 1, particles: new Set() };
const PARTICLE_BUDGET = 40;
export const HighlightContext = createContext<Highlight>(EMPTY);
export const useHighlight = () => useContext(HighlightContext);

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function useComputeHighlight(): Highlight {
  const doc = useProject((s) => s.doc);
  const q = useUI((s) => s.searchQuery);
  const tags = useUI((s) => s.tagFilter);
  const bfil = useUI((s) => s.behaviorFilter);
  const tr = useUI((s) => s.trace);
  const focus = useUI((s) => s.focusNodeId);
  const result = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);

  const dragging = useProject((s) => !!s.txn);
  const { maxFlow, particles } = useMemo(() => {
    const it = result?.iterations[cursor];
    if (!it) return { maxFlow: 1, particles: new Set<string>() };
    let m = 1e-9;
    const flows: [string, number][] = [];
    for (const [id, es] of Object.entries(it.edges)) { const q = qty(es.delivered); m = Math.max(m, q); if (q > 0) flows.push([id, q]); }
    // durante un arrastre no se animan partículas; fuera de él, solo las de mayor caudal
    const top = dragging ? [] : flows.sort((a, b) => b[1] - a[1]).slice(0, PARTICLE_BUDGET).map(([id]) => id);
    return { maxFlow: m, particles: new Set(top) };
  }, [result, cursor, dragging]);

  // sin búsqueda, filtros, rastreo ni enfoque el resaltado no depende del mapa:
  // así, al arrastrar una idea no se vuelve a dibujar todo el lienzo en cada fotograma
  const filtering = !!(q.trim() || tags.length || bfil.length || tr || focus);
  const hlDoc = filtering ? doc : null;
  return useMemo(() => {
    const doc = hlDoc;
    if (!doc) return { ...EMPTY, maxFlow, particles };
    let nodes: Set<string> | null = null;
    let edges: Set<string> | null = null;
    let inactive = new Set<string>();
    let trRes: TraceResult | null = null;
    const intersect = (a: Set<string> | null, b: Set<string>) => (a ? new Set([...a].filter((x) => b.has(x))) : b);
    if (q.trim()) {
      const nq = norm(q.trim());
      const m = new Set(Object.values(doc.nodes).filter((n) => norm(`${n.title} ${n.description} ${n.tags.join(' ')}`).includes(nq)).map((n) => n.id));
      nodes = intersect(nodes, m);
    }
    if (tags.length) nodes = intersect(nodes, new Set(Object.values(doc.nodes).filter((n) => tags.some((t) => n.tags.includes(t))).map((n) => n.id)));
    if (bfil.length) nodes = intersect(nodes, new Set(Object.values(doc.nodes).filter((n) => n.behaviorIds.some((b) => bfil.includes(doc.behaviors[b]?.behaviorType ?? ''))).map((n) => n.id)));
    if (tr && doc.nodes[tr.rootId]) {
      trRes = trace(doc, tr.rootId, tr.direction, result);
      nodes = intersect(nodes, new Set(trRes.nodeIds));
      edges = new Set(trRes.activeEdgeIds);
      inactive = new Set(trRes.inactiveEdgeIds);
    }
    if (focus && doc.nodes[focus]) {
      const near = new Set([focus]);
      const es = new Set<string>();
      for (const e of Object.values(doc.edges)) {
        if (e.sourceNodeId === focus || e.targetNodeId === focus) { near.add(e.sourceNodeId); near.add(e.targetNodeId); es.add(e.id); }
      }
      nodes = intersect(nodes, near);
      edges = edges ? new Set([...edges].filter((x) => es.has(x))) : es;
    }
    if (!nodes && !edges) return { ...EMPTY, maxFlow, particles };
    const ns = nodes ?? new Set(Object.keys(doc.nodes));
    if (!edges) edges = new Set(Object.values(doc.edges).filter((e) => ns.has(e.sourceNodeId) && ns.has(e.targetNodeId)).map((e) => e.id));
    return { active: true, nodes: ns, edges, inactiveEdges: inactive, trace: trRes, maxFlow, particles };
  }, [hlDoc, q, tags, bfil, tr, focus, result, maxFlow, particles]);
}
