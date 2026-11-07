/**
 * MOTOR DE SIMULACIÓN — discreto por rondas, determinista y explicable.
 *
 * Pipeline por nodo (en orden topológico; las dependencias de retorno usan el
 * estado de la ronda anterior):
 *   1. Recoger entradas (llegadas inmediatas + retardadas, capacidad de puertos)
 *   8. Resolver convergencias (regla del nodo) e inhibiciones
 *   2. Evaluar condiciones (activación del nodo y de cada comportamiento)
 *   3. Activar comportamientos (controladores, compensaciones, generadores)
 *   4. Procesar filtros
 *   5. Aplicar transformaciones (transformador, multiplicador, reductor,
 *      consumidor, acelerador, influencias causales)
 *   7. Aplicar capacidades y restricciones (restrictor, colas, desbordes)
 *   9. Actualizar acumuladores (almacenar, fugas, liberar)
 *   6. Procesar bifurcaciones (reparto entre conexiones de salida)
 *   7b. Aplicar condiciones, pérdidas, multiplicadores y capacidades de las conexiones
 *  10. Procesar retroalimentaciones (réplicas, inhibiciones, circuitos, retardos)
 *  11. Calcular el estado siguiente (stocks, colas, flujo en tránsito)
 *  12. Registrar eventos, libro de conservación y resultados
 *
 * Cada aumento o pérdida de una magnitud extensiva se anota en el libro
 * (generado / consumido / perdido / acumulado / terminal / deduplicado) con su
 * mecanismo responsable, de modo que no aparecen unidades inexplicadas.
 */
import type { Behavior, Circuit, MapNode, ProjectDoc } from '../core/model/schema';
import { evaluateCondition, type ConditionMemory, type MetricReader } from './conditions';
import { compileModel, type CompiledModel, type SimEdge } from './compile';
import { evaluateExpression } from './expression';
import {
  EPS, PRIMARY, addTo, clean, clonePacket, emptyPacket, mergePackets, qty, scalePacket, splitPacket,
} from './packet';
import { dimensionValueToNumber, scaleValueToWeighted } from './scales';
import { effectiveDoc } from './scenario';
import { applyFrame } from './frame';
import type {
  Approximation, DimMap, EdgeIterState, EventKind, IterationResult, Ledger, NodeIterState, Packet,
  RunMetrics, SimEvent, SimulationResult,
} from './types';

export interface SimulateOptions {
  scenarioId?: string | null;
  iterations?: number;
  /** si true, el documento ya es efectivo (no aplica el escenario) */
  preEffective?: boolean;
}

const MAX_VALUE = 1e12;
const MAX_EVENTS_PER_ITERATION = 4000;

interface Delivery {
  edgeId: string;
  to: string;
  portId: string | null;
  packet: Packet;
  priority: number;
  weight: number;
  convergenceWeight: number;
}

interface Inhibition { edgeId: string; to: string; amount: number }

function newNodeState(nodeId: string): NodeIterState {
  return {
    nodeId, active: true, in: emptyPacket(), out: emptyPacket(), terminal: emptyPacket(),
    generated: {}, consumed: {}, lost: {}, accumulated: {}, released: {}, deduplicated: {}, stock: {}, queue: {},
    influence: 0, baseInfluence: 0, compensation: 0, saturated: false, blocked: false, transformed: false,
    flags: [], detected: null,
  };
}

function newEdgeState(edgeId: string): EdgeIterState {
  return {
    edgeId, active: false, assigned: 0, delivered: emptyPacket(), lost: 0, generated: 0, blocked: false,
    saturated: false, arrivesAt: 0, influenceFactor: null, compensationApplied: null, feedback: false, inhibition: false,
  };
}

function emptyLedger(): Ledger {
  return {
    generated: {}, consumed: {}, lost: {}, accumulated: {}, released: {}, terminal: {}, deduplicated: {},
    inFlightStart: {}, inFlightEnd: {}, unexplained: {},
  };
}

const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);

function combine(factors: number[], rule: Behavior['combinationRule']): number {
  if (factors.length === 0) return 1;
  switch (rule) {
    case 'additive': return Math.max(0, 1 + factors.reduce((s, f) => s + (f - 1), 0));
    case 'max': return Math.max(...factors);
    case 'min': return Math.min(...factors);
    default: return factors.reduce((s, f) => s * f, 1);
  }
}

export function simulate(inputDoc: ProjectDoc, options: SimulateOptions = {}): SimulationResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const scenarioId = options.scenarioId ?? inputDoc.project.activeScenarioId ?? null;
  const framed = applyFrame(options.preEffective ? inputDoc : effectiveDoc(inputDoc, scenarioId));
  const doc = framed.doc;
  const iterations = Math.max(1, Math.min(500, options.iterations ?? doc.project.settings.simulation.iterations));
  const model = compileModel(doc);
  const runner = new Runner(model, iterations);
  const iterationResults = runner.run();
  const metrics = computeMetrics(model, iterationResults);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    id: `run_${Math.round(Date.now()).toString(36)}`,
    scenarioId,
    configuration: { iterations },
    iterationCount: iterations,
    order: model.order,
    backEdges: [...model.backEdgeIds],
    iterations: iterationResults,
    loops: model.loops,
    metrics,
    warnings: runner.warnings,
    approximations: [...runner.approximations.values()],
    hypotheses: runner.hypotheses(),
    frameNotes: framed.notes,
    executionDate: Date.now(),
    durationMs: t1 - t0,
  };
}

class Runner {
  m: CompiledModel;
  doc: ProjectDoc;
  N: number;
  warnings: string[] = [];
  approximations = new Map<string, Approximation>();
  private warned = new Set<string>();

  // dimensiones
  extDims: string[];
  intDims: string[];
  isExt: (d: string) => boolean;
  wmax: number;

  // estado entre rondas
  stocks = new Map<string, Packet>();
  queues = new Map<string, Packet>();
  scheduled = new Map<number, Delivery[]>();
  scheduledInhibitions = new Map<number, Inhibition[]>();
  condMem = new Map<string, ConditionMemory>();
  pulseFired = new Set<string>();
  prev: Record<string, NodeIterState> = {};

  // estado de la ronda en curso
  t = 0;
  cur: Record<string, NodeIterState> = {};
  edgeStates: Record<string, EdgeIterState> = {};
  inbox = new Map<string, Delivery[]>();
  inhibitions = new Map<string, Inhibition[]>();
  events: SimEvent[] = [];
  ledger: Ledger = emptyLedger();
  controlOverrides = new Map<string, Record<string, number>>();

  constructor(model: CompiledModel, iterations: number) {
    this.m = model;
    this.doc = model.doc;
    this.N = iterations;
    const dims = Object.values(this.doc.dimensions);
    this.extDims = dims.filter((d) => d.aggregation === 'extensive').map((d) => d.id);
    this.intDims = dims.filter((d) => d.aggregation === 'intensive').map((d) => d.id);
    const extSet = new Set(this.extDims);
    if (!extSet.has(PRIMARY)) extSet.add(PRIMARY);
    this.isExt = (d) => extSet.has(d);
    this.wmax = Math.max(1e-9, Math.abs(this.doc.project.settings.weightedScale.max));
  }

  hypotheses(): string[] {
    const out: string[] = [];
    for (const id of this.m.simNodeIds) {
      const n = this.m.nodes.get(id)!;
      if (n.metadata.confidence === 'hypothesis') out.push(`«${n.title}» está marcado como hipótesis`);
      for (const [dimId, dv] of Object.entries(n.dimensionValues)) {
        if (dv.confidence === 'hypothesis') out.push(`«${n.title}»: ${this.dimName(dimId)} es una hipótesis`);
        if (dv.range) out.push(`«${n.title}»: ${this.dimName(dimId)} tiene rango ${dv.range.low}–${dv.range.high}`);
      }
      for (const b of this.m.behaviorsByNode.get(id) ?? []) {
        for (const k of Object.keys(b.ranges)) out.push(`«${n.title}»: parámetro ${k} con rango de incertidumbre`);
      }
    }
    return out;
  }

  dimName(id: string): string {
    return this.doc.dimensions[id]?.name ?? id;
  }

  title(id: string): string {
    return this.m.nodes.get(id)?.title ?? id;
  }

