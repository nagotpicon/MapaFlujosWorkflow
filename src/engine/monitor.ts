/**
 * Panel monitor: métricas que determinan el éxito, las fricciones y los
 * puntos neurálgicos. Los impactos se calculan con contrafactuales reales del
 * motor ("¿cuánto cambiaría el resultado si esta fricción no existiera?").
 */
import type { MapNode, ProjectDoc } from '../core/model/schema';
import { compileModel, type SimEdge } from './compile';
import { diagnose, type Diagnostic } from './diagnostics';
import { PRIMARY, qty } from './packet';
import { effectiveDoc } from './scenario';
import { simulate } from './simulate';
import type { SimulationResult } from './types';

export interface FunnelStep { nodeId: string; title: string; value: number; pctOfStart: number; pctOfPrev: number }
export interface ImpactItem {
  nodeId: string;
  title: string;
  /** cambio del resultado total si se neutraliza (fricción: ganancia; impulsor: pérdida) */
  impact: number;
  impactPct: number;
  kind: 'friction' | 'driver';
  reason: string;
  category: 'personal' | 'external' | 'system' | null;
  resolution: string | null;
  hypothesis: boolean;
}

export interface MonitorData {
  kpis: {
    totalResult: number;
    lastResult: number;
    totalGenerated: number;
    efficiency: number;
    lostPct: number;
    trendPct: number | null;
    saturatedElements: number;
    activeLoops: number;
    approximations: number;
    hypotheses: number;
  };
  funnel: FunnelStep[];
  frictions: ImpactItem[];
  drivers: ImpactItem[];
  neuralgic: Diagnostic[];
  diagnostics: Diagnostic[];
  series: { result: number[]; generated: number[]; lost: number[] };
  frictionStatus: { total: number; pending: number; resolved: number; byCategory: Record<'personal' | 'external' | 'system' | 'unclassified', number> };
  unit: string;
}

function isFriction(doc: ProjectDoc, n: MapNode): string | null {
  const inf = n.weight.influence;
  if (n.metadata.discovery?.role === 'friction') return 'Fricción identificada';
  if (inf && inf.mode !== 'qualitative' && inf.value < 0) return `Influencia negativa (${inf.value})`;
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  if (bhs.some((b) => b.behaviorType === 'reducer')) return 'Reduce el flujo';
  if (bhs.some((b) => b.behaviorType === 'consumer')) return 'Consume flujo';
  if (bhs.some((b) => b.behaviorType === 'filter')) return 'Filtra el flujo';
  if (bhs.some((b) => b.behaviorType === 'restrictor')) return 'Limita la capacidad';
  return null;
}

function isDriver(doc: ProjectDoc, n: MapNode): string | null {
  const inf = n.weight.influence;
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  if (bhs.some((b) => b.behaviorType === 'compensator')) return 'Compensa fricciones';
  if (bhs.some((b) => b.behaviorType === 'multiplier')) return 'Multiplica el flujo';
  if (inf && ((inf.mode !== 'qualitative' && inf.value > 0) || inf.mode === 'qualitative') && n.type !== 'input') return 'Influencia positiva';
  return null;
}

/** Documento con la fricción/impulsor neutralizado. */
function neutralize(doc: ProjectDoc, nodeId: string, kind: 'friction' | 'driver'): ProjectDoc {
  const n = doc.nodes[nodeId];
  const nodes = { ...doc.nodes, [nodeId]: { ...n, weight: { ...n.weight, influence: n.weight.influence ? { ...n.weight.influence, mode: 'weighted' as const, value: 0 } : null } } };
  const behaviors = { ...doc.behaviors };
  for (const bid of n.behaviorIds) {
    const b = behaviors[bid];
    if (!b) continue;
    if (kind === 'friction') {
      if (['reducer', 'consumer'].includes(b.behaviorType)) behaviors[bid] = { ...b, enabled: false };
      if (b.behaviorType === 'filter') behaviors[bid] = { ...b, parameters: { ...b.parameters, passRatio: 1 }, enabled: b.parameters.mode === 'threshold' ? false : b.enabled };
      if (b.behaviorType === 'restrictor') behaviors[bid] = { ...b, enabled: false };
    } else if (['compensator', 'multiplier'].includes(b.behaviorType)) behaviors[bid] = { ...b, enabled: false };
  }
  let edges = doc.edges;
  if (kind === 'driver') {
    edges = { ...doc.edges };
    for (const e of Object.values(doc.edges)) if (e.sourceNodeId === nodeId && e.type === 'causal') edges[e.id] = { ...e, direction: 'none' };
  }
  return { ...doc, nodes, behaviors, edges };
}

