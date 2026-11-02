import { describe, expect, it } from 'vitest';
import { DocBuilder } from '../src/core/model/builder';
import { simulate } from '../src/engine/simulate';
import { computeHeat } from '../src/engine/heat';

describe('Termómetro de calor', () => {
  const build = (inflow: number) => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', inflow);
    const op = b.node('bubble', 'Operador');
    b.behavior(op, 'restrictor', { capacity: 100, excess: 'queue' });
    const out = b.node('output', 'Salida');
    b.edge(inp, op); b.edge(op, out);
    return { b, op };
  };
  it('recalentado cuando la entrada supera la capacidad y crece la cola', () => {
    const { b, op } = build(150);
    const h = computeHeat(b.doc, simulate(b.doc, { iterations: 4 }));
    expect(h.nodes[op][2].state).toBe('overheated');
    expect(h.nodes[op][2].causes.join(' ')).toMatch(/Presión|Cola/);
  });
  it('ritmo perfecto en utilización sana', () => {
    const { b, op } = build(80);
    const h = computeHeat(b.doc, simulate(b.doc, { iterations: 3 }));
    expect(h.nodes[op][1].state).toBe('rhythm');
    expect(h.nodeAvg[op].state).toBe('rhythm');
  });
  it('frío cuando está infrautilizado', () => {
    const { b, op } = build(15);
    const h = computeHeat(b.doc, simulate(b.doc, { iterations: 3 }));
    expect(h.nodes[op][0].state).toBe('cold');
  });
  it('zonas por celda en modo cuadrícula', () => {
    const { b } = build(150);
    b.doc.project.settings.frame.mode = 'grid';
    const h = computeHeat(b.doc, simulate(b.doc, { iterations: 3 }));
    expect(Object.keys(h.zones).length).toBeGreaterThan(0);
  });
});
