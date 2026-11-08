/**
 * TERMÓMETRO DE CALOR
 * Temperatura en [-1, 1] por elemento y vuelta:
 *   < -0.33  frío        (sin flujo / infrautilizado / bloqueado)
 *   ±0.33    ritmo       (utilización sana, sin fricción relevante)
 *   > 0.33   caliente    (presión, fricción, prisas)
 *   > 0.75   recalentado (saturación sostenida, colas que crecen, pérdidas fuertes)
 * Cada valor incluye las causas que lo explican.
 */
import type { ProjectDoc } from '../core/model/schema';
import { applyFrame, nodeCell } from './frame';
import { PRIMARY, qty } from './packet';
import type { SimulationResult } from './types';

export type HeatState = 'cold' | 'rhythm' | 'warm' | 'overheated' | 'idle';

export interface HeatReading {
  temperature: number;
  state: HeatState;
  utilization: number | null;
  causes: string[];
}

export interface HeatMap {
  /** nodeId -> lecturas por vuelta */
  nodes: Record<string, HeatReading[]>;
  /** media por nodo (ponderada por actividad) */
  nodeAvg: Record<string, HeatReading>;
  /** zonas del marco: "col:row" -> lecturas por vuelta (solo modo cuadrícula) */
  zones: Record<string, { column: number; row: number; readings: HeatReading[]; avg: HeatReading }>;
  /** temperatura global por vuelta */
  global: number[];
}

export function heatState(t: number, active = true): HeatState {
  if (!active) return 'idle';
  if (t > 0.75) return 'overheated';
  if (t > 0.33) return 'warm';
  if (t < -0.33) return 'cold';
  return 'rhythm';
}

export const HEAT_LABEL: Record<HeatState, string> = {
  cold: 'Frío: le falta', rhythm: 'A buen ritmo', warm: 'Caliente', overheated: 'Agobiado', idle: 'Sin actividad',
};

function capacityOf(doc: ProjectDoc, nodeId: string): number | null {
  const n = doc.nodes[nodeId];
  if (!n) return null;
  const caps: number[] = [];
  for (const bid of n.behaviorIds) {
    const b = doc.behaviors[bid];
    if (b?.enabled && b.behaviorType === 'restrictor' && typeof b.parameters.capacity === 'number') caps.push(b.parameters.capacity);
  }
  for (const pid of n.portIds) {
    const p = doc.ports[pid];
    if (p?.direction !== 'out' && p?.capacity != null) caps.push(p.capacity);
  }
  return caps.length ? Math.min(...caps) : null;
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));

