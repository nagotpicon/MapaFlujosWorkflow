/**
 * MARCO ESPACIAL: cuando el lienzo está en modo cuadrícula, la posición de cada
 * elemento computa. Se traduce a parámetros normales del motor (retardos,
 * pérdidas, comportamientos con condición) antes de simular, de modo que todo
 * efecto queda registrado y es explicable.
 *
 *  · Columnas = tiempo. Columna 1 = ronda 1.
 *    - Una entrada empieza a generar en su columna.
 *    - Entre dos elementos conectados, cada columna de separación = 1 ronda de retardo.
 *    - Si el destino está ANTES que su origen (inversión temporal) se aplica una
 *      pérdida por columna (prisas / contradicción) y se avisa.
 *    - Fecha límite: lo que ocurre o llega después se penaliza o se corta.
 *  · Filas = apoyo / fricción respecto al eje central.
 *    - Por encima del eje: multiplica el flujo y suma influencia positiva.
 *    - Por debajo: reduce el flujo y resta influencia.
 */
import type { Behavior, Condition, MapNode, ProjectDoc } from '../core/model/schema';

export interface FrameCell { column: number; row: number }
export interface FrameResult { doc: ProjectDoc; notes: string[]; cells: Record<string, FrameCell> }

const DEFAULT_W = 190;
const DEFAULT_H = 64;

export function absolutePosition(doc: ProjectDoc, n: MapNode): { x: number; y: number } {
  let x = n.position.x;
  let y = n.position.y;
  let p = n.parentId ? doc.nodes[n.parentId] : undefined;
  const seen = new Set<string>();
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    x += p.position.x;
    y += p.position.y;
    p = p.parentId ? doc.nodes[p.parentId] : undefined;
  }
  return { x, y };
}

export function nodeCell(doc: ProjectDoc, n: MapNode): FrameCell {
  const f = doc.project.settings.frame;
  const pos = absolutePosition(doc, n);
  const cx = pos.x + (n.dimensions?.width ?? DEFAULT_W) / 2;
  const cy = pos.y + (n.dimensions?.height ?? DEFAULT_H) / 2;
  return {
    column: Math.max(1, Math.floor((cx - f.origin.x) / f.cellWidth) + 1),
    row: Math.round((f.origin.y - cy) / f.cellHeight),
  };
}

