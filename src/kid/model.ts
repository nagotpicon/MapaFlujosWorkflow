/**
 * MODO FÁCIL · «el camino».
 *
 * Una forma de pensar que entiende cualquiera (también un niño de 8 años):
 *
 *   🌱 Hoy ──👣 paso──👣 paso──▶ 🎯 Lo que quiero
 *                 ▲
 *              🪨 piedra  ◀── 🤝 ayuda
 *
 * Por el camino viajan tus «empujones» (10 en cada vuelta). Las piedras se
 * quedan con una parte; las ayudas hacen las piedras más pequeñas. Al final se
 * cuenta cuántos de cada 10 llegan a lo que quieres.
 *
 * Todo se monta sobre el motor de siempre, sin trucos:
 *   Hoy       → entrada (input) que genera 10 por ronda
 *   Paso      → burbuja en una cadena de uniones «Pasa» (flow)
 *   Meta      → salida (output)
 *   Piedra    → burbuja con influencia negativa (−1, −3 o −5) y una unión
 *               «Influye» (causal, modula) hacia el paso que frena
 *   Ayuda     → burbuja con una unión «Influye» que compensa la piedra
 *   Razón, «Cómo me siento», Pregunta, Idea → ideas unidas sin efecto
 *
 * El papel se guarda en `metadata.custom.papel`. Si falta, se deduce de la
 * estructura, así también se leen los mapas hechos en el nivel 3 o por una IA.
 */
import type { MapEdge, MapNode, ProjectDoc } from '../core/model/schema';
import { defaultEdgeBehavior } from '../core/model/factory';
import * as op from '../core/operations';

type Influence = MapEdge['behavior']['influence'];
const inf = (p: Partial<Influence>): Influence => ({ ...defaultEdgeBehavior().influence, ...p });
const FRENA = () => ({ behavior: { influence: inf({ mode: 'modulate', targetDimension: 'quantity', sensitivity: SENSIBILIDAD }) } });
const AYUDA = (amount: number) => ({ behavior: { influence: inf({ mode: 'compensate', compensationType: 'partial', compensationUnit: 'points', amount }) } });

export type Papel = 'hoy' | 'meta' | 'paso' | 'piedra' | 'ayuda' | 'razon' | 'siento' | 'pregunta' | 'idea';
export type Tamano = 'pequena' | 'mediana' | 'grande';
export type Fuerza = 'poco' | 'bastante' | 'mucho';

export const PAPELES: Papel[] = ['paso', 'piedra', 'ayuda', 'meta', 'hoy', 'idea', 'razon', 'siento', 'pregunta'];

export const PAPEL: Record<Papel, { emoji: string; name: string; hint: string; color: string }> = {
  idea: { emoji: '💡', name: 'Idea', hint: 'Algo que se te ocurre', color: 'slate' },
  hoy: { emoji: '🌱', name: 'Hoy', hint: 'Cómo está la cosa ahora', color: 'blue' },
  meta: { emoji: '🎯', name: 'Lo que quiero', hint: 'A dónde quieres llegar', color: 'emerald' },
  paso: { emoji: '👣', name: 'Paso', hint: 'Algo que harás para llegar', color: 'amber' },
  piedra: { emoji: '🪨', name: 'Piedra', hint: 'Algo que te frena', color: 'rose' },
  ayuda: { emoji: '🤝', name: 'Ayuda', hint: 'Algo o alguien que te echa una mano', color: 'cyan' },
  razon: { emoji: '💛', name: 'Por qué me importa', hint: 'Tus razones: te dan fuerza', color: 'pink' },
  siento: { emoji: '❤️', name: 'Cómo me siento', hint: 'Lo que sientes también cuenta', color: 'pink' },
  pregunta: { emoji: '❓', name: 'Pregunta', hint: 'Algo que quieres averiguar', color: 'violet' },
};