export function computeHeat(doc: ProjectDoc, r: SimulationResult): HeatMap {
  const framed = applyFrame(doc).doc;
  const nodes: HeatMap['nodes'] = {};
  const ids = new Set<string>();
  for (const it of r.iterations) for (const id of Object.keys(it.nodes)) ids.add(id);
  const peak: Record<string, number> = {};
  for (const it of r.iterations) for (const [id, st] of Object.entries(it.nodes)) {
    const thr = qty(st.in) + (st.generated[PRIMARY] ?? 0) + (st.released[PRIMARY] ?? 0);
    peak[id] = Math.max(peak[id] ?? 0, thr);
  }
  const lateEvents = new Map<string, number>();
  for (const it of r.iterations) for (const ev of it.events) {
    if (ev.nodeId && /plazo/i.test(ev.mechanism + ev.message)) lateEvents.set(`${it.iteration}:${ev.nodeId}`, 1);
  }
  const inversion = new Set<string>();
  for (const note of r.frameNotes ?? []) {
    const m = note.match(/«([^»]+)» está \d+ .* ANTES/);
    if (m) for (const n of Object.values(doc.nodes)) if (n.title === m[1]) inversion.add(n.id);
  }

  for (const id of ids) {
    const cap = capacityOf(framed, id);
    let prevQueue = 0;
    const readings: HeatReading[] = [];
    for (const it of r.iterations) {
      const st = it.nodes[id];
      if (!st) { readings.push({ temperature: 0, state: 'idle', utilization: null, causes: [] }); continue; }
      const thr = qty(st.in) + (st.generated[PRIMARY] ?? 0) + (st.released[PRIMARY] ?? 0);
      const queue = st.queue[PRIMARY] ?? 0;
      const lost = st.lost[PRIMARY] ?? 0;
      const causes: string[] = [];
      let t = 0;
      let utilization: number | null = null;
      if (!st.active) {
        readings.push({ temperature: -0.6, state: 'cold', utilization: null, causes: ['Inactivo (condición no cumplida)'] });
        continue;
      }
      if (thr + queue <= 1e-9) {
        const starving = (peak[id] ?? 0) > 1e-9;
        readings.push({ temperature: starving ? -0.8 : 0, state: starving ? 'cold' : 'idle', utilization: cap ? 0 : null, causes: starving ? ['Sin flujo en esta vuelta'] : [] });
        prevQueue = queue;
        continue;
      }
      if (cap != null && cap > 0) {
        utilization = (thr) / cap;
        if (utilization > 1) { t += Math.min(1, 0.4 + (utilization - 1) * 1.2); causes.push(`Le llegan más de las que caben: ${Math.round(utilization * 100)} % de su sitio (${thr.toFixed(1)} de ${cap})`); }
        else if (utilization >= 0.6) causes.push(`Va al ${Math.round(utilization * 100)} % de lo que puede`);
        else { t -= Math.min(0.9, (0.6 - utilization) * 1.6); causes.push(`Le sobra sitio: usa solo el ${Math.round(utilization * 100)} % de lo que puede`); }
      } else if ((peak[id] ?? 0) > 1e-9) {
        const rel = thr / peak[id];
        if (rel < 0.3) { t -= (0.3 - rel) * 2; causes.push(`Le llega poco: el ${Math.round(rel * 100)} % de lo más que le ha llegado`); }
      }
      if (queue > prevQueue + 1e-6) { t += 0.3; causes.push(`Cada vez hay más esperando turno (${prevQueue.toFixed(1)} → ${queue.toFixed(1)})`); }
      prevQueue = queue;
      if (st.saturated && !(utilization != null && utilization > 1)) { t += 0.45; causes.push('Está lleno'); }
      const lossRate = thr > 0 ? lost / thr : 0;
      if (lossRate > 0.05) { t += Math.min(0.6, lossRate * 0.9); causes.push(`Aquí se pierde el ${Math.round(lossRate * 100)} %`); }
      if (st.blocked) { t -= 0.5; causes.push('Corta el paso'); }
      if (lateEvents.has(`${it.iteration}:${id}`)) { t += 0.35; causes.push('Llega tarde (después de la fecha límite)'); }
      if (inversion.has(id)) { t += 0.3; causes.push('Va con prisas: está antes que lo que lo causa'); }
      const temperature = clamp(t);
      if (causes.length === 0) causes.push('Todo pasa bien, sin frenos');
      readings.push({ temperature, state: heatState(temperature), utilization, causes });
    }
    nodes[id] = readings;
  }

  const avgOf = (rs: HeatReading[]): HeatReading => {
    const act = rs.filter((x) => x.state !== 'idle');
    if (!act.length) return { temperature: 0, state: 'idle', utilization: null, causes: [] };
    const t = act.reduce((s, x) => s + x.temperature, 0) / act.length;
    const utils = act.map((x) => x.utilization).filter((u): u is number => u != null);
    const counts = new Map<string, number>();
    for (const x of act) for (const c of x.causes) { const k = c.replace(/[\d.,]+/g, '#'); counts.set(k, (counts.get(k) ?? 0) + 1); }
    const worst = [...act].sort((a, b) => Math.abs(b.temperature) - Math.abs(a.temperature))[0];
    return { temperature: t, state: heatState(t), utilization: utils.length ? utils.reduce((s, u) => s + u, 0) / utils.length : null, causes: worst.causes };
  };
  const nodeAvg: HeatMap['nodeAvg'] = {};
  for (const [id, rs] of Object.entries(nodes)) nodeAvg[id] = avgOf(rs);

  const zones: HeatMap['zones'] = {};
  if (doc.project.settings.frame?.mode === 'grid') {
    for (const id of Object.keys(nodes)) {
      const n = doc.nodes[id];
      if (!n) continue;
      const cell = nodeCell(doc, n);
      const key = `${cell.column}:${cell.row}`;
      if (!zones[key]) zones[key] = { column: cell.column, row: cell.row, readings: [], avg: { temperature: 0, state: 'idle', utilization: null, causes: [] } };
    }
    for (const z of Object.values(zones)) {
      const members = Object.keys(nodes).filter((id) => { const c = nodeCell(doc, doc.nodes[id]); return c.column === z.column && c.row === z.row; });
      z.readings = r.iterations.map((_, i) => {
        const rs = members.map((m) => nodes[m][i]).filter((x) => x.state !== 'idle');
        if (!rs.length) return { temperature: 0, state: 'idle' as const, utilization: null, causes: [] };
        const hottest = [...rs].sort((a, b) => Math.abs(b.temperature) - Math.abs(a.temperature))[0];
        const t = rs.reduce((s, x) => s + x.temperature, 0) / rs.length;
        return { temperature: t, state: heatState(t), utilization: null, causes: hottest.causes };
      });
      z.avg = avgOf(z.readings);
    }
  }
  const global = r.iterations.map((_, i) => {
    const vals = Object.values(nodes).map((rs) => rs[i]).filter((x) => x && x.state !== 'idle');
    return vals.length ? vals.reduce((s, x) => s + x.temperature, 0) / vals.length : 0;
  });
  return { nodes, nodeAvg, zones, global };
}
