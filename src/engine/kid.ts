/**
 * Análisis del modo fácil: «de cada 10 empujones que salen de Hoy, ¿cuántos
 * llegan a lo que quieres?», cuánto quita cada piedra y cuánto devuelve cada
 * ayuda. Son contrafactuales reales del motor: se simula el mapa sin la piedra
 * (o sin la ayuda) y se compara.
 */
import type { ProjectDoc } from '../core/model/schema';
import { EMPUJONES, fuerzaOf, isHecho, isPrimero, leerCamino, objetivoDe, piedraDe, tamanoOf, type Fuerza, type Tamano } from '../kid/model';
import { PRIMARY, qty } from './packet';
import { effectiveDoc } from './scenario';
import { simulate } from './simulate';

export interface KidStone { id: string; title: string; tamano: Tamano; quita: number; objetivo: string | null; ayudas: string[] }
export interface KidHelper { id: string; title: string; fuerza: Fuerza; devuelve: number; piedra: string | null }
export interface KidStep { id: string; title: string; hecho: boolean; primero: boolean; llegan: number }
export interface KidAnalysis {
  /** hay Hoy, meta y un camino entre los dos */
  listo: boolean;
  falta: 'hoy' | 'meta' | 'camino' | null;
  /** de cada 10, cuántos llegan (con un decimal) */
  llegan: number;
  /** redondeado a entero, para dibujar 10 bolitas */
  de10: number;
  /** cuántos llegarían si no hubiera ninguna piedra */
  sinPiedras: number;
  piedras: KidStone[];
  ayudas: KidHelper[];
  pasos: KidStep[];
  /** pasos en los que se pierde algo por otras razones (mapas del nivel 3) */
  perdidas: { id: string; title: string; pierde: number }[];
}

const EMPTY: KidAnalysis = { listo: false, falta: null, llegan: 0, de10: 0, sinPiedras: 0, piedras: [], ayudas: [], pasos: [], perdidas: [] };
const round1 = (v: number) => Math.round(v * 10) / 10;

function ratio(doc: ProjectDoc): { r: number; byNode: Record<string, { in: number; out: number; lost: number }>; gen: number } {
  const res = simulate(doc, { preEffective: true, iterations: 1, scenarioId: null });
  const gen = res.metrics.totalGenerated[PRIMARY] ?? 0;
  const got = res.metrics.totalResult[PRIMARY] ?? 0;
  const byNode: Record<string, { in: number; out: number; lost: number }> = {};
  const it = res.iterations[0];
  if (it) for (const [id, st] of Object.entries(it.nodes)) byNode[id] = { in: qty(st.in), out: Math.max(qty(st.out), qty(st.terminal)), lost: st.lost[PRIMARY] ?? 0 };
  return { r: gen > 1e-9 ? got / gen : 0, byNode, gen };
}

export function analizarCamino(input: ProjectDoc, opts: { maxCounterfactuals?: number } = {}): KidAnalysis {
  const doc = effectiveDoc(input, input.project.activeScenarioId ?? null);
  const c = leerCamino(doc);
  if (!c.meta) return { ...EMPTY, falta: 'meta' };
  if (!c.hoy) return { ...EMPTY, falta: 'hoy' };
  if (!c.conectado) return { ...EMPTY, falta: 'camino' };
  const base = ratio(doc);
  if (base.gen <= 1e-9) return { ...EMPTY, falta: 'hoy' };
  const max = opts.maxCounterfactuals ?? 24;
  const sinPiedra = (d: ProjectDoc, ids: string[]): ProjectDoc => {
    const nodes = { ...d.nodes };
    for (const id of ids) {
      const n = nodes[id];
      if (n?.weight.influence) nodes[id] = { ...n, weight: { ...n.weight, influence: { ...n.weight.influence, mode: 'weighted', value: 0 } } };
    }
    return { ...d, nodes };
  };
  const sinAyuda = (d: ProjectDoc, id: string): ProjectDoc => {
    const edges = { ...d.edges };
    for (const e of Object.values(d.edges)) if (e.sourceNodeId === id && e.type === 'causal') edges[e.id] = { ...e, direction: 'none' };
    return { ...d, edges };
  };
  const helpersOf = new Map<string, string[]>();
  for (const h of c.ayudas) {
    const s = piedraDe(doc, h.id, c.idx);
    if (s) helpersOf.set(s, [...(helpersOf.get(s) ?? []), h.id]);
  }
  const piedras: KidStone[] = c.piedras.slice(0, max).map((s) => ({
    id: s.id, title: s.title, tamano: tamanoOf(s), objetivo: objetivoDe(doc, s.id, c.idx), ayudas: helpersOf.get(s.id) ?? [],
    quita: round1(Math.max(0, ratio(sinPiedra(doc, [s.id])).r - base.r) * EMPUJONES),
  })).sort((a, b) => b.quita - a.quita);
  const ayudas: KidHelper[] = c.ayudas.slice(0, max).map((h) => ({
    id: h.id, title: h.title, fuerza: fuerzaOf(doc, h, c.idx), piedra: piedraDe(doc, h.id, c.idx),
    devuelve: round1(Math.max(0, base.r - ratio(sinAyuda(doc, h.id)).r) * EMPUJONES),
  })).sort((a, b) => b.devuelve - a.devuelve);
  const clear = c.piedras.length ? ratio(sinPiedra(doc, c.piedras.map((s) => s.id))) : base;
  const perdidas = c.pasos
    .map((p) => ({ id: p.id, title: p.title, pierde: round1(((clear.byNode[p.id]?.lost ?? 0) / clear.gen) * EMPUJONES) }))
    .filter((p) => p.pierde >= 0.1)
    .sort((a, b) => b.pierde - a.pierde);
  const pasos: KidStep[] = c.pasos.map((p) => ({ id: p.id, title: p.title, hecho: isHecho(p), primero: isPrimero(p), llegan: round1(((base.byNode[p.id]?.out ?? 0) / base.gen) * EMPUJONES) }));
  const llegan = round1(base.r * EMPUJONES);
  return { listo: true, falta: null, llegan, de10: Math.round(base.r * EMPUJONES), sinPiedras: round1(clear.r * EMPUJONES), piedras, ayudas, pasos, perdidas };
}
