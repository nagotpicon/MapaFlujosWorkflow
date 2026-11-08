/**
 * Modo fácil («el camino»): papeles, construcción y análisis con el motor real.
 */
import { describe, expect, it } from 'vitest';
import { createEmptyDoc } from '../src/core/model/factory';
import { parseProjectDoc } from '../src/core/model/migrations';
import type { ProjectDoc } from '../src/core/model/schema';
import { analizarCamino } from '../src/engine/kid';
import { apuntar, borrar, crear, leerCamino, marcar, moverPaso, ordenarCamino, setFuerza, setPapel, setTamano } from '../src/kid/model';

function camino(): { doc: ProjectDoc; ids: Record<string, string> } {
  let d = createEmptyDoc('Prueba');
  const ids: Record<string, string> = {};
  const add = (k: string, r: { doc: ProjectDoc; id: string }) => { d = r.doc; ids[k] = r.id; };
  add('hoy', crear(d, 'hoy', 'Dibujo pero nadie lo ve'));
  add('meta', crear(d, 'meta', 'Vender mis dibujos'));
  add('p1', crear(d, 'paso', 'Hacer 10 dibujos'));
  add('p2', crear(d, 'paso', 'Enseñarlos en internet'));
  return { doc: d, ids };
}

describe('Camino · construcción', () => {
  it('Hoy → pasos → meta queda en orden y el documento es válido', () => {
    const { doc, ids } = camino();
    const c = leerCamino(doc);
    expect(c.hoy?.id).toBe(ids.hoy);
    expect(c.meta?.id).toBe(ids.meta);
    expect(c.pasos.map((p) => p.id)).toEqual([ids.p1, ids.p2]);
    expect(c.conectado).toBe(true);
    expect(c.simple).toBe(true);
    expect(parseProjectDoc(JSON.parse(JSON.stringify(doc))).repairs).toEqual([]);
  });

  it('sin piedras llegan 10 de cada 10; una piedra grande deja la mitad', () => {
    const { doc, ids } = camino();
    expect(analizarCamino(doc).llegan).toBe(10);
    const r = crear(doc, 'piedra', 'Me da vergüenza', { objetivo: ids.p2, tamano: 'grande' });
    const a = analizarCamino(r.doc);
    expect(a.llegan).toBe(5);
    expect(a.piedras[0]).toMatchObject({ id: r.id, quita: 5, objetivo: ids.p2, tamano: 'grande' });
    expect(a.sinPiedras).toBe(10);
    expect(a.pasos.map((p) => p.llegan)).toEqual([10, 5]);
  });

  it('el tamaño de la piedra cambia lo que quita (pequeña 1, mediana 3, grande 5)', () => {
    const { doc } = camino();
    const r = crear(doc, 'piedra', 'Miedo');
    expect(analizarCamino(r.doc).llegan).toBe(7);
    expect(analizarCamino(setTamano(r.doc, r.id, 'pequena')).llegan).toBe(9);
    expect(analizarCamino(setTamano(r.doc, r.id, 'grande')).llegan).toBe(5);
  });

  it('una ayuda hace la piedra más pequeña y el análisis dice cuánto devuelve', () => {
    const { doc } = camino();
    const s = crear(doc, 'piedra', 'Miedo', { tamano: 'grande' });
    const h = crear(s.doc, 'ayuda', 'Mi prima', { piedra: s.id, fuerza: 'bastante' });
    const a = analizarCamino(h.doc);
    expect(a.llegan).toBe(7); // −5 + 2 = −3 → 70 %
    expect(a.ayudas[0]).toMatchObject({ id: h.id, devuelve: 2, piedra: s.id });
    expect(a.piedras[0].ayudas).toEqual([h.id]);
    expect(analizarCamino(setFuerza(h.doc, h.id, 'mucho')).llegan).toBe(9);
  });

  it('dos piedras en el camino se multiplican', () => {
    const { doc, ids } = camino();
    const a = crear(doc, 'piedra', 'A', { objetivo: ids.p1, tamano: 'grande' });
    const b = crear(a.doc, 'piedra', 'B', { objetivo: ids.p2, tamano: 'grande' });
    expect(analizarCamino(b.doc).llegan).toBe(2.5);
  });

  it('borrar un paso no rompe el camino y su piedra pasa al siguiente', () => {
    const { doc, ids } = camino();
    const s = crear(doc, 'piedra', 'Lío', { objetivo: ids.p1 });
    const d = borrar(s.doc, [ids.p1]);
    const c = leerCamino(d);
    expect(c.conectado).toBe(true);
    expect(c.pasos.map((p) => p.id)).toEqual([ids.p2]);
    expect(analizarCamino(d).piedras[0].objetivo).toBe(ids.p2);
  });

  it('cambiar de papel recoloca: un paso que pasa a piedra sale del camino', () => {
    const { doc, ids } = camino();
    const d = setPapel(doc, ids.p1, 'piedra', { objetivo: ids.p2, tamano: 'mediana' });
    const c = leerCamino(d);
    expect(c.pasos.map((p) => p.id)).toEqual([ids.p2]);
    expect(c.piedras.map((p) => p.id)).toEqual([ids.p1]);
    expect(analizarCamino(d).llegan).toBe(7);
  });

  it('mover pasos y marcar primer paso y hecho', () => {
    const { doc, ids } = camino();
    const d = moverPaso(doc, ids.p2, -1);
    expect(leerCamino(d).pasos.map((p) => p.id)).toEqual([ids.p2, ids.p1]);
    let m = marcar(d, ids.p1, 'primero', true);
    m = marcar(m, ids.p2, 'primero', true);
    m = marcar(m, ids.p2, 'hecho', true);
    const a = analizarCamino(m);
    expect(a.pasos.find((p) => p.id === ids.p2)).toMatchObject({ primero: true, hecho: true });
    expect(a.pasos.find((p) => p.id === ids.p1)?.primero).toBe(false);
  });

  it('apuntar una piedra a otro paso y una ayuda a otra piedra', () => {
    const { doc, ids } = camino();
    const s = crear(doc, 'piedra', 'Miedo', { objetivo: ids.p1, tamano: 'grande' });
    const t = crear(s.doc, 'piedra', 'Tiempo', { objetivo: ids.p1, tamano: 'pequena' });
    const h = crear(t.doc, 'ayuda', 'Ayuda', { piedra: t.id });
    let d = apuntar(h.doc, s.id, ids.p2);
    d = apuntar(d, h.id, s.id);
    const a = analizarCamino(d);
    expect(a.piedras.find((p) => p.id === s.id)?.objetivo).toBe(ids.p2);
    expect(a.ayudas[0].piedra).toBe(s.id);
  });

  it('ordenar coloca el camino en fila y las piedras encima', () => {
    const { doc, ids } = camino();
    const s = crear(doc, 'piedra', 'Miedo', { objetivo: ids.p2 });
    const d = ordenarCamino(s.doc);
    const y = (id: string) => d.nodes[id].position.y;
    const x = (id: string) => d.nodes[id].position.x;
    expect([y(ids.hoy), y(ids.p1), y(ids.p2), y(ids.meta)]).toEqual([0, 0, 0, 0]);
    expect(x(ids.hoy)).toBeLessThan(x(ids.p1));
    expect(x(ids.p2)).toBeLessThan(x(ids.meta));
    expect(y(s.id)).toBeLessThan(0);
    expect(x(s.id)).toBe(x(ids.p2));
  });

  it('dice qué falta: la meta, el Hoy o el camino', () => {
    let d = createEmptyDoc('x');
    expect(analizarCamino(d).falta).toBe('meta');
    d = crear(d, 'meta', 'Lo que quiero').doc;
    expect(analizarCamino(d).falta).toBe('hoy');
  });

  it('lee los mapas del nivel 3: una idea con influencia negativa unida con «Influye» es una piedra', () => {
    const { doc, ids } = camino();
    let d = doc;
    const r = crear(d, 'idea', 'Fricción');
    d = r.doc;
    d = { ...d, nodes: { ...d.nodes, [r.id]: { ...d.nodes[r.id], metadata: { ...d.nodes[r.id].metadata, custom: {} }, weight: { ...d.nodes[r.id].weight, influence: { mode: 'weighted', value: -5, scaleId: null } } } } };
    d = apuntarCausal(d, r.id, ids.p1);
    expect(leerCamino(d).roles.get(r.id)).toBe('piedra');
  });
});

function apuntarCausal(d: ProjectDoc, from: string, to: string): ProjectDoc {
  const id = 'ed_test';
  const e = Object.values(d.edges)[0];
  return { ...d, edges: { ...d.edges, [id]: { ...structuredClone(e), id, type: 'causal', sourceNodeId: from, targetNodeId: to, behavior: { ...e.behavior, influence: { ...e.behavior.influence, mode: 'modulate', sensitivity: 0.5 } } } } };
}
