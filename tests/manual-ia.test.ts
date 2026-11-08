/**
 * Garantiza que el ejemplo del MANUAL-IA (docs/ejemplos/mapa-ejemplo-ia.json)
 * se importa sin errores ni reparaciones y simula con conservación exacta.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseProjectDoc } from '../src/core/model/migrations';
import { simulate } from '../src/engine/simulate';
import { analizarCamino } from '../src/engine/kid';
import { leerCamino } from '../src/kid/model';

const raw = JSON.parse(readFileSync(new URL('../docs/ejemplos/mapa-ejemplo-ia.json', import.meta.url), 'utf8'));

describe('Ejemplo del manual para IA', () => {
  it('se valida y migra sin reparaciones', () => {
    const { doc, repairs } = parseProjectDoc(raw);
    expect(repairs).toEqual([]);
    expect(Object.keys(doc.nodes)).toHaveLength(7);
    expect(Object.keys(doc.conditions)).toHaveLength(1);
    expect(Object.keys(doc.dimensions).length).toBeGreaterThanOrEqual(5);
    expect(doc.schemaVersion).toBe(2);
  });

  it('simula, conserva el flujo y el escenario cambia el resultado', () => {
    const { doc } = parseProjectDoc(raw);
    const base = simulate(doc, { scenarioId: 'scn_base' });
    const mas = simulate(doc, { scenarioId: 'scn_huecos' });
    const total = (r: typeof base) => r.metrics.totalResult.quantity ?? 0;
    expect(total(base)).toBeGreaterThan(0);
    expect(total(mas)).toBeGreaterThan(total(base));
    for (const it of base.iterations) expect(Math.abs(it.ledger.unexplained.quantity ?? 0)).toBeLessThan(1e-6);
    expect(base.iterations[0].nodes['n_domicilio'].active).toBe(false);
    expect(base.iterations[3].nodes['n_domicilio'].active).toBe(true);
    console.log('base', total(base).toFixed(2), 'más huecos', total(mas).toFixed(2));
  });
});

describe('Ejemplo avanzado del manual para IA', () => {
  const adv = JSON.parse(readFileSync(new URL('../docs/ejemplos/mapa-ejemplo-ia-avanzado.json', import.meta.url), 'utf8'));

  it('se valida sin reparaciones y conserva la dimensión propia', () => {
    const { doc, repairs } = parseProjectDoc(adv);
    expect(repairs).toEqual([]);
    expect(doc.dimensions.coste.aggregation).toBe('extensive');
    expect(doc.project.settings.frame.mode).toBe('grid');
    expect(doc.project.settings.depth).toBe('expert');
  });

  it('simula: rechazo, desborde, circuito y marco temporal funcionan y se conserva todo', () => {
    const { doc } = parseProjectDoc(adv);
    const r = simulate(doc, { scenarioId: 'scn_base' });
    const total = (x: typeof r) => x.metrics.totalResult.quantity ?? 0;
    for (const it of r.iterations) for (const v of Object.values(it.ledger.unexplained)) expect(Math.abs(v)).toBeLessThan(1e-6);
    const sumTerm = (id: string) => r.iterations.reduce((s, it) => s + (it.nodes[id]?.terminal.ext.quantity ?? 0), 0);
    expect(sumTerm('n_abandono')).toBeGreaterThan(0);
    expect(sumTerm('n_pedidos')).toBeGreaterThan(0);
    expect(r.iterations.some((it) => it.nodes['n_pago'].saturated)).toBe(true);
    expect(r.iterations.some((it) => (it.nodes['n_cola'].stock.quantity ?? 0) > 0)).toBe(true);
    expect(r.loops.length).toBeGreaterThan(0);
    expect(r.frameNotes.length).toBeGreaterThan(0);
    const mas = simulate(doc, { scenarioId: 'scn_pagos' });
    const peor = simulate(doc, { scenarioId: 'scn_peor' });
    expect(total(mas)).toBeGreaterThan(total(r));
    expect(total(peor)).toBeLessThan(total(r));
    // Fórmulas de colocación del MANUAL-IA: x = (c−1)·ancho + ancho/2 − 95 ; y = −f·alto − 32
    expect(r.frameNotes).toContain('«Envío gratis» está 1 fila(s) por encima (apoyo) del eje: +8% sobre su flujo');
    expect(r.frameNotes).toContain('«Pedidos en espera» está 1 fila(s) por debajo (fricción) del eje: −8% sobre su flujo');
    expect(r.frameNotes).toContain('«Visitas a la web» → «Añaden al carrito»: 1 semana(s) de separación = 1 vuelta(s) de retardo');
    console.log('avanzado base', total(r).toFixed(1), 'pagos', total(mas).toFixed(1), 'floja', total(peor).toFixed(1));
  });
});

describe('Ejemplo del modo fácil (mapa-ejemplo-camino.json)', () => {
  const raw = JSON.parse(readFileSync(new URL('../docs/ejemplos/mapa-ejemplo-camino.json', import.meta.url), 'utf8'));
  it('se importa sin reparaciones y se lee como un camino', () => {
    const { doc, repairs } = parseProjectDoc(raw);
    expect(repairs).toEqual([]);
    const c = leerCamino(doc);
    expect(c.pasos.map((p) => p.title)).toEqual(['Repasar 20 minutos cada día', 'Hacer los ejercicios del libro', 'Preguntar lo que no entiendo']);
    expect(c.piedras).toHaveLength(2);
    expect(c.ayudas).toHaveLength(1);
    expect(c.razones).toHaveLength(1);
  });
  it('la cuenta del MANUAL-IA es exacta: 0,9 × 0,7 → llegan 6,3 de cada 10', () => {
    const a = analizarCamino(parseProjectDoc(raw).doc);
    expect(a.llegan).toBe(6.3);
    expect(a.sinPiedras).toBe(10);
    expect(a.piedras.map((s) => s.id)).toEqual(['n_piedra2', 'n_piedra']);
  });
});

describe('MANUAL-IA.md', () => {
  const md = readFileSync(new URL('../docs/MANUAL-IA.md', import.meta.url), 'utf8');
  const blocks = [...md.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);

  it('todos los proyectos completos incluidos en el manual se importan sin reparaciones', () => {
    const projects = blocks.map((b) => { try { return JSON.parse(b); } catch { return null; } }).filter((j) => j?.project?.id);
    expect(projects.length).toBe(3);
    for (const p of projects) {
      const { repairs } = parseProjectDoc(p);
      expect(repairs).toEqual([]);
    }
  });

  it('la condición de ejemplo y el discovery de ejemplo son JSON válido', () => {
    const parsed = blocks.map((b) => { try { return JSON.parse(b); } catch { return undefined; } });
    expect(parsed.some((j) => j?.conditionType === 'iteration')).toBe(true);
    expect(parsed.some((j) => j?.role === 'friction')).toBe(true);
  });
});