export const TAMANO: Record<Tamano, { label: string; value: number }> = {
  pequena: { label: 'Pequeña', value: -1 },
  mediana: { label: 'Mediana', value: -3 },
  grande: { label: 'Grande', value: -5 },
};
export const FUERZA: Record<Fuerza, { label: string; amount: number }> = {
  poco: { label: 'Un poco', amount: 1 },
  bastante: { label: 'Bastante', amount: 2 },
  mucho: { label: 'Mucho', amount: 4 },
};
/** Una piedra grande (−5) deja pasar la mitad; una mediana, el 70 %; una pequeña, el 90 %. */
export const SENSIBILIDAD = 0.5;
/** Empujones que salen de «Hoy» en cada vuelta. */
export const EMPUJONES = 10;

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

export interface EdgeIndex { out: Map<string, MapEdge[]>; in: Map<string, MapEdge[]> }

export function indexEdges(doc: ProjectDoc): EdgeIndex {
  const out = new Map<string, MapEdge[]>();
  const inn = new Map<string, MapEdge[]>();
  for (const e of Object.values(doc.edges)) {
    (out.get(e.sourceNodeId) ?? out.set(e.sourceNodeId, []).get(e.sourceNodeId)!).push(e);
    (inn.get(e.targetNodeId) ?? inn.set(e.targetNodeId, []).get(e.targetNodeId)!).push(e);
  }
  return { out, in: inn };
}

const isCompensate = (e: MapEdge) => e.type === 'causal' && e.behavior.influence.mode === 'compensate';
const isModulate = (e: MapEdge) => e.type === 'causal' && e.behavior.influence.mode !== 'compensate';
const numInfluence = (n: MapNode) => (n.weight.influence && n.weight.influence.mode !== 'qualitative' ? n.weight.influence.value : 0);

export function papelOf(doc: ProjectDoc, n: MapNode, idx: EdgeIndex = indexEdges(doc)): Papel | null {
  const p = n.metadata.custom?.papel as Papel | undefined;
  if (p && p in PAPEL) return p;
  if (n.type === 'input') return 'hoy';
  if (n.type === 'output') return 'meta';
  if (n.type !== 'bubble') return null;
  const outs = idx.out.get(n.id) ?? [];
  if (outs.some(isCompensate)) return 'ayuda';
  const inf = numInfluence(n);
  if (inf < 0 && outs.some(isModulate)) return 'piedra';
  if (inf > 0 && outs.some(isModulate)) return 'ayuda';
  const ins = idx.in.get(n.id) ?? [];
  if (outs.some((e) => e.type === 'flow') || ins.some((e) => e.type === 'flow')) return 'paso';
  return 'idea';
}

export const tamanoOf = (n: MapNode): Tamano => {
  const t = n.metadata.custom?.tamano as Tamano | undefined;
  if (t && t in TAMANO) return t;
  const v = numInfluence(n);
  return v <= -4 ? 'grande' : v <= -2 ? 'mediana' : 'pequena';
};
export const fuerzaOf = (doc: ProjectDoc, n: MapNode, idx: EdgeIndex = indexEdges(doc)): Fuerza => {
  const f = n.metadata.custom?.fuerza as Fuerza | undefined;
  if (f && f in FUERZA) return f;
  const a = (idx.out.get(n.id) ?? []).find(isCompensate)?.behavior.influence.amount ?? 2;
  return a >= 3 ? 'mucho' : a >= 2 ? 'bastante' : 'poco';
};
export const isHecho = (n: MapNode) => n.metadata.custom?.hecho === '1';
export const isPrimero = (n: MapNode) => n.metadata.custom?.primero === '1';

/** A qué frena una piedra (el destino de su unión «Influye»). */
export function objetivoDe(doc: ProjectDoc, id: string, idx: EdgeIndex = indexEdges(doc)): string | null {
  return (idx.out.get(id) ?? []).find(isModulate)?.targetNodeId ?? null;
}
/** Con qué piedra ayuda una ayuda. */
export function piedraDe(doc: ProjectDoc, id: string, idx: EdgeIndex = indexEdges(doc)): string | null {
  return (idx.out.get(id) ?? []).find(isCompensate)?.targetNodeId ?? null;
}

