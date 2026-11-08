/**
 * 🔇 Silenciar: la idea se calcula como si no estuviera, sin borrar nada.
 * Y «Lo siguiente»: lo que la tarjeta te trae según cómo va el mapa.
 */
import { describe, expect, it } from 'vitest';
import { buildKidDemo } from '../src/demo/kidDemo';
import { analizarCamino } from '../src/engine/kid';
import { applyMutes, canMute, isMuted } from '../src/engine/mute';
import { simulate } from '../src/engine/simulate';
import * as op from '../src/core/operations';
import { createEmptyDoc } from '../src/core/model/factory';
import type { ProjectDoc } from '../src/core/model/schema';
import { nextSteps } from '../src/editor/nextSteps';

const mute = (d: ProjectDoc, title: string, on = true): ProjectDoc => {
  const n = Object.values(d.nodes).find((x) => x.title === title)!;
  const custom = { ...(n.metadata.custom ?? {}) };
  if (on) custom.mute = '1'; else delete custom.mute;
  return op.updateNode(d, n.id, { metadata: { ...n.metadata, custom } });
};

describe('silenciar', () => {
  it('sin la piedra llegan más; sin la ayuda, menos; y nada se borra', () => {
    const d = buildKidDemo();
    const base = analizarCamino(d).llegan;
    const sinPiedra = mute(d, 'Me da vergüenza enseñarlos');
    expect(analizarCamino(sinPiedra).llegan).toBeGreaterThan(base);
    const sinAyuda = mute(d, 'Mi prima sabe de redes');
    expect(analizarCamino(sinAyuda).llegan).toBeLessThan(base);
    // la idea sigue en el mapa y se puede volver a activar
    expect(Object.values(sinPiedra.nodes).some((n) => n.title === 'Me da vergüenza enseñarlos' && isMuted(n))).toBe(true);
    expect(analizarCamino(mute(sinPiedra, 'Me da vergüenza enseñarlos', false)).llegan).toBe(base);
  });

  it('un inicio silenciado no pone nada en marcha, y el resto del mapa sigue igual', () => {
    let d = createEmptyDoc('Dos canales');
    const a = op.addNode(d, 'input', { title: 'Web' }); d = a.doc;
    const b = op.addNode(d, 'input', { title: 'Tienda' }); d = b.doc;
    const m = op.addNode(d, 'output', { title: 'Ventas' }); d = m.doc;
    d = op.addEdge(d, a.id, m.id, 'flow').doc;
    d = op.addEdge(d, b.id, m.id, 'flow').doc;
    const total = (x: ProjectDoc) => simulate(x, { iterations: 1 }).metrics.totalResult.quantity ?? 0;
    const both = total(d);
    expect(total(mute(d, 'Web'))).toBeCloseTo(both / 2, 5);
    // con dos inicios tiene sentido silenciar uno; la meta, no
    expect(canMute(d, d.nodes[a.id])).toBe(true);
    expect(canMute(d, d.nodes[m.id])).toBe(false);
    // sin nada silenciado, el mapa no se toca
    expect(applyMutes(d)).toBe(d);
  });
});

describe('lo siguiente', () => {
  it('una idea suelta pregunta qué es; un inicio sin número pregunta cuántos salen', () => {
    let d = createEmptyDoc('Pan');
    const r = op.addNode(d, 'bubble', { title: 'Vender pan' }); d = r.doc;
    expect(nextSteps(d, d.nodes[r.id]).map((s) => s.id)).toEqual(['role']);
    d = op.convertNodeType(d, r.id, 'input');
    const n = d.nodes[r.id];
    const ids = nextSteps({ ...d, nodes: { ...d.nodes, [n.id]: { ...n, dimensionValues: {} } } }, { ...n, dimensionValues: {} }).map((s) => s.id);
    expect(ids).toContain('qty');
    expect(ids).toContain('after');
  });

  it('un colador sin salida para los que no pasan te ofrece llevarlos a otra idea', () => {
    let d = createEmptyDoc('Llamadas');
    const a = op.addNode(d, 'input', { title: 'Llamadas' }); d = a.doc;
    const f = op.addNode(d, 'bubble', { title: 'Útiles' }); d = f.doc;
    d = op.addEdge(d, a.id, f.id, 'flow').doc;
    expect(nextSteps(d, d.nodes[f.id]).map((s) => s.id)).toContain('behavior');
    d = op.addBehavior(d, f.id, 'filter').doc;
    expect(nextSteps(d, d.nodes[f.id]).map((s) => s.id)).toContain('reject');
  });

  it('una idea que frena sin decir a quién pregunta a quién estorba', () => {
    let d = createEmptyDoc('Frenos');
    const a = op.addNode(d, 'bubble', { title: 'Lluvia', weight: { importance: null, influence: { mode: 'weighted', value: -3, scaleId: null }, impact: null } as never }); d = a.doc;
    d = op.addNode(d, 'bubble', { title: 'Ir en bici' }).doc;
    const s = nextSteps(d, d.nodes[a.id]);
    expect(s[0].id).toBe('target');
    expect(s[0].ask).toBe('¿A quién estorba?');
  });
});