  warn(key: string, msg: string) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.warnings.push(msg);
  }

  approx(elementId: string, message: string) {
    if (message && !this.approximations.has(`${elementId}:${message}`)) this.approximations.set(`${elementId}:${message}`, { elementId, message });
  }

  ev(kind: EventKind, phase: number, message: string, extra: Partial<SimEvent> = {}) {
    if (this.events.length >= MAX_EVENTS_PER_ITERATION) return;
    this.events.push({ iteration: this.t, phase, kind, message, mechanism: extra.mechanism ?? kind, ...extra });
  }

  /* ---------------- libro de conservación ---------------- */
  book(key: 'generated' | 'consumed' | 'lost' | 'accumulated' | 'released' | 'terminal' | 'deduplicated', dim: string, amount: number, st?: NodeIterState) {
    if (Math.abs(amount) < EPS || !this.isExt(dim)) return;
    addTo(this.ledger[key], dim, amount);
    if (st && key !== 'terminal') addTo(st[key], dim, amount);
  }

  bookPacket(key: 'generated' | 'consumed' | 'lost' | 'accumulated' | 'released' | 'terminal' | 'deduplicated', p: Packet, st?: NodeIterState) {
    for (const [d, v] of Object.entries(p.ext)) this.book(key, d, v, st);
  }

  clampInt(p: Packet) {
    for (const [d, v] of Object.entries(p.int)) {
      const def = this.doc.dimensions[d];
      if (def) p.int[d] = Math.max(def.range.min, Math.min(def.range.max, v));
    }
    for (const [d, v] of Object.entries(p.ext)) {
      if (v > MAX_VALUE) {
        this.warn(`overflow:${d}`, `La dimensión ${this.dimName(d)} superó ${MAX_VALUE.toExponential()} (crecimiento explosivo); se limita para evitar desbordamiento.`);
        p.ext[d] = MAX_VALUE;
      }
      if (v < 0) p.ext[d] = 0;
    }
  }

  /* ---------------- lectura de métricas (condiciones) ---------------- */
  read: MetricReader = (nodeId, metric, dimensionId) => {
    const id = this.m.resolve(nodeId);
    const s = this.cur[id] ?? this.prev[id];
    if (!s) return 0;
    switch (metric) {
      case 'in': return qty(s.in);
      case 'out': return qty(s.out);
      case 'stock': return s.stock[PRIMARY] ?? 0;
      case 'influence': return s.influence;
      case 'lost': return s.lost[PRIMARY] ?? 0;
      case 'result': return s.terminal.ext[PRIMARY] ?? 0;
      case 'active': return s.active ? 1 : 0;
      case 'dim': {
        const d = dimensionId ?? PRIMARY;
        return this.isExt(d) ? (s.out.ext[d] ?? s.terminal.ext[d] ?? 0) : (s.out.int[d] ?? s.terminal.int[d] ?? s.in.int[d] ?? 0);
      }
    }
  };

  cond(id: string | null | undefined): boolean {
    if (!id) return true;
    const c = this.m.conditions[id];
    if (!c) return true;
    return evaluateCondition(c, { iteration: this.t, read: this.read }, this.condMem);
  }

  condsAll(ids: string[]): boolean {
    let ok = true;
    for (const id of ids) if (!this.cond(id)) ok = false; // evaluar todas para mantener la memoria
    return ok;
  }

  /* ---------------- bucle principal ---------------- */
  run(): IterationResult[] {
    // stocks iniciales
    for (const id of this.m.simNodeIds) {
      for (const b of this.m.behaviorsByNode.get(id) ?? []) {
        if (b.behaviorType === 'accumulator') {
          const init = num(b.parameters.initialStock);
          if (init > 0) {
            const p = emptyPacket();
            p.ext[PRIMARY] = init;
            p.origins[`stock:${id}`] = init;
            this.stocks.set(id, mergePackets([this.stocks.get(id) ?? emptyPacket(), p]));
          }
        }
      }
    }
    const results: IterationResult[] = [];
    for (let t = 1; t <= this.N; t++) results.push(this.iterate(t));
    return results;
  }

  totalExt(packets: Iterable<Packet>): DimMap {
    const out: DimMap = {};
    for (const p of packets) for (const [d, v] of Object.entries(p.ext)) if (this.isExt(d)) addTo(out, d, v);
    return out;
  }

  pendingDeliveries(fromT: number): Packet[] {
    const out: Packet[] = [];
    for (const [k, list] of this.scheduled) if (k >= fromT) for (const d of list) out.push(d.packet);
    return out;
  }

  iterate(t: number): IterationResult {
    this.t = t;
    this.cur = {};
    this.edgeStates = {};
    this.inbox = new Map();
    this.inhibitions = new Map();
    this.events = [];
    this.ledger = emptyLedger();
    this.controlOverrides = new Map();

    const stockStart = this.totalExt([...this.stocks.values(), ...this.queues.values()]);
    this.ledger.inFlightStart = this.totalExt(this.pendingDeliveries(t));

    for (const d of this.scheduled.get(t) ?? []) this.deliver(d);
    this.scheduled.delete(t);
    for (const inh of this.scheduledInhibitions.get(t) ?? []) {
      if (!this.inhibitions.has(inh.to)) this.inhibitions.set(inh.to, []);
      this.inhibitions.get(inh.to)!.push(inh);
    }
    this.scheduledInhibitions.delete(t);

    for (const id of this.m.order) this.processNode(id);

    // estado siguiente y conservación (fase 11–12)
    for (const id of this.m.simNodeIds) {
      const st = this.cur[id];
      if (!st) continue;
      st.stock = { ...(this.stocks.get(id)?.ext ?? {}) };
      st.queue = { ...(this.queues.get(id)?.ext ?? {}) };
    }
    const stockEnd = this.totalExt([...this.stocks.values(), ...this.queues.values()]);
    this.ledger.inFlightEnd = this.totalExt(this.pendingDeliveries(t + 1));
    const L = this.ledger;
    const dims = new Set([...Object.keys(stockStart), ...Object.keys(stockEnd), ...Object.keys(L.generated), ...Object.keys(L.inFlightStart), ...Object.keys(L.inFlightEnd), ...Object.keys(L.terminal), ...Object.keys(L.lost), ...Object.keys(L.consumed)]);
    for (const d of dims) {
      const inSide = (stockStart[d] ?? 0) + (L.inFlightStart[d] ?? 0) + (L.generated[d] ?? 0);
      const outSide = (stockEnd[d] ?? 0) + (L.inFlightEnd[d] ?? 0) + (L.consumed[d] ?? 0) + (L.lost[d] ?? 0) + (L.terminal[d] ?? 0) + (L.deduplicated[d] ?? 0);
      const diff = inSide - outSide;
      const tol = 1e-6 * Math.max(1, inSide);
      L.unexplained[d] = Math.abs(diff) < tol ? 0 : diff;
      if (L.unexplained[d] !== 0) this.warn(`unexplained:${d}`, `Conservación: ${diff.toFixed(6)} ${this.dimName(d)} sin explicar en la ronda ${t}`);
    }

    const outs = this.m.outputIds.length ? this.m.outputIds : this.m.simNodeIds;
    const result = mergePackets(outs.map((id) => this.cur[id]?.terminal ?? emptyPacket()));
    this.prev = this.cur;
    return { iteration: t, nodes: this.cur, edges: this.edgeStates, events: this.events, ledger: this.ledger, result };
  }

  deliver(d: Delivery) {
    if (!this.inbox.has(d.to)) this.inbox.set(d.to, []);
    this.inbox.get(d.to)!.push(d);
  }

  schedule(d: Delivery, at: number) {
    if (at <= this.t) { this.deliver(d); return; }
    if (at > this.N) {
      // fuera del horizonte: queda en tránsito (se contabiliza como tal)
    }
    if (!this.scheduled.has(at)) this.scheduled.set(at, []);
    this.scheduled.get(at)!.push(d);
  }

  /* ---------------- parámetros efectivos ---------------- */
  params(b: Behavior, active: boolean): Behavior['parameters'] | null {
    let p: Behavior['parameters'] | null = active ? b.parameters : b.elseMode === 'alternate' ? { ...b.parameters, ...b.elseParameters } : null;
    const ctl = this.controlOverrides.get(b.id);
    if (p && ctl) p = { ...p, ...ctl };
    return p;
  }

  /* ---------------- procesamiento de un nodo ---------------- */
  processNode(id: string) {
    const node = this.m.nodes.get(id)!;
    const st = newNodeState(id);
    this.cur[id] = st;
    const behaviors = this.m.behaviorsByNode.get(id) ?? [];

    // 1. Recoger entradas + puertos
    const arrivals = this.applyPorts(node, this.inbox.get(id) ?? [], st);
    // 8. Convergencia
    let flow = this.converge(node, arrivals, st);
    // Inhibiciones (retroalimentación equilibradora)
    const inh = (this.inhibitions.get(id) ?? []).reduce((s, x) => s + x.amount, 0);
    if (inh > EPS && qty(flow) > EPS) {
      const q = qty(flow);
      const removed = Math.min(q, inh);
      const [keep, gone] = splitPacket(flow, (q - removed) / q);
      flow = keep;
      this.bookPacket('lost', gone, st);
      st.flags.push('loss');
      this.ev('inhibit', 10, `«${node.title}» recibe una inhibición de ${removed.toFixed(2)} (retroalimentación equilibradora)`, { nodeId: id, amount: removed, dimension: PRIMARY, mechanism: 'retroalimentación negativa' });
    }
    st.in = clonePacket(flow);

    // 2. Condiciones del nodo
    st.active = this.cond(node.activationConditionId);
    if (node.activationConditionId) {
      this.ev('condition', 2, `Condición de «${node.title}»: ${st.active ? 'cumplida' : 'no cumplida'}`, { nodeId: id, mechanism: 'condición de activación' });
    }

    // 3. Activación de comportamientos (+ controladores, compensación)
    const active = behaviors.map((b) => ({ b, p: st.active ? this.params(b, this.condsAll(b.conditions)) : null }));
    const compensation = this.computeCompensation(node, st);
    this.computeInfluence(node, st, compensation);
    for (const { b, p } of active) if (p && b.behaviorType === 'controller') this.applyController(node, b, p);

    const rejected: Packet[] = [];
    const overflow: Packet[] = [];
    const divert: Packet[] = [];
    const blocked: Packet[] = [];

    if (!st.active && node.inactiveMode === 'block') {
      if (qty(flow) > EPS) {
        blocked.push(flow);
        this.ev('block', 2, `«${node.title}» está inactivo y bloquea ${qty(flow).toFixed(2)} u.`, { nodeId: id, amount: qty(flow), mechanism: 'nodo inactivo (bloqueo)' });
      }
      flow = emptyPacket();
      st.blocked = true;
      st.flags.push('blocked');
    }

    if (st.active) {
      // Generadores
      for (const { b, p } of active) if (p && b.behaviorType === 'generator') flow = this.generate(node, b, p, flow, st);
      // 4. Filtros
      flow = this.applyFilters(node, active, flow, rejected, st, compensation);
      // 5. Transformaciones
      flow = this.applyTransforms(node, active, flow, st, compensation);
    }
    // Influencias causales sobre el flujo (también si está inactivo en paso libre)
    flow = this.applyModulations(node, flow, st);

    if (st.active) {
      // 7. Capacidades
      flow = this.applyCapacity(node, active, flow, overflow, st);
      // 9. Acumuladores / liberadores
      flow = this.applyStore(node, active, flow, st);
      // Desviador
      for (const { b, p } of active) {
        if (!p || b.behaviorType !== 'diverter') continue;
        const r = Math.max(0, Math.min(1, num(p.ratio)));
        if (qty(flow) > EPS && r > 0) {
          const [d, keep] = splitPacket(flow, r);
          divert.push(d);
          flow = keep;
          this.ev('divert', 6, `«${node.title}» desvía ${qty(d).toFixed(2)} u. (${Math.round(r * 100)}%)`, { nodeId: id, amount: qty(d), mechanism: 'desviador' });
        }
      }
      // Detector
      for (const { b, p } of active) {
        if (!p || b.behaviorType !== 'detector') continue;
        const metric = str(p.metric, 'in');
        const v = metric === 'out' ? qty(flow) : metric === 'dim' ? (flow.int[str(p.dimension)] ?? flow.ext[str(p.dimension)] ?? 0) : qty(st.in);
        st.detected = v;
        const th = num(p.threshold);
        this.ev('detect', 12, `Detector en «${node.title}»: ${v.toFixed(2)}${th > 0 && v >= th ? ` (supera umbral ${th})` : ''}`, { nodeId: id, amount: v, mechanism: 'detector' });
      }
    } else if (node.inactiveMode !== 'block' && qty(flow) > EPS) {
      this.ev('condition', 2, `«${node.title}» inactivo: el flujo pasa sin transformarse`, { nodeId: id, mechanism: 'nodo inactivo (paso libre)' });
    }

    // 6. Bifurcación + 7b conexiones + 10 retroalimentación
    this.clampInt(flow);
    st.out = clonePacket(flow);
    this.route(node, flow, rejected, overflow, divert, blocked, st);
    this.replicate(node, flow, st);

    // flags finales
    if (st.active) st.flags.push('active'); else st.flags.push('inactive');
    if (qty(st.in) > EPS) st.flags.push('receiving');
    if (qty(st.out) > EPS && !st.flags.includes('terminal')) st.flags.push('emitting');
    if ((st.lost[PRIMARY] ?? 0) > EPS) st.flags.push('loss');
    if (st.saturated) st.flags.push('saturated');
    if (st.transformed) st.flags.push('transforming');
    if ((st.accumulated[PRIMARY] ?? 0) > EPS || (this.stocks.get(id)?.ext[PRIMARY] ?? 0) > EPS) st.flags.push('accumulating');
    if (st.compensation > EPS) st.flags.push('compensated');
    if ((st.generated[PRIMARY] ?? 0) > EPS) st.flags.push('generating');
    st.flags = [...new Set(st.flags)];
  }

  applyPorts(node: MapNode, arrivals: Delivery[], st: NodeIterState): Delivery[] {
    if (arrivals.length === 0) return arrivals;
    const byPort = new Map<string, Delivery[]>();
    for (const d of arrivals) {
      const key = d.portId && this.m.ports[d.portId] ? d.portId : '__default';
      if (!byPort.has(key)) byPort.set(key, []);
      byPort.get(key)!.push(d);
    }
    const out: Delivery[] = [];
    for (const [portId, list] of byPort) {
      const port = this.m.ports[portId];
      let ds = list;
      if (port?.supportedDimensions) {
        const allowed = new Set([PRIMARY, ...port.supportedDimensions]);
        ds = ds.map((d) => {
          const p = clonePacket(d.packet);
          for (const dim of Object.keys(p.ext)) {
            if (!allowed.has(dim)) {
              this.book('lost', dim, p.ext[dim], st);
              this.ev('loss', 1, `Puerto «${port.name}» de «${node.title}» no admite ${this.dimName(dim)}`, { nodeId: node.id, dimension: dim, amount: p.ext[dim], mechanism: 'dimensión incompatible' });
              delete p.ext[dim];
            }
          }
          for (const dim of Object.keys(p.int)) if (!allowed.has(dim)) delete p.int[dim];
          return { ...d, packet: p };
        });
      }
      if (port?.capacity != null) {
        const total = ds.reduce((s, d) => s + qty(d.packet), 0);
        if (total > port.capacity + EPS) {
          const f = port.capacity / total;
          ds = ds.map((d) => {
            const [keep, excess] = splitPacket(d.packet, f);
            this.bookPacket('lost', excess, st);
            return { ...d, packet: keep };
          });
          st.saturated = true;
          this.ev('saturate', 7, `Puerto «${port.name}» de «${node.title}» saturado: entran ${total.toFixed(2)}, capacidad ${port.capacity}`, { nodeId: node.id, amount: total - port.capacity, mechanism: 'capacidad del puerto' });
        }
      }
      out.push(...ds);
    }
    return out;
  }

  converge(node: MapNode, arrivals: Delivery[], st: NodeIterState): Packet {
    if (arrivals.length === 0) return emptyPacket();
    if (arrivals.length === 1) return clonePacket(arrivals[0].packet);
    const rule = node.convergence.rule;
    const all = mergePackets(arrivals.map((a) => a.packet));
    const total = qty(all);
    const discard = (keepFraction: number, key: 'lost' | 'deduplicated', mechanism: string, base: Packet = all) => {
      const [keep, gone] = splitPacket(base, keepFraction);
      this.bookPacket(key, gone, st);
      if (qty(gone) > EPS) this.ev(key === 'deduplicated' ? 'dedupe' : 'merge', 8, `«${node.title}»: ${mechanism} descarta ${qty(gone).toFixed(2)} u.`, { nodeId: node.id, amount: qty(gone), mechanism });
      return keep;
    };
    switch (rule) {
      case 'sum': {
        this.ev('merge', 8, `«${node.title}» fusiona ${arrivals.length} flujos (suma = ${total.toFixed(2)})`, { nodeId: node.id, amount: total, mechanism: 'convergencia: suma' });
        return all;
      }
      case 'weighted': {
        const parts = arrivals.map((a) => scalePacket(a.packet, Math.max(0, Math.min(1, a.convergenceWeight))));
        const merged = mergePackets(parts);
        // intensivas ponderadas por peso de convergencia
        const wsum = arrivals.reduce((s, a) => s + a.convergenceWeight, 0) || 1;
        for (const d of Object.keys(merged.int)) {
          merged.int[d] = arrivals.reduce((s, a) => s + (a.packet.int[d] ?? merged.int[d]) * a.convergenceWeight, 0) / wsum;
        }
        const lost = total - qty(merged);
        if (lost > EPS) {
          for (const d of Object.keys(all.ext)) this.book('lost', d, (all.ext[d] ?? 0) - (merged.ext[d] ?? 0), st);
          this.ev('merge', 8, `«${node.title}»: combinación ponderada descarta ${lost.toFixed(2)} u.`, { nodeId: node.id, amount: lost, mechanism: 'convergencia ponderada' });
        }
        return merged;
      }
      case 'priority':
      case 'max':
      case 'min': {
        const sorted = [...arrivals].sort((a, b) => rule === 'priority' ? a.priority - b.priority || b.weight - a.weight
          : rule === 'max' ? qty(b.packet) - qty(a.packet) : qty(a.packet) - qty(b.packet));
        const pick = rule === 'priority' ? (sorted.find((a) => qty(a.packet) > EPS) ?? sorted[0]) : sorted[0];
        const kept = clonePacket(pick.packet);
        const others = mergePackets(arrivals.filter((a) => a !== pick).map((a) => a.packet));
        this.bookPacket('deduplicated', others, st);
        this.ev('merge', 8, `«${node.title}»: convergencia por ${rule === 'priority' ? 'prioridad' : rule === 'max' ? 'máximo' : 'mínimo'} conserva ${qty(kept).toFixed(2)} u. y descarta ${qty(others).toFixed(2)}`, { nodeId: node.id, amount: qty(others), mechanism: `convergencia: ${rule}` });
        return kept;
      }
      case 'dedupe': {
        const maxQ = Math.max(...arrivals.map((a) => qty(a.packet)));
        const target = maxQ + (1 - node.convergence.overlap) * (total - maxQ);
        return discard(total > EPS ? target / total : 1, 'deduplicated', `deduplicación (solapamiento ${Math.round(node.convergence.overlap * 100)}%)`);
      }
      case 'custom': {
        const vars: Record<string, number> = { sum: total, count: arrivals.length, max: Math.max(...arrivals.map((a) => qty(a.packet))), min: Math.min(...arrivals.map((a) => qty(a.packet))), avg: total / arrivals.length };
        arrivals.forEach((a, i) => { vars[`in${i + 1}`] = qty(a.packet); });
        let target = total;
        try {
          target = Math.max(0, evaluateExpression(node.convergence.formula || 'sum', vars));
        } catch (e) {
          this.warn(`formula:${node.id}`, `Fórmula de convergencia no válida en «${node.title}»: ${(e as Error).message}. Se usa la suma.`);
        }
        if (target <= total + EPS) return discard(total > EPS ? target / total : 1, 'lost', 'fórmula de convergencia');
        const gain = target - total;
        const out = scalePacket(all, target / total);
        for (const d of Object.keys(all.ext)) this.book('generated', d, (out.ext[d] ?? 0) - (all.ext[d] ?? 0), st);
        // el aumento se atribuye al mecanismo
        out.origins = { ...all.origins, [`formula:${node.id}`]: gain };
        this.ev('merge', 8, `«${node.title}»: la fórmula genera ${gain.toFixed(2)} u. adicionales`, { nodeId: node.id, amount: gain, mechanism: 'fórmula de convergencia' });
        return out;
      }
    }
  }

  /** Fracción compensada (0..1) de las dificultades del nodo. */
  computeCompensation(node: MapNode, st: NodeIterState): number {
    const edges = this.m.compensateIn.get(node.id) ?? [];
    if (edges.length === 0) return 0;
    const base = scaleValueToWeighted(node.weight.influence, this.doc.project.settings).value;
    const magnitude = base < 0 ? Math.abs(base) : this.wmax;
    const fractions: number[] = [];
    for (const se of edges) {
      const inf = se.edge.behavior.influence;
      const es = this.edgeState(se.id);
      es.active = false;
      const src = this.cur[se.from] ?? this.prev[se.from];
      const srcActive = src ? src.active : true;
      if (!srcActive) continue;
      if (inf.compensationType === 'temporal' && (this.t < inf.fromIteration || (inf.toIteration != null && this.t > inf.toIteration))) continue;
      if ((inf.compensationType === 'conditional' || se.edge.conditions.length) && !this.condsAll(se.edge.conditions)) continue;
      const comp = (this.m.behaviorsByNode.get(se.from) ?? []).find((b) => b.behaviorType === 'compensator');
      const eff = comp ? num(comp.parameters.efficiency, 1) : 1;
      let f = inf.compensationType === 'total' ? 1
        : inf.compensationUnit === 'percent' ? Math.max(0, inf.amount) / 100 : Math.max(0, inf.amount) / magnitude;
      f *= eff;
      fractions.push(f);
      es.active = true;
      es.compensationApplied = f;
    }
    let c = 0;
    switch (node.mitigationCombination) {
      case 'max': c = Math.max(0, ...fractions); break;
      case 'diminishing': c = 1 - fractions.reduce((s, f) => s * (1 - Math.min(1, f)), 1); break;
      default: c = fractions.reduce((s, f) => s + f, 0);
    }
    c = Math.max(0, Math.min(1, c));
    if (c > EPS) {
      st.compensation = c;
      this.ev('compensate', 3, `«${node.title}»: compensado un ${Math.round(c * 100)}% de su efecto negativo (${fractions.length} medida${fractions.length === 1 ? '' : 's'}, regla ${node.mitigationCombination === 'additive' ? 'aditiva' : node.mitigationCombination === 'max' ? 'máximo' : 'rendimientos decrecientes'})`, { nodeId: node.id, amount: c, mechanism: 'compensación' });
    }
    return c;
  }

  computeInfluence(node: MapNode, st: NodeIterState, compensation: number) {
    const interp = scaleValueToWeighted(node.weight.influence, this.doc.project.settings);
    if (interp.approximate) this.approx(node.id, `«${node.title}»: ${interp.note}`);
    let base = interp.value;
    if (node.influenceSource !== 'static') {
      const ref = Math.max(EPS, node.influenceReference);
      const metric = node.influenceSource === 'stock' ? (this.stocks.get(node.id)?.ext[PRIMARY] ?? 0) : qty(st.in);
      const sign = base < 0 ? -1 : 1;
      base = sign * this.wmax * Math.min(1, metric / ref);
    }
    // influencias causales entrantes que modifican la influencia (destino sin flujo o dimensión «influencia»)
    let added = 0;
    const hasFlowEdges = (this.m.transferOut.get(node.id)?.length ?? 0) > 0 || qty(st.in) > EPS;
    for (const se of this.m.causalIn.get(node.id) ?? []) {
      const inf = se.edge.behavior.influence;
      if (hasFlowEdges && inf.targetDimension !== '__influence') continue;
      const src = this.cur[se.from] ?? this.prev[se.from];
      if (!src || !src.active) continue;
      if (se.edge.conditions.length && !this.condsAll(se.edge.conditions)) { this.edgeState(se.id).blocked = true; continue; }
      const sign = se.edge.behavior.polarity === 'negative' ? -1 : 1;
      const delta = sign * inf.sensitivity * src.influence * se.edge.behavior.intensity;
      added += delta;
      const es = this.edgeState(se.id);
      es.active = Math.abs(delta) > EPS;
      es.influenceFactor = delta;
    }
    st.baseInfluence = base + added;
    let net = base + added;
    if (net < 0 && compensation > 0) net = net * (1 - compensation);
    st.influence = st.active ? net : 0;
  }

  applyController(node: MapNode, _b: Behavior, p: Behavior['parameters']) {
    const targetId = str(p.targetBehaviorId);
    const target = this.doc.behaviors[targetId];
    if (!target) return;
    const key = str(p.parameter, 'capacity');
    const base = num(this.controlOverrides.get(targetId)?.[key] ?? target.parameters[key], 0);
    const v = num(p.value, 1);
    const mode = str(p.mode, 'scale');
    const next = mode === 'set' ? v : mode === 'add' ? base + v : base * v;
    this.controlOverrides.set(targetId, { ...(this.controlOverrides.get(targetId) ?? {}), [key]: next });
    this.ev('control', 3, `«${node.title}» ajusta ${key} de «${this.title(target.ownerId)}»: ${base} → ${next}`, { nodeId: node.id, mechanism: 'controlador' });
  }

  generate(node: MapNode, b: Behavior, p: Behavior['parameters'], flow: Packet, st: NodeIterState): Packet {
    const start = Math.max(1, num(p.startIteration, 1));
    const end = num(p.endIteration, 0);
    if (this.t < start || (end > 0 && this.t > end)) return flow;
    if (str(p.mode) === 'once') {
      if (this.pulseFired.has(b.id)) return flow;
      this.pulseFired.add(b.id);
    }
    const settings = this.doc.project.settings;
    const qv = node.dimensionValues[PRIMARY];
    let amount = num(p.amount, 0);
    if (qv) {
      const i = dimensionValueToNumber(qv, this.doc.dimensions[PRIMARY], settings);
      if (i.approximate) this.approx(node.id, `«${node.title}» cantidad: ${i.note}`);
      amount = i.value;
    }
    const growth = num(p.growth, 0);
    if (growth) amount *= Math.pow(1 + growth, this.t - start);
    amount = Math.max(0, amount);
    const g = emptyPacket();
    g.ext[PRIMARY] = amount;
    g.origins[node.id] = amount;
    for (const [dimId, dv] of Object.entries(node.dimensionValues)) {
      if (dimId === PRIMARY) continue;
      const def = this.doc.dimensions[dimId];
      if (!def) continue;
      const i = dimensionValueToNumber(dv, def, settings);
      if (i.approximate) this.approx(node.id, `«${node.title}» ${def.name}: ${i.note}`);
      if (def.aggregation === 'extensive') g.ext[dimId] = Math.max(0, i.value);
      else g.int[dimId] = i.value;
    }
    for (const d of this.intDims) if (g.int[d] === undefined) g.int[d] = this.doc.dimensions[d].defaultValue;
    this.bookPacket('generated', g, st);
    this.ev('generate', 3, `«${node.title}» genera ${amount.toFixed(2)} u.`, { nodeId: node.id, amount, dimension: PRIMARY, mechanism: 'generador' });
    return mergePackets([flow, g]);
  }

  applyFilters(node: MapNode, active: { b: Behavior; p: Behavior['parameters'] | null }[], flow: Packet, rejected: Packet[], _st: NodeIterState, compensation: number): Packet {
    const filters = active.filter((a) => a.p && a.b.behaviorType === 'filter');
    if (!filters.length) return flow;
    const ratioFilters = filters.filter((f) => str(f.p!.mode, 'ratio') === 'ratio');
    if (ratioFilters.length && qty(flow) > EPS) {
      let pass = combine(ratioFilters.map((f) => Math.max(0, Math.min(1, num(f.p!.passRatio, 1)))), ratioFilters[0].b.combinationRule);
      pass = Math.max(0, Math.min(1, pass));
      const original = pass;
      if (compensation > 0) pass = pass + (1 - pass) * compensation;
      const [keep, rej] = splitPacket(flow, pass);
      if (qty(rej) > EPS) rejected.push(rej);
      this.ev('filter', 4, `«${node.title}» filtra: pasan ${qty(keep).toFixed(2)} de ${qty(flow).toFixed(2)} (${Math.round(pass * 100)}%${compensation > 0 ? `, ${Math.round(original * 100)}% sin compensar` : ''})`, { nodeId: node.id, amount: qty(rej), mechanism: 'filtro' });
      flow = keep;
    }
    for (const f of filters) {
      if (str(f.p!.mode) !== 'threshold' || qty(flow) <= EPS) continue;
      const dim = str(f.p!.thresholdDimension, 'quality');
      const v = this.isExt(dim) ? (flow.ext[dim] ?? 0) : (flow.int[dim] ?? this.doc.dimensions[dim]?.defaultValue ?? 0);
      const th = num(f.p!.threshold);
      const op = str(f.p!.operator, '>=');
      const ok = op === '>' ? v > th : op === '<=' ? v <= th : op === '<' ? v < th : v >= th;
      if (!ok) {
        rejected.push(flow);
        this.ev('filter', 4, `«${node.title}»: ${this.dimName(dim)} = ${v.toFixed(2)} no cumple ${op} ${th}; se rechaza el flujo`, { nodeId: node.id, amount: qty(flow), mechanism: 'filtro por umbral' });
        flow = emptyPacket();
      }
    }
    return flow;
  }

  /** Aplica un factor a una dimensión registrando ganancia/pérdida. */
  scaleDim(flow: Packet, dim: string, f: number, st: NodeIterState, mechanism: string, lossKey: 'lost' | 'consumed' = 'lost', originKey?: string): Packet {
    if (this.isExt(dim)) {
      const before = flow.ext[dim] ?? 0;
      if (before <= EPS || Math.abs(f - 1) < EPS) return flow;
      const after = Math.max(0, before * f);
      const delta = after - before;
      if (dim === PRIMARY) {
        if (delta < 0) {
          const scaled = scalePacket(flow, f);
          scaled.ext = { ...flow.ext, [PRIMARY]: after };
          flow = { ...scaled };
        } else {
          flow = { ...flow, ext: { ...flow.ext, [PRIMARY]: after }, origins: { ...flow.origins } };
          addTo(flow.origins, originKey ?? `gen:${st.nodeId}`, delta);
        }
      } else {
        flow = { ...flow, ext: { ...flow.ext, [dim]: after } };
      }
      if (delta > 0) this.book('generated', dim, delta, st);
      else this.book(lossKey, dim, -delta, st);
      this.ev(delta > 0 ? 'multiply' : lossKey === 'consumed' ? 'consume' : 'reduce', 5, `«${this.title(st.nodeId)}»: ${mechanism} ${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${this.dimName(dim)}`, { nodeId: st.nodeId, dimension: dim, amount: delta, mechanism });
      return flow;
    }
    const before = flow.int[dim] ?? this.doc.dimensions[dim]?.defaultValue ?? 0;
    const after = before * f;
    if (Math.abs(after - before) > EPS) {
      flow = { ...flow, int: { ...flow.int, [dim]: after } };
      st.transformed = true;
      this.ev('transform', 5, `«${this.title(st.nodeId)}»: ${mechanism} ${this.dimName(dim)} ${before.toFixed(2)} → ${after.toFixed(2)}`, { nodeId: st.nodeId, dimension: dim, amount: after - before, mechanism });
    }
    return flow;
  }

  applyTransforms(node: MapNode, active: { b: Behavior; p: Behavior['parameters'] | null }[], flow: Packet, st: NodeIterState, compensation: number): Packet {
    if (qty(flow) <= EPS && Object.keys(flow.int).length === 0) return flow;
    const dimsOf = (b: Behavior, fallback: string[]) => (b.affectedDimensions.length ? b.affectedDimensions : fallback);

    for (const { b, p } of active) {
      if (!p || b.behaviorType !== 'transformer') continue;
      const mode = str(p.mode, 'scale');
      if (mode === 'convert') {
        const from = str(p.from, PRIMARY);
        const to = str(p.to, 'load');
        const ratio = Math.max(0, Math.min(1, num(p.ratio, 0.5)));
        const factor = num(p.factor, 1);
        if (this.isExt(from) && this.isExt(to)) {
          const moved = (flow.ext[from] ?? 0) * ratio;
          if (moved > EPS) {
            const origins = from === PRIMARY ? scalePacket(flow, 1 - ratio).origins : { ...flow.origins };
            flow = { ext: { ...flow.ext }, int: { ...flow.int }, origins };
            flow.ext[from] = clean((flow.ext[from] ?? 0) - moved);
            flow.ext[to] = (flow.ext[to] ?? 0) + moved * factor;
            if (to === PRIMARY) addTo(flow.origins, `conv:${node.id}`, moved * factor);
            this.book('consumed', from, moved, st);
            this.book('generated', to, moved * factor, st);
            st.transformed = true;
            this.ev('transform', 5, `«${node.title}» convierte ${moved.toFixed(2)} ${this.dimName(from)} en ${(moved * factor).toFixed(2)} ${this.dimName(to)}`, { nodeId: node.id, amount: moved, mechanism: 'transformador (conversión)' });
          }
        } else if (!this.isExt(from) && !this.isExt(to)) {
          const v = flow.int[from] ?? 0;
          flow = { ...flow, int: { ...flow.int, [to]: (flow.int[to] ?? 0) + v * ratio * factor, [from]: v * (1 - ratio) } };
          st.transformed = true;
          this.ev('transform', 5, `«${node.title}» transfiere ${this.dimName(from)} hacia ${this.dimName(to)}`, { nodeId: node.id, mechanism: 'transformador (conversión)' });
        } else {
          this.warn(`conv:${b.id}`, `«${node.title}»: no se puede convertir una dimensión extensiva en intensiva (${from} → ${to}).`);
        }
        continue;
      }
      for (const dim of dimsOf(b, ['quality'])) {
        if (mode === 'scale') flow = this.scaleDim(flow, dim, num(p.factor, 1), st, 'transformador');
        else if (mode === 'shift' || mode === 'set') {
          const v = num(p.value);
          if (this.isExt(dim)) {
            const before = flow.ext[dim] ?? 0;
            const after = Math.max(0, mode === 'set' ? v : before + v);
            if (before > EPS) flow = this.scaleDim(flow, dim, after / before, st, 'transformador');
          } else {
            const before = flow.int[dim] ?? this.doc.dimensions[dim]?.defaultValue ?? 0;
            const after = mode === 'set' ? v : before + v;
            flow = { ...flow, int: { ...flow.int, [dim]: after } };
            st.transformed = true;
            this.ev('transform', 5, `«${node.title}»: ${this.dimName(dim)} ${before.toFixed(2)} → ${after.toFixed(2)}`, { nodeId: node.id, dimension: dim, mechanism: 'transformador' });
          }
        }
      }
    }

    // Multiplicadores y reductores (agrupados por dimensión con su regla de combinación)
    const groups: { type: 'multiplier' | 'reducer' | 'accelerator'; mech: string; fallback: string[] }[] = [
      { type: 'multiplier', mech: 'multiplicador', fallback: [PRIMARY] },
      { type: 'reducer', mech: 'reductor', fallback: [PRIMARY] },
      { type: 'accelerator', mech: 'acelerador', fallback: ['speed'] },
    ];
    for (const g of groups) {
      const list = active.filter((a) => a.p && a.b.behaviorType === g.type);
      if (!list.length) continue;
      const perDim = new Map<string, number[]>();
      const amounts = new Map<string, number>();
      for (const { b, p } of list) {
        for (const dim of dimsOf(b, g.fallback)) {
          if (g.type === 'reducer' && str(p!.mode, 'ratio') === 'amount') {
            amounts.set(dim, (amounts.get(dim) ?? 0) + Math.max(0, num(p!.amount)) * (1 - compensation));
            continue;
          }
          let f = g.type === 'reducer' ? 1 - Math.max(0, Math.min(1, num(p!.ratio))) * (1 - compensation) : Math.max(0, num(p!.factor, 1));
          if (g.type === 'accelerator' && compensation > 0 && f < 1) f = f + (1 - f) * compensation;
          if (!perDim.has(dim)) perDim.set(dim, []);
          perDim.get(dim)!.push(f);
        }
      }
      const rule = list[0].b.combinationRule;
      for (const [dim, fs] of perDim) flow = this.scaleDim(flow, dim, combine(fs, rule), st, g.mech, 'lost', `mult:${node.id}`);
      for (const [dim, amt] of amounts) {
        const before = this.isExt(dim) ? flow.ext[dim] ?? 0 : flow.int[dim] ?? 0;
        if (before > EPS) flow = this.scaleDim(flow, dim, Math.max(0, before - amt) / before, st, g.mech);
      }
    }

    // Consumidores
    for (const { b, p } of active) {
      if (!p || b.behaviorType !== 'consumer') continue;
      for (const dim of dimsOf(b, [PRIMARY])) {
        const before = flow.ext[dim] ?? 0;
        if (before <= EPS) continue;
        const take = str(p.mode, 'ratio') === 'amount' ? Math.min(before, Math.max(0, num(p.amount))) : before * Math.max(0, Math.min(1, num(p.ratio)));
        flow = this.scaleDim(flow, dim, (before - take * (1 - compensation)) / before, st, 'consumidor', 'consumed');
      }
    }
    return flow;
  }

  applyModulations(node: MapNode, flow: Packet, st: NodeIterState): Packet {
    const edges = this.m.causalIn.get(node.id) ?? [];
    if (!edges.length) return flow;
    const hasFlow = qty(flow) > EPS;
    if (!hasFlow) return flow;
    const factors = new Map<string, { f: number; names: string[] }>();
    for (const se of edges) {
      const inf = se.edge.behavior.influence;
      if (inf.targetDimension === '__influence') continue;
      const src = this.cur[se.from] ?? this.prev[se.from];
      const es = this.edgeState(se.id);
      if (!src || !src.active) continue;
      if (se.edge.conditions.length && !this.condsAll(se.edge.conditions)) { es.blocked = true; continue; }
      const sign = se.edge.behavior.polarity === 'negative' ? -1 : 1;
      let srcInf = src.influence;
      const circuit = this.m.circuitByReturnEdge.get(se.baseId);
      if (circuit) {
        if (!this.circuitActive(circuit)) continue;
        srcInf *= (circuit.returnPercent / 100) * circuit.intensity;
      }
      const f = Math.max(0, 1 + sign * inf.sensitivity * se.edge.behavior.intensity * (srcInf / this.wmax));
      es.influenceFactor = f;
      es.active = Math.abs(f - 1) > EPS;
      if (this.m.backEdgeIds.has(se.id)) es.feedback = true;
      const key = inf.targetDimension || PRIMARY;
      const cur = factors.get(key) ?? { f: 1, names: [] };
      cur.f *= f;
      cur.names.push(this.title(se.from));
      factors.set(key, cur);
    }
    for (const [dim, { f, names }] of factors) {
      if (Math.abs(f - 1) < EPS) continue;
      flow = this.scaleDim(flow, dim, f, st, `influencia de ${names.map((n) => `«${n}»`).join(', ')} (×${f.toFixed(3)})`, 'lost', `inf:${node.id}`);
      this.ev('influence', 5, `«${node.title}»: ${this.dimName(dim)} ×${f.toFixed(3)} por influencia de ${names.join(', ')}`, { nodeId: node.id, dimension: dim, mechanism: 'influencia causal' });
    }
    return flow;
  }

  applyCapacity(node: MapNode, active: { b: Behavior; p: Behavior['parameters'] | null }[], flow: Packet, overflow: Packet[], st: NodeIterState): Packet {
    const restrictors = active.filter((a) => a.p && a.b.behaviorType === 'restrictor');
    const backlog = this.queues.get(node.id);
    if (backlog && qty(backlog) > EPS) {
      flow = mergePackets([backlog, flow]);
      this.queues.delete(node.id);
      this.ev('release', 7, `«${node.title}» retoma ${qty(backlog).toFixed(2)} u. en cola`, { nodeId: node.id, amount: qty(backlog), mechanism: 'cola del restrictor' });
    }
    if (!restrictors.length) return flow;
    const caps = restrictors.map((r) => Math.max(0, num(r.p!.capacity, Infinity)));
    const cap = restrictors[0].b.combinationRule === 'additive' ? caps.reduce((s, c) => s + c, 0) : restrictors[0].b.combinationRule === 'max' ? Math.max(...caps) : Math.min(...caps);
    const q = qty(flow);
    if (q <= cap + EPS) return flow;
    const [keep, excess] = splitPacket(flow, cap / q);
    st.saturated = true;
    const mode = str(restrictors[0].p!.excess, 'queue');
    this.ev('saturate', 7, `«${node.title}» saturado: llegan ${q.toFixed(2)}, capacidad ${cap}`, { nodeId: node.id, amount: q - cap, mechanism: 'restrictor' });
    if (mode === 'queue') {
      this.queues.set(node.id, excess);
      this.bookPacket('accumulated', excess, st);
      this.ev('queue', 7, `«${node.title}» encola ${qty(excess).toFixed(2)} u. para la siguiente ronda`, { nodeId: node.id, amount: qty(excess), mechanism: 'restrictor (cola)' });
    } else if (mode === 'overflow') {
      overflow.push(excess);
    } else {
      this.bookPacket('lost', excess, st);
      this.ev('loss', 7, `«${node.title}» pierde ${qty(excess).toFixed(2)} u. por exceso de capacidad`, { nodeId: node.id, amount: qty(excess), mechanism: 'restrictor (pérdida)' });
    }
    return keep;
  }

  applyStore(node: MapNode, active: { b: Behavior; p: Behavior['parameters'] | null }[], flow: Packet, st: NodeIterState): Packet {
    const accs = active.filter((a) => a.p && a.b.behaviorType === 'accumulator');
    const rels = active.filter((a) => a.p && a.b.behaviorType === 'releaser');
    if (!accs.length && !rels.length) return flow;
    let stock = this.stocks.get(node.id) ?? emptyPacket();
    for (const { p } of accs) {
      // fuga del stock existente
      const leak = Math.max(0, Math.min(1, num(p!.leak)));
      if (leak > 0 && qty(stock) > EPS) {
        const [gone, keep] = splitPacket(stock, leak);
        this.bookPacket('lost', gone, st);
        stock = keep;
        this.ev('leak', 9, `«${node.title}»: fuga de ${qty(gone).toFixed(2)} u. del stock`, { nodeId: node.id, amount: qty(gone), mechanism: 'fuga del acumulador' });
      }
      const ratio = Math.max(0, Math.min(1, num(p!.ratio, 1)));
      const max = num(p!.maxStock, 0);
      let toStore = qty(flow) * ratio;
      if (max > 0) toStore = Math.min(toStore, Math.max(0, max - qty(stock)));
      if (toStore > EPS && qty(flow) > EPS) {
        const [stored, keep] = splitPacket(flow, toStore / qty(flow));
        stock = mergePackets([stock, stored]);
        flow = keep;
        this.bookPacket('accumulated', stored, st);
        this.ev('accumulate', 9, `«${node.title}» acumula ${toStore.toFixed(2)} u. (stock ${qty(stock).toFixed(2)})`, { nodeId: node.id, amount: toStore, mechanism: 'acumulador' });
      }
      if (max > 0 && qty(stock) >= max - EPS) st.saturated = true;
    }
    for (const { p } of rels) {
      const s = qty(stock);
      if (s <= EPS) continue;
      const mode = str(p!.mode, 'ratio');
      const amount = mode === 'all' ? s : mode === 'amount' ? Math.min(s, Math.max(0, num(p!.amount))) : s * Math.max(0, Math.min(1, num(p!.ratio)));
      if (amount <= EPS) continue;
      const [out, keep] = splitPacket(stock, amount / s);
      stock = keep;
      flow = mergePackets([flow, out]);
      this.bookPacket('released', out, st);
      this.ev('release', 9, `«${node.title}» libera ${amount.toFixed(2)} u. del stock`, { nodeId: node.id, amount, mechanism: 'liberador' });
    }
    if (qty(stock) > EPS || Object.keys(stock.ext).length) this.stocks.set(node.id, stock);
    else this.stocks.delete(node.id);
    return flow;
  }

  edgeState(id: string): EdgeIterState {
    if (!this.edgeStates[id]) this.edgeStates[id] = newEdgeState(id);
    return this.edgeStates[id];
  }

  circuitActive(c: Circuit): boolean {
    if (!c.enabled) return false;
    if ((this.t - 1) % Math.max(1, c.frequency) !== 0) return false;
    return this.cond(c.conditionId);
  }

  /** Fases 6, 7b y 10: reparto, procesamiento de conexiones y retroalimentación. */
  route(node: MapNode, flow: Packet, rejected: Packet[], overflow: Packet[], divert: Packet[], blocked: Packet[], st: NodeIterState) {
    const out = this.m.transferOut.get(node.id) ?? [];
    const byRole = (role: string) => out.filter((se) => se.edge.behavior.role === role);
    const main = byRole('main');
    const rejectEdges = byRole('reject');
    const overflowEdges = byRole('overflow');
    const divertEdges = byRole('divert');

    // desvío sin ruta: vuelve al flujo principal
    if (divert.length && !divertEdges.length) {
      flow = mergePackets([flow, ...divert]);
      this.warn(`divert:${node.id}`, `«${node.title}» tiene un desviador pero ninguna conexión marcada como «desvío»; el flujo continúa por la ruta principal.`);
      divert = [];
    }

    // Reparto principal
    if (qty(flow) > EPS || Object.keys(flow.ext).some((k) => (flow.ext[k] ?? 0) > EPS)) {
      if (!main.length) {
        st.terminal = mergePackets([st.terminal, flow]);
        this.bookPacket('terminal', flow, st);
        st.flags.push('terminal');
        if (node.type !== 'output' && qty(flow) > EPS && (this.m.transferOut.get(node.id)?.length ?? 0) === 0 && (this.m.replicateOut.get(node.id)?.length ?? 0) === 0) {
          this.ev('terminal', 6, `«${node.title}» retiene ${qty(flow).toFixed(2)} u. (sin conexiones de salida)`, { nodeId: node.id, amount: qty(flow), mechanism: 'flujo terminal' });
        } else if (node.type === 'output') {
          this.ev('terminal', 6, `«${node.title}» recibe ${qty(flow).toFixed(2)} u. como resultado`, { nodeId: node.id, amount: qty(flow), mechanism: 'resultado' });
        }
      } else {
        const shares = this.computeShares(node, main, flow, st);
        let assignedTotal = 0;
        for (const [se, share] of shares) {
          if (share <= EPS) { this.edgeState(se.id); continue; }
          assignedTotal += share;
          this.sendOnEdge(se, scalePacket(flow, share), st, node.split.mode === 'conditional');
        }
        const rest = 1 - assignedTotal;
        if (rest > 1e-7) {
          const remainder = scalePacket(flow, rest);
          if (node.split.mode === 'conditional' && assignedTotal <= EPS) {
            blocked.push(remainder);
            st.blocked = true;
            this.ev('block', 6, `«${node.title}»: ninguna ruta cumple su condición; el flujo queda bloqueado`, { nodeId: node.id, amount: qty(remainder), mechanism: 'reparto condicionado' });
          } else if (node.split.mode === 'priority') {
            overflow.push(remainder);
          } else {
            st.terminal = mergePackets([st.terminal, remainder]);
            this.bookPacket('terminal', remainder, st);
            this.warn(`split:${node.id}`, `«${node.title}»: el reparto fijo no asigna el 100% del flujo; el resto queda retenido en el nodo.`);
          }
        }
        if (shares.length > 1) this.ev('split', 6, `«${node.title}» reparte ${qty(flow).toFixed(2)} u. entre ${shares.filter(([, s]) => s > EPS).length} rutas (${this.splitLabel(node.split.mode)})`, { nodeId: node.id, amount: qty(flow), mechanism: `bifurcación: ${node.split.mode}` });
      }
    }

    const dispatch = (packets: Packet[], edges: SimEdge[], label: string, mechanism: string) => {
      const p = mergePackets(packets);
      if (qty(p) <= EPS && Object.values(p.ext).every((v) => v <= EPS)) return;
      if (!edges.length) {
        this.bookPacket('lost', p, st);
        this.ev('loss', 6, `«${node.title}»: ${qty(p).toFixed(2)} u. ${label} se pierden (sin ruta alternativa)`, { nodeId: node.id, amount: qty(p), mechanism });
        return;
      }
      const wsum = edges.reduce((s, e) => s + Math.max(0, e.edge.behavior.weight), 0) || edges.length;
      for (const se of edges) this.sendOnEdge(se, scalePacket(p, (Math.max(0, se.edge.behavior.weight) || (wsum === edges.length ? 1 : 0)) / wsum), st, false);
      this.ev('divert', 6, `«${node.title}»: ${qty(p).toFixed(2)} u. ${label} se derivan por ruta alternativa`, { nodeId: node.id, amount: qty(p), mechanism });
    };
    dispatch(rejected, rejectEdges, 'rechazadas', 'filtro: rechazo');
    dispatch(blocked, rejectEdges.length ? rejectEdges : overflowEdges, 'bloqueadas', 'bloqueo');
    dispatch(overflow, overflowEdges, 'desbordadas', 'desborde por capacidad');
    dispatch(divert, divertEdges, 'desviadas', 'desviador');
  }

  splitLabel(mode: string): string {
    return ({ fixed: 'reparto fijo', proportional: 'proporcional', conditional: 'condicionado', priority: 'prioritario', competitive: 'competitivo', dynamic: 'dinámico' } as Record<string, string>)[mode] ?? mode;
  }

  computeShares(node: MapNode, edges: SimEdge[], flow: Packet, st: NodeIterState): [SimEdge, number][] {
    const q = qty(flow);
    const mode = node.split.mode;
    const norm = (ws: number[]): number[] => {
      const s = ws.reduce((a, b) => a + Math.max(0, b), 0);
      return s > EPS ? ws.map((w) => Math.max(0, w) / s) : ws.map(() => 1 / ws.length);
    };
    if (edges.length === 1 && mode !== 'conditional' && mode !== 'fixed') return [[edges[0], 1]];
    switch (mode) {
      case 'fixed': {
        let shares = edges.map((e) => Math.max(0, e.edge.behavior.share) / 100);
        const s = shares.reduce((a, b) => a + b, 0);
        if (s > 1 + 1e-9) {
          this.warn(`fixed:${node.id}`, `«${node.title}»: los porcentajes del reparto fijo suman ${Math.round(s * 100)}%; se normalizan al 100% para conservar el flujo.`);
          shares = shares.map((x) => x / s);
        }
        return edges.map((e, i) => [e, shares[i]]);
      }
      case 'conditional': {
        const ok = edges.map((e) => this.condsAll(e.edge.conditions));
        edges.forEach((e, i) => { if (!ok[i]) this.edgeState(e.id).blocked = true; });
        if (!ok.some(Boolean)) return edges.map((e) => [e, 0]);
        const ws = norm(edges.map((e, i) => (ok[i] ? Math.max(0, e.edge.behavior.weight) || 1 : 0)));
        return edges.map((e, i) => [e, ws[i]]);
      }
      case 'priority': {
        const sorted = [...edges].sort((a, b) => a.edge.behavior.priority - b.edge.behavior.priority || a.id.localeCompare(b.id));
        let remaining = q;
        const res: [SimEdge, number][] = [];
        sorted.forEach((e, i) => {
          const cap = this.edgeCapacity(e);
          const take = i === sorted.length - 1 && cap == null ? remaining : Math.min(remaining, cap ?? remaining);
          res.push([e, q > EPS ? take / q : 0]);
          remaining -= take;
        });
        return res;
      }
      case 'competitive': {
        const ws = norm(edges.map((e) => (this.edgeCapacity(e) ?? q) * Math.max(0, e.edge.behavior.weight)));
        return edges.map((e, i) => [e, ws[i]]);
      }
      case 'dynamic': {
        const ref = node.split.dynamicSourceNodeId ? this.m.resolve(node.split.dynamicSourceNodeId) : null;
        const inf = ref ? (this.cur[ref] ?? this.prev[ref])?.influence ?? 0 : 0;
        const ws = norm(edges.map((e) => Math.max(0, e.edge.behavior.weight) * Math.max(0.0001, 1 + (e.edge.behavior.polarity === 'negative' ? -1 : 1) * (inf / this.wmax))));
        if (ref) this.ev('split', 6, `«${node.title}»: reparto dinámico según la influencia de «${this.title(ref)}» (${inf.toFixed(2)})`, { nodeId: node.id, mechanism: 'reparto dinámico' });
        void st;
        return edges.map((e, i) => [e, ws[i]]);
      }
      default: {
        const ws = norm(edges.map((e) => e.edge.behavior.weight));
        return edges.map((e, i) => [e, ws[i]]);
      }
    }
  }

  edgeCapacity(se: SimEdge): number | null {
    const caps: number[] = [];
    if (se.edge.capacity != null) caps.push(se.edge.capacity);
    const port = se.edge.targetPortId ? this.m.ports[se.edge.targetPortId] : null;
    if (port?.capacity != null) caps.push(port.capacity);
    return caps.length ? Math.min(...caps) : null;
  }

  /** Procesa un paquete a lo largo de una conexión de transferencia. */
  sendOnEdge(se: SimEdge, packet: Packet, st: NodeIterState, conditionsAlreadyChecked: boolean) {
    const e = se.edge;
    const es = this.edgeState(se.id);
    const assigned = qty(packet);
    es.assigned += assigned;
    if (assigned <= EPS && Object.values(packet.ext).every((v) => v <= EPS)) return;
    let p = clonePacket(packet);
    const name = `«${this.title(se.from)}» → «${this.title(se.to)}»`;

    if (!conditionsAlreadyChecked && e.conditions.length && !this.condsAll(e.conditions)) {
      es.blocked = true;
      es.lost += assigned;
      this.bookPacket('lost', p, st);
      this.ev('block', 7, `Conexión ${name} bloqueada por condición: ${assigned.toFixed(2)} u. no pasan`, { edgeId: se.id, nodeId: se.from, amount: assigned, mechanism: 'condición de la conexión' });
      return;
    }
    // dimensiones transportadas
    if (e.behavior.transportedDimensions) {
      const allowed = new Set([PRIMARY, ...e.behavior.transportedDimensions]);
      for (const d of Object.keys(p.ext)) if (!allowed.has(d)) { this.book('lost', d, p.ext[d], st); delete p.ext[d]; }
      for (const d of Object.keys(p.int)) if (!allowed.has(d)) delete p.int[d];
    }
    const circuit = this.m.circuitByReturnEdge.get(se.baseId);
    let factor = e.behavior.multiplier;
    if (circuit) {
      if (!this.circuitActive(circuit)) {
        es.blocked = true;
        es.lost += assigned;
        this.bookPacket('lost', p, st);
        this.ev('circuit', 10, `Circuito «${circuit.name}» inactivo en esta ronda: el retorno no circula`, { edgeId: se.id, amount: assigned, mechanism: 'circuito' });
        return;
      }
      factor *= (circuit.returnPercent / 100) * circuit.intensity;
    }
    p = this.edgeTransform(se, p, st, factor, circuit);
    this.dispatchDelivery(se, p, circuit, false);
    es.active = qty(p) > EPS;
    void name;
  }

  /** multiplicador, pérdida, capacidad, resistencia, intensidad, velocidad y límites de circuito */
  edgeTransform(se: SimEdge, p: Packet, st: NodeIterState, factor: number, circuit: Circuit | undefined): Packet {
    const e = se.edge;
    const es = this.edgeState(se.id);
    const name = `«${this.title(se.from)}» → «${this.title(se.to)}»`;
    if (Math.abs(factor - 1) > EPS) {
      const before = qty(p);
      const scaled = scalePacket(p, factor);
      const delta = qty(scaled) - before;
      if (delta > 0) {
        scaled.origins = { ...p.origins };
        addTo(scaled.origins, circuit ? `circuit:${circuit.id}` : `edge:${se.baseId}`, delta);
        for (const d of Object.keys(p.ext)) this.book('generated', d, (scaled.ext[d] ?? 0) - (p.ext[d] ?? 0), st);
        es.generated += delta;
        this.ev('multiply', 7, `${name} multiplica ×${factor.toFixed(3)} (+${delta.toFixed(2)} u. generadas${circuit ? ` por el circuito «${circuit.name}»` : ''})`, { edgeId: se.id, amount: delta, mechanism: circuit ? 'retorno del circuito' : 'multiplicador de conexión' });
      } else {
        for (const d of Object.keys(p.ext)) this.book('lost', d, (p.ext[d] ?? 0) - (scaled.ext[d] ?? 0), st);
        es.lost += -delta;
        this.ev('loss', 7, `${name}: ${circuit ? `retorno del ${Math.round(factor * 100)}%` : `factor ×${factor.toFixed(3)}`} (−${(-delta).toFixed(2)} u.)`, { edgeId: se.id, amount: -delta, mechanism: circuit ? 'retorno parcial del circuito' : 'multiplicador de conexión' });
      }
      p = scaled;
    }
    if (e.behavior.loss > 0) {
      const [keep, gone] = splitPacket(p, 1 - e.behavior.loss);
      this.bookPacket('lost', gone, st);
      es.lost += qty(gone);
      if (qty(gone) > EPS) this.ev('loss', 7, `${name} pierde ${qty(gone).toFixed(2)} u. (${Math.round(e.behavior.loss * 100)}%)`, { edgeId: se.id, amount: qty(gone), mechanism: 'pérdida en conexión' });
      p = keep;
    }
    const cap = this.edgeCapacity(se);
    if (cap != null && qty(p) > cap + EPS) {
      const before = qty(p);
      const [keep, gone] = splitPacket(p, cap / before);
      this.bookPacket('lost', gone, st);
      es.lost += qty(gone);
      es.saturated = true;
      this.ev('saturate', 7, `${name} saturada: capacidad ${cap}, se pierden ${qty(gone).toFixed(2)} u.`, { edgeId: se.id, amount: qty(gone), mechanism: 'capacidad de conexión' });
      p = keep;
    }
    if (circuit) {
      const q = qty(p);
      let target = q;
      if (circuit.saturation != null && circuit.saturation > 0) target = circuit.saturation * (1 - Math.exp(-q / circuit.saturation));
      if (circuit.maxLimit != null) target = Math.min(target, circuit.maxLimit);
      if (circuit.minLimit != null && q > EPS) target = Math.max(target, circuit.minLimit);
      if (Math.abs(target - q) > EPS && q > EPS) {
        const scaled = scalePacket(p, target / q);
        if (target < q) {
          for (const d of Object.keys(p.ext)) this.book('lost', d, (p.ext[d] ?? 0) - (scaled.ext[d] ?? 0), st);
          es.lost += q - target;
          es.saturated = true;
          this.ev('saturate', 10, `Circuito «${circuit.name}» saturado: retorno limitado de ${q.toFixed(2)} a ${target.toFixed(2)}`, { edgeId: se.id, amount: q - target, mechanism: 'saturación del circuito' });
        } else {
          scaled.origins = { ...p.origins };
          addTo(scaled.origins, `circuit:${circuit.id}`, target - q);
          for (const d of Object.keys(p.ext)) this.book('generated', d, (scaled.ext[d] ?? 0) - (p.ext[d] ?? 0), st);
          es.generated += target - q;
          this.ev('circuit', 10, `Circuito «${circuit.name}»: mínimo garantizado eleva el retorno a ${target.toFixed(2)}`, { edgeId: se.id, amount: target - q, mechanism: 'límite mínimo del circuito' });
        }
        p = scaled;
      }
    }
    // dimensiones intensivas
    if (e.resistance > 0) p.int.speed = (p.int.speed ?? this.doc.dimensions.speed?.defaultValue ?? 1) * (1 - e.resistance);
    if (e.behavior.speed !== 1) p.int.speed = (p.int.speed ?? this.doc.dimensions.speed?.defaultValue ?? 1) * e.behavior.speed;
    if (e.behavior.intensity !== 1 && e.type === 'flow') p.int.potential = (p.int.potential ?? this.doc.dimensions.potential?.defaultValue ?? 0.5) * e.behavior.intensity;
    this.clampInt(p);
    return p;
  }

  dispatchDelivery(se: SimEdge, p: Packet, circuit: Circuit | undefined, replicated: boolean) {
    const e = se.edge;
    const es = this.edgeState(se.id);
    const isBack = this.m.backEdgeIds.has(se.id);
    const delay = e.delay + (circuit?.delay ?? 0);
    const at = this.t + (isBack ? Math.max(1, delay) : delay);
    es.arrivesAt = at;
    es.feedback = isBack || replicated;
    es.delivered = mergePackets([es.delivered, p]);
    const d: Delivery = {
      edgeId: se.id, to: se.to, portId: e.targetPortId, packet: p, priority: e.behavior.priority,
      weight: e.behavior.weight, convergenceWeight: e.behavior.convergenceWeight,
    };
    if (at > this.t) {
      this.ev(isBack ? 'feedback' : 'delay', 10, `«${this.title(se.from)}» → «${this.title(se.to)}»: ${qty(p).toFixed(2)} u. llegarán en la ronda ${at}${isBack ? ' (retroalimentación)' : ''}`, { edgeId: se.id, amount: qty(p), mechanism: isBack ? 'retroalimentación' : 'retardo' });
    }
    this.schedule(d, at);
    // persistencia del circuito: el efecto se repite atenuado
    if (circuit && circuit.persistence > 1 && qty(p) > EPS) {
      for (let k = 1; k < circuit.persistence; k++) {
        const decay = 1 - k / circuit.persistence;
        const echo = scalePacket(p, decay);
        echo.origins = { [`circuit:${circuit.id}`]: qty(echo) };
        for (const [dim, v] of Object.entries(echo.ext)) this.book('generated', dim, v);
        this.schedule({ ...d, packet: echo }, at + k);
      }
    }
  }

  /** Conexiones de réplica: retroalimentación generativa (+) o inhibidora (−). */
  replicate(node: MapNode, flow: Packet, st: NodeIterState) {
    const edges = this.m.replicateOut.get(node.id) ?? [];
    if (!edges.length) return;
    const basis = mergePackets([flow]);
    for (const se of edges) {
      const e = se.edge;
      const es = this.edgeState(se.id);
      const circuit = this.m.circuitByReturnEdge.get(se.baseId);
      if (circuit && !this.circuitActive(circuit)) continue;
      if (e.conditions.length && !this.condsAll(e.conditions)) { es.blocked = true; continue; }
      const q = qty(basis);
      if (q <= EPS) continue;
      let factor = e.behavior.multiplier * (circuit ? (circuit.returnPercent / 100) * circuit.intensity : 1);
      factor = Math.max(0, factor);
      if (e.behavior.polarity === 'negative') {
        let amount = q * factor * (1 - e.behavior.loss);
        if (circuit?.maxLimit != null) amount = Math.min(amount, circuit.maxLimit);
        if (circuit?.saturation) amount = circuit.saturation * (1 - Math.exp(-amount / circuit.saturation));
        const isBack = this.m.backEdgeIds.has(se.id);
        const at = this.t + (isBack ? Math.max(1, e.delay + (circuit?.delay ?? 0)) : e.delay + (circuit?.delay ?? 0));
        es.active = true; es.inhibition = true; es.feedback = true; es.arrivesAt = at; es.assigned = amount;
        const inh: Inhibition = { edgeId: se.id, to: se.to, amount };
        if (at <= this.t) {
          if (!this.inhibitions.has(se.to)) this.inhibitions.set(se.to, []);
          this.inhibitions.get(se.to)!.push(inh);
        } else {
          if (!this.scheduledInhibitions.has(at)) this.scheduledInhibitions.set(at, []);
          this.scheduledInhibitions.get(at)!.push(inh);
        }
        this.ev('inhibit', 10, `«${node.title}» inhibe a «${this.title(se.to)}» en ${amount.toFixed(2)} u. (ronda ${at})`, { edgeId: se.id, nodeId: node.id, amount, mechanism: 'retroalimentación equilibradora' });
        continue;
      }
      // réplica generativa: no consume el flujo de origen
      // solo se genera la parte que retorna (factor de retorno × multiplicador)
      const scaledCopy = scalePacket(basis, factor);
      scaledCopy.origins = { [circuit ? `circuit:${circuit.id}` : `feedback:${se.baseId}`]: qty(scaledCopy) };
      for (const [d, v] of Object.entries(scaledCopy.ext)) this.book('generated', d, v, st);
      const p = this.edgeTransform(se, scaledCopy, st, 1, circuit);
      es.assigned += q;
      es.generated += qty(scaledCopy);
      es.active = qty(p) > EPS;
      this.ev('feedback', 10, `«${node.title}» retroalimenta a «${this.title(se.to)}» con ${qty(p).toFixed(2)} u. (${Math.round(factor * 100)}% de ${q.toFixed(2)})`, { edgeId: se.id, nodeId: node.id, amount: qty(p), mechanism: circuit ? `circuito «${circuit.name}»` : 'réplica (retroalimentación)' });
      this.dispatchDelivery(se, p, circuit, true);
    }
  }
}