export interface Camino {
  roles: Map<string, Papel>;
  hoy: MapNode | null;
  meta: MapNode | null;
  /** pasos en orden, del primero al último (sin Hoy ni la meta) */
  pasos: MapNode[];
  /** pasos que no están en el camino de Hoy a la meta */
  sueltos: MapNode[];
  piedras: MapNode[];
  ayudas: MapNode[];
  razones: MapNode[];
  sientos: MapNode[];
  preguntas: MapNode[];
  ideas: MapNode[];
  /** hay un camino de uniones «Pasa» desde Hoy hasta la meta */
  conectado: boolean;
  /** el camino es una cadena simple (se pueden cambiar los pasos de orden) */
  simple: boolean;
  idx: EdgeIndex;
}

const byX = (a: MapNode, b: MapNode) => a.position.x - b.position.x || a.createdAt - b.createdAt;

export function leerCamino(doc: ProjectDoc): Camino {
  const idx = indexEdges(doc);
  const roles = new Map<string, Papel>();
  const lists: Record<Papel, MapNode[]> = { idea: [], hoy: [], meta: [], paso: [], piedra: [], ayuda: [], razon: [], siento: [], pregunta: [] };
  for (const n of Object.values(doc.nodes)) {
    if (n.hidden || n.aliasOf) continue;
    const p = papelOf(doc, n, idx);
    if (!p) continue;
    roles.set(n.id, p);
    lists[p].push(n);
  }
  for (const l of Object.values(lists)) l.sort(byX);
  const hoy = lists.hoy[0] ?? null;
  const meta = lists.meta[lists.meta.length - 1] ?? null;
  // camino: búsqueda en profundidad por uniones «Pasa» de Hoy a la meta
  let path: string[] = [];
  if (hoy && meta) {
    const seen = new Set<string>();
    const dfs = (id: string, acc: string[]): string[] | null => {
      if (id === meta.id) return [...acc, id];
      if (seen.has(id)) return null;
      seen.add(id);
      const outs = (idx.out.get(id) ?? []).filter((e) => e.type === 'flow' && !e.behavior.isFeedback && doc.nodes[e.targetNodeId]);
      outs.sort((a, b) => byX(doc.nodes[a.targetNodeId], doc.nodes[b.targetNodeId]));
      for (const e of outs) {
        const r = dfs(e.targetNodeId, [...acc, id]);
        if (r) return r;
      }
      return null;
    };
    path = dfs(hoy.id, []) ?? [];
  }
  const conectado = path.length >= 2;
  const onPath = new Set(path);
  const pasos = path.slice(1, -1).map((id) => doc.nodes[id]);
  const sueltos = lists.paso.filter((n) => !onPath.has(n.id));
  // simple: cada nodo del camino tiene como mucho una unión «Pasa» de entrada y otra de salida
  const simple = !conectado || path.every((id, i) => {
    const outs = (idx.out.get(id) ?? []).filter((e) => e.type === 'flow');
    const ins = (idx.in.get(id) ?? []).filter((e) => e.type === 'flow');
    return (i === path.length - 1 || outs.length === 1) && (i === 0 || ins.length === 1);
  });
  return {
    roles, hoy, meta, pasos, sueltos, conectado, simple, idx,
    piedras: lists.piedra, ayudas: lists.ayuda, razones: lists.razon, sientos: lists.siento, preguntas: lists.pregunta, ideas: lists.idea,
  };
}