export function applyFrame(doc: ProjectDoc): FrameResult {
  const f = doc.project.settings.frame;
  if (!f || f.mode !== 'grid') return { doc, notes: [], cells: {} };
  const notes: string[] = [];
  const nodes = { ...doc.nodes };
  const edges = { ...doc.edges };
  const behaviors = { ...doc.behaviors };
  const conditions = { ...doc.conditions };
  const cells: Record<string, FrameCell> = {};
  const skip = new Set(['note', 'label', 'comment', 'group', 'container']);
  for (const n of Object.values(doc.nodes)) if (!skip.has(n.type)) cells[n.id] = nodeCell(doc, n);
  const unit = f.time.unitLabel.toLowerCase();

  const addBehavior = (nodeId: string, b: Behavior) => {
    behaviors[b.id] = b;
    nodes[nodeId] = { ...nodes[nodeId], behaviorIds: [...nodes[nodeId].behaviorIds, b.id] };
  };
  const mkBehavior = (nodeId: string, type: Behavior['behaviorType'], params: Behavior['parameters'], label: string, conds: string[] = []): Behavior => ({
    id: `frame:${type}:${nodeId}:${label.length}`, ownerId: nodeId, behaviorType: type, label, enabled: true, parameters: params,
    affectedDimensions: ['quantity'], conditions: conds, combinationRule: 'sequential', elseMode: 'inactive', elseParameters: {}, ranges: {}, sideEffects: [],
  });

  if (f.time.enabled) {
    // entradas: empiezan en su columna
    for (const n of Object.values(nodes)) {
      const cell = cells[n.id];
      if (!cell || cell.column <= 1) continue;
      for (const bid of n.behaviorIds) {
        const b = behaviors[bid];
        if (b?.behaviorType !== 'generator') continue;
        const start = Math.max(Number(b.parameters.startIteration ?? 1), cell.column);
        behaviors[bid] = { ...b, parameters: { ...b.parameters, startIteration: start } };
        notes.push(`«${n.title}» empieza a generar en ${unit} ${start} (columna del marco temporal)`);
      }
    }
    // conexiones de flujo: retardo por separación; inversión temporal penalizada
    for (const e of Object.values(edges)) {
      if (e.type !== 'flow') continue;
      const cs = cells[e.sourceNodeId];
      const ct = cells[e.targetNodeId];
      if (!cs || !ct || e.sourceNodeId === e.targetNodeId) continue;
      const gap = ct.column - cs.column;
      const s = doc.nodes[e.sourceNodeId].title;
      const t = doc.nodes[e.targetNodeId].title;
      if (gap > 0) {
        edges[e.id] = { ...e, delay: e.delay + gap };
        notes.push(`«${s}» → «${t}»: ${gap} ${unit}(s) de separación = ${gap} ronda(s) de retardo`);
      } else if (gap < 0 && !e.behavior.isFeedback && e.behavior.transport !== 'replicate') {
        const extra = 1 - Math.pow(1 - f.time.inversionPenalty, -gap);
        const loss = 1 - (1 - e.behavior.loss) * (1 - extra);
        edges[e.id] = { ...e, behavior: { ...e.behavior, loss } };
        notes.push(`Contradicción temporal: «${t}» está ${-gap} ${unit}(s) ANTES que su causa «${s}»; se aplica una pérdida del ${Math.round(extra * 100)}% (prisas)`);
      }
    }
    // fecha límite
    const dl = f.time.deadline;
    if (dl != null) {
      const ratio = f.time.latePolicy === 'cut' ? 1 : 1 - f.time.lateKeep;
      for (const n of Object.values(nodes)) {
        const cell = cells[n.id];
        if (!cell) continue;
        if (cell.column > dl) {
          addBehavior(n.id, mkBehavior(n.id, 'reducer', { mode: 'ratio', ratio }, 'Fuera de plazo (posición posterior a la fecha límite)'));
          notes.push(`«${n.title}» está colocado después de la fecha límite (${unit} ${dl}): ${f.time.latePolicy === 'cut' ? 'no cuenta' : `solo conserva el ${Math.round(f.time.lateKeep * 100)}%`}`);
        } else if (n.type === 'output') {
          const cid = `frame:deadline:${n.id}`;
          const cond: Condition = {
            id: cid, ownerId: n.id, ownerType: 'behavior', label: 'Después de la fecha límite', conditionType: 'iteration', operator: '>',
            operands: [{ kind: 'const', value: dl }],
            expr: { id: `${cid}:x`, conditionType: 'iteration', operator: '>', operands: [{ kind: 'const', value: dl }], children: [] },
            result: 'activate', activationRules: { mode: 'always', sustain: 1 },
          };
          conditions[cid] = cond;
          addBehavior(n.id, mkBehavior(n.id, 'reducer', { mode: 'ratio', ratio }, 'Resultado que llega fuera de plazo', [cid]));
        }
      }
      notes.push(`Fecha límite en ${unit} ${dl}: lo que llega después ${f.time.latePolicy === 'cut' ? 'no cuenta' : `vale el ${Math.round(f.time.lateKeep * 100)}%`}`);
    }
  }

  if (f.support.enabled) {
    for (const n of Object.values(nodes)) {
      const cell = cells[n.id];
      if (!cell || cell.row === 0) continue;
      const r = cell.row;
      if (r > 0) addBehavior(n.id, mkBehavior(n.id, 'multiplier', { factor: 1 + r * f.support.effectPerRow }, `Apoyo por posición (+${r} fila/s)`));
      else addBehavior(n.id, mkBehavior(n.id, 'reducer', { mode: 'ratio', ratio: Math.min(0.95, -r * f.support.effectPerRow) }, `Fricción por posición (${r} fila/s)`));
      const inf = nodes[n.id].weight.influence;
      const delta = r * f.support.influencePerRow;
      nodes[n.id] = {
        ...nodes[n.id],
        weight: { ...nodes[n.id].weight, influence: inf && inf.mode !== 'qualitative' ? { ...inf, value: inf.value + delta } : inf ?? { mode: 'weighted', value: delta, scaleId: null } },
      };
      notes.push(`«${n.title}» está ${Math.abs(r)} fila(s) ${r > 0 ? 'por encima (apoyo)' : 'por debajo (fricción)'} del eje: ${r > 0 ? '+' : '−'}${Math.round(Math.abs(r) * f.support.effectPerRow * 100)}% sobre su flujo`);
    }
  }
  return { doc: { ...doc, nodes, edges, behaviors, conditions }, notes, cells };
}