export function computeMonitor(doc: ProjectDoc, scenarioId: string | null, result: SimulationResult, opts: { counterfactuals?: boolean; maxItems?: number } = {}): MonitorData {
  const eff = effectiveDoc(doc, scenarioId);
  const iterations = result.iterationCount;
  const total = result.metrics.totalResult[PRIMARY] ?? 0;
  const gen = result.metrics.totalGenerated[PRIMARY] ?? 0;
  const lost = result.metrics.totalLost[PRIMARY] ?? 0;
  const s = result.metrics.resultSeries;
  const half = Math.max(1, Math.floor(s.length / 2));
  const firstAvg = s.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const lastAvg = s.slice(-half).reduce((a, b) => a + b, 0) / half;
  const model = compileModel(eff);

  // Embudo: ruta principal (mayor caudal) desde la entrada principal hasta una salida
  const thr: Record<string, number> = {};
  for (const it of result.iterations) for (const [id, st] of Object.entries(it.nodes)) thr[id] = (thr[id] ?? 0) + Math.max(qty(st.in) + (st.generated[PRIMARY] ?? 0), qty(st.out) + qty(st.terminal));
  const edgeFlow: Record<string, number> = {};
  for (const it of result.iterations) for (const [id, es] of Object.entries(it.edges)) edgeFlow[id] = (edgeFlow[id] ?? 0) + qty(es.delivered);
  const inputs = model.simNodeIds.filter((id) => result.iterations.some((it) => (it.nodes[id]?.generated[PRIMARY] ?? 0) > 0));
  const start = inputs.sort((a, b) => (thr[b] ?? 0) - (thr[a] ?? 0))[0];
  const funnel: FunnelStep[] = [];
  if (start) {
    const visited = new Set<string>();
    let cur: string | undefined = start;
    while (cur && !visited.has(cur) && funnel.length < 40) {
      visited.add(cur);
      const v: number = cur === start ? (thr[cur] ?? 0) : result.iterations.reduce((acc, it) => acc + Math.max(qty(it.nodes[cur!]?.out ?? { ext: {}, int: {}, origins: {} }), qty(it.nodes[cur!]?.terminal ?? { ext: {}, int: {}, origins: {} })), 0);
      const prev: number = funnel.length ? funnel[funnel.length - 1].value : v;
      funnel.push({ nodeId: cur, title: eff.nodes[cur]?.title ?? cur, value: v, pctOfStart: funnel.length ? v / (funnel[0].value || 1) : 1, pctOfPrev: prev > 0 ? v / prev : 0 });
      const outs: SimEdge[] = (model.transferOut.get(cur) ?? []).filter((se) => se.edge.behavior.role === 'main' && !model.backEdgeIds.has(se.id));
      const next: SimEdge | undefined = outs.sort((a: SimEdge, b: SimEdge) => (edgeFlow[b.id] ?? 0) - (edgeFlow[a.id] ?? 0))[0];
      cur = next?.to;
    }
  }

  // Fricciones e impulsores (contrafactuales)
  const frictions: ImpactItem[] = [];
  const drivers: ImpactItem[] = [];
  const maxItems = opts.maxItems ?? 24;
  const candidates = model.simNodeIds.map((id) => eff.nodes[id]).filter(Boolean);
  let count = 0;
  for (const n of candidates) {
    if (count >= maxItems) break;
    const f = isFriction(eff, n);
    const d = f ? null : isDriver(eff, n);
    if (!f && !d) continue;
    count++;
    let impact = 0;
    if (opts.counterfactuals !== false) {
      const alt = simulate(neutralize(eff, n.id, f ? 'friction' : 'driver'), { preEffective: true, iterations, scenarioId });
      const t2 = alt.metrics.totalResult[PRIMARY] ?? 0;
      impact = f ? t2 - total : total - t2;
    }
    const item: ImpactItem = {
      nodeId: n.id, title: n.title, impact, impactPct: total > 1e-9 ? impact / total : 0, kind: f ? 'friction' : 'driver',
      reason: (f ?? d)!, category: n.metadata.discovery?.frictionCategory ?? null,
      resolution: n.metadata.discovery?.resolution ?? null,
      hypothesis: n.metadata.confidence === 'hypothesis' || result.approximations.some((a) => a.elementId === n.id),
    };
    (f ? frictions : drivers).push(item);
  }
  frictions.sort((a, b) => b.impact - a.impact);
  drivers.sort((a, b) => b.impact - a.impact);

  const diagnostics = diagnose(eff, result);
  const neuralgic = diagnostics.filter((d) => ['bottleneck', 'dependency', 'recovery', 'blocked', 'saturation'].includes(d.kind) || d.severity === 'critical').slice(0, 8);

  const disc = Object.values(eff.nodes).filter((n) => n.metadata.discovery?.role === 'friction' || n.metadata.discovery?.frictionCategory);
  const byCategory = { personal: 0, external: 0, system: 0, unclassified: 0 };
  for (const n of disc) byCategory[n.metadata.discovery?.frictionCategory ?? 'unclassified']++;
  const saturated = new Set<string>();
  for (const it of result.iterations) {
    for (const [id, st] of Object.entries(it.nodes)) if (st.saturated) saturated.add(id);
    for (const [id, es] of Object.entries(it.edges)) if (es.saturated) saturated.add(id);
  }
  return {
    kpis: {
      totalResult: total,
      lastResult: s[s.length - 1] ?? 0,
      totalGenerated: gen,
      efficiency: result.metrics.efficiency,
      lostPct: gen > 1e-9 ? lost / gen : 0,
      trendPct: firstAvg > 1e-9 ? (lastAvg - firstAvg) / firstAvg : null,
      saturatedElements: saturated.size,
      activeLoops: result.loops.length,
      approximations: result.approximations.length,
      hypotheses: result.hypotheses.length,
    },
    funnel,
    frictions,
    drivers,
    neuralgic,
    diagnostics,
    series: {
      result: s,
      generated: result.iterations.map((it) => it.ledger.generated[PRIMARY] ?? 0),
      lost: result.iterations.map((it) => it.ledger.lost[PRIMARY] ?? 0),
    },
    frictionStatus: {
      total: disc.length,
      pending: disc.filter((n) => (n.metadata.discovery?.resolution ?? 'pending') === 'pending').length,
      resolved: disc.filter((n) => (n.metadata.discovery?.resolution ?? 'pending') !== 'pending').length,
      byCategory,
    },
    unit: eff.dimensions[PRIMARY]?.unit || 'u.',
  };
}