/** Lo principal del mapa: la primera idea creada (la del centro). */
export function ideaCentral(doc: ProjectDoc): MapNode | null {
  const ns = Object.values(doc.nodes).filter((n) => ['bubble', 'input', 'output'].includes(n.type) && !n.hidden);
  return ns.sort((a, b) => a.createdAt - b.createdAt)[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Escritura (operaciones puras doc → doc)                             */
/* ------------------------------------------------------------------ */

function setCustom(doc: ProjectDoc, id: string, patch: Record<string, string | null>): ProjectDoc {
  const n = doc.nodes[id];
  if (!n) return doc;
  const c: Record<string, string> = { ...n.metadata.custom };
  for (const [k, v] of Object.entries(patch)) { if (v == null) delete c[k]; else c[k] = v; }
  return op.updateNode(doc, id, { metadata: { ...n.metadata, custom: c } });
}

function styleFor(doc: ProjectDoc, id: string, papel: Papel): ProjectDoc {
  const n = doc.nodes[id];
  const big = papel === 'hoy' || papel === 'meta';
  return op.updateNode(doc, id, {
    visualStyle: {
      ...n.visualStyle, color: PAPEL[papel].color, background: null, icon: null,
      shape: big ? 'pill' : 'rounded', fontFamily: big ? 'serif' : 'sans', fontSize: big ? 17 : 14, fontWeight: big ? 600 : 500,
      borderStyle: papel === 'piedra' ? 'solid' : n.visualStyle.borderStyle === 'none' ? 'solid' : n.visualStyle.borderStyle,
    },
  });
}

const flowEdges = (doc: ProjectDoc, a: string, b: string) => Object.values(doc.edges).filter((e) => e.type === 'flow' && e.sourceNodeId === a && e.targetNodeId === b);
function link(doc: ProjectDoc, a: string, b: string): ProjectDoc {
  if (a === b || flowEdges(doc, a, b).length) return doc;
  return op.addEdge(doc, a, b, 'flow').doc;
}
function unlink(doc: ProjectDoc, a: string, b: string): ProjectDoc {
  const ids = flowEdges(doc, a, b).map((e) => e.id);
  return ids.length ? op.deleteElements(doc, [], ids) : doc;
}
function conceptual(doc: ProjectDoc, a: string, b: string): ProjectDoc {
  if (a === b) return doc;
  const exists = Object.values(doc.edges).some((e) => (e.sourceNodeId === a && e.targetNodeId === b) || (e.sourceNodeId === b && e.targetNodeId === a));
  return exists ? doc : op.addEdge(doc, a, b, 'conceptual').doc;
}

/** Saca un elemento del camino y le quita su efecto, para darle otro papel. */
export function soltar(doc: ProjectDoc, id: string): ProjectDoc {
  let d = doc;
  const n = d.nodes[id];
  if (!n) return d;
  const c = leerCamino(d);
  const papel = c.roles.get(id);
  // 1. si estaba en el camino, sus vecinos se unen entre sí
  const chain = [c.hoy, ...c.pasos, c.meta].filter(Boolean).map((x) => x!.id);
  const i = chain.indexOf(id);
  const prev = i > 0 ? chain[i - 1] : null;
  const next = i >= 0 && i < chain.length - 1 ? chain[i + 1] : null;
  const flowIds = Object.values(d.edges).filter((e) => e.type === 'flow' && (e.sourceNodeId === id || e.targetNodeId === id)).map((e) => e.id);
  if (flowIds.length) d = op.deleteElements(d, [], flowIds);
  if (prev && next) d = link(d, prev, next);
  // 2. las piedras que frenaban este paso pasan a frenar el siguiente (o se quedan sueltas)
  if (papel === 'paso' || papel === 'meta' || papel === 'hoy') {
    for (const e of Object.values(d.edges)) {
      if (e.targetNodeId !== id || !isModulate(e)) continue;
      const to = next ?? c.meta?.id ?? null;
      d = to && to !== id ? op.updateEdge(d, e.id, { targetNodeId: to, targetPortId: d.nodes[to]?.portIds.find((p) => d.ports[p]?.direction !== 'out') ?? null }) : op.deleteElements(d, [], [e.id]);
    }
  }
  // 3. sus propias uniones «Influye» desaparecen; si era piedra, también las ayudas que le llegaban
  const causalIds = Object.values(d.edges).filter((e) => e.type === 'causal' && (e.sourceNodeId === id || (papel === 'piedra' && e.targetNodeId === id && isCompensate(e)))).map((e) => e.id);
  if (causalIds.length) d = op.deleteElements(d, [], causalIds);
  // 4. vuelve a ser una idea normal
  const cur = d.nodes[id];
  if (cur.type === 'input' || cur.type === 'output') d = op.convertNodeType(d, id, 'bubble');
  d = op.updateNode(d, id, { weight: { ...d.nodes[id].weight, influence: null }, dimensionValues: {} });
  return setCustom(d, id, { papel: null, tamano: null, fuerza: null, hecho: null, primero: null });
}

export interface PapelOpts { objetivo?: string | null; piedra?: string | null; cerca?: string | null; tamano?: Tamano; fuerza?: Fuerza }

/** Pone un paso al final del camino (justo antes de la meta). */
function alCamino(doc: ProjectDoc, id: string): ProjectDoc {
  const c = leerCamino(doc);
  const prev = c.pasos.filter((p) => p.id !== id).at(-1)?.id ?? c.hoy?.id ?? null;
  const next = c.meta?.id ?? null;
  let d = doc;
  if (prev && next) d = unlink(d, prev, next);
  if (prev) d = link(d, prev, id);
  if (next) d = link(d, id, next);
  return d;
}

function piedraSinAyuda(doc: ProjectDoc): string | null {
  const c = leerCamino(doc);
  const helped = new Set(c.ayudas.map((a) => piedraDe(doc, a.id, c.idx)).filter(Boolean));
  const stones = [...c.piedras].sort((a, b) => numInfluence(a) - numInfluence(b));
  return stones.find((s) => !helped.has(s.id))?.id ?? stones[0]?.id ?? null;
}

export function setPapel(doc: ProjectDoc, id: string, papel: Papel, opts: PapelOpts = {}): ProjectDoc {
  if (!doc.nodes[id]) return doc;
  let d = soltar(doc, id);
  const c0 = leerCamino(d);
  if (papel === 'hoy' || papel === 'meta') {
    // solo hay un «Hoy» y un «Lo que quiero»: el anterior pasa a ser una idea
    const old = papel === 'hoy' ? c0.hoy : c0.meta;
    if (old && old.id !== id) d = soltar(d, old.id);
    d = op.convertNodeType(d, id, papel === 'hoy' ? 'input' : 'output');
    if (papel === 'hoy') {
      const q = d.nodes[id].dimensionValues.quantity;
      d = op.updateNode(d, id, { dimensionValues: { ...d.nodes[id].dimensionValues, quantity: { ...(q ?? { mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null }), value: EMPUJONES } } });
    }
    d = setCustom(d, id, { papel });
    const c = leerCamino(d);
    if (c.hoy && c.meta && !c.conectado) {
      // une Hoy con la meta pasando por los pasos que ya hubiera
      const chain = [c.hoy.id, ...c.sueltos.map((x) => x.id), c.meta.id];
      for (let k = 0; k < chain.length - 1; k++) d = link(d, chain[k], chain[k + 1]);
    }
  } else if (papel === 'paso') {
    d = setCustom(d, id, { papel });
    d = alCamino(d, id);
  } else if (papel === 'piedra') {
    const tamano = opts.tamano ?? 'mediana';
    d = op.updateNode(d, id, { weight: { ...d.nodes[id].weight, influence: { mode: 'weighted', value: TAMANO[tamano].value, scaleId: null } } });
    d = setCustom(d, id, { papel, tamano });
    const c = leerCamino(d);
    const to = opts.objetivo !== undefined ? opts.objetivo : c.pasos.at(-1)?.id ?? c.meta?.id ?? null;
    if (to) d = op.addEdge(d, id, to, 'causal', FRENA()).doc;
  } else if (papel === 'ayuda') {
    const fuerza = opts.fuerza ?? 'bastante';
    d = setCustom(d, id, { papel, fuerza });
    const stone = opts.piedra !== undefined ? opts.piedra : piedraSinAyuda(d);
    if (stone) d = op.addEdge(d, id, stone, 'causal', AYUDA(FUERZA[fuerza].amount)).doc;
  } else {
    d = setCustom(d, id, { papel });
    const c = leerCamino(d);
    const near = opts.cerca ?? (papel === 'razon' ? c.meta?.id : papel === 'siento' ? c.hoy?.id ?? c.meta?.id : papel === 'pregunta' ? c.meta?.id ?? c.hoy?.id : null) ?? null;
    if (near && near !== id) d = conceptual(d, near, id);
  }
  return styleFor(d, id, papel);
}

/** Crea un elemento nuevo con su papel ya puesto. */
export function crear(doc: ProjectDoc, papel: Papel, title: string, opts: PapelOpts = {}): { doc: ProjectDoc; id: string } {
  const type = papel === 'hoy' ? 'input' : papel === 'meta' ? 'output' : 'bubble';
  const base = opts.cerca ? doc.nodes[opts.cerca]?.position : undefined;
  const r = op.addNode(doc, type, { title: title.trim() || PAPEL[papel].name, position: base ? { x: base.x + 40, y: base.y + 120 } : { x: 0, y: 0 } });
  return { doc: setPapel(r.doc, r.id, papel, opts), id: r.id };
}

export function setTamano(doc: ProjectDoc, id: string, tamano: Tamano): ProjectDoc {
  const n = doc.nodes[id];
  if (!n) return doc;
  const d = op.updateNode(doc, id, { weight: { ...n.weight, influence: { mode: 'weighted', value: TAMANO[tamano].value, scaleId: null } } });
  return setCustom(d, id, { tamano });
}

export function setFuerza(doc: ProjectDoc, id: string, fuerza: Fuerza): ProjectDoc {
  let d = setCustom(doc, id, { fuerza });
  for (const e of Object.values(d.edges)) {
    if (e.sourceNodeId === id && isCompensate(e)) d = op.updateEdge(d, e.id, { behavior: { ...e.behavior, influence: { ...e.behavior.influence, amount: FUERZA[fuerza].amount } } });
  }
  return d;
}

/** Cambia a qué frena una piedra (o con qué piedra ayuda una ayuda). */
export function apuntar(doc: ProjectDoc, id: string, to: string | null): ProjectDoc {
  const c = leerCamino(doc);
  const papel = c.roles.get(id);
  if (papel !== 'piedra' && papel !== 'ayuda') return doc;
  const mine = Object.values(doc.edges).filter((e) => e.sourceNodeId === id && (papel === 'piedra' ? isModulate(e) : isCompensate(e))).map((e) => e.id);
  let d = mine.length ? op.deleteElements(doc, [], mine) : doc;
  if (!to || !d.nodes[to] || to === id) return d;
  if (papel === 'piedra') return op.addEdge(d, id, to, 'causal', FRENA()).doc;
  return op.addEdge(d, id, to, 'causal', AYUDA(FUERZA[fuerzaOf(doc, doc.nodes[id])].amount)).doc;
}

/** ⭐ primer paso (solo uno) y ✅ hecho. */
export function marcar(doc: ProjectDoc, id: string, key: 'hecho' | 'primero', on: boolean): ProjectDoc {
  let d = doc;
  if (key === 'primero' && on) {
    for (const n of Object.values(d.nodes)) if (n.id !== id && isPrimero(n)) d = setCustom(d, n.id, { primero: null });
  }
  return setCustom(d, id, { [key]: on ? '1' : null });
}

/** Cambia un paso de sitio en el camino (solo si el camino es una cadena simple). */
export function moverPaso(doc: ProjectDoc, id: string, dir: -1 | 1): ProjectDoc {
  const c = leerCamino(doc);
  if (!c.simple || !c.conectado) return doc;
  const i = c.pasos.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= c.pasos.length) return doc;
  const before = [c.hoy!.id, ...c.pasos.map((p) => p.id), c.meta!.id];
  const pasos = c.pasos.map((p) => p.id);
  [pasos[i], pasos[j]] = [pasos[j], pasos[i]];
  const after = [c.hoy!.id, ...pasos, c.meta!.id];
  let d = doc;
  for (let k = 0; k < before.length - 1; k++) d = unlink(d, before[k], before[k + 1]);
  for (let k = 0; k < after.length - 1; k++) d = link(d, after[k], after[k + 1]);
  return d;
}

/** Borrar sin romper el camino: los vecinos de un paso borrado se unen entre sí. */
export function borrar(doc: ProjectDoc, ids: string[]): ProjectDoc {
  let d = doc;
  for (const id of ids) {
    const papel = leerCamino(d).roles.get(id);
    if (papel === 'paso') d = soltar(d, id);
  }
  return op.deleteElements(d, ids, []);
}

/* ------------------------------------------------------------------ */
/* Colocación                                                          */
/* ------------------------------------------------------------------ */

const STEP_X = 290;
const ROW = 170;

/** Coloca cada cosa en su sitio: el camino en fila, las piedras encima y las ayudas sobre sus piedras. */
export function ordenarCamino(doc: ProjectDoc): ProjectDoc {
  const c = leerCamino(doc);
  if (!c.hoy && !c.meta) return doc;
  const pos = new Map<string, { x: number; y: number }>();
  const chain = [c.hoy, ...c.pasos, c.meta].filter(Boolean) as MapNode[];
  chain.forEach((n, i) => pos.set(n.id, { x: i * STEP_X, y: 0 }));
  let tail = chain.length * STEP_X;
  for (const s of c.sueltos) { pos.set(s.id, { x: tail, y: 0 }); tail += STEP_X; }
  // piedras sobre lo que frenan; sus ayudas, encima
  const stonesBy = new Map<string, MapNode[]>();
  const looseStones: MapNode[] = [];
  for (const s of c.piedras) {
    const t = objetivoDe(doc, s.id, c.idx);
    if (t && pos.has(t)) (stonesBy.get(t) ?? stonesBy.set(t, []).get(t)!).push(s); else looseStones.push(s);
  }
  for (const [t, stones] of stonesBy) {
    const base = pos.get(t)!;
    stones.forEach((s, k) => pos.set(s.id, { x: base.x + (k % 2 ? 40 : 0), y: -ROW - k * ROW * 2 }));
  }
  looseStones.forEach((s, k) => pos.set(s.id, { x: tail + k * 230, y: -ROW }));
  const helpersBy = new Map<string, MapNode[]>();
  const looseHelpers: MapNode[] = [];
  for (const h of c.ayudas) {
    const s = piedraDe(doc, h.id, c.idx);
    if (s && pos.has(s)) (helpersBy.get(s) ?? helpersBy.set(s, []).get(s)!).push(h); else looseHelpers.push(h);
  }
  for (const [s, hs] of helpersBy) {
    const base = pos.get(s)!;
    hs.forEach((h, k) => pos.set(h.id, { x: base.x + (k - (hs.length - 1) / 2) * 220, y: base.y - ROW }));
  }
  looseHelpers.forEach((h, k) => pos.set(h.id, { x: tail + k * 230, y: -ROW * 2 }));
  // debajo: cómo me siento (bajo Hoy), preguntas y razones (bajo la meta)
  const first = chain[0] ? pos.get(chain[0].id)!.x : 0;
  const last = chain.length ? pos.get(chain[chain.length - 1].id)!.x : 0;
  c.sientos.forEach((n, k) => pos.set(n.id, { x: first + k * 220, y: ROW }));
  [...c.razones, ...c.preguntas].forEach((n, k) => pos.set(n.id, { x: last - k * 230, y: ROW }));
  c.ideas.forEach((n, k) => pos.set(n.id, { x: first + k * 220, y: ROW * 2 }));
  let d = doc;
  for (const [id, p] of pos) {
    const n = d.nodes[id];
    if (n && !n.locked && !n.parentId && (n.position.x !== p.x || n.position.y !== p.y)) d = op.updateNode(d, id, { position: p });
  }
  // las líneas salen por el lado que mira a donde van (sin rodeos)
  for (const e of Object.values(d.edges)) {
    const a = pos.get(e.sourceNodeId);
    const b = pos.get(e.targetNodeId);
    if (!a || !b) continue;
    const [sa, ta] = anchorsBetween(a, b);
    if (e.visualStyle.sourceAnchor !== sa || e.visualStyle.targetAnchor !== ta) d = op.updateEdge(d, e.id, { visualStyle: { ...e.visualStyle, sourceAnchor: sa, targetAnchor: ta } });
  }
  return d;
}

type Anchor = 'top' | 'right' | 'bottom' | 'left';
function anchorsBetween(a: { x: number; y: number }, b: { x: number; y: number }): [Anchor, Anchor] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) > Math.abs(dx) * 0.6) return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
  return dx >= 0 ? ['right', 'left'] : ['left', 'right'];
}

