/**
 * Análisis sobre resultados del motor: rastreo, sensibilidad, comparación de
 * escenarios. Todo es determinista y explicable.
 */
import type { EntityKind, ProjectDoc } from '../core/model/schema';
import { getPath, setPath } from '../core/model/paths';
import { compileModel } from './compile';
import { PRIMARY, qty } from './packet';
import { effectiveDoc, collectionFor } from './scenario';
import { simulate } from './simulate';
import type { SimulationResult } from './types';

/* ------------------------------------------------------------------ */
/* Rastreo                                                             */
/* ------------------------------------------------------------------ */

export interface TraceResult {
  direction: 'forward' | 'backward';
  rootId: string;
  nodeIds: string[];
  edgeIds: string[];
  activeEdgeIds: string[];
  inactiveEdgeIds: string[];
  /** composición por origen del flujo en el nodo raíz (rastreo hacia atrás) */
  contributions: { key: string; label: string; amount: number; share: number; kind: 'input' | 'generation' | 'feedback' | 'stock' }[];
  conditionIds: string[];
  /** aportaciones de influencia (causales y compensaciones) */
  influences: { nodeId: string; edgeId: string; effect: string }[];
}

export function trace(doc: ProjectDoc, rootId: string, direction: 'forward' | 'backward', result: SimulationResult | null, iteration?: number): TraceResult {
  const model = compileModel(doc);
  const root = model.resolve(rootId);
  const nodeSet = new Set<string>([root]);
  const edgeSet = new Set<string>();
  const queue = [root];
  while (queue.length) {
    const v = queue.shift()!;
    for (const se of model.allSimEdges) {
      const [a, b] = direction === 'forward' ? [se.from, se.to] : [se.to, se.from];
      if (a !== v) continue;
      edgeSet.add(se.baseId);
      if (!nodeSet.has(b)) { nodeSet.add(b); queue.push(b); }
    }
  }
  // conexiones conceptuales/informativas también se iluminan (sin flujo)
  for (const e of Object.values(doc.edges)) {
    if (e.type === 'conceptual' || e.type === 'informative') {
      const a = direction === 'forward' ? e.sourceNodeId : e.targetNodeId;
      if (nodeSet.has(model.resolve(a))) edgeSet.add(e.id);
    }
  }
  const its = result?.iterations ?? [];
  const it = iteration != null ? its[iteration] : undefined;
  const active = new Set<string>();
  for (const x of it ? [it] : its) {
    for (const [eid, es] of Object.entries(x.edges)) if (es.active) active.add(eid.replace('~rev', ''));
  }
  const conditionIds = new Set<string>();
  for (const id of nodeSet) {
    const n = doc.nodes[id];
    if (n?.activationConditionId) conditionIds.add(n.activationConditionId);
    for (const b of n?.behaviorIds ?? []) for (const c of doc.behaviors[b]?.conditions ?? []) conditionIds.add(c);
  }
  for (const eid of edgeSet) for (const c of doc.edges[eid]?.conditions ?? []) conditionIds.add(c);

  const contributions: TraceResult['contributions'] = [];
  if (direction === 'backward' && its.length) {
    const agg: Record<string, number> = {};
    for (const x of it ? [it] : its) {
      const st = x.nodes[root];
      if (!st) continue;
      const src = qty(st.terminal) > 0 ? st.terminal : st.out;
      for (const [k, v] of Object.entries(src.origins)) agg[k] = (agg[k] ?? 0) + v;
    }
    const total = Object.values(agg).reduce((s, v) => s + v, 0);
    for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1])) {
      const [prefix, id] = k.includes(':') ? [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)] : ['input', k];
      const kind = prefix === 'input' ? 'input' : prefix === 'feedback' || prefix === 'circuit' ? 'feedback' : prefix === 'stock' ? 'stock' : 'generation';
      const name = prefix === 'circuit' ? `Circuito «${doc.circuits[id]?.name ?? id}»`
        : prefix === 'feedback' || prefix === 'edge' ? `Conexión «${doc.nodes[doc.edges[id]?.sourceNodeId]?.title ?? '?'}» → «${doc.nodes[doc.edges[id]?.targetNodeId]?.title ?? '?'}»`
        : `«${doc.nodes[id]?.title ?? id}»`;
      const label = prefix === 'input' ? name
        : prefix === 'mult' ? `${name} (multiplicador)`
        : prefix === 'inf' ? `${name} (influencias recibidas)`
        : prefix === 'gen' ? `${name} (generación)`
        : prefix === 'conv' ? `${name} (conversión)`
        : prefix === 'formula' ? `${name} (fórmula)`
        : prefix === 'stock' ? `${name} (stock inicial)`
        : prefix === 'edge' ? `${name} (multiplicador de conexión)`
        : `${name} (retroalimentación)`;
      contributions.push({ key: k, label, amount: v, share: total > 0 ? v / total : 0, kind });
    }
  }
  const influences: TraceResult['influences'] = [];
  for (const se of model.allSimEdges) {
    if (se.edge.type !== 'causal' || !nodeSet.has(se.to) || !nodeSet.has(se.from)) continue;
    const mode = se.edge.behavior.influence.mode;
    influences.push({ nodeId: se.from, edgeId: se.baseId, effect: mode === 'compensate' ? 'compensa' : se.edge.behavior.polarity === 'negative' ? 'reduce' : 'refuerza' });
  }
  const edgeIds = [...edgeSet];
  return {
    direction, rootId: root, nodeIds: [...nodeSet], edgeIds,
    activeEdgeIds: edgeIds.filter((e) => active.has(e)),
    inactiveEdgeIds: edgeIds.filter((e) => !active.has(e)),
    contributions, conditionIds: [...conditionIds], influences,
  };
}

