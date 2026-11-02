import { describe, expect, it } from 'vitest';
import { simulate } from '../src/engine/simulate';
import { qty } from '../src/engine/packet';
import { DocBuilder } from '../src/core/model/builder';

const it1 = (r: ReturnType<typeof simulate>, i = 0) => r.iterations[i];

function noUnexplained(r: ReturnType<typeof simulate>) {
  expect(r.metrics.maxUnexplained).toBeLessThan(1e-6);
  for (const it of r.iterations) for (const v of Object.values(it.ledger.unexplained)) expect(Math.abs(v)).toBeLessThan(1e-6);
}

describe('Motor de flujos', () => {
  it('1-3. entrada de 100 unidades con filtro del 65% deja pasar 65', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const f = b.node('bubble', 'Filtro');
    b.behavior(f, 'filter', { passRatio: 0.65 });
    const out = b.node('output', 'Útiles');
    b.edge(inp, f);
    b.edge(f, out);
    const r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[inp].out)).toBeCloseTo(100);
    expect(qty(it1(r).nodes[f].out)).toBeCloseTo(65);
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(65);
    // sin ruta de rechazo: 35 perdidas y explicadas
    expect(it1(r).ledger.lost.quantity).toBeCloseTo(35);
    noUnexplained(r);
  });

  it('rechazo del filtro va a la ruta alternativa si existe', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const f = b.node('bubble', 'Clasificación');
    b.behavior(f, 'filter', { passRatio: 0.65 });
    const useful = b.node('output', 'Útiles');
    const recov = b.node('output', 'Recuperación');
    b.edge(inp, f);
    b.edge(f, useful);
    b.edge(f, recov, { behavior: { role: 'reject' } });
    const r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[useful].terminal)).toBeCloseTo(65);
    expect(qty(it1(r).nodes[recov].terminal)).toBeCloseTo(35);
    expect(it1(r).ledger.lost.quantity ?? 0).toBeCloseTo(0);
    noUnexplained(r);
  });

  it('4-5. dividir el flujo: reparto fijo y proporcional', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const a = b.node('output', 'A');
    const c = b.node('output', 'B');
    b.set(inp, 'split', { mode: 'fixed', dynamicSourceNodeId: null });
    b.edge(inp, a, { behavior: { share: 60 } });
    b.edge(inp, c, { behavior: { share: 40 } });
    const r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[a].terminal)).toBeCloseTo(60);
    expect(qty(it1(r).nodes[c].terminal)).toBeCloseTo(40);

    b.set(inp, 'split', { mode: 'proportional', dynamicSourceNodeId: null });
    const ea = Object.values(b.doc.edges).find((e) => e.targetNodeId === a)!;
    b.doc.edges[ea.id] = { ...ea, behavior: { ...ea.behavior, weight: 3 } };
    const r2 = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r2).nodes[a].terminal)).toBeCloseTo(75);
    expect(qty(it1(r2).nodes[c].terminal)).toBeCloseTo(25);
    noUnexplained(r2);
  });

  it('reparto condicionado, prioritario y bloqueo', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const a = b.node('output', 'A');
    const c = b.node('output', 'B');
    b.set(inp, 'split', { mode: 'priority', dynamicSourceNodeId: null });
    b.edge(inp, a, { behavior: { priority: 1 }, capacity: 30 });
    b.edge(inp, c, { behavior: { priority: 2 } });
    const r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[a].terminal)).toBeCloseTo(30);
    expect(qty(it1(r).nodes[c].terminal)).toBeCloseTo(70);
    noUnexplained(r);

    const b2 = new DocBuilder();
    const i2 = b2.input('Entrada', 100);
    const x = b2.node('output', 'X');
    const y = b2.node('output', 'Y');
    b2.set(i2, 'split', { mode: 'conditional', dynamicSourceNodeId: null });
    const ex = b2.edge(i2, x);
    const ey = b2.edge(i2, y);
    const cx = b2.condition(ex, 'edge', b2.compare(i2, 'out', '>', 50));
    const cy = b2.condition(ey, 'edge', b2.compare(i2, 'out', '<=', 50));
    b2.doc.edges[ex] = { ...b2.doc.edges[ex], conditions: [cx] };
    b2.doc.edges[ey] = { ...b2.doc.edges[ey], conditions: [cy] };
    const r2 = simulate(b2.doc, { iterations: 1 });
    expect(qty(it1(r2).nodes[x].terminal)).toBeCloseTo(100);
    expect(qty(it1(r2).nodes[y].terminal)).toBeCloseTo(0);
    noUnexplained(r2);
  });

  it('6-8. pérdida y compensación con efecto neto según la regla aditiva', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const fr = b.node('bubble', 'Falta de tiempo');
    b.set(fr, 'weight', { importance: null, influence: { mode: 'weighted', value: -5, scaleId: null }, impact: null });
    b.behavior(fr, 'reducer', { ratio: 0.5 });
    const m1 = b.node('bubble', 'Automatización');
    const m2 = b.node('bubble', 'Organización');
    const out = b.node('output', 'Salida');
    b.edge(inp, fr);
    b.edge(fr, out);
    // sin mitigadores: 50
    let r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(50);
    expect(it1(r).nodes[fr].influence).toBeCloseTo(-5);
    // +2 y +1 puntos: compensa 60% → influencia neta −2, pérdida 50%×0.4 = 20%
    b.edge(m1, fr, { type: 'causal', behavior: { influence: { mode: 'compensate', compensationUnit: 'points', amount: 2 } as never } });
    b.edge(m2, fr, { type: 'causal', behavior: { influence: { mode: 'compensate', compensationUnit: 'points', amount: 1 } as never } });
    r = simulate(b.doc, { iterations: 1 });
    expect(it1(r).nodes[fr].influence).toBeCloseTo(-2);
    expect(it1(r).nodes[fr].compensation).toBeCloseTo(0.6);
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(80);
    // regla máximo: solo cuenta el mayor (40%)
    b.set(fr, 'mitigationCombination', 'max');
    r = simulate(b.doc, { iterations: 1 });
    expect(it1(r).nodes[fr].compensation).toBeCloseTo(0.4);
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(70);
    noUnexplained(r);
  });

  it('compensación temporal solo actúa en su ventana', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const fr = b.node('bubble', 'Fricción');
    b.behavior(fr, 'reducer', { ratio: 0.5 });
    const m = b.node('bubble', 'Medida');
    const out = b.node('output', 'Salida');
    b.edge(inp, fr);
    b.edge(fr, out);
    b.edge(m, fr, { type: 'causal', behavior: { influence: { mode: 'compensate', compensationType: 'temporal', compensationUnit: 'percent', amount: 100, fromIteration: 2, toIteration: 3 } as never } });
    const r = simulate(b.doc, { iterations: 4 });
    expect(r.metrics.resultSeries.map((v) => Math.round(v))).toEqual([50, 100, 100, 50]);
  });

  it('9-10. convergencia: suma, máximo, deduplicación y fórmula', () => {
    const build = (rule: 'sum' | 'max' | 'dedupe' | 'custom' | 'min', formula = 'sum', overlap = 1) => {
      const b = new DocBuilder();
      const a = b.input('A', 60);
      const c = b.input('B', 40);
      const m = b.node('output', 'Fusión');
      b.set(m, 'convergence', { rule, overlap, formula });
      b.edge(a, m);
      b.edge(c, m);
      const r = simulate(b.doc, { iterations: 1 });
      noUnexplained(r);
      return qty(it1(r).nodes[m].terminal);
    };
    expect(build('sum')).toBeCloseTo(100);
    expect(build('max')).toBeCloseTo(60);
    expect(build('min')).toBeCloseTo(40);
    expect(build('dedupe', 'sum', 1)).toBeCloseTo(60);
    expect(build('dedupe', 'sum', 0.5)).toBeCloseTo(80);
    expect(build('custom', 'in1 * 0.5 + in2')).toBeCloseTo(70);
    expect(build('custom', 'sum * 1.5')).toBeCloseTo(150);
  });

  it('convergencia promedia las dimensiones intensivas ponderadas por cantidad', () => {
    const b = new DocBuilder();
    const a = b.input('A', 75, { quality: 0.8 });
    const c = b.input('B', 25, { quality: 0.4 });
    const m = b.node('output', 'Fusión');
    b.edge(a, m);
    b.edge(c, m);
    const r = simulate(b.doc, { iterations: 1 });
    expect(it1(r).nodes[m].terminal.int.quality).toBeCloseTo(0.7);
  });

  it('11-12. límite de capacidad y saturación (pérdida y cola)', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const op = b.node('bubble', 'Operador');
    const rid = b.behavior(op, 'restrictor', { capacity: 40, excess: 'lose' });
    const out = b.node('output', 'Atendidas');
    b.edge(inp, op);
    b.edge(op, out);
    let r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(40);
    expect(it1(r).nodes[op].saturated).toBe(true);
    expect(it1(r).nodes[op].flags).toContain('saturated');
    noUnexplained(r);
    // cola: el exceso se arrastra
    b.doc.behaviors[rid] = { ...b.doc.behaviors[rid], parameters: { ...b.doc.behaviors[rid].parameters, excess: 'queue' } };
    r = simulate(b.doc, { iterations: 3 });
    expect(r.metrics.resultSeries).toEqual([40, 40, 40]);
    expect(r.iterations[2].nodes[op].queue.quantity).toBeCloseTo(180);
    noUnexplained(r);
  });

  it('13-15. acumulación, liberación y conservación sin unidades inexplicadas', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    b.behavior(inp, 'generator', {}, {});
    const res = b.node('bubble', 'Reserva');
    b.behavior(res, 'accumulator', { ratio: 1 });
    b.behavior(res, 'releaser', { mode: 'ratio', ratio: 0.5 });
    const out = b.node('output', 'Salida');
    b.edge(inp, res);
    b.edge(res, out);
    // la entrada tiene dos generadores → 200 por iteración
    const r = simulate(b.doc, { iterations: 3 });
    expect(r.metrics.resultSeries[0]).toBeCloseTo(100);
    expect(r.iterations[0].nodes[res].stock.quantity).toBeCloseTo(100);
    expect(r.metrics.resultSeries[1]).toBeCloseTo(150);
    expect(r.iterations[1].nodes[res].stock.quantity).toBeCloseTo(150);
    noUnexplained(r);
  });

  it('multiplicador registra la generación y su mecanismo en el origen', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const mul = b.node('bubble', 'Impulso');
    b.behavior(mul, 'multiplier', { factor: 1.5 });
    const out = b.node('output', 'Salida');
    b.edge(inp, mul);
    b.edge(mul, out);
    const r = simulate(b.doc, { iterations: 1 });
    const term = it1(r).nodes[out].terminal;
    expect(qty(term)).toBeCloseTo(150);
    expect(term.origins[inp]).toBeCloseTo(100);
    expect(term.origins[`mult:${mul}`]).toBeCloseTo(50);
    expect(it1(r).ledger.generated.quantity).toBeCloseTo(150);
    noUnexplained(r);
  });

  it('las operaciones sobre una dimensión no alteran las demás', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100, { quality: 0.6, load: 20 });
    const t = b.node('bubble', 'Formación');
    b.behavior(t, 'transformer', { mode: 'shift', value: 0.2 }, { affectedDimensions: ['quality'] });
    b.behavior(t, 'reducer', { ratio: 0.1 });
    const out = b.node('output', 'Salida');
    b.edge(inp, t);
    b.edge(t, out);
    const r = simulate(b.doc, { iterations: 1 });
    const term = it1(r).nodes[out].terminal;
    expect(term.int.quality).toBeCloseTo(0.8);
    expect(qty(term)).toBeCloseTo(90);
    expect(term.ext.load).toBeCloseTo(20);
    expect(term.int.speed).toBeCloseTo(1);
    noUnexplained(r);
  });

  it('pérdida, multiplicador y retardo en conexiones', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const out = b.node('output', 'Salida');
    b.edge(inp, out, { behavior: { loss: 0.2, multiplier: 1.5 }, delay: 2 });
    const r = simulate(b.doc, { iterations: 4 });
    expect(r.metrics.resultSeries.map((v) => Math.round(v))).toEqual([0, 0, 120, 120]);
    noUnexplained(r);
  });

  it('condición de activación bloquea un nodo', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const g = b.node('bubble', 'Puerta');
    b.set(g, 'inactiveMode', 'block');
    const c = b.condition(g, 'node', { id: 'x', conditionType: 'iteration', operator: '>=', operands: [{ kind: 'const', value: 3 }], children: [] });
    b.set(g, 'activationConditionId', c);
    const out = b.node('output', 'Salida');
    b.edge(inp, g);
    b.edge(g, out);
    const r = simulate(b.doc, { iterations: 3 });
    expect(r.metrics.resultSeries).toEqual([0, 0, 100]);
    expect(r.iterations[0].nodes[g].flags).toContain('blocked');
    noUnexplained(r);
  });

  it('condiciones lógicas AND / OR / NOT y comportamiento IF/ELSE', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const n = b.node('bubble', 'Nodo');
    const bid = b.behavior(n, 'filter', { passRatio: 0.5 }, { elseMode: 'alternate', elseParameters: { passRatio: 0.9 } });
    const c = b.condition(bid, 'behavior', {
      id: 'and', conditionType: 'and', operator: null, operands: [], children: [
        { id: 'a', conditionType: 'iteration', operator: '>=', operands: [{ kind: 'const', value: 2 }], children: [] },
        { id: 'n', conditionType: 'not', operator: null, operands: [], children: [
          { id: 'o', conditionType: 'or', operator: null, operands: [], children: [
            { id: 'i', conditionType: 'iteration', operator: '==', operands: [{ kind: 'const', value: 3 }], children: [] },
          ] },
        ] },
      ],
    });
    b.doc.behaviors[bid] = { ...b.doc.behaviors[bid], conditions: [c] };
    const out = b.node('output', 'Salida');
    b.edge(inp, n);
    b.edge(n, out);
    const r = simulate(b.doc, { iterations: 4 });
    // it1: cond falsa → ELSE 0.9; it2: verdadera → 0.5; it3: falsa (NOT) → 0.9; it4: 0.5
    expect(r.metrics.resultSeries.map((v) => Math.round(v))).toEqual([90, 50, 90, 50]);
  });

  it('influencia causal modula el flujo según polaridad y sensibilidad', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const fr = b.node('bubble', 'Fricción tecnológica');
    b.set(fr, 'weight', { importance: null, influence: { mode: 'weighted', value: -3, scaleId: null }, impact: null });
    const conv = b.node('bubble', 'Conversación');
    const out = b.node('output', 'Salida');
    b.edge(inp, conv);
    b.edge(conv, out);
    b.edge(fr, conv, { type: 'causal', behavior: { influence: { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.5 } as never } });
    const r = simulate(b.doc, { iterations: 1 });
    expect(qty(it1(r).nodes[out].terminal)).toBeCloseTo(70);
    noUnexplained(r);
  });

  it('valores cualitativos se interpretan como aproximación y se declaran', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    b.doc.nodes[inp].dimensionValues.quality = { value: 3, mode: 'qualitative', unit: '', confidence: 'hypothesis', source: '', range: null };
    const out = b.node('output', 'Salida');
    b.edge(inp, out);
    const r = simulate(b.doc, { iterations: 1 });
    expect(it1(r).nodes[out].terminal.int.quality).toBeCloseTo(0.7);
    expect(r.approximations.length).toBeGreaterThan(0);
    expect(r.hypotheses.some((h) => h.includes('hipótesis'))).toBe(true);
  });

  it('es determinista: misma configuración, mismo resultado', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const f = b.node('bubble', 'F');
    b.behavior(f, 'filter', { passRatio: 0.7 });
    const out = b.node('output', 'S');
    b.edge(inp, f);
    b.edge(f, out);
    b.edge(out, inp, { behavior: { transport: 'replicate', multiplier: 0.2 } });
    const a = simulate(b.doc, { iterations: 10 });
    const c = simulate(b.doc, { iterations: 10 });
    expect(a.metrics.resultSeries).toEqual(c.metrics.resultSeries);
  });
});