/** Coloca una idea nueva alrededor de otra, como pétalos de una flor (nivel 1). */
export function alrededor(doc: ProjectDoc, id: string, center: string): ProjectDoc {
  const cn = doc.nodes[center];
  if (!cn) return doc;
  const neighbours = Object.values(doc.edges).filter((e) => e.sourceNodeId === center || e.targetNodeId === center).length;
  const k = Math.max(0, neighbours - 1);
  const ring = Math.floor(k / 8);
  const angle = -Math.PI / 2 + (k % 8) * (Math.PI / 4) + ring * (Math.PI / 8);
  const r = 250 + ring * 170;
  const p = { x: cn.position.x + Math.cos(angle) * r * 1.25, y: cn.position.y + Math.sin(angle) * r * 0.8 };
  let d = op.updateNode(doc, id, { position: p });
  for (const e of Object.values(d.edges)) {
    const between = (e.sourceNodeId === center && e.targetNodeId === id) || (e.sourceNodeId === id && e.targetNodeId === center);
    if (!between) continue;
    const from = e.sourceNodeId === center ? cn.position : p;
    const to = e.sourceNodeId === center ? p : cn.position;
    const [sa, ta] = anchorsBetween(from, to);
    d = op.updateEdge(d, e.id, { visualStyle: { ...e.visualStyle, sourceAnchor: sa, targetAnchor: ta } });
  }
  return d;
}

