import { describe, expect, it } from 'vitest';
import { buildInsuranceDemo } from '../src/demo/insuranceDemo';
import { simulate } from '../src/engine/simulate';
import { diagnose } from '../src/engine/diagnostics';
import { compareScenarios, tornado, trace, uncertaintyBand, sensitivitySweep, listNumericParams } from '../src/engine/analysis';
import { ProjectDocSchema } from '../src/core/model/schema';

describe('Proyecto de demostración', () => {
  const doc = buildInsuranceDemo();
  const scen = Object.values(doc.scenarios);
  const base = scen.find((s) => s.isBase)!;

  it('valida contra el esquema', () => {
    expect(ProjectDocSchema.safeParse(doc).success).toBe(true);
    expect(scen).toHaveLength(5);
  });

  it('simula todos los escenarios con conservación', () => {
    const totals: Record<string, number> = {};
    for (const s of scen) {
      const r = simulate(doc, { scenarioId: s.id });
      expect(r.metrics.maxUnexplained).toBeLessThan(1e-6);
      totals[s.name] = r.metrics.totalResult.quantity ?? 0;
    }
    console.log('Totales por escenario', totals);
    const a = totals['Situación inicial'];
    expect(a).toBeGreaterThan(0);
    for (const k of Object.keys(totals)) if (k !== 'Situación inicial') expect(totals[k]).toBeGreaterThan(a);
    expect(totals['E · Combinar mejoras']).toBeGreaterThanOrEqual(Math.max(...Object.values(totals)) - 1e-9);
  });

  it('detecta el circuito, diagnostica y compara', () => {
    const r = simulate(doc, { scenarioId: base.id });
    expect(r.loops.length).toBeGreaterThan(0);
    const t = tornado(doc, base.id, 0.2, 25);
    const d = diagnose(doc, r, t);
    console.log(d.slice(0, 12).map((x) => `${x.severity} | ${x.title}`).join('\n'));
    expect(d.some((x) => x.kind === 'loss')).toBe(true);
    expect(d.some((x) => x.kind === 'compensation')).toBe(true);
    expect(d.some((x) => x.kind.startsWith('loop'))).toBe(true);
    expect(d.every((x) => x.rule && x.confidence)).toBe(true);
    const sE = scen.find((s) => s.name.startsWith('E'))!;
    const cmp = compareScenarios(doc, base.id, sE.id);
    expect(cmp.improved.length).toBeGreaterThan(0);
    expect(cmp.parameterDiffs.length).toBeGreaterThan(0);
    expect(cmp.hypothesisBased).toBe(true);
  });

  it('rastreo hacia atrás reconstruye las contribuciones de Ventas', () => {
    const r = simulate(doc, { scenarioId: base.id });
    const ventas = Object.values(doc.nodes).find((n) => n.title === 'Ventas')!;
    const tr = trace(doc, ventas.id, 'backward', r);
    expect(tr.nodeIds.length).toBeGreaterThan(5);
    expect(tr.contributions.length).toBeGreaterThan(0);
    const sum = tr.contributions.reduce((s, c) => s + c.share, 0);
    expect(sum).toBeCloseTo(1);
    const fwd = trace(doc, Object.values(doc.nodes).find((n) => n.title === 'Llamadas recibidas')!.id, 'forward', r);
    expect(fwd.activeEdgeIds.length).toBeGreaterThan(3);
  });

  it('incertidumbre y sensibilidad', () => {
    const band = uncertaintyBand(doc, base.id);
    expect(band.totals.favorable).toBeGreaterThan(band.totals.central);
    expect(band.totals.unfavorable).toBeLessThan(band.totals.central);
    const p = listNumericParams(doc).find((x) => x.path === 'parameters.passRatio')!;
    const sw = sensitivitySweep(doc, base.id, p, [0.5, 0.65, 0.8]);
    expect(sw[2].result).toBeGreaterThan(sw[0].result);
  });
});