describe('Circuitos y retroalimentación', () => {
  it('1-3. bucle reforzador: la realimentación aumenta las entradas siguientes', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const ventas = b.node('output', 'Ventas');
    b.edge(inp, ventas);
    const ret = b.edge(ventas, inp, { behavior: { transport: 'replicate', multiplier: 0.5 } });
    const r = simulate(b.doc, { iterations: 5 });
    // 100, 150, 175, 187.5, 193.75 (converge a 200: ganancia < 1)
    expect(r.metrics.resultSeries[0]).toBeCloseTo(100);
    expect(r.metrics.resultSeries[1]).toBeCloseTo(150);
    expect(r.metrics.resultSeries[4]).toBeCloseTo(193.75);
    expect(r.loops[0].polarity).toBe('reinforcing');
    expect(r.iterations[1].edges[ret].feedback).toBe(true);
    noUnexplained(r);
  });

  it('4-5. bucle equilibrador: se estabiliza', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const a = b.node('bubble', 'Proceso');
    const out = b.node('output', 'Resultado');
    b.edge(inp, a);
    b.edge(a, out);
    b.edge(out, a, { behavior: { transport: 'replicate', multiplier: 0.5, polarity: 'negative' } });
    const r = simulate(b.doc, { iterations: 30 });
    expect(r.loops[0].polarity).toBe('balancing');
    const last = r.metrics.resultSeries.slice(-3);
    expect(last[2]).toBeCloseTo(66.6667, 2);
    expect(Math.abs(last[2] - last[1])).toBeLessThan(0.01);
    noUnexplained(r);
  });

  it('bucle equilibrador causal (más ventas → más carga → menos conversión)', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const conv = b.node('bubble', 'Conversión');
    const ventas = b.node('output', 'Ventas');
    const carga = b.node('bubble', 'Carga de trabajo');
    b.set(carga, 'influenceSource', 'throughput');
    b.set(carga, 'influenceReference', 100);
    b.set(carga, 'weight', { importance: null, influence: { mode: 'weighted', value: 5, scaleId: null }, impact: null });
    b.edge(inp, conv);
    b.edge(conv, ventas);
    b.edge(ventas, carga, { behavior: { transport: 'replicate', multiplier: 1 } });
    b.edge(carga, conv, { type: 'causal', behavior: { polarity: 'negative', influence: { mode: 'modulate', sensitivity: 0.5, targetDimension: 'quantity' } as never } });
    const r = simulate(b.doc, { iterations: 25 });
    expect(r.loops.some((l) => l.polarity === 'balancing')).toBe(true);
    const s = r.metrics.resultSeries;
    expect(Math.abs(s[24] - s[23])).toBeLessThan(0.5);
    expect(s[24]).toBeLessThan(100);
  });

  it('6-7. retardo: el efecto aparece después', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const ventas = b.node('output', 'Ventas');
    b.edge(inp, ventas);
    b.edge(ventas, inp, { behavior: { transport: 'replicate', multiplier: 0.5 }, delay: 3 });
    const r = simulate(b.doc, { iterations: 5 });
    expect(r.metrics.resultSeries.map((v) => Math.round(v * 100) / 100)).toEqual([100, 100, 100, 150, 150]);
    noUnexplained(r);
  });

  it('8-9. saturación y límite máximo del circuito se respetan', () => {
    const b = new DocBuilder();
    const inp = b.input('Llamadas', 100);
    const ventas = b.node('output', 'Ventas');
    b.edge(inp, ventas);
    const ret = b.edge(ventas, inp, { behavior: { transport: 'replicate', multiplier: 1.2 } });
    b.circuit('Referidos', [inp, ventas], [ret], { returnEdgeId: ret, maxLimit: 50 });
    const r = simulate(b.doc, { iterations: 10 });
    for (const it of r.iterations) expect(it.edges[ret] ? qty(it.edges[ret].delivered) : 0).toBeLessThanOrEqual(50 + 1e-9);
    expect(r.metrics.resultSeries[9]).toBeCloseTo(150);
    expect(r.loops[0].polarity).toBe('mixed');
    noUnexplained(r);
  });

  it('10. bucle de ganancia > 1 no se procesa infinitamente y avisa del crecimiento', () => {
    const b = new DocBuilder();
    const inp = b.input('Semilla', 1);
    const a = b.node('bubble', 'A');
    b.behavior(a, 'multiplier', { factor: 10 });
    b.edge(inp, a);
    b.edge(a, a); // autolazo de transferencia
    const start = Date.now();
    const r = simulate(b.doc, { iterations: 40 });
    expect(Date.now() - start).toBeLessThan(2000);
    expect(r.iterations).toHaveLength(40);
    expect(r.loops.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.includes('explosivo'))).toBe(true);
  });

  it('circuito con frecuencia y porcentaje de retorno', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const out = b.node('output', 'Salida');
    b.edge(inp, out);
    const ret = b.edge(out, inp, { behavior: { transport: 'replicate' } });
    b.circuit('Retorno', [inp, out], [ret], { returnEdgeId: ret, returnPercent: 10, frequency: 2 });
    const r = simulate(b.doc, { iterations: 4 });
    // retorno solo en iteraciones impares (1, 3) → llega en 2 y 4
    expect(r.metrics.resultSeries.map((v) => Math.round(v * 100) / 100)).toEqual([100, 110, 100, 110]);
  });

  it('transferencia de vuelta (circuito cerrado real) sin bucle infinito', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const a = b.node('bubble', 'A');
    const c = b.node('bubble', 'B');
    b.set(a, 'split', { mode: 'fixed', dynamicSourceNodeId: null });
    b.edge(inp, a);
    b.edge(a, c, { behavior: { share: 100 } });
    const sink = b.node('output', 'Salida');
    b.set(c, 'split', { mode: 'fixed', dynamicSourceNodeId: null });
    b.edge(c, sink, { behavior: { share: 70 } });
    b.edge(c, a, { behavior: { share: 30 } });
    const r = simulate(b.doc, { iterations: 20 });
    // estado estacionario: x = 100 + 0.3x → 142.86 en A; salida = 0.7 × 142.86 = 100
    expect(r.metrics.resultSeries[19]).toBeCloseTo(100, 1);
    noUnexplained(r);
  });
});