/** Idea nueva unida a otra (nivel 1: soltar ideas). */
export function ideaUnida(doc: ProjectDoc, title: string, near: string | null, papel: Papel = 'idea'): { doc: ProjectDoc; id: string } {
  const r = op.addNode(doc, 'bubble', { title: title.trim() || 'Idea', position: { x: 0, y: 0 } });
  let d = setCustom(r.doc, r.id, { papel });
  d = styleFor(d, r.id, papel);
  if (near && d.nodes[near]) {
    d = conceptual(d, near, r.id);
    d = alrededor(d, r.id, near);
  }
  return { doc: d, id: r.id };
}

/** Mete un paso nuevo justo después de otro del camino (al final si no se dice). */
export function pasoDespues(doc: ProjectDoc, title: string, afterId: string | null): { doc: ProjectDoc; id: string } {
  const c = leerCamino(doc);
  const chain = [c.hoy, ...c.pasos, c.meta].filter(Boolean).map((x) => x!.id);
  const i = afterId ? chain.indexOf(afterId) : -1;
  if (i < 0 || i >= chain.length - 1) return crear(doc, 'paso', title);
  const next = chain[i + 1];
  const r = op.addNode(doc, 'bubble', { title: title.trim() || PAPEL.paso.name, position: { x: 0, y: 0 } });
  let d = setCustom(r.doc, r.id, { papel: 'paso' });
  d = unlink(d, chain[i], next);
  d = link(d, chain[i], r.id);
  d = link(d, r.id, next);
  return { doc: styleFor(d, r.id, 'paso'), id: r.id };
}

/** Preguntas pendientes sobre un elemento (p. ej. «¿qué tamaño tiene esta piedra?»). */
export const pendientes = (n: MapNode | undefined): string[] => (n?.metadata.custom?.preguntar ?? '').split(',').filter(Boolean);
export function pendiente(doc: ProjectDoc, id: string, keys: string[]): ProjectDoc {
  return setCustom(doc, id, { preguntar: keys.length ? keys.join(',') : null });
}
export function resuelto(doc: ProjectDoc, id: string, key: string): ProjectDoc {
  return pendiente(doc, id, pendientes(doc.nodes[id]).filter((k) => k !== key));
}
/** Marca libre en el elemento (p. ej. «conseguido» en la meta). */
export function setMarca(doc: ProjectDoc, id: string, key: string, value: string | null): ProjectDoc {
  return setCustom(doc, id, { [key]: value });
}
