/**
 * Biblioteca extensible de comportamientos.
 * Cada entrada describe sus parámetros para que la interfaz pueda construir
 * los controles visualmente (sin obligar a escribir código) y el motor sepa
 * qué valores por defecto aplicar.
 */
import type { BehaviorType } from './schema';

export type ParamKind = 'number' | 'percent' | 'select' | 'dimension' | 'node' | 'edge' | 'boolean' | 'behavior' | 'text';

export interface ParamSpec {
  key: string;
  label: string;
  kind: ParamKind;
  default: number | string | boolean | null;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
  /** Solo se muestra si otro parámetro tiene cierto valor */
  showIf?: { key: string; equals: (string | number | boolean)[] };
  advanced?: boolean;
}

export type BehaviorFamily = 'source' | 'shape' | 'gain' | 'loss' | 'route' | 'store' | 'control';

export interface BehaviorSpec {
  type: BehaviorType;
  label: string;
  verb: string;
  family: BehaviorFamily;
  description: string;
  /** Fase del pipeline en la que actúa */
  phase: 'generate' | 'filter' | 'transform' | 'capacity' | 'store' | 'route' | 'observe' | 'control';
  icon: string;
  params: ParamSpec[];
  defaultDimensions: string[];
}

const pct = (key: string, label: string, def: number, help?: string): ParamSpec => ({
  key, label, kind: 'percent', default: def, min: 0, max: 1, step: 0.01, help,
});

