/**
 * Compilación del documento a una estructura de simulación: resuelve clones,
 * conexiones bidireccionales, dependencias, orden de procesamiento y bucles.
 */
import type { Behavior, Circuit, Condition, MapEdge, MapNode, Port, ProjectDoc } from '../core/model/schema';
import { BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import { exprDependencies } from './conditions';
import { computeProcessingOrder, findSimpleCycles, type DepEdge } from './graph';
import type { LoopInfo } from './types';

export interface SimEdge {
  /** id de la conexión (o id~rev para el sentido inverso de una bidireccional) */
  id: string;
  baseId: string;
  edge: MapEdge;
  from: string;
  to: string;
  reversed: boolean;
}

export interface CompiledModel {
  doc: ProjectDoc;
  nodes: Map<string, MapNode>;
  /** nodos que participan en la simulación, orden estable */
  simNodeIds: string[];
  resolve: (id: string) => string;
  transferOut: Map<string, SimEdge[]>;
  replicateOut: Map<string, SimEdge[]>;
  causalIn: Map<string, SimEdge[]>;
  compensateIn: Map<string, SimEdge[]>;
  causalOut: Map<string, SimEdge[]>;
  allSimEdges: SimEdge[];
  behaviorsByNode: Map<string, Behavior[]>;
  conditions: Record<string, Condition>;
  ports: Record<string, Port>;
  circuitByReturnEdge: Map<string, Circuit>;
  order: string[];
  /** claves de dependencias de retorno */
  back: Set<string>;
  /** ids de conexiones (SimEdge.id) que son retornos */
  backEdgeIds: Set<string>;
  loops: LoopInfo[];
  outputIds: string[];
}

const NON_SIM_TYPES = new Set(['note', 'label', 'comment']);

export function compileModel(doc: ProjectDoc): CompiledModel {
  const nodes = new Map(Object.entries(doc.nodes));
  const resolve = (id: string): string => {
    let cur = id;
    const seen = new Set<string>();
    while (nodes.get(cur)?.aliasOf && !seen.has(cur)) {
      seen.add(cur);
      cur = nodes.get(cur)!.aliasOf!;
    }
    return cur;
  };

  const behaviorsByNode = new Map<string, Behavior[]>();
  for (const n of nodes.values()) {
    behaviorsByNode.set(n.id, n.behaviorIds.map((b) => doc.behaviors[b]).filter((b): b is Behavior => !!b && b.enabled));
  }

  const isGenerator = (n: MapNode) => n.type === 'input' || (behaviorsByNode.get(n.id) ?? []).some((b) => b.behaviorType === 'generator');
  const simNodeIds = [...nodes.values()]
    .filter((n) => !NON_SIM_TYPES.has(n.type) && !n.aliasOf)
    .sort((a, b) => (isGenerator(a) ? 0 : 1) - (isGenerator(b) ? 0 : 1) || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((n) => n.id);
  const simSet = new Set(simNodeIds);

  const transferOut = new Map<string, SimEdge[]>();
  const replicateOut = new Map<string, SimEdge[]>();
  const causalIn = new Map<string, SimEdge[]>();
  const causalOut = new Map<string, SimEdge[]>();
  const compensateIn = new Map<string, SimEdge[]>();
  const push = (m: Map<string, SimEdge[]>, k: string, v: SimEdge) => {
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(v);
  };
  const allSimEdges: SimEdge[] = [];
  const edgesSorted = Object.values(doc.edges).sort((a, b) => a.metadata.createdAt - b.metadata.createdAt || a.id.localeCompare(b.id));
  for (const e of edgesSorted) {
    if (e.type === 'conceptual' || e.type === 'informative' || e.direction === 'none') continue;
    const from = resolve(e.sourceNodeId);
    const to = resolve(e.targetNodeId);
    if (!simSet.has(from) || !simSet.has(to)) continue;
    const variants: SimEdge[] = [{ id: e.id, baseId: e.id, edge: e, from, to, reversed: false }];
    if (e.direction === 'both') variants.push({ id: `${e.id}~rev`, baseId: e.id, edge: e, from: to, to: from, reversed: true });
    for (const se of variants) {
      allSimEdges.push(se);
      if (e.type === 'flow') {
        if (e.behavior.transport === 'replicate') push(replicateOut, se.from, se);
        else push(transferOut, se.from, se);
      } else if (e.type === 'causal') {
        if (e.behavior.influence.mode === 'compensate') push(compensateIn, se.to, se);
        else push(causalIn, se.to, se);
        push(causalOut, se.from, se);
      }
    }
  }

  const circuitByReturnEdge = new Map<string, Circuit>();
  for (const c of Object.values(doc.circuits)) {
    if (c.enabled && c.returnEdgeId) circuitByReturnEdge.set(c.returnEdgeId, c);
  }

  // Dependencias
  const deps: DepEdge[] = [];
  for (const se of allSimEdges) {
    const e = se.edge;
    const kind: DepEdge['kind'] = e.type === 'causal'
      ? (e.behavior.influence.mode === 'compensate' ? 'compensate' : 'causal')
      : e.behavior.transport === 'replicate' ? 'replicate' : 'flow';
    deps.push({ key: `e:${se.id}`, from: se.from, to: se.to, kind, edgeId: se.id, forcedBack: e.behavior.isFeedback || circuitByReturnEdge.has(e.id) });
  }
  const condDeps = (cid: string | null | undefined, owner: string) => {
    if (!cid) return;
    const c = doc.conditions[cid];
    if (!c) return;
    for (const dep of exprDependencies(c.expr)) {
      const r = resolve(dep);
      if (r !== owner && simSet.has(r)) deps.push({ key: `c:${cid}:${r}:${owner}`, from: r, to: owner, kind: 'condition' });
    }
  };
  for (const id of simNodeIds) {
    const n = nodes.get(id)!;
    condDeps(n.activationConditionId, id);
    for (const b of behaviorsByNode.get(id) ?? []) {
      for (const c of b.conditions) condDeps(c, id);
      if (b.behaviorType === 'controller') {
        const target = doc.behaviors[String(b.parameters.targetBehaviorId ?? '')];
        if (target) {
          const t = resolve(target.ownerId);
          if (t !== id && simSet.has(t)) deps.push({ key: `k:${b.id}`, from: id, to: t, kind: 'control' });
        }
      }
    }
    if (n.split.mode === 'dynamic' && n.split.dynamicSourceNodeId) {
      const r = resolve(n.split.dynamicSourceNodeId);
      if (r !== id && simSet.has(r)) deps.push({ key: `d:${id}`, from: r, to: id, kind: 'dynamic' });
    }
  }
  for (const se of allSimEdges) {
    for (const cid of se.edge.conditions) condDeps(cid, se.from);
  }
  for (const c of circuitByReturnEdge.values()) {
    const re = allSimEdges.find((s) => s.id === c.returnEdgeId);
    if (re) condDeps(c.conditionId, re.from);
  }

  const { order, back } = computeProcessingOrder(simNodeIds, deps);
  const backEdgeIds = new Set<string>();
  for (const d of deps) if (back.has(d.key) && d.edgeId) backEdgeIds.add(d.edgeId);

  const loops = detectLoops(doc, allSimEdges, simNodeIds, behaviorsByNode, circuitByReturnEdge, backEdgeIds);
  const outputIds = simNodeIds.filter((id) => nodes.get(id)!.type === 'output');

  return {
    doc, nodes, simNodeIds, resolve, transferOut, replicateOut, causalIn, compensateIn, causalOut, allSimEdges,
    behaviorsByNode, conditions: doc.conditions, ports: doc.ports, circuitByReturnEdge, order, back, backEdgeIds, loops, outputIds,
  };
}

function edgeSign(se: SimEdge): number {
  const e = se.edge;
  if (e.type === 'flow' && e.behavior.transport === 'transfer') return 1;
  if (e.type === 'causal' && e.behavior.influence.mode === 'compensate') return 1;
  return e.behavior.polarity === 'negative' ? -1 : 1;
}

export function detectLoops(
  doc: ProjectDoc,
  simEdges: SimEdge[],
  simNodeIds: string[],
  behaviorsByNode: Map<string, Behavior[]>,
  circuitByReturnEdge: Map<string, Circuit>,
  backEdgeIds: Set<string>,
): LoopInfo[] {
  const refs = simEdges.map((s) => ({ id: s.id, from: s.from, to: s.to }));
  const byId = new Map(simEdges.map((s) => [s.id, s]));
  const cycles = findSimpleCycles(simNodeIds, refs);
  let r = 0, b = 0, m = 0;
  const loops: LoopInfo[] = [];
  for (const cyc of cycles) {
    const ses = cyc.map((c) => byId.get(c.id)!);
    const sign = ses.reduce((s, se) => s * edgeSign(se), 1);
    const nodeIds = ses.map((s) => s.from);
    const hasLimit = ses.some((s) => s.edge.capacity != null)
      || nodeIds.some((n) => (behaviorsByNode.get(n) ?? []).some((bh) => BEHAVIOR_LIBRARY[bh.behaviorType].phase === 'capacity'))
      || ses.some((s) => { const c = circuitByReturnEdge.get(s.baseId); return !!c && (c.saturation != null || c.maxLimit != null); });
    const circuit = ses.map((s) => circuitByReturnEdge.get(s.baseId)).find(Boolean)
      ?? Object.values(doc.circuits).find((c) => c.edgeIds.length > 0 && c.edgeIds.every((id) => ses.some((s) => s.baseId === id)));
    let polarity: LoopInfo['polarity'] = sign < 0 ? 'balancing' : hasLimit ? 'mixed' : 'reinforcing';
    if (circuit && circuit.loopType !== 'auto') polarity = circuit.loopType;
    const label = polarity === 'reinforcing' ? `R${++r}` : polarity === 'balancing' ? `B${++b}` : `M${++m}`;
    loops.push({
      id: `loop_${cyc.map((c) => c.id).sort().join('_')}`,
      nodeIds,
      edgeIds: [...new Set(ses.map((s) => s.baseId))],
      polarity,
      circuitId: circuit?.id ?? null,
      label: circuit ? `${label} · ${circuit.name}` : label,
      hasDelay: ses.some((s) => s.edge.delay > 0 || backEdgeIds.has(s.id)),
      hasLimit,
    });
  }
  return loops;
}
