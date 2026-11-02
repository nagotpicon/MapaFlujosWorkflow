/**
 * PROYECTO DE DEMOSTRACIÓN
 * SISTEMA DE ÉXITO COMERCIAL — OPERADOR DE SEGUROS DE HOGAR
 *
 * Todos los valores son FICTICIOS y DEMOSTRATIVOS. El mapa es totalmente
 * editable y simulable: no es una estructura obligatoria.
 */
import { DocBuilder } from '../core/model/builder';
import { createAnnotation, createScenario, newId } from '../core/model/factory';
import type { Layer, MapEdge, ProjectDoc, ScaleValue } from '../core/model/schema';

const weighted = (value: number): ScaleValue => ({ mode: 'weighted', value, scaleId: null });

export const DEMO_NAME = 'SISTEMA DE ÉXITO COMERCIAL — OPERADOR DE SEGUROS DE HOGAR';

export function buildInsuranceDemo(): ProjectDoc {
  const b = new DocBuilder(DEMO_NAME);
  const doc = b.doc;
  doc.project.isDemo = true;
  doc.project.description = 'Ejemplo didáctico con valores ficticios. Modifica cualquier variable y simula.';
  doc.project.settings.simulation.iterations = 12;

  // Capas
  const baseLayer = Object.values(doc.layers)[0];
  const mkLayer = (name: string, color: string, order: number): Layer => ({ id: newId('lyr'), name, color, visible: true, locked: false, order });
  const lFlow = mkLayer('Flujo comercial', '#3b82f6', 1);
  const lFactors = mkLayer('Factores y fricciones', '#f59e0b', 2);
  const lLoop = mkLayer('Retroalimentación', '#10b981', 3);
  doc.layers = { [baseLayer.id]: baseLayer, [lFlow.id]: lFlow, [lFactors.id]: lFactors, [lLoop.id]: lLoop };

  const demoMeta = { demo: true, confidence: 'hypothesis' as const };
  const N = (type: Parameters<DocBuilder['node']>[0], title: string, x: number, y: number, extra: Parameters<DocBuilder['node']>[2] = {}) =>
    b.node(type, title, { position: { x, y }, metadata: { ...demoMeta } as never, ...extra });

  // ── Ruta principal ──
  const llamadas = N('input', 'Llamadas recibidas', 0, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'PhoneIncoming' } as never, description: 'Entrada del sistema: llamadas entrantes por iteración (semana).' });
  doc.nodes[llamadas].dimensionValues = {
    quantity: { value: 100, mode: 'numeric', unit: 'llamadas', confidence: 'hypothesis', source: 'Valor demostrativo', range: { low: 80, high: 120 } },
    quality: { value: 2, mode: 'qualitative', unit: '', confidence: 'hypothesis', source: 'Valor demostrativo', range: null },
    load: { value: 25, mode: 'numeric', unit: 'h', confidence: 'hypothesis', source: 'Valor demostrativo', range: null },
  };
  b.behavior(llamadas, 'generator');

  const clasif = N('bubble', 'Clasificación de llamadas', 260, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'Filter', color: 'violet' } as never, description: 'Separa llamadas útiles de no útiles.' });
  const fClasif = b.behavior(clasif, 'filter', { passRatio: 0.65 }, { ranges: { passRatio: { favorable: 0.72, unfavorable: 0.55 } } });

  const utiles = N('bubble', 'Llamadas útiles', 520, 180, { layerIds: [lFlow.id], visualStyle: { icon: 'CheckCircle2', color: 'blue' } as never });
  const noUtiles = N('bubble', 'Llamadas no útiles', 520, 420, { layerIds: [lFlow.id], visualStyle: { icon: 'XCircle', color: 'rose' } as never, description: 'Fuera de perfil, incompletas o mal clasificadas.' });
  b.set(noUtiles, 'weight', { importance: weighted(3), influence: weighted(-4), impact: null });
  b.behavior(noUtiles, 'reducer', { ratio: 0.5 }, { label: 'Parte irrecuperable (fuera de perfil)' });

  const capacidad = N('bubble', 'Capacidad del operador', 780, 180, { layerIds: [lFlow.id], visualStyle: { icon: 'UserCheck', color: 'blue' } as never, description: 'Llamadas que el operador puede atender en una semana.' });
  b.behavior(capacidad, 'restrictor', { capacity: 70, excess: 'overflow' }, { ranges: { capacity: { favorable: 80, unfavorable: 60 } } });

  const conversacion = N('bubble', 'Conversación comercial', 1040, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'MessagesSquare', color: 'blue' } as never });
  b.set(conversacion, 'convergence', { rule: 'sum', overlap: 1, formula: 'sum' });
  b.behavior(conversacion, 'transformer', { mode: 'shift', value: 0.05 }, { affectedDimensions: ['potential'], label: 'La conversación eleva el potencial' });

  const objeciones = N('bubble', 'Objeciones', 1300, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'ShieldAlert', color: 'rose' } as never, description: 'Precio, coberturas, desconfianza.' });
  b.set(objeciones, 'weight', { importance: weighted(4), influence: weighted(-3), impact: null });
  b.behavior(objeciones, 'reducer', { ratio: 0.35 }, { label: 'Oportunidades que se pierden por objeciones' });

  const cierre = N('bubble', 'Cierre', 1560, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'Handshake', color: 'violet' } as never });
  b.behavior(cierre, 'filter', { passRatio: 0.4 }, { label: 'Tasa de cierre', ranges: { passRatio: { favorable: 0.48, unfavorable: 0.32 } } });

  const ventas = N('output', 'Ventas', 1820, 260, { layerIds: [lFlow.id], visualStyle: { icon: 'BadgeEuro' } as never });

  // ── Ruta de recuperación ──
  const recuperacion = N('bubble', 'Recuperación de oportunidades', 1040, 520, { layerIds: [lFlow.id], visualStyle: { icon: 'RotateCcw', color: 'emerald' } as never, description: 'Rellamadas, otro canal y desbordes de capacidad.' });
  b.behavior(recuperacion, 'filter', { passRatio: 0.3 }, { label: 'Se recupera una parte' });

  // ── Factores ──
  const calidadOp = N('bubble', 'Calidad de oportunidad', 780, 20, { layerIds: [lFactors.id], visualStyle: { icon: 'Gem', color: 'violet' } as never });
  b.set(calidadOp, 'weight', { importance: weighted(4), influence: weighted(2), impact: null });
  const tiempo = N('bubble', 'Tiempo disponible', 520, 20, { layerIds: [lFactors.id], visualStyle: { icon: 'Clock', color: 'amber' } as never, description: 'Tiempo real del operador (cualitativo).' });
  b.set(tiempo, 'weight', { importance: weighted(3), influence: { mode: 'qualitative', value: 2, scaleId: 'scale_five' }, impact: null });
  const formacion = N('bubble', 'Formación', 1040, -120, { layerIds: [lFactors.id], visualStyle: { icon: 'GraduationCap', color: 'emerald' } as never });
  b.set(formacion, 'weight', { importance: weighted(4), influence: weighted(2), impact: null });
  b.behavior(formacion, 'compensator', { efficiency: 1 });
  const motivacion = N('bubble', 'Motivación', 1300, -120, { layerIds: [lFactors.id], visualStyle: { icon: 'Flame', color: 'amber' } as never });
  b.set(motivacion, 'weight', { importance: weighted(3), influence: weighted(3), impact: null });
  const friccion = N('bubble', 'Fricción tecnológica', 1300, 20, { layerIds: [lFactors.id], visualStyle: { icon: 'Bug', color: 'rose' } as never, description: 'CRM lento, cortes, doble registro.' });
  b.set(friccion, 'weight', { importance: weighted(4), influence: weighted(-3), impact: null });
  const argumentario = N('bubble', 'Argumentario', 1560, 20, { layerIds: [lFactors.id], visualStyle: { icon: 'ScrollText', color: 'emerald' } as never });
  b.set(argumentario, 'weight', { importance: weighted(3), influence: weighted(2), impact: null });
  b.behavior(argumentario, 'compensator', { efficiency: 1 });

  // ── Retroalimentación ──
  const aprendizaje = N('bubble', 'Aprendizaje', 1820, 520, { layerIds: [lLoop.id], visualStyle: { icon: 'Lightbulb', color: 'emerald' } as never, description: 'Cada venta genera experiencia; su influencia crece con las ventas.' });
  b.set(aprendizaje, 'influenceSource', 'throughput');
  b.set(aprendizaje, 'influenceReference', 20);
  b.set(aprendizaje, 'weight', { importance: weighted(3), influence: weighted(4), impact: null });
  const mejora = N('bubble', 'Mejora del sistema', 1560, 680, { layerIds: [lLoop.id], visualStyle: { icon: 'Wrench', color: 'emerald' } as never });
  b.set(mejora, 'weight', { importance: weighted(3), influence: weighted(1), impact: null });
  b.behavior(mejora, 'compensator', { efficiency: 1 });

  const flowE = (from: string, to: string, init: Parameters<DocBuilder['edge']>[2] = {}) => b.edge(from, to, init);
  const causal = (from: string, to: string, influence: Partial<MapEdge['behavior']['influence']>, extra: Partial<MapEdge['behavior']> = {}, label = '') =>
    b.edge(from, to, { type: 'causal', behavior: { ...extra, influence: influence as never }, visualStyle: { label, sourceAnchor: 'bottom', targetAnchor: 'top' } });

  flowE(llamadas, clasif);
  flowE(clasif, utiles, { visualStyle: { label: 'útiles' } });
  flowE(clasif, noUtiles, { behavior: { role: 'reject' }, visualStyle: { label: 'no útiles', sourceAnchor: 'bottom', targetAnchor: 'left' } });
  flowE(utiles, capacidad);
  flowE(capacidad, conversacion);
  flowE(capacidad, recuperacion, { behavior: { role: 'overflow' }, visualStyle: { label: 'desborde', sourceAnchor: 'bottom', targetAnchor: 'top' }, delay: 1 });
  flowE(noUtiles, recuperacion, { visualStyle: { label: 'recuperables' } });
  flowE(recuperacion, conversacion, { visualStyle: { label: 'recuperadas', sourceAnchor: 'top', targetAnchor: 'bottom' } });
  flowE(conversacion, objeciones);
  flowE(objeciones, cierre);
  flowE(cierre, ventas);
  flowE(cierre, recuperacion, { behavior: { role: 'reject', loss: 0.5 }, delay: 2, visualStyle: { label: 'no cerradas', sourceAnchor: 'bottom', targetAnchor: 'right' } });

  causal(calidadOp, conversacion, { mode: 'modulate', targetDimension: 'quality', sensitivity: 0.3 }, {}, 'calidad');
  causal(tiempo, capacidad, { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.15 }, {}, 'tiempo');
  causal(formacion, cierre, { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.15 }, {}, 'mejor cierre');
  causal(motivacion, conversacion, { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.1 }, {}, 'actitud');
  causal(friccion, conversacion, { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.25 }, {}, 'fricción');
  causal(friccion, conversacion, { mode: 'modulate', targetDimension: 'speed', sensitivity: 0.4 }, {}, 'lentitud');
  causal(formacion, friccion, { mode: 'compensate', compensationUnit: 'points', amount: 1, compensationType: 'partial' }, {}, 'mitiga');
  causal(argumentario, objeciones, { mode: 'compensate', compensationUnit: 'percent', amount: 30, compensationType: 'partial' }, {}, 'mitiga');
  causal(mejora, noUtiles, { mode: 'compensate', compensationUnit: 'percent', amount: 20, compensationType: 'temporal', fromIteration: 4, toIteration: null }, {}, 'reduce');

  // Circuito: ventas → aprendizaje → mejora del sistema; ventas → referidos → llamadas
  const eAprend = flowE(ventas, aprendizaje, { behavior: { transport: 'replicate', multiplier: 1 }, visualStyle: { label: 'experiencia', sourceAnchor: 'bottom', targetAnchor: 'top' } });
  causal(aprendizaje, mejora, { mode: 'modulate', targetDimension: '__influence', sensitivity: 0.5 }, {}, 'aprende');
  causal(aprendizaje, cierre, { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.1 }, {}, 'experiencia');
  const eRef = flowE(ventas, llamadas, { behavior: { transport: 'replicate', multiplier: 1 }, delay: 1, visualStyle: { label: 'referidos', sourceAnchor: 'top', targetAnchor: 'top' } });
  b.circuit('Referidos', [llamadas, clasif, utiles, capacidad, conversacion, objeciones, cierre, ventas], [eRef], {
    returnEdgeId: eRef, returnPercent: 15, loopType: 'auto', saturation: 25,
    description: 'Clientes satisfechos recomiendan el servicio: parte de las ventas vuelve como llamadas nuevas.',
  });
  void eAprend;

  // Escenarios
  const base = Object.values(doc.scenarios)[0];
  base.description = 'Valores demostrativos de partida.';
  const pid = doc.project.id;
  const ov = (targetType: 'node' | 'edge' | 'behavior', targetId: string, path: string, value: unknown) => ({ id: newId('ov'), targetType, targetId, path, value, note: '' });
  const formEdge = Object.values(doc.edges).find((e) => e.sourceNodeId === formacion && e.targetNodeId === friccion)!;
  const sB = createScenario(pid, 'B · Mejorar la clasificación', { description: 'Mejor filtrado inicial: más llamadas útiles.', color: '#8b5cf6', overrides: [ov('behavior', fClasif, 'parameters.passRatio', 0.75)] });
  const sC = createScenario(pid, 'C · Aumentar la formación', { description: 'Más formación: más influencia y mayor mitigación de la fricción.', color: '#10b981', overrides: [
    ov('node', formacion, 'weight.influence.value', 4), ov('edge', formEdge.id, 'behavior.influence.amount', 2),
  ] });
  const sD = createScenario(pid, 'D · Reducir la fricción tecnológica', { description: 'Herramientas más ágiles.', color: '#06b6d4', overrides: [ov('node', friccion, 'weight.influence.value', -1)] });
  const sE = createScenario(pid, 'E · Combinar mejoras', { description: 'B + C + D.', color: '#f59e0b', overrides: [...sB.overrides, ...sC.overrides, ...sD.overrides].map((o) => ({ ...o, id: newId('ov') })) });
  for (const s of [sB, sC, sD, sE]) doc.scenarios[s.id] = s;

  const note = createAnnotation('project', pid, 'Todos los valores de este proyecto son ficticios e ilustrativos. Sirven para aprender a usar el simulador, no describen ninguna empresa real.', { kind: 'note', author: 'MAPA DE FLUJOS', labels: ['demostrativo'] });
  doc.annotations[note.id] = note;
  const c1 = createAnnotation('node', noUtiles, 'Causas: cliente fuera de perfil, llamada incompleta, error de clasificación.', { kind: 'note', author: 'Demo' });
  const c2 = createAnnotation('node', friccion, 'Hipótesis: el CRM tarda ~40 s por registro.', { kind: 'hypothesis', author: 'Demo' });
  doc.annotations[c1.id] = c1;
  doc.annotations[c2.id] = c2;

  // Nota explicativa en el lienzo
  N('note', 'Valores ficticios y demostrativos. Cambia cualquier parámetro en el inspector y pulsa ▶ para simular.', 0, -60, { dimensions: { width: 300, height: 110 } });
  return doc;
}
