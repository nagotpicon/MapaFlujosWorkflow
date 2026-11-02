/**
 * Convierte una propuesta del Explorador en elementos NATIVOS del mapa
 * (nodos, conexiones, comportamientos, anotaciones, capa). No crea un sistema
 * gráfico paralelo. Se aplica como una única operación deshacible.
 */
import type { MapNode, ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import { createAnnotation, createEmptyDoc, newId } from '../core/model/factory';
import { BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import type { Proposal, ProposalNode } from './shared/schemas';

export interface InsertOptions {
  mode: 'new' | 'current' | 'connect';
  anchorNodeId?: string | null;
  /** tempIds aceptados (por defecto todos) */
  accepted?: Set<string>;
  origin: 'ai' | 'template';
  sessionId?: string | null;
  sizeOf?: (id: string) => { width: number; height: number };
}

const ROLE_STYLE: Record<ProposalNode['role'], { color: string; icon: string | null; shape?: MapNode['visualStyle']['shape'] }> = {
  input: { color: 'blue', icon: 'Flag', shape: 'pill' }, resource: { color: 'cyan', icon: 'Wallet' }, condition: { color: 'amber', icon: null, shape: 'diamond' },
  action: { color: 'slate', icon: null }, transformation: { color: 'violet', icon: null }, result: { color: 'emerald', icon: 'Target', shape: 'pill' },
  limitation: { color: 'rose', icon: 'Minimize2' }, friction: { color: 'rose', icon: 'Flame' }, mitigator: { color: 'emerald', icon: 'ShieldCheck' },
  alternative: { color: 'cyan', icon: 'RotateCcw' }, metric: { color: 'slate', icon: 'Gauge' }, experiment: { color: 'amber', icon: 'Sparkles' }, unknown: { color: 'slate', icon: null },
};

const EVIDENCE_CONF: Record<ProposalNode['evidence'], MapNode['metadata']['confidence']> = {
  confirmed: 'verified', observed: 'observation', estimate: 'estimate', hypothesis: 'hypothesis', preference: 'estimate', unknown: 'hypothesis',
};

function layout(p: Proposal, accepted: Set<string>): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const roleOf = (id: string) => p.nodes.find((n) => n.tempId === id)?.role;
  let main = p.edges.filter((e) => e.type === 'flow' && e.role === 'main' && accepted.has(e.from) && accepted.has(e.to) && e.from !== e.to);
  // quitar aristas que cierran ciclos (retroalimentación) para calcular columnas
  const adj = new Map<string, typeof main>();
  for (const e of main) { if (!adj.has(e.from)) adj.set(e.from, []); adj.get(e.from)!.push(e); }
  const color = new Map<string, number>();
  const back = new Set<(typeof main)[number]>();
  const dfs = (v: string) => {
    color.set(v, 1);
    for (const e of adj.get(v) ?? []) {
      const c = color.get(e.to) ?? 0;
      if (c === 1) back.add(e);
      else if (c === 0) dfs(e.to);
    }
    color.set(v, 2);
  };
  const order = [...p.nodes].sort((a, b) => (a.role === 'input' ? -1 : 0) - (b.role === 'input' ? -1 : 0)).map((n) => n.tempId);
  for (const id of order) if (!color.get(id)) dfs(id);
  main = main.filter((e) => !back.has(e) && roleOf(e.from) !== 'result');
  const col = new Map<string, number>();
  const indeg = new Map<string, number>();
  for (const e of main) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const queue = p.nodes.filter((n) => accepted.has(n.tempId) && !indeg.get(n.tempId) && main.some((e) => e.from === n.tempId)).map((n) => n.tempId);
  for (const s0 of queue) col.set(s0, 0);
  while (queue.length) {
    const v = queue.shift()!;
    for (const e of main.filter((x) => x.from === v)) {
      col.set(e.to, Math.max(col.get(e.to) ?? 0, (col.get(v) ?? 0) + 1));
      indeg.set(e.to, (indeg.get(e.to) ?? 1) - 1);
      if (indeg.get(e.to) === 0) queue.push(e.to);
    }
  }
  const W = 270;
  const usedRows = new Map<number, number>();
  const place = (id: string, c: number, baseRow: number) => {
    const key = c * 100 + baseRow;
    const k = usedRows.get(key) ?? 0;
    usedRows.set(key, k + 1);
    pos.set(id, { x: c * W, y: baseRow * 130 + k * 100 * Math.sign(baseRow || 1) });
  };
  for (const [id, c] of col) place(id, c, 0);
  const targetCol = (id: string) => {
    const e = p.edges.find((x) => x.from === id && accepted.has(x.to) && col.has(x.to));
    return e ? col.get(e.to)! : Math.max(0, ...col.values()) + 1;
  };
  for (const n of p.nodes) {
    if (pos.has(n.tempId) || !accepted.has(n.tempId)) continue;
    if (n.role === 'friction' || n.role === 'limitation') place(n.tempId, targetCol(n.tempId), 2);
  }
  for (const n of p.nodes) {
    if (pos.has(n.tempId) || !accepted.has(n.tempId)) continue;
    if (n.role === 'mitigator') {
      const tgt = p.edges.find((e) => e.from === n.tempId && pos.has(e.to));
      const tp = tgt ? pos.get(tgt.to)! : { x: 0, y: 0 };
      place(n.tempId, Math.round(tp.x / W), 4 + Math.floor(Math.max(0, tp.y - 260) / 130));
    }
  }
  let extraCol = 0;
  for (const n of p.nodes) {
    if (pos.has(n.tempId) || !accepted.has(n.tempId)) continue;
    if (n.role === 'resource' || n.role === 'condition') place(n.tempId, targetCol(n.tempId), -2);
    else if (n.role === 'alternative') place(n.tempId, extraCol++ % 4 + 1, -3);
    else place(n.tempId, Math.max(0, ...col.values()) + 1 + Math.floor(extraCol++ / 3), 0);
  }
  return pos;
}

export function insertProposal(docIn: ProjectDoc, p: Proposal, opts: InsertOptions): { doc: ProjectDoc; nodeIds: string[]; idMap: Map<string, string> } {
  let doc = opts.mode === 'new' ? createEmptyDoc(p.discovery.topic || 'Exploración') : docIn;
  if (opts.mode === 'new') doc = { ...doc, project: { ...doc.project, description: p.discovery.summary } };
  const accepted = opts.accepted ?? new Set(p.nodes.map((n) => n.tempId));
  const pos = layout(p, accepted);
  // desplazamiento a la derecha del contenido existente
  let ox = 0;
  let oy = 0;
  if (opts.mode !== 'new') {
    const ns = Object.values(doc.nodes).filter((n) => !n.parentId);
    if (ns.length) {
      ox = Math.max(...ns.map((n) => n.position.x + (n.dimensions?.width ?? 200))) + 260;
      oy = Math.min(...ns.map((n) => n.position.y));
    }
  }
  const layerRes = op.addLayer(doc, `Explorador · ${(p.discovery.topic || 'propuesta').slice(0, 30)}`, '#8b5cf6');
  doc = layerRes.doc;
  const layerId = layerRes.id;
  const idMap = new Map<string, string>();
  const created: string[] = [];
  for (const n of p.nodes) {
    if (!accepted.has(n.tempId)) continue;
    const style = ROLE_STYLE[n.role];
    const isInput = n.role === 'input';
    const pp = pos.get(n.tempId) ?? { x: 0, y: 0 };
    const res = op.addNode(doc, isInput ? 'input' : n.role === 'result' ? 'output' : n.role === 'metric' || n.role === 'experiment' ? 'note' : 'bubble', {
      title: n.title,
      description: [n.description, n.mitigation && `Posible mitigador: ${n.mitigation}`, n.alternativeRoute && `Ruta alternativa: ${n.alternativeRoute}`].filter(Boolean).join('\n'),
      position: { x: pp.x + ox, y: pp.y + oy },
      layerIds: [layerId],
      tags: [n.role === 'friction' ? `fricción-${n.frictionCategory ?? 'sin-clasificar'}` : n.role].filter(Boolean),
      visualStyle: { shape: style.shape ?? (isInput || n.role === 'result' ? 'pill' : 'rounded'), color: style.color, icon: style.icon, borderStyle: n.confirmed ? 'solid' : 'dashed' } as never,
      metadata: {
        confidence: EVIDENCE_CONF[n.evidence],
        discovery: {
          origin: opts.origin, status: n.confirmed ? 'confirmed' : 'suggested', role: n.role, frictionCategory: n.frictionCategory, controllability: n.controllability,
          resolution: 'pending', frequency: n.frequency, intensity: n.intensity, cost: n.cost, probability: n.probability, detectability: n.detectability,
          stage: n.stage, evidence: n.evidence, sourceRef: n.sourceRef, sessionId: opts.sessionId ?? null,
        },
      } as never,
    });
    doc = res.doc;
    const id = res.id;
    idMap.set(n.tempId, id);
    created.push(id);
    // peso: solo si existe; si es sugerencia queda marcado como hipótesis
    if (n.weight != null) doc = op.updateNode(doc, id, { weight: { importance: null, influence: { mode: 'weighted', value: n.weight, scaleId: null }, impact: null } });
    // entrada: valor del usuario o índice base 100 claramente identificado
    if (isInput) {
      const sp = p.startingPoint;
      const hasValue = sp.initialValue != null && n.tempId === p.nodes.find((x) => x.role === 'input')?.tempId;
      const value = hasValue ? sp.initialValue! : n.value ?? 100;
      doc = op.updateNode(doc, id, {
        dimensionValues: { quantity: { value, mode: 'numeric', unit: (hasValue ? sp.unit : n.unit) ?? '', confidence: hasValue || n.value != null ? 'estimate' : 'hypothesis', source: hasValue || n.value != null ? 'Dato del usuario' : 'Índice base 100 (no es un dato: los resultados se leen como % de la entrada)', range: null } },
        description: `${doc.nodes[id].description}${hasValue || n.value != null ? '' : '\nValor: índice base 100 (sin dato real todavía).'}`,
      });
    }
    if (n.behavior && BEHAVIOR_LIBRARY[n.behavior.type]) {
      const params: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(n.behavior.params ?? {})) if (BEHAVIOR_LIBRARY[n.behavior.type].params.some((s) => s.key === k)) params[k] = v;
      doc = op.addBehavior(doc, id, n.behavior.type, params).doc;
    }
  }
  for (const e of p.edges) {
    const s = idMap.get(e.from);
    const t = idMap.get(e.to);
    if (!s || !t) continue;
    const isFeedback = e.type === 'flow' && ['result', 'mitigator'].includes(p.nodes.find((x) => x.tempId === e.from)?.role ?? '') && (pos.get(e.to)?.x ?? 0) < (pos.get(e.from)?.x ?? 0);
    doc = op.addEdge(doc, s, t, e.type, {
      behavior: {
        role: e.role, polarity: e.polarity,
        ...(isFeedback ? { transport: 'replicate', multiplier: 0, isFeedback: true } : {}),
        ...(e.type === 'causal' ? { influence: { mode: e.mode, targetDimension: 'quantity', sensitivity: 0.25, compensationType: 'partial', compensationUnit: 'points', amount: 1, fromIteration: 1, toIteration: null } } : {}),
      },
      visualStyle: {
        label: isFeedback ? `${e.label || 'retorno'} (define el %)` : e.label,
        sourceAnchor: e.type === 'causal' ? 'top' : isFeedback ? 'bottom' : 'right',
        targetAnchor: e.type === 'causal' ? 'bottom' : isFeedback ? 'bottom' : 'left',
      },
    }).doc;
  }
  // anotaciones del proyecto: supuestos, incógnitas, alternativas, experimento
  const pid = doc.project.id;
  const notes = [
    ...p.assumptions.map((t) => createAnnotation('project', pid, t, { kind: 'hypothesis', author: opts.origin === 'ai' ? 'Explorador (IA)' : 'Explorador (plantilla)', labels: ['supuesto'] })),
    ...p.unknowns.map((t) => createAnnotation('project', pid, t, { kind: 'question', author: 'Explorador', labels: ['incertidumbre'] })),
  ];
  const annotations = { ...doc.annotations };
  for (const a of notes) annotations[a.id] = a;
  doc = { ...doc, annotations };
  const maxX = Math.max(0, ...created.map((id) => doc.nodes[id].position.x));
  const minY = Math.min(0, ...created.map((id) => doc.nodes[id].position.y));
  const summary = [
    `PRIMER EXPERIMENTO: ${p.experiments[0] ? `${p.experiments[0].name} — ${p.experiments[0].test}${p.experiments[0].confirmIf ? `\nConfirma si: ${p.experiments[0].confirmIf}` : ''}${p.experiments[0].stopWhen ? `\nParar si: ${p.experiments[0].stopWhen}` : ''}` : '—'}`,
    p.unknowns.length ? `\nINCERTIDUMBRES:\n${p.unknowns.slice(0, 6).map((u) => `• ${u}`).join('\n')}` : '',
    p.recommendedNextAction ? `\nSIGUIENTE PASO: ${p.recommendedNextAction}` : '',
  ].join('');
  const note = op.addNode(doc, 'note', { title: summary, position: { x: maxX + 300, y: minY }, dimensions: { width: 320, height: 240 }, layerIds: [layerId] });
  doc = note.doc;
  created.push(note.id);
  if (p.alternatives.length) {
    const alt = op.addNode(doc, 'note', {
      title: `ESTRATEGIAS ALTERNATIVAS\n${p.alternatives.slice(0, 5).map((a) => `• ${a.name}: ${a.description}${a.advantages ? ` (+ ${a.advantages})` : ''}${a.limitations ? ` (− ${a.limitations})` : ''}`).join('\n')}`,
      position: { x: maxX + 300, y: minY + 280 }, dimensions: { width: 320, height: 220 }, layerIds: [layerId],
    });
    doc = alt.doc;
    created.push(alt.id);
  }
  if (opts.mode === 'connect' && opts.anchorNodeId && doc.nodes[opts.anchorNodeId]) {
    const start = idMap.get(p.nodes.find((n) => n.role === 'input' && accepted.has(n.tempId))?.tempId ?? '') ?? created[0];
    if (start) doc = op.addEdge(doc, opts.anchorNodeId, start, 'conceptual', { visualStyle: { label: 'explorado' } }).doc;
  }
  void newId;
  return { doc, nodeIds: created, idMap };
}
