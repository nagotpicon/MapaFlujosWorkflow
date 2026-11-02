import { describe, expect, it } from 'vitest';
import { buildInsuranceDemo } from '../src/demo/insuranceDemo';
import { simulate } from '../src/engine/simulate';
import { computeMonitor } from '../src/engine/monitor';
import { buildVerdict, verdictToMarkdown } from '../src/engine/verdict';
import { DocBuilder } from '../src/core/model/builder';

describe('Monitor y «Dímelo claro»', () => {
  it('calcula embudo, fricciones e impulsores con contrafactuales', () => {
    const doc = buildInsuranceDemo();
    const base = Object.values(doc.scenarios).find((s) => s.isBase)!;
    const r = simulate(doc, { scenarioId: base.id });
    const m = computeMonitor(doc, base.id, r);
    expect(m.funnel.length).toBeGreaterThan(3);
    expect(m.funnel[0].title).toBe('Llamadas recibidas');
    expect(m.funnel[m.funnel.length - 1].title).toBe('Ventas');
    expect(m.frictions.length).toBeGreaterThan(2);
    expect(m.frictions[0].impact).toBeGreaterThan(0);
    expect(m.drivers.length).toBeGreaterThan(0);
    const v = buildVerdict(doc, m, base.name);
    const md = verdictToMarkdown(doc, v);
    console.log(md);
    expect(md).toContain('Dímelo claro');
    expect(v.point).toMatch(/de cada 100/);
  });

  it('no inventa cifras: cada número citado sale de los datos', () => {
    const b = new DocBuilder();
    const inp = b.input('Entrada', 100);
    const f = b.node('bubble', 'Filtro');
    b.behavior(f, 'filter', { passRatio: 0.4 });
    const o = b.node('output', 'Salida');
    b.edge(inp, f); b.edge(f, o);
    const r = simulate(b.doc, { iterations: 2 });
    const m = computeMonitor(b.doc, null, r);
    const v = buildVerdict(b.doc, m, 'Base');
    expect(v.point).toContain('40');
    expect(m.frictions[0].impact).toBeCloseTo(120);
    const allowed = [m.kpis.totalResult, m.kpis.totalGenerated, m.kpis.lostPct * 100, 40, m.frictions[0].impact, m.frictions[0].impactPct * 100];
    for (const n of v.citedNumbers) expect(allowed.some((a) => Math.abs(a - n) < 1e-6)).toBe(true);
  });
});
