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
    description: 'Produce flujo nuevo en cada ronda con las dimensiones definidas en el nodo.',
    params: [
      { key: 'amount', label: 'Cantidad por ronda', kind: 'number', default: 100, min: 0, step: 1, help: 'Se usa si el nodo no define la dimensión Cantidad.' },
      { key: 'mode', label: 'Emisión', kind: 'select', default: 'continuous', options: [
        { value: 'continuous', label: 'Continua (cada ronda)' }, { value: 'once', label: 'Pulso único' },
      ] },
      { key: 'startIteration', label: 'Desde la ronda', kind: 'number', default: 1, min: 1, step: 1, advanced: true },
      { key: 'endIteration', label: 'Hasta la ronda (0 = sin fin)', kind: 'number', default: 0, min: 0, step: 1, advanced: true },
      { key: 'growth', label: 'Crecimiento por ronda', kind: 'percent', default: 0, min: -1, max: 1, step: 0.01, advanced: true },
    ],
    defaultDimensions: ['quantity'],
  },
  consumer: {
    type: 'consumer', label: 'Consumidor', verb: 'Consume', family: 'loss', phase: 'transform', icon: 'Flame',
    description: 'Absorbe parte del flujo (se registra como consumido, no como perdido).',
    params: [
      { key: 'mode', label: 'Modo', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Proporción' }, { value: 'amount', label: 'Cantidad fija' },
      ] },
      { ...pct('ratio', 'Proporción consumida', 0.2), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cantidad consumida', kind: 'number', default: 10, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  filter: {
    type: 'filter', label: 'Filtro', verb: 'Filtra', family: 'route', phase: 'filter', icon: 'Filter',
    description: 'Deja pasar una parte del flujo. Lo rechazado va a las conexiones de rechazo o se pierde.',
    params: [
      { key: 'mode', label: 'Criterio', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Proporción que pasa' }, { value: 'threshold', label: 'Umbral de dimensión' },
      ] },
      { ...pct('passRatio', 'Pasa', 0.65), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'thresholdDimension', label: 'Dimensión evaluada', kind: 'dimension', default: 'quality', showIf: { key: 'mode', equals: ['threshold'] } },
      { key: 'operator', label: 'Operador', kind: 'select', default: '>=', options: [
        { value: '>=', label: '≥' }, { value: '>', label: '>' }, { value: '<=', label: '≤' }, { value: '<', label: '<' },
      ], showIf: { key: 'mode', equals: ['threshold'] } },
      { key: 'threshold', label: 'Umbral', kind: 'number', default: 0.5, step: 0.05, showIf: { key: 'mode', equals: ['threshold'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  transformer: {
    type: 'transformer', label: 'Transformador', verb: 'Transforma', family: 'shape', phase: 'transform', icon: 'Shuffle',
    description: 'Cambia las características del flujo: escala, desplaza, fija o convierte una dimensión en otra.',
    params: [
      { key: 'mode', label: 'Operación', kind: 'select', default: 'scale', options: [
        { value: 'scale', label: 'Escalar (×)' }, { value: 'shift', label: 'Desplazar (+)' },
        { value: 'set', label: 'Fijar valor' }, { value: 'convert', label: 'Convertir dimensión' },
      ] },
      { key: 'factor', label: 'Factor', kind: 'number', default: 1.2, step: 0.05, showIf: { key: 'mode', equals: ['scale', 'convert'] } },
      { key: 'value', label: 'Valor', kind: 'number', default: 0.1, step: 0.05, showIf: { key: 'mode', equals: ['shift', 'set'] } },
      { key: 'from', label: 'Desde dimensión', kind: 'dimension', default: 'quantity', showIf: { key: 'mode', equals: ['convert'] } },
      { key: 'to', label: 'Hacia dimensión', kind: 'dimension', default: 'load', showIf: { key: 'mode', equals: ['convert'] } },
      { ...pct('ratio', 'Proporción convertida', 0.5), showIf: { key: 'mode', equals: ['convert'] } },
    ],
    defaultDimensions: ['quality'],
  },
  multiplier: {
    type: 'multiplier', label: 'Multiplicador', verb: 'Multiplica', family: 'gain', phase: 'transform', icon: 'X',
    description: 'Amplifica una o varias dimensiones. El aumento de magnitudes extensivas se registra como generación.',
    params: [{ key: 'factor', label: 'Factor', kind: 'number', default: 1.5, min: 0, step: 0.05 }],
    defaultDimensions: ['quantity'],
  },
  reducer: {
    type: 'reducer', label: 'Reductor', verb: 'Reduce', family: 'loss', phase: 'transform', icon: 'TrendingDown',
    description: 'Disminuye una dimensión. La reducción de magnitudes extensivas se registra como pérdida.',
    params: [
      { key: 'mode', label: 'Modo', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Proporción' }, { value: 'amount', label: 'Cantidad fija' },
      ] },
      { ...pct('ratio', 'Reducción', 0.1), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cantidad', kind: 'number', default: 5, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  accelerator: {
    type: 'accelerator', label: 'Acelerador', verb: 'Acelera', family: 'shape', phase: 'transform', icon: 'Gauge',
    description: 'Modifica la velocidad del flujo (factor > 1 acelera, < 1 frena).',
    params: [{ key: 'factor', label: 'Factor de velocidad', kind: 'number', default: 1.3, min: 0, step: 0.05 }],
    defaultDimensions: ['speed'],
  },
  restrictor: {
    type: 'restrictor', label: 'Restrictor', verb: 'Limita', family: 'loss', phase: 'capacity', icon: 'Minimize2',
    description: 'Limita la capacidad de paso por ronda. El exceso se pierde, se encola o se desborda a otra ruta.',
    params: [
      { key: 'capacity', label: 'Capacidad por ronda', kind: 'number', default: 50, min: 0, step: 1 },
      { key: 'excess', label: 'Exceso', kind: 'select', default: 'queue', options: [
        { value: 'queue', label: 'Encolar para la siguiente ronda' }, { value: 'lose', label: 'Se pierde' },
        { value: 'overflow', label: 'Desbordar a las uniones de desborde' },
      ] },
    ],
    defaultDimensions: ['quantity'],
  },
  diverter: {
    type: 'diverter', label: 'Desviador', verb: 'Desvía', family: 'route', phase: 'route', icon: 'Split',
    description: 'Envía una parte del flujo a las conexiones marcadas como desvío.',
    params: [pct('ratio', 'Proporción desviada', 0.2)],
    defaultDimensions: ['quantity'],
  },
  accumulator: {
    type: 'accumulator', label: 'Acumulador', verb: 'Acumula', family: 'store', phase: 'store', icon: 'Database',
    description: 'Guarda flujo para otro momento (stock). Puede tener capacidad máxima y fugas.',
    params: [
      pct('ratio', 'Proporción almacenada', 1),
      { key: 'maxStock', label: 'Stock máximo (0 = sin límite)', kind: 'number', default: 0, min: 0 },
      { ...pct('leak', 'Fuga del stock por ronda', 0), advanced: true },
      { key: 'initialStock', label: 'Stock inicial', kind: 'number', default: 0, min: 0, advanced: true },
    ],
    defaultDimensions: ['quantity'],
  },
  releaser: {
    type: 'releaser', label: 'Liberador', verb: 'Libera', family: 'store', phase: 'store', icon: 'PackageOpen',
    description: 'Devuelve al flujo lo acumulado en el stock del nodo.',
    params: [
      { key: 'mode', label: 'Modo', kind: 'select', default: 'ratio', options: [
        { value: 'ratio', label: 'Proporción del stock' }, { value: 'amount', label: 'Cantidad fija' }, { value: 'all', label: 'Todo' },
      ] },
      { ...pct('ratio', 'Proporción liberada', 0.5), showIf: { key: 'mode', equals: ['ratio'] } },
      { key: 'amount', label: 'Cantidad liberada', kind: 'number', default: 10, min: 0, showIf: { key: 'mode', equals: ['amount'] } },
    ],
    defaultDimensions: ['quantity'],
  },
  compensator: {
    type: 'compensator', label: 'Compensador', verb: 'Compensa', family: 'control', phase: 'control', icon: 'ShieldCheck',
    description: 'Mitiga el efecto negativo de otros elementos a través de sus conexiones de compensación.',
    params: [{ key: 'efficiency', label: 'Eficacia', kind: 'percent', default: 1, min: 0, max: 2, step: 0.05 }],
    defaultDimensions: [],
  },
  detector: {
    type: 'detector', label: 'Detector', verb: 'Observa', family: 'control', phase: 'observe', icon: 'Radar',
    description: 'Mide el flujo sin modificarlo y avisa cuando cruza un umbral.',
    params: [
      { key: 'metric', label: 'Mide', kind: 'select', default: 'in', options: [
        { value: 'in', label: 'Entrada' }, { value: 'out', label: 'Salida' }, { value: 'dim', label: 'Dimensión' },
      ] },
      { key: 'dimension', label: 'Dimensión', kind: 'dimension', default: 'quality', showIf: { key: 'metric', equals: ['dim'] } },
      { key: 'threshold', label: 'Umbral de aviso (0 = ninguno)', kind: 'number', default: 0 },
    ],
    defaultDimensions: [],
  },
  controller: {
    type: 'controller', label: 'Controlador', verb: 'Controla', family: 'control', phase: 'control', icon: 'SlidersHorizontal',
    description: 'Cuando está activo modifica un parámetro de otro comportamiento (SI condición → ENTONCES ajuste).',
    params: [
      { key: 'targetBehaviorId', label: 'Comportamiento controlado', kind: 'behavior', default: '' },
      { key: 'parameter', label: 'Parámetro', kind: 'text', default: 'capacity' },
      { key: 'mode', label: 'Ajuste', kind: 'select', default: 'scale', options: [
        { value: 'scale', label: 'Multiplicar' }, { value: 'set', label: 'Fijar' }, { value: 'add', label: 'Sumar' },
      ] },
      { key: 'value', label: 'Valor', kind: 'number', default: 1.5, step: 0.05 },
    ],
    defaultDimensions: [],
  },
};

export const BEHAVIOR_ORDER: BehaviorType[] = [
  'generator', 'filter', 'transformer', 'multiplier', 'reducer', 'consumer', 'accelerator',
  'restrictor', 'accumulator', 'releaser', 'diverter', 'compensator', 'detector', 'controller',
];

export const FAMILY_LABEL: Record<BehaviorFamily, string> = {
  source: 'Origen', shape: 'Forma', gain: 'Impulso', loss: 'Pérdida / fricción', route: 'Ruta', store: 'Reserva', control: 'Control',
};