export const BEHAVIOR_LIBRARY: Record<BehaviorType, BehaviorSpec> = {
  generator: {
    type: 'generator', label: 'Generador', verb: 'Genera', family: 'source', phase: 'generate', icon: 'Sparkles',
    description: 'Produce flujo nuevo en cada vuelta con las dimensiones definidas en el nodo.',
    params: [
      { key: 'amount', label: '¿Cuántos crea en cada vuelta?', kind: 'number', default: 100, min: 0, step: 1, help: 'Si la idea ya dice cuántos en «Qué sale de aquí», manda eso.' },
      { key: 'mode', label: '¿Cuándo crea?', kind: 'select', default: 'continuous', options: [
        { value: 'continuous', label: 'En todas las vueltas' }, { value: 'once', label: 'Solo una vez, al principio' },
      ] },
      { key: 'startIteration', label: 'Empieza en la vuelta', kind: 'number', default: 1, min: 1, step: 1, advanced: true },
      { key: 'endIteration', label: 'Para en la vuelta (0 = nunca para)', kind: 'number', default: 0, min: 0, step: 1, advanced: true },
      { key: 'growth', label: 'Cada vuelta crea un poco más', kind: 'percent', default: 0, min: -1, max: 1, step: 0.01, advanced: true, help: '10 % = cada vuelta, un 10 % más. Negativo = cada vez menos.' },
    ],
    defaultDimensions: ['quantity'],
  },
  consumer: {
    type: 'consumer', label: 'Consumidor', verb: 'Consume', family: 'loss', phase: 'transform', icon: 'Flame',
    description: 'Absorbe parte del flujo (se registra como consumido, no como perdido).',
    params: [
      { key: 'mode', label: '¿Cómo se lo come?', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Una parte (en %)' }, { value: 'amount', label: 'Un número fijo' },
      ] },
      { ...pct('ratio', 'Qué parte se come', 0.2, '20 % = de cada 100, se come 20.'), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cuántos se come', kind: 'number', default: 10, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  filter: {
    type: 'filter', label: 'Filtro', verb: 'Filtra', family: 'route', phase: 'filter', icon: 'Filter',
    description: 'Deja pasar una parte del flujo. Lo rechazado va a las conexiones de rechazo o se pierde.',
    params: [
      { key: 'mode', label: '¿Cómo decide qué pasa?', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Pasa una parte (en %)' }, { value: 'threshold', label: 'Pasa lo que cumple una regla' },
      ] },
      { ...pct('passRatio', '¿Qué parte pasa?', 0.65, '65 % = de cada 100, pasan 65. Lo demás se queda fuera.'), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'thresholdDimension', label: '¿Qué mira?', kind: 'dimension', default: 'quality', showIf: { key: 'mode', equals: ['threshold'] } },
      { key: 'operator', label: '¿Cómo compara?', kind: 'select', default: '>=', options: [
        { value: '>=', label: '≥ (igual o más)' }, { value: '>', label: '> (más)' }, { value: '<=', label: '≤ (igual o menos)' }, { value: '<', label: '< (menos)' },
      ], showIf: { key: 'mode', equals: ['threshold'] } },
      { key: 'threshold', label: '¿Con qué número?', kind: 'number', default: 0.5, step: 0.05, showIf: { key: 'mode', equals: ['threshold'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  transformer: {
    type: 'transformer', label: 'Transformador', verb: 'Transforma', family: 'shape', phase: 'transform', icon: 'Shuffle',
    description: 'Cambia las características del flujo: escala, desplaza, fija o convierte una dimensión en otra.',
    params: [
      { key: 'mode', label: '¿Qué cambio hace?', kind: 'select', default: 'scale', options: [
        { value: 'scale', label: 'Multiplicarlo (×)' }, { value: 'shift', label: 'Sumarle (+)' },
        { value: 'set', label: 'Ponerle un valor fijo' }, { value: 'convert', label: 'Convertir una cosa en otra' },
      ] },
      { key: 'factor', label: '¿Por cuánto?', kind: 'number', default: 1.2, step: 0.05, showIf: { key: 'mode', equals: ['scale', 'convert'] } },
      { key: 'value', label: '¿Cuánto?', kind: 'number', default: 0.1, step: 0.05, showIf: { key: 'mode', equals: ['shift', 'set'] } },
      { key: 'from', label: 'Convierte esto…', kind: 'dimension', default: 'quantity', showIf: { key: 'mode', equals: ['convert'] } },
      { key: 'to', label: '…en esto', kind: 'dimension', default: 'load', showIf: { key: 'mode', equals: ['convert'] } },
      { ...pct('ratio', 'Qué parte convierte', 0.5), showIf: { key: 'mode', equals: ['convert'] } },
    ],
    defaultDimensions: ['quality'],
  },
  multiplier: {
    type: 'multiplier', label: 'Multiplicador', verb: 'Multiplica', family: 'gain', phase: 'transform', icon: 'X',
    description: 'Amplifica una o varias dimensiones. El aumento de magnitudes extensivas se registra como generación.',
    params: [{ key: 'factor', label: '¿Por cuánto multiplica?', kind: 'number', default: 1.5, min: 0, step: 0.05, help: '2 = el doble. 1,5 = la mitad más.' }],
    defaultDimensions: ['quantity'],
  },
  reducer: {
    type: 'reducer', label: 'Reductor', verb: 'Reduce', family: 'loss', phase: 'transform', icon: 'TrendingDown',
    description: 'Disminuye una dimensión. La reducción de magnitudes extensivas se registra como pérdida.',
    params: [
      { key: 'mode', label: '¿Cómo se escapa?', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Una parte (en %)' }, { value: 'amount', label: 'Un número fijo' },
      ] },
      { ...pct('ratio', 'Qué parte se escapa', 0.1, '10 % = de cada 100, se escapan 10.'), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cuántos se escapan', kind: 'number', default: 5, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  accelerator: {
    type: 'accelerator', label: 'Acelerador', verb: 'Acelera', family: 'shape', phase: 'transform', icon: 'Gauge',
    description: 'Modifica la velocidad del flujo (factor > 1 acelera, < 1 frena).',
    params: [{ key: 'factor', label: '¿Cuánto más rápido?', kind: 'number', default: 1.3, min: 0, step: 0.05, help: 'Más de 1 = más rápido. Menos de 1 = más lento.' }],
    defaultDimensions: ['speed'],
  },
  restrictor: {
    type: 'restrictor', label: 'Restrictor', verb: 'Limita', family: 'loss', phase: 'capacity', icon: 'Minimize2',
    description: 'Limita la capacidad de paso por vuelta. El exceso se pierde, se encola o se desborda a otra ruta.',
    params: [
      { key: 'capacity', label: '¿Cuántos caben en cada vuelta?', kind: 'number', default: 50, min: 0, step: 1, help: 'Como las sillas de una clase: si llegan más, no caben.' },
      { key: 'excess', label: '¿Qué pasa con los que no caben?', kind: 'select', default: 'queue', options: [
        { value: 'queue', label: 'Esperan a la vuelta siguiente' }, { value: 'lose', label: 'Se pierden' },
        { value: 'overflow', label: 'Van por la línea de «lo que no cabe»' },
      ] },
    ],
    defaultDimensions: ['quantity'],
  },
  diverter: {
    type: 'diverter', label: 'Desviador', verb: 'Desvía', family: 'route', phase: 'route', icon: 'Split',
    description: 'Envía una parte del flujo a las conexiones marcadas como desvío.',
    params: [pct('ratio', 'Qué parte va por el desvío', 0.2, 'Necesita una línea marcada como «Desvío».')],
    defaultDimensions: ['quantity'],
  },
  accumulator: {
    type: 'accumulator', label: 'Acumulador', verb: 'Acumula', family: 'store', phase: 'store', icon: 'Database',
    description: 'Guarda flujo para otro momento (stock). Puede tener capacidad máxima y fugas.',
    params: [
      pct('ratio', 'Qué parte guarda', 1, '100 % = lo guarda todo.'),
      { key: 'maxStock', label: '¿Cuánto cabe en la hucha? (0 = sin límite)', kind: 'number', default: 0, min: 0 },
      { ...pct('leak', 'Se escapa de la hucha en cada vuelta', 0), advanced: true },
      { key: 'initialStock', label: 'Lo que ya hay al empezar', kind: 'number', default: 0, min: 0, advanced: true },
    ],
    defaultDimensions: ['quantity'],
  },
  releaser: {
    type: 'releaser', label: 'Liberador', verb: 'Libera', family: 'store', phase: 'store', icon: 'PackageOpen',
    description: 'Devuelve al flujo lo acumulado en el stock del nodo.',
    params: [
      { key: 'mode', label: '¿Cuánto suelta?', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Una parte (en %)' }, { value: 'amount', label: 'Un número fijo' }, { value: 'all', label: 'Todo' },
      ] },
      { ...pct('ratio', 'Qué parte suelta', 0.5), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cuántos suelta', kind: 'number', default: 10, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  compensator: {
    type: 'compensator', label: 'Compensador', verb: 'Compensa', family: 'control', phase: 'control', icon: 'ShieldCheck',
    description: 'Mitiga el efecto negativo de otros elementos a través de sus conexiones de compensación.',
    params: [{ key: 'efficiency', label: '¿Qué tal funciona?', kind: 'percent', default: 1, min: 0, max: 2, step: 0.05, help: '100 % = funciona tal cual. 50 % = solo la mitad.' }],
    defaultDimensions: [],
  },
  detector: {
    type: 'detector', label: 'Detector', verb: 'Observa', family: 'control', phase: 'observe', icon: 'Radar',
    description: 'Mide el flujo sin modificarlo y avisa cuando cruza un umbral.',
    params: [
      { key: 'metric', label: '¿Qué mira?', kind: 'select', default: 'in', options: [
        { value: 'in', label: 'Lo que le llega' }, { value: 'out', label: 'Lo que sale' }, { value: 'dim', label: 'Otra cosa (calidad, velocidad…)' },
      ] },
      { key: 'dimension', label: '¿Cuál?', kind: 'dimension', default: 'quality', showIf: { key: 'metric', equals: ['dim'] } },
      { key: 'threshold', label: 'Avisa al llegar a (0 = no avisa)', kind: 'number', default: 0 },
    ],
    defaultDimensions: [],
  },
  controller: {
    type: 'controller', label: 'Controlador', verb: 'Controla', family: 'control', phase: 'control', icon: 'SlidersHorizontal',
    description: 'Cuando está activo modifica un parámetro de otro comportamiento (SI condición → ENTONCES ajuste).',
    params: [
      { key: 'targetBehaviorId', label: '¿A qué le cambia algo?', kind: 'behavior', default: '' },
      { key: 'parameter', label: '¿Qué número cambia?', kind: 'text', default: 'capacity', help: 'Su nombre interno, por ejemplo capacity (cuántos caben).' },
      { key: 'mode', label: '¿Cómo lo cambia?', kind: 'select', default: 'scale', options: [
        { value: 'scale', label: 'Multiplicándolo' }, { value: 'set', label: 'Poniéndole un valor' }, { value: 'add', label: 'Sumándole' },
      ] },
      { key: 'value', label: '¿Cuánto?', kind: 'number', default: 1.5, step: 0.05 },
    ],
    defaultDimensions: [],
  },
};

/** Nombre, dibujo y explicación de cada comportamiento para cualquiera (también un niño de 8 años). */
export const BEHAVIOR_KID: Record<BehaviorType, { name: string; emoji: string; hint: string }> = {
  generator: { name: 'Fábrica', emoji: '✨', hint: 'Crea cosas nuevas en cada vuelta, como un grifo que echa agua.' },
  consumer: { name: 'Se come una parte', emoji: '🍽️', hint: 'Usa o gasta una parte de lo que le llega.' },
  filter: { name: 'Colador', emoji: '🧺', hint: 'Solo deja pasar una parte. Lo demás se queda fuera.' },
  transformer: { name: 'Cambia cómo es', emoji: '🔄', hint: 'Cambia algo de lo que pasa: mejor calidad, más peso…' },
  multiplier: { name: 'Multiplica', emoji: '✖️', hint: 'Lo que llega sale más grande: el doble, la mitad más…' },
  reducer: { name: 'Se escapa algo', emoji: '💧', hint: 'Por el camino se pierde un poco.' },
  accelerator: { name: 'Más rápido', emoji: '⚡', hint: 'Hace que vaya más rápido (o más lento).' },
  restrictor: { name: 'Límite', emoji: '🚧', hint: 'Solo caben unos cuantos en cada vuelta; los demás esperan o se pierden.' },
  diverter: { name: 'Desvío', emoji: '↪️', hint: 'Manda una parte por otro camino.' },
  accumulator: { name: 'Hucha', emoji: '🐷', hint: 'Lo va guardando para más adelante.' },
  releaser: { name: 'Suelta lo guardado', emoji: '🎁', hint: 'Saca lo que había en la hucha.' },
  compensator: { name: 'Remedio', emoji: '🩹', hint: 'Les quita fuerza a los frenos a los que está unido.' },
  detector: { name: 'Chivato', emoji: '👀', hint: 'Mira lo que pasa sin tocar nada y avisa al llegar a un número.' },
  controller: { name: 'Mando', emoji: '🎛️', hint: 'Cuando se cumple algo, cambia cómo funciona otra cosa.' },
};

export const BEHAVIOR_ORDER: BehaviorType[] = [
  'generator', 'filter', 'transformer', 'multiplier', 'reducer', 'consumer', 'accelerator',
  'restrictor', 'accumulator', 'releaser', 'diverter', 'compensator', 'detector', 'controller',
];

export const FAMILY_LABEL: Record<BehaviorFamily, string> = {
  source: 'Crear', shape: 'Cambiar', gain: 'Empujar', loss: 'Frenar o perder', route: 'Repartir', store: 'Guardar', control: 'Vigilar y mandar',
};
