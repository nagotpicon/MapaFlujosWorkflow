/**
 * Sistema de diagnóstico: analiza un resultado y produce observaciones
 * descriptivas y explicables (qué, dónde, quién interviene, regla, datos,
 * supuestos y confianza). Nunca presenta hipótesis como certezas.
 */
import type { ProjectDoc } from '../core/model/schema';
import { BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import { compileModel } from './compile';
import { PRIMARY, qty } from './packet';
import type { TornadoEntry } from './analysis';
import type { SimulationResult } from './types';

export type DiagnosticKind =
  | 'bottleneck' | 'loss' | 'influence' | 'blocked' | 'saturation' | 'loop-reinforcing' | 'loop-balancing'
  | 'compensation' | 'side-effect' | 'recovery' | 'dependency' | 'behavior-change' | 'conservation' | 'hypothesis';

export interface Diagnostic {
  id: string;
  kind: DiagnosticKind;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  nodeIds: string[];
  edgeIds: string[];
  rule: string;
  data: string[];
  assumptions: string[];
  confidence: 'alta' | 'media' | 'baja';
}

const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2));

export function diagnose(doc: ProjectDoc, r: SimulationResult, tornadoEntries?: TornadoEntry[]): Diagnostic[] {
  const out: Diagnostic[] = [];
  const title = (id: string) => doc.nodes[id]?.title ?? id;
  const edgeName = (id: string) => {
    const e = doc.edges[id.replace('~rev', '')];
    return e ? `${title(e.sourceNodeId)} → ${title(e.targetNodeId)}` : id;
  };
  const approxIds = new Set(r.approximations.map((a) => a.elementId));
  const confidenceFor = (nodeIds: string[]): Diagnostic['confidence'] => {
    if (nodeIds.some((n) => approxIds.has(n) || doc.nodes[n]?.metadata.confidence === 'hypothesis')) return 'baja';
    if (nodeIds.length && nodeIds.every((n) => doc.nodes[n]?.metadata.confidence === 'verified')) return 'alta';
    return 'media';
  };
  const assumptionsFor = (nodeIds: string[]) => {
    const a: string[] = [];
    for (const ap of r.approximations) if (nodeIds.includes(ap.elementId)) a.push(ap.message);
    for (const n of nodeIds) if (doc.nodes[n]?.metadata.confidence === 'hypothesis') a.push(`«${title(n)}» está marcado como hipótesis`);
    if (doc.project.isDemo) a.push('Valores ficticios del proyecto de demostración');
    return a;
  };
  const N = r.iterations.length;
  if (N === 0) return out;

  // Agregados por nodo
  const lost: Record<string, number> = {};
  const satCount: Record<string, number> = {};
  const blockedCount: Record<string, number> = {};
  const inTotal: Record<string, number> = {};
  const lossByMechanism: Record<string, { amount: number; nodeIds: Set<string>; edgeIds: Set<string> }> = {};
  const edgeLost: Record<string, number> = {};
  const edgeSat: Record<string, number> = {};
  const edgeBlocked: Record<string, number> = {};
  for (const it of r.iterations) {
    for (const [id, st] of Object.entries(it.nodes)) {
      lost[id] = (lost[id] ?? 0) + (st.lost[PRIMARY] ?? 0);
      inTotal[id] = (inTotal[id] ?? 0) + qty(st.in) + (st.generated[PRIMARY] ?? 0);
      if (st.saturated) satCount[id] = (satCount[id] ?? 0) + 1;
      if (st.blocked) blockedCount[id] = (blockedCount[id] ?? 0) + 1;
    }
    for (const [id, es] of Object.entries(it.edges)) {
      edgeLost[id] = (edgeLost[id] ?? 0) + es.lost;
      if (es.saturated) edgeSat[id] = (edgeSat[id] ?? 0) + 1;
      if (es.blocked) edgeBlocked[id] = (edgeBlocked[id] ?? 0) + 1;
    }
    for (const ev of it.events) {
      if (!['loss', 'reduce', 'filter', 'saturate', 'leak', 'block', 'inhibit'].includes(ev.kind) || !ev.amount || ev.amount <= 0) continue;
      if (ev.kind === 'filter' || (ev.kind === 'saturate' && ev.mechanism === 'restrictor')) continue; // se contabiliza al perderse
      const key = ev.mechanism;
      const m = lossByMechanism[key] ?? { amount: 0, nodeIds: new Set(), edgeIds: new Set() };
      m.amount += ev.amount;
      if (ev.nodeId) m.nodeIds.add(ev.nodeId);
      if (ev.edgeId) m.edgeIds.add(ev.edgeId);
      lossByMechanism[key] = m;
    }
  }
  const totalGen = r.metrics.totalGenerated[PRIMARY] ?? 0;
  const totalLost = r.metrics.totalLost[PRIMARY] ?? 0;

  // Principales pérdidas por nodo
  const lossRank = Object.entries(lost).filter(([, v]) => v > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [id, v] of lossRank) {
    const share = totalLost > 0 ? v / totalLost : 0;
    const bhs = (doc.nodes[id]?.behaviorIds ?? []).map((b) => doc.behaviors[b]).filter(Boolean).map((b) => BEHAVIOR_LIBRARY[b.behaviorType].label);
    out.push({
      id: `loss:${id}`, kind: 'loss', severity: share > 0.4 ? 'critical' : 'warning',
      title: `Pérdida principal en «${title(id)}»`,
      description: `Se pierden ${fmt(v)} u. en ${N} vueltas (${Math.round(share * 100)}% de todas las pérdidas${totalGen > 0 ? `, ${Math.round((v / totalGen) * 100)}% de lo generado` : ''}).`,
      nodeIds: [id], edgeIds: [], rule: bhs.length ? `Comportamientos: ${bhs.join(', ')}` : 'Flujo sin ruta de salida o bloqueado',
      data: [`Entrada acumulada: ${fmt(inTotal[id] ?? 0)} u.`, `Pérdida acumulada: ${fmt(v)} u.`],
      assumptions: assumptionsFor([id]), confidence: confidenceFor([id]),
    });
  }
  for (const [id, v] of Object.entries(edgeLost).filter(([, v]) => v > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 2)) {
    const e = doc.edges[id.replace('~rev', '')];
    out.push({
      id: `eloss:${id}`, kind: 'loss', severity: 'warning', title: `Pérdida en la unión ${edgeName(id)}`,
      description: `La unión pierde ${fmt(v)} u. en total por ${e?.behavior.loss ? `pérdida del ${Math.round(e.behavior.loss * 100)}%` : edgeSat[id] ? 'capacidad insuficiente' : edgeBlocked[id] ? 'condiciones no cumplidas' : 'su configuración'}.`,
      nodeIds: e ? [e.sourceNodeId, e.targetNodeId] : [], edgeIds: [id.replace('~rev', '')], rule: 'Pérdida / capacidad / condición de conexión',
      data: [`Pérdida acumulada: ${fmt(v)} u.`], assumptions: [], confidence: 'media',
    });
  }

  // Cuellos de botella y saturaciones
  for (const [id, c] of Object.entries(satCount).sort((a, b) => b[1] - a[1])) {
    const first = r.iterations.findIndex((it) => it.nodes[id]?.saturated) + 1;
    out.push({
      id: `bottleneck:${id}`, kind: c >= N / 2 ? 'bottleneck' : 'saturation', severity: c >= N / 2 ? 'critical' : 'warning',
      title: c >= N / 2 ? `Cuello de botella: «${title(id)}»` : `Saturación puntual en «${title(id)}»`,
      description: `Está saturado en ${c} de ${N} vueltas (desde la vuelta ${first}). Limita lo que llega a las etapas siguientes.`,
      nodeIds: [id], edgeIds: [], rule: 'Entrada > capacidad (restrictor, puerto o stock máximo)',
      data: [`Vueltas saturadas: ${c}/${N}`], assumptions: assumptionsFor([id]), confidence: confidenceFor([id]),
    });
  }
  for (const [id, c] of Object.entries(edgeSat)) {
    out.push({
      id: `esat:${id}`, kind: 'saturation', severity: 'warning', title: `Unión saturada: ${edgeName(id)}`,
      description: `La capacidad de la unión se supera en ${c} de ${N} vueltas.`, nodeIds: [], edgeIds: [id.replace('~rev', '')],
      rule: 'Capacidad de conexión / circuito', data: [], assumptions: [], confidence: 'media',
    });
  }

  // Rutas bloqueadas
  for (const [id, c] of Object.entries(edgeBlocked)) {
    out.push({
      id: `blocked:${id}`, kind: 'blocked', severity: c === N ? 'warning' : 'info',
      title: `Ruta ${c === N ? 'bloqueada' : 'intermitente'}: ${edgeName(id)}`,
      description: `Sus condiciones no se cumplen en ${c} de ${N} vueltas.`, nodeIds: [], edgeIds: [id.replace('~rev', '')],
      rule: 'Condición de conexión / reparto condicionado', data: [], assumptions: [], confidence: 'media',
    });
  }
  for (const [id, c] of Object.entries(blockedCount)) {
    out.push({
      id: `nblocked:${id}`, kind: 'blocked', severity: 'warning', title: `«${title(id)}» bloquea el flujo`,
      description: `Esta idea bloquea el paso en ${c} de ${N} vueltas (condición no cumplida o ninguna ruta disponible).`,
      nodeIds: [id], edgeIds: [], rule: 'Condición de activación con modo bloqueo', data: [], assumptions: assumptionsFor([id]), confidence: confidenceFor([id]),
    });
  }

  // Oportunidades de recuperación: pérdidas sin ruta alternativa
  for (const it of [r.iterations[N - 1]]) {
    for (const ev of it.events) {
      if (ev.kind !== 'loss' || !/sin ruta alternativa/.test(ev.message) || !ev.nodeId) continue;
      if (out.some((d) => d.id === `recovery:${ev.nodeId}:${ev.mechanism}`)) continue;
      out.push({
        id: `recovery:${ev.nodeId}:${ev.mechanism}`, kind: 'recovery', severity: 'info',
        title: `Oportunidad de recuperación en «${title(ev.nodeId)}»`,
        description: `${fmt(ev.amount ?? 0)} u. por vuelta (${ev.mechanism}) se pierden sin ruta alternativa. Una conexión de rechazo/desborde hacia una ruta de recuperación podría aprovecharlas.`,
        nodeIds: [ev.nodeId], edgeIds: [], rule: 'Flujo rechazado o desbordado sin conexión alternativa',
        data: [ev.message], assumptions: assumptionsFor([ev.nodeId]), confidence: confidenceFor([ev.nodeId]),
      });
    }
  }

  // Bucles
  const loopFeedback = (edgeIds: string[]) => r.iterations.reduce((s, it) => s + edgeIds.reduce((x, e) => x + (it.edges[e] ? qty(it.edges[e].delivered) + (it.edges[e].inhibition ? it.edges[e].assigned : 0) : 0), 0), 0);
  for (const l of r.loops) {
    const fb = loopFeedback(l.edgeIds);
    const s = r.metrics.resultSeries;
    const trend = s.length > 2 ? s[s.length - 1] - s[Math.max(0, s.length - 3)] : 0;
    out.push({
      id: `loop:${l.id}`, kind: l.polarity === 'balancing' ? 'loop-balancing' : 'loop-reinforcing',
      severity: l.polarity === 'reinforcing' && trend > 0 ? 'positive' : 'info',
      title: `${l.polarity === 'reinforcing' ? 'Bucle reforzador' : l.polarity === 'balancing' ? 'Bucle equilibrador' : 'Bucle mixto'} ${l.label}`,
      description: `${l.nodeIds.map(title).join(' → ')} → ${title(l.nodeIds[0])}. ${l.polarity === 'reinforcing' ? 'El resultado refuerza el origen.' : l.polarity === 'balancing' ? 'El crecimiento activa una resistencia que lo frena.' : 'Refuerza hasta encontrar un límite de capacidad o saturación.'}${fb > 0 ? ` Ha devuelto ${fmt(fb)} u. en total.` : ''}${l.hasDelay ? ' Actúa con retardo.' : ''}`,
      nodeIds: l.nodeIds, edgeIds: l.edgeIds, rule: 'Producto de polaridades del ciclo (+ refuerza, − equilibra); límites → mixto',
      data: [`Tendencia final del resultado: ${trend >= 0 ? '+' : ''}${fmt(trend)}`], assumptions: assumptionsFor(l.nodeIds), confidence: confidenceFor(l.nodeIds),
    });
  }

  // Compensaciones
  const compAgg: Record<string, number> = {};
  for (const it of r.iterations) for (const [id, st] of Object.entries(it.nodes)) if (st.compensation > 0) compAgg[id] = Math.max(compAgg[id] ?? 0, st.compensation);
  const model = compileModel(doc);
  for (const [id, c] of Object.entries(compAgg)) {
    const sources = (model.compensateIn.get(id) ?? []).map((se) => se.from);
    out.push({
      id: `comp:${id}`, kind: 'compensation', severity: 'positive', title: `Compensación sobre «${title(id)}»`,
      description: `${sources.map((s) => `«${title(s)}»`).join(', ')} compensa${sources.length > 1 ? 'n' : ''} hasta un ${Math.round(c * 100)}% de su efecto negativo (regla ${doc.nodes[id]?.mitigationCombination}).`,
      nodeIds: [id, ...sources], edgeIds: (model.compensateIn.get(id) ?? []).map((se) => se.baseId), rule: 'Compensación parcial/total/condicionada/temporal',
      data: [], assumptions: assumptionsFor([id, ...sources]), confidence: confidenceFor([id, ...sources]),
    });
  }

  // Efectos secundarios
  for (const n of Object.values(doc.nodes)) {
    const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
    const declared = bhs.flatMap((b) => b.sideEffects);
    const outs = model.causalOut.get(n.id) ?? [];
    const pos = outs.filter((se) => se.edge.behavior.polarity === 'positive' && se.edge.behavior.influence.mode === 'modulate');
    const neg = outs.filter((se) => se.edge.behavior.polarity === 'negative');
    const gains = bhs.some((b) => b.behaviorType === 'multiplier' || (b.behaviorType === 'transformer' && Number(b.parameters.factor ?? 1) > 1));
    const losses = bhs.some((b) => ['reducer', 'consumer'].includes(b.behaviorType));
    if (declared.length || (pos.length && neg.length) || (gains && losses)) {
      out.push({
        id: `side:${n.id}`, kind: 'side-effect', severity: 'info', title: `Efectos cruzados de «${n.title}»`,
        description: declared.length
          ? declared.map((d) => `${d.polarity === 'positive' ? '+' : '−'} ${d.description}`).join(' · ')
          : `Mejora unas dimensiones o elementos y empeora otros (${pos.length + (gains ? 1 : 0)} efectos positivos, ${neg.length + (losses ? 1 : 0)} negativos).`,
        nodeIds: [n.id, ...outs.map((o) => o.to)], edgeIds: outs.map((o) => o.baseId), rule: 'Influencias de polaridad opuesta o comportamientos con efecto mixto',
        data: [], assumptions: assumptionsFor([n.id]), confidence: confidenceFor([n.id]),
      });
    }
  }

  // Dependencias críticas: nodos cuya eliminación desconecta entradas y salidas
  const inputs = model.simNodeIds.filter((id) => (r.iterations[0].nodes[id]?.generated[PRIMARY] ?? 0) > 0 || doc.nodes[id]?.type === 'input');
  const outputs = model.outputIds;
  if (inputs.length && outputs.length) {
    const flowEdges = model.allSimEdges.filter((s) => s.edge.type === 'flow');
    const reach = (skip: string | null) => {
      const seen = new Set(inputs.filter((i) => i !== skip));
      const q = [...seen];
      while (q.length) {
        const v = q.shift()!;
        for (const se of flowEdges) if (se.from === v && se.to !== skip && !seen.has(se.to)) { seen.add(se.to); q.push(se.to); }
      }
      return outputs.filter((o) => seen.has(o)).length;
    };
    const baseReach = reach(null);
    if (baseReach > 0) {
      for (const id of model.simNodeIds) {
        if (inputs.includes(id) || outputs.includes(id)) continue;
        if (reach(id) < baseReach) {
          out.push({
            id: `dep:${id}`, kind: 'dependency', severity: 'warning', title: `Dependencia crítica: «${title(id)}»`,
            description: `Sin este elemento, ${baseReach - reach(id)} de ${baseReach} resultado(s) quedan desconectados de las entradas. No existe ruta alternativa.`,
            nodeIds: [id], edgeIds: [], rule: 'Punto de articulación entre entradas y salidas', data: [], assumptions: [], confidence: 'alta',
          });
        }
      }
    }
  }

  // Elementos de mayor influencia (sensibilidad)
  if (tornadoEntries?.length) {
    const top = tornadoEntries.filter((t) => t.swing > 1e-6).slice(0, 4);
    for (const t of top) {
      const nodeId = t.param.targetType === 'node' ? t.param.targetId : t.param.targetType === 'behavior' ? doc.behaviors[t.param.targetId]?.ownerId : t.param.targetType === 'edge' ? doc.edges[t.param.targetId]?.targetNodeId : undefined;
      out.push({
        id: `inf:${t.param.targetId}:${t.param.path}`, kind: 'influence', severity: 'info', title: `Alta influencia: ${t.param.label}`,
        description: `Variar este parámetro ±20% cambia el resultado total entre ${fmt(t.resultLow)} y ${fmt(t.resultHigh)} (elasticidad ${t.elasticity.toFixed(2)}).`,
        nodeIds: nodeId ? [nodeId] : [], edgeIds: t.param.targetType === 'edge' ? [t.param.targetId] : [],
        rule: 'Análisis de sensibilidad ±20% (un parámetro cada vez)', data: [`Valor actual: ${fmt(t.base)}`],
        assumptions: nodeId ? assumptionsFor([nodeId]) : [], confidence: nodeId ? confidenceFor([nodeId]) : 'media',
      });
    }
  }

  // Cambios de comportamiento a lo largo del tiempo
  for (const id of model.simNodeIds) {
    let prevKey = '';
    for (let i = 0; i < N; i++) {
      const st = r.iterations[i].nodes[id];
      if (!st) continue;
      const key = `${st.active ? 'A' : 'I'}${st.saturated ? 'S' : ''}${st.blocked ? 'B' : ''}`;
      if (i > 0 && key !== prevKey) {
        const what = !st.active && prevKey.startsWith('A') ? 'se desactiva' : st.active && prevKey.startsWith('I') ? 'se activa' : st.saturated && !prevKey.includes('S') ? 'empieza a saturarse' : !st.saturated && prevKey.includes('S') ? 'deja de estar saturado' : st.blocked ? 'empieza a bloquear' : 'cambia de estado';
        out.push({
          id: `change:${id}:${i}`, kind: 'behavior-change', severity: 'info', title: `«${title(id)}» ${what} en la vuelta ${i + 1}`,
          description: 'El comportamiento del elemento cambia durante la simulación; conviene revisar qué condición o acumulación lo provoca.',
          nodeIds: [id], edgeIds: [], rule: 'Cambio de estado entre vueltas', data: [], assumptions: assumptionsFor([id]), confidence: confidenceFor([id]),
        });
        break;
      }
      prevKey = key;
    }
  }

  if (r.metrics.maxUnexplained > 1e-6) {
    out.push({
      id: 'conservation', kind: 'conservation', severity: 'critical', title: 'Unidades sin explicar',
      description: `El libro de conservación muestra una diferencia de ${r.metrics.maxUnexplained}.`, nodeIds: [], edgeIds: [],
      rule: 'Conservación del flujo', data: r.warnings, assumptions: [], confidence: 'alta',
    });
  }
  if (r.hypotheses.length || r.approximations.length) {
    out.push({
      id: 'hypothesis', kind: 'hypothesis', severity: 'info', title: 'Resultados basados en hipótesis y aproximaciones',
      description: `${r.hypotheses.length} supuesto(s) declarado(s) y ${r.approximations.length} interpretación(es) cualitativa(s). Los resultados deben leerse como exploración, no como predicción.`,
      nodeIds: [], edgeIds: [], rule: 'Trazabilidad de supuestos', data: [...r.hypotheses.slice(0, 6), ...r.approximations.slice(0, 6).map((a) => a.message)], assumptions: [], confidence: 'baja',
    });
  }
  const order: Record<Diagnostic['severity'], number> = { critical: 0, warning: 1, positive: 2, info: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