/* ------------------------------------------------------------------ */
/* Parámetros numéricos y sensibilidad                                 */
/* ------------------------------------------------------------------ */

export interface ParamRef {
  targetType: EntityKind;
  targetId: string;
  path: string;
  label: string;
}

export function listNumericParams(doc: ProjectDoc): ParamRef[] {
  const out: ParamRef[] = [];
  const title = (id: string) => doc.nodes[id]?.title ?? id;
  for (const n of Object.values(doc.nodes)) {
    for (const [dim, dv] of Object.entries(n.dimensionValues)) {
      if (typeof dv.value === 'number') out.push({ targetType: 'node', targetId: n.id, path: `dimensionValues.${dim}.value`, label: `${title(n.id)} · ${doc.dimensions[dim]?.name ?? dim}` });
    }
    if (n.weight.influence && n.weight.influence.mode !== 'qualitative') out.push({ targetType: 'node', targetId: n.id, path: 'weight.influence.value', label: `${title(n.id)} · influencia` });
  }
  for (const b of Object.values(doc.behaviors)) {
    for (const [k, v] of Object.entries(b.parameters)) {
      if (typeof v !== 'number' || ['startIteration', 'endIteration'].includes(k)) continue;
      out.push({ targetType: 'behavior', targetId: b.id, path: `parameters.${k}`, label: `${title(b.ownerId)} · ${b.behaviorType}.${k}` });
    }
  }
  for (const e of Object.values(doc.edges)) {
    if (e.type === 'conceptual' || e.type === 'informative') continue;
    const name = `${title(e.sourceNodeId)} → ${title(e.targetNodeId)}`;
    if (e.type === 'flow') {
      for (const k of ['multiplier', 'loss', 'weight', 'share'] as const) out.push({ targetType: 'edge', targetId: e.id, path: `behavior.${k}`, label: `${name} · ${k}` });
      if (e.capacity != null) out.push({ targetType: 'edge', targetId: e.id, path: 'capacity', label: `${name} · capacidad` });
    } else if (e.behavior.influence.mode === 'modulate') {
      out.push({ targetType: 'edge', targetId: e.id, path: 'behavior.influence.sensitivity', label: `${name} · sensibilidad` });
    } else {
      out.push({ targetType: 'edge', targetId: e.id, path: 'behavior.influence.amount', label: `${name} · compensación` });
    }
  }
  for (const c of Object.values(doc.circuits)) {
    out.push({ targetType: 'circuit', targetId: c.id, path: 'returnPercent', label: `Circuito ${c.name} · % retorno` });
  }
  return out;
}

function withParam(doc: ProjectDoc, p: ParamRef, value: number): ProjectDoc {
  const key = collectionFor(p.targetType);
  const coll = doc[key] as Record<string, unknown>;
  return { ...doc, [key]: { ...coll, [p.targetId]: setPath(coll[p.targetId], p.path, value) } } as ProjectDoc;
}

export function readParam(doc: ProjectDoc, p: ParamRef): number {
  const coll = doc[collectionFor(p.targetType)] as Record<string, unknown>;
  const v = getPath(coll[p.targetId], p.path);
  return typeof v === 'number' ? v : 0;
}

export const totalResultMetric = (r: SimulationResult) => r.metrics.totalResult[PRIMARY] ?? 0;

export interface SensitivityPoint { value: number; result: number }

/** Barre un parámetro y observa su impacto sobre el resultado total. */
export function sensitivitySweep(doc: ProjectDoc, scenarioId: string | null, p: ParamRef, values: number[], iterations?: number): SensitivityPoint[] {
  const eff = effectiveDoc(doc, scenarioId);
  return values.map((value) => ({ value, result: totalResultMetric(simulate(withParam(eff, p, value), { preEffective: true, iterations, scenarioId })) }));
}

export interface TornadoEntry { param: ParamRef; base: number; low: number; high: number; resultLow: number; resultHigh: number; baseResult: number; swing: number; elasticity: number }

