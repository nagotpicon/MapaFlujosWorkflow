import { describe, expect, it } from 'vitest';
import { DocBuilder } from '../src/core/model/builder';
import { simulate } from '../src/engine/simulate';

function setup() {
  const b = new DocBuilder();
  b.doc.project.settings.frame.mode = 'grid';
  b.doc.project.settings.frame.cellWidth = 200;
  const inp = b.input('Inicio', 100);
  const mid = b.node('bubble', 'Paso');
  const out = b.node('output', 'Meta');
  b.edge(inp, mid);
  b.edge(mid, out);
  const place = (id: string, col: number, row = 0) => {
    // centro de la celda (col 1 = x 0..200); nodo por defecto 190×64
    b.doc.nodes[id] = { ...b.doc.nodes[id], position: { x: (col - 1) * 200 + 5, y: -row * 140 - 32 } };
  };
  return { b, inp, mid, out, place };
}

describe('Marco espacial (cuadrícula)', () => {
  it('en tapiz libre la posición no computa', () => {
    const { b, place, inp, mid, out } = setup();
    b.doc.project.settings.frame.mode = 'free';
    place(inp, 1); place(mid, 4); place(out, 6);
    expect(simulate(b.doc, { iterations: 3 }).metrics.resultSeries).toEqual([100, 100, 100]);
  });

  it('la separación en columnas se convierte en retardo', () => {
    const { b, place, inp, mid, out } = setup();
    place(inp, 1); place(mid, 2); place(out, 4);
    const r = simulate(b.doc, { iterations: 5 });
    expect(r.metrics.resultSeries).toEqual([0, 0, 0, 100, 100]);
    expect(r.frameNotes.some((n) => n.includes('retardo'))).toBe(true);
  });

  it('una entrada empieza en su columna', () => {
    const { b, place, inp, mid, out } = setup();
    place(inp, 3); place(mid, 3); place(out, 3);
    expect(simulate(b.doc, { iterations: 4 }).metrics.resultSeries).toEqual([0, 0, 100, 100]);
  });

  it('inversión temporal se penaliza y se avisa', () => {
    const { b, place, inp, mid, out } = setup();
    place(inp, 3); place(mid, 1); place(out, 3);
    const r = simulate(b.doc, { iterations: 5 });
    // mid antes que su causa: 2 columnas → pérdida 1-(0.85^2)=27.75%; mid→out +2 retardo
    expect(r.frameNotes.some((n) => n.includes('Contradicción temporal'))).toBe(true);
    expect(r.metrics.resultSeries.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(r.metrics.resultSeries[4]).toBeCloseTo(72.25);
    expect(r.metrics.maxUnexplained).toBeLessThan(1e-6);
  });

  it('fecha límite penaliza lo que llega tarde', () => {
    const { b, place, inp, mid, out } = setup();
    b.doc.project.settings.frame.time.deadline = 2;
    place(inp, 1); place(mid, 1); place(out, 2);
    const r = simulate(b.doc, { iterations: 4 });
    expect(r.metrics.resultSeries).toEqual([0, 100, 50, 50]);
    b.doc.project.settings.frame.time.latePolicy = 'cut';
    expect(simulate(b.doc, { iterations: 4 }).metrics.resultSeries).toEqual([0, 100, 0, 0]);
  });

  it('eje apoyo/fricción: por encima empuja, por debajo frena', () => {
    const { b, place, inp, mid, out } = setup();
    b.doc.project.settings.frame.time.enabled = false;
    b.doc.project.settings.frame.support.enabled = true;
    place(inp, 1); place(mid, 2, 2); place(out, 3);
    expect(simulate(b.doc, { iterations: 1 }).metrics.resultSeries[0]).toBeCloseTo(116);
    place(mid, 2, -3);
    const r = simulate(b.doc, { iterations: 1 });
    expect(r.metrics.resultSeries[0]).toBeCloseTo(76);
    expect(r.iterations[0].nodes[mid].influence).toBeCloseTo(-3);
  });
});
