import { describe, expect, it } from 'vitest';
import { bigMap } from '../src/demo/bigMap';
import { simulate } from '../src/engine/simulate';
import { computeMonitor } from '../src/engine/monitor';
import { computeHeat } from '../src/engine/heat';
import { simulationFingerprint } from '../src/engine/scenario';

describe('Rendimiento del motor con mapas progresivamente grandes', () => {
  for (const n of [100, 300, 600]) {
    it(`${n} nodos, 24 iteraciones`, () => {
      const doc = bigMap(n);
      const t0 = performance.now();
      const r = simulate(doc, { iterations: 24 });
      const t1 = performance.now();
      const heat = computeHeat(doc, r);
      const t2 = performance.now();
      console.log(`${n} nodos · ${Object.keys(doc.edges).length} conexiones · simulación ${(t1 - t0).toFixed(0)} ms · calor ${(t2 - t1).toFixed(0)} ms`);
      expect(r.metrics.maxUnexplained).toBeLessThan(1e-6 * Math.max(1, r.metrics.totalGenerated.quantity ?? 1));
      expect(Object.keys(heat.nodes).length).toBeGreaterThan(n * 0.9);
      expect(t1 - t0).toBeLessThan(n <= 300 ? 1500 : 4000);
    });
  }

  it('monitor con contrafactuales en un mapa de 150 nodos', () => {
    const doc = bigMap(150);
    const r = simulate(doc, { iterations: 12 });
    const t0 = performance.now();
    const m = computeMonitor(doc, null, r, { maxItems: 24 });
    const dt = performance.now() - t0;
    console.log(`monitor 150 nodos: ${dt.toFixed(0)} ms, ${m.frictions.length} fricciones`);
    expect(dt).toBeLessThan(8000);
  });

  it('invalidación selectiva: mover o recolorear no invalida la simulación', () => {
    const doc = bigMap(50);
    const fp = simulationFingerprint(doc, null, 12);
    const id = Object.keys(doc.nodes)[5];
    const moved = { ...doc, nodes: { ...doc.nodes, [id]: { ...doc.nodes[id], position: { x: 9999, y: 9999 }, title: 'otro', visualStyle: { ...doc.nodes[id].visualStyle, color: 'rose' } } } };
    expect(simulationFingerprint(moved, null, 12)).toBe(fp);
    const bid = Object.keys(doc.behaviors)[3];
    const changed = { ...doc, behaviors: { ...doc.behaviors, [bid]: { ...doc.behaviors[bid], parameters: { ...doc.behaviors[bid].parameters, passRatio: 0.5 } } } };
    expect(simulationFingerprint(changed, null, 12)).not.toBe(fp);
  });
});