/** Análisis de sensibilidad básico: ±delta sobre cada parámetro numérico. */
export function tornado(doc: ProjectDoc, scenarioId: string | null, delta = 0.2, maxParams = 40, iterations?: number): TornadoEntry[] {
  const eff = effectiveDoc(doc, scenarioId);
  const base = totalResultMetric(simulate(eff, { preEffective: true, iterations, scenarioId }));
  const params = listNumericParams(eff).filter((p) => readParam(eff, p) !== 0).slice(0, maxParams);
  const out: TornadoEntry[] = [];
  for (const p of params) {
    const v = readParam(eff, p);
    const lo = v * (1 - delta);
    const hi = v * (1 + delta);
    const clampP = (x: number) => (p.path.endsWith('passRatio') || p.path.endsWith('ratio') || p.path.endsWith('.loss') ? Math.max(0, Math.min(1, x)) : x);
    const rl = totalResultMetric(simulate(withParam(eff, p, clampP(lo)), { preEffective: true, iterations, scenarioId }));
    const rh = totalResultMetric(simulate(withParam(eff, p, clampP(hi)), { preEffective: true, iterations, scenarioId }));
    const swing = Math.abs(rh - rl);
    out.push({ param: p, base: v, low: clampP(lo), high: clampP(hi), resultLow: rl, resultHigh: rh, baseResult: base, swing, elasticity: base !== 0 ? ((rh - rl) / base) / (2 * delta) : 0 });
  }
  return out.sort((a, b) => b.swing - a.swing);
}

/* ------------------------------------------------------------------ */
/* Comparación de escenarios                                           */
/* ------------------------------------------------------------------ */

export interface NodeDelta { nodeId: string; title: string; a: number; b: number; delta: number; pct: number | null }

export interface ScenarioComparison {
  resultA: Record<string, number>;
  resultB: Record<string, number>;
  dimensionDeltas: { dimension: string; name: string; a: number; b: number; delta: number }[];
  intensiveDeltas: { dimension: string; name: string; a: number; b: number; delta: number }[];
  improved: NodeDelta[];
  worsened: NodeDelta[];
  newBottlenecks: string[];
  resolvedBottlenecks: string[];
  loopChanges: { label: string; change: string }[];
  parameterDiffs: { label: string; a: unknown; b: unknown }[];
  seriesA: number[];
  seriesB: number[];
  hypothesisBased: boolean;
}

function throughputTotals(r: SimulationResult): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of r.iterations) for (const [id, st] of Object.entries(it.nodes)) out[id] = (out[id] ?? 0) + Math.max(qty(st.out), qty(st.terminal));
  return out;
}

function saturatedNodes(r: SimulationResult): Set<string> {
  const s = new Set<string>();
  for (const it of r.iterations) {
    for (const [id, st] of Object.entries(it.nodes)) if (st.saturated) s.add(id);
    for (const [id, es] of Object.entries(it.edges)) if (es.saturated) s.add(id);
  }
  return s;
}

export function compareScenarios(doc: ProjectDoc, scenarioA: string, scenarioB: string, iterations?: number): ScenarioComparison {
  const ra = simulate(doc, { scenarioId: scenarioA, iterations });
  const rb = simulate(doc, { scenarioId: scenarioB, iterations });
  return compareRuns(doc, scenarioA, ra, scenarioB, rb);
}

