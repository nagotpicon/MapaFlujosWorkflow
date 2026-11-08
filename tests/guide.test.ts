/**
 * La Brújula: una pregunta cada vez, en orden humano, hasta un plan.
 */
import { describe, expect, it } from 'vitest';
import { createEmptyDoc } from '../src/core/model/factory';
import { parseProjectDoc } from '../src/core/model/migrations';
import type { ProjectDoc } from '../src/core/model/schema';
import { analizarCamino } from '../src/engine/kid';
import { answer, descubrimientos, miPlan, nextQuestion, type Answer } from '../src/kid/guide';
import { leerCamino } from '../src/kid/model';

function run() {
  let doc: ProjectDoc = createEmptyDoc('Mis dibujos');
  const skipped = new Set<string>();
  let level: 1 | 2 = 1;
  const asked: string[] = [];
  const step = (expectId: string | RegExp, a: Answer) => {
    const analysis = analizarCamino(doc);
    const ctx = { level, skipped, analysis, selected: null };
    const q = nextQuestion(doc, ctx)!;
    asked.push(q.id);
    if (typeof expectId === 'string') expect(q.id).toBe(expectId); else expect(q.id).toMatch(expectId);
    expect(q.why.length).toBeGreaterThan(10); // siempre explica por qué
    const r = answer(doc, q, a, ctx);
    doc = r.doc;
    for (const s of r.fx.skip ?? []) skipped.add(s);
    for (const s of r.fx.unskip ?? []) skipped.delete(s);
    if (r.fx.level) level = r.fx.level;
    return { q, fx: r.fx };
  };
  return { step, get doc() { return doc; }, get level() { return level; }, asked };
}

describe('Brújula', () => {
  it('lleva de una idea suelta a un plan, sin pedir nada técnico', () => {
    const g = run();
    g.step('idea', { text: 'Nadie ve mis dibujos' });
    const tipo = g.step('tipo', { choice: 'preocupa' });
    expect(tipo.fx.level).toBe(2);
    g.step('meta', { text: 'Vender mis dibujos' });
    g.step('razon', { text: 'Quiero comprarme una tableta' });
    g.step('paso1', { text: 'Hacer 10 dibujos bonitos' });
    g.step('pasoN', { text: 'Enseñarlos en internet' });
    g.step('pasoN', { text: 'Poner un precio' });
    g.step('pasoN', { skip: true });
    g.step('piedra1', { text: 'Me da vergüenza enseñarlos' });
    g.step(/^tamano:/, { choice: 'grande' });
    const donde = g.step(/^donde:/, { choice: leerCamino(g.doc).pasos[1].id });
    expect(donde.q.choices?.length).toBe(4); // tres pasos y «llegar al final»
    g.step(/^ayuda:/, { text: 'Mi prima sabe de redes' });
    g.step(/^fuerza:/, { choice: 'bastante' });
    g.step('piedraN', { skip: true });
    g.step('primero', { choice: leerCamino(g.doc).pasos[0].id });
    g.step('siento', { choice: 'miedo' });
    g.step('miedo', { choice: 'no' });
    g.step('pregunta', { text: '¿Dónde se venden dibujos?' });
    const d = g.step('descubre', { choice: 'ver' });
    expect(d.fx.open).toBe('discover');
    // ahora toca hacerlo
    g.step(/^hecho:/, { choice: 'si' });

    const c = leerCamino(g.doc);
    expect(c.hoy?.title).toBe('Nadie ve mis dibujos');
    expect(c.meta?.title).toBe('Vender mis dibujos');
    expect(c.pasos.map((p) => p.title)).toEqual(['Hacer 10 dibujos bonitos', 'Enseñarlos en internet', 'Poner un precio']);
    const a = analizarCamino(g.doc);
    expect(a.llegan).toBe(7); // piedra grande (−5) con ayuda «bastante» (+2) → 70 %
    expect(a.piedras[0].objetivo).toBe(c.pasos[1].id);
    expect(parseProjectDoc(JSON.parse(JSON.stringify(g.doc))).repairs).toEqual([]);

    const found = descubrimientos(g.doc, a);
    expect(found[0].text).toBe('De cada 10 empujones, llegan 7 a «Vender mis dibujos».');
    expect(found.some((x) => x.text.startsWith('«Me da vergüenza enseñarlos» es tu piedra más grande: te quita'))).toBe(true);
    expect(found.some((x) => x.emoji === '⭐' && x.text.includes('Hacer 10 dibujos bonitos'))).toBe(true);

    const plan = miPlan(g.doc, a);
    expect(plan.lines).toContain('🎯 Quiero: Vender mis dibujos');
    expect(plan.lines).toContain('  1. Hacer 10 dibujos bonitos  ⭐ primer paso  ✅ hecho');
    expect(plan.story).toMatch(/^Quieres «Vender mis dibujos»\. Ahora mismo: «Nadie ve mis dibujos»\./);
    expect(plan.story).toMatch(/¡Tú puedes!$/);
  });

  it('«Lo quiero conseguir» convierte la idea en la meta y pregunta cómo está hoy', () => {
    const g = run();
    g.step('idea', { text: 'Sacar un 8 en mates' });
    g.step('tipo', { choice: 'quiero' });
    expect(leerCamino(g.doc).meta?.title).toBe('Sacar un 8 en mates');
    const hoy = g.step('hoy', { skip: true });
    expect(hoy.q.skip).toBe('No sé, sigue');
    expect(leerCamino(g.doc).hoy?.title).toBe('Así estoy hoy');
    expect(analizarCamino(g.doc).listo).toBe(true);
  });

  it('«Solo quiero pensar» deja soltar ideas y luego elegir una como meta', () => {
    const g = run();
    g.step('idea', { text: 'Mi cumpleaños' });
    g.step('tipo', { choice: 'pensar' });
    expect(g.level).toBe(1);
    g.step('mas', { text: 'Que venga mucha gente' });
    g.step('mas', { text: 'Hacer una tarta' });
    g.step('mas', { text: 'Juegos' });
    const pick = g.step('elegir', { choice: Object.values(g.doc.nodes).find((n) => n.title === 'Que venga mucha gente')!.id });
    expect(pick.fx.level).toBe(2);
    expect(leerCamino(g.doc).meta?.title).toBe('Que venga mucha gente');
    g.step('hoy', { text: 'Solo vienen mis primos' });
  });
});