function computeMetrics(model: CompiledModel, its: IterationResult[]): RunMetrics {
  const totalResult: DimMap = {};
  const totalGenerated: DimMap = {};
  const totalLost: DimMap = {};
  const totalConsumed: DimMap = {};
  const resultSeries: number[] = [];
  let maxUnexplained = 0;
  const perOutput: RunMetrics['perOutput'] = {};
  const outs = model.outputIds.length ? model.outputIds : [];
  for (const it of its) {
    for (const [d, v] of Object.entries(it.result.ext)) addTo(totalResult, d, v);
    for (const [d, v] of Object.entries(it.ledger.generated)) addTo(totalGenerated, d, v);
    for (const [d, v] of Object.entries(it.ledger.lost)) addTo(totalLost, d, v);
    for (const [d, v] of Object.entries(it.ledger.consumed)) addTo(totalConsumed, d, v);
    resultSeries.push(clean(it.result.ext[PRIMARY] ?? 0));
    for (const v of Object.values(it.ledger.unexplained)) maxUnexplained = Math.max(maxUnexplained, Math.abs(v));
    for (const o of outs) {
      const s = it.nodes[o];
      const q = s ? qty(s.terminal) : 0;
      const cur = perOutput[o] ?? { total: 0, last: 0, int: {} };
      cur.total += q;
      cur.last = q;
      if (s) cur.int = { ...s.terminal.int };
      perOutput[o] = cur;
    }
  }
  const gen = totalGenerated[PRIMARY] ?? 0;
  return {
    totalResult,
    finalResult: its.length ? its[its.length - 1].result : emptyPacket(),
    totalGenerated,
    totalLost,
    totalConsumed,
    efficiency: gen > EPS ? (totalResult[PRIMARY] ?? 0) / gen : 0,
    resultSeries,
    maxUnexplained,
    perOutput,
  };
}