export function compareRuns(doc: ProjectDoc, scenarioA: string, ra: SimulationResult, scenarioB: string, rb: SimulationResult): ScenarioComparison {
  const title = (id: string) => doc.nodes[id]?.title ?? (doc.edges[id] ? `${doc.nodes[doc.edges[id].sourceNodeId]?.title} → ${doc.nodes[doc.edges[id].targetNodeId]?.title}` : id);
  const dims = new Set([...Object.keys(ra.metrics.totalResult), ...Object.keys(rb.metrics.totalResult)]);
  const dimensionDeltas = [...dims].map((d) => {
    const a = ra.metrics.totalResult[d] ?? 0;
    const b = rb.metrics.totalResult[d] ?? 0;
    return { dimension: d, name: doc.dimensions[d]?.name ?? d, a, b, delta: b - a };
  });
  const ia = ra.metrics.finalResult.int;
  const ib = rb.metrics.finalResult.int;
  const intensiveDeltas = [...new Set([...Object.keys(ia), ...Object.keys(ib)])].map((d) => ({
    dimension: d, name: doc.dimensions[d]?.name ?? d, a: ia[d] ?? 0, b: ib[d] ?? 0, delta: (ib[d] ?? 0) - (ia[d] ?? 0),
  }));
  const ta = throughputTotals(ra);
  const tb = throughputTotals(rb);
  const deltas: NodeDelta[] = [];
  for (const id of new Set([...Object.keys(ta), ...Object.keys(tb)])) {
    const a = ta[id] ?? 0;
    const b = tb[id] ?? 0;
    if (Math.abs(b - a) < 1e-6) continue;
    deltas.push({ nodeId: id, title: title(id), a, b, delta: b - a, pct: a > 1e-9 ? (b - a) / a : null });
  }
  deltas.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const sa = saturatedNodes(ra);
  const sb = saturatedNodes(rb);
  const loopChanges: ScenarioComparison['loopChanges'] = [];
  const la = new Map(ra.loops.map((l) => [l.id, l]));
  const lb = new Map(rb.loops.map((l) => [l.id, l]));
  for (const [id, l] of lb) {
    const prev = la.get(id);
    if (!prev) loopChanges.push({ label: l.label, change: 'nuevo circuito' });
    else if (prev.polarity !== l.polarity) loopChanges.push({ label: l.label, change: `cambia de ${prev.polarity} a ${l.polarity}` });
  }
  for (const [id, l] of la) if (!lb.has(id)) loopChanges.push({ label: l.label, change: 'desaparece' });
  // cambios de actividad en circuitos (retornos)
  const feedbackTotal = (r: SimulationResult) => r.iterations.reduce((s, it) => s + Object.values(it.edges).filter((e) => e.feedback).reduce((x, e) => x + qty(e.delivered) + (e.inhibition ? e.assigned : 0), 0), 0);
  const fa = feedbackTotal(ra);
  const fb = feedbackTotal(rb);
  if (Math.abs(fb - fa) > 1e-6) loopChanges.push({ label: 'Retroalimentación total', change: `${fa.toFixed(1)} → ${fb.toFixed(1)}` });

  const A = doc.scenarios[scenarioA];
  const B = doc.scenarios[scenarioB];
  const parameterDiffs: ScenarioComparison['parameterDiffs'] = [];
  const keyOf = (o: { targetType: string; targetId: string; path: string }) => `${o.targetType}|${o.targetId}|${o.path}`;
  const mapA = new Map((A?.overrides ?? []).map((o) => [keyOf(o), o]));
  const mapB = new Map((B?.overrides ?? []).map((o) => [keyOf(o), o]));
  const effA = effectiveDoc(doc, scenarioA);
  const effB = effectiveDoc(doc, scenarioB);
  for (const k of new Set([...mapA.keys(), ...mapB.keys()])) {
    const o = mapA.get(k) ?? mapB.get(k)!;
    const coll = (d: ProjectDoc) => (d[collectionFor(o.targetType)] as Record<string, unknown>)[o.targetId];
    const va = getPath(coll(effA), o.path);
    const vb = getPath(coll(effB), o.path);
    if (JSON.stringify(va) === JSON.stringify(vb)) continue;
    const owner = o.targetType === 'node' ? doc.nodes[o.targetId]?.title : o.targetType === 'behavior' ? doc.nodes[doc.behaviors[o.targetId]?.ownerId]?.title : o.targetType === 'edge' ? title(o.targetId) : doc.circuits[o.targetId]?.name;
    parameterDiffs.push({ label: `${owner ?? o.targetId} · ${o.path}`, a: va, b: vb });
  }
  return {
    resultA: ra.metrics.totalResult,
    resultB: rb.metrics.totalResult,
    dimensionDeltas,
    intensiveDeltas,
    improved: deltas.filter((d) => d.delta > 0),
    worsened: deltas.filter((d) => d.delta < 0),
    newBottlenecks: [...sb].filter((x) => !sa.has(x)).map(title),
    resolvedBottlenecks: [...sa].filter((x) => !sb.has(x)).map(title),
    loopChanges,
    parameterDiffs,
    seriesA: ra.metrics.resultSeries,
    seriesB: rb.metrics.resultSeries,
    hypothesisBased: ra.hypotheses.length > 0 || rb.hypotheses.length > 0 || ra.approximations.length > 0 || rb.approximations.length > 0,
  };
}

/** Banda de incertidumbre: desfavorable / central / favorable. */
export function uncertaintyBand(doc: ProjectDoc, scenarioId: string, iterations?: number) {
  const s = doc.scenarios[scenarioId];
  const run = (u: 'central' | 'favorable' | 'unfavorable') => {
    const d = s ? { ...doc, scenarios: { ...doc.scenarios, [scenarioId]: { ...s, uncertainty: u } } } : doc;
    return simulate(d, { scenarioId, iterations });
  };
  const c = run('central');
  const f = run('favorable');
  const u = run('unfavorable');
  return {
    central: c.metrics.resultSeries,
    favorable: f.metrics.resultSeries,
    unfavorable: u.metrics.resultSeries,
    totals: { central: totalResultMetric(c), favorable: totalResultMetric(f), unfavorable: totalResultMetric(u) },
  };
}
