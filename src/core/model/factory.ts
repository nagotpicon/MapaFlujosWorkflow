/**
 * Fábricas y valores por defecto del modelo.
 */
import {
  CURRENT_SCHEMA_VERSION,
  type Annotation,
  type Behavior,
  type BehaviorType,
  type Circuit,
  type Condition,
  type ConditionExpr,
  type FlowDimensionDef,
  type Layer,
  type MapEdge,
  type MapNode,
  type NodeType,
  type Palette,
  type Port,
  type ProjectDoc,
  type ProjectSettings,
  type QualitativeScale,
  type Scenario,
  type EdgeType,
} from './schema';
import { BEHAVIOR_LIBRARY } from './behaviorLibrary';

export function newId(prefix: string): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += (b % 36).toString(36);
  return `${prefix}_${s}`;
}

const now = () => Date.now();

export const DEFAULT_QUALITATIVE_SCALE: QualitativeScale = {
  id: 'scale_five',
  name: 'Muy bajo → Muy alto',
  levels: [
    { label: 'Muy bajo', value: 0.1 },
    { label: 'Bajo', value: 0.3 },
    { label: 'Medio', value: 0.5 },
    { label: 'Alto', value: 0.7 },
    { label: 'Muy alto', value: 0.9 },
  ],
};

export const CRITICAL_SCALE: QualitativeScale = {
  id: 'scale_critical',
  name: 'Muy bajo → Crítico',
  levels: [
    { label: 'Muy bajo', value: 0.1 },
    { label: 'Bajo', value: 0.3 },
    { label: 'Moderado', value: 0.5 },
    { label: 'Alto', value: 0.75 },
    { label: 'Crítico', value: 0.95 },
  ],
};

export const DEFAULT_PALETTE: Palette = {
  flow: '#3b82f6',
  gain: '#10b981',
  loss: '#f43f5e',
  condition: '#f59e0b',
  transform: '#8b5cf6',
  concept: '#94a3b8',
};

export function defaultDimensions(): Record<string, FlowDimensionDef> {
  const dims: FlowDimensionDef[] = [
    {
      id: 'quantity', key: 'quantity', name: 'Cantidad', description: 'Volumen que circula',
      dataType: 'numeric', measurementMode: 'per-iteration', unit: 'u', range: { min: 0, max: 1_000_000 },
      aggregation: 'extensive', confidence: 'estimate', source: '', color: '#3b82f6', scaleId: null,
      builtin: true, defaultValue: 0,
    },
    {
      id: 'quality', key: 'quality', name: 'Calidad', description: 'Proporción del flujo con valor (0–1)',
      dataType: 'numeric', measurementMode: 'instant', unit: '', range: { min: 0, max: 1 },
      aggregation: 'intensive', confidence: 'estimate', source: '', color: '#8b5cf6', scaleId: 'scale_five',
      builtin: true, defaultValue: 0.5,
    },
    {
      id: 'speed', key: 'speed', name: 'Velocidad', description: 'Rapidez relativa de circulación (1 = nominal)',
      dataType: 'numeric', measurementMode: 'instant', unit: '×', range: { min: 0, max: 3 },
      aggregation: 'intensive', confidence: 'estimate', source: '', color: '#06b6d4', scaleId: null,
      builtin: true, defaultValue: 1,
    },
    {
      id: 'potential', key: 'potential', name: 'Potencial', description: 'Capacidad del flujo para producir resultado (0–1)',
      dataType: 'numeric', measurementMode: 'instant', unit: '', range: { min: 0, max: 1 },
      aggregation: 'intensive', confidence: 'estimate', source: '', color: '#f59e0b', scaleId: 'scale_five',
      builtin: true, defaultValue: 0.5,
    },
    {
      id: 'load', key: 'load', name: 'Carga', description: 'Recursos necesarios para procesarlo',
      dataType: 'numeric', measurementMode: 'per-iteration', unit: 'h', range: { min: 0, max: 100_000 },
      aggregation: 'extensive', confidence: 'estimate', source: '', color: '#64748b', scaleId: null,
      builtin: true, defaultValue: 0,
    },
  ];
  return Object.fromEntries(dims.map((d) => [d.id, d]));
}

export function defaultSettings(): ProjectSettings {
  return {
    weightedScale: { min: -5, max: 5 },
    qualitativeScales: [DEFAULT_QUALITATIVE_SCALE, CRITICAL_SCALE],
    defaultScaleId: DEFAULT_QUALITATIVE_SCALE.id,
    palette: { ...DEFAULT_PALETTE },
    legend: { visible: true, items: {} },
    simulation: { iterations: 12 },
    animation: { enabled: true, particles: true },
    depth: 'advanced',
    shortcuts: {},
    defaultEdgePath: 'curve',
    frame: {
      mode: 'free', cellWidth: 260, cellHeight: 140, origin: { x: 0, y: 0 },
      time: { enabled: true, unitLabel: 'Semana', deadline: null, latePolicy: 'penalize', lateKeep: 0.5, inversionPenalty: 0.15 },
      support: { enabled: false, effectPerRow: 0.08, influencePerRow: 1 },
    },
  };
}

export function createBaseScenario(projectId: string): Scenario {
  const t = now();
  return {
    id: newId('scn'),
    projectId,
    name: 'Situación inicial',
    description: 'Modelo base sin modificaciones',
    isBase: true,
    baseSnapshotId: null,
    overrides: [],
    initialConditions: {},
    uncertainty: 'central',
    color: '#64748b',
    createdAt: t,
    updatedAt: t,
  };
}

export function createEmptyDoc(name = 'Proyecto sin título'): ProjectDoc {
  const t = now();
  const projectId = newId('prj');
  const base = createBaseScenario(projectId);
  const layer: Layer = { id: newId('lyr'), name: 'General', color: '#64748b', visible: true, locked: false, order: 0 };
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    project: {
      id: projectId,
      name,
      description: '',
      createdAt: t,
      updatedAt: t,
      settings: defaultSettings(),
      themePreference: 'system',
      activeScenarioId: base.id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      isDemo: false,
    },
    nodes: {},
    ports: {},
    edges: {},
    behaviors: {},
    conditions: {},
    annotations: {},
    layers: { [layer.id]: layer },
    dimensions: defaultDimensions(),
    scenarios: { [base.id]: base },
    circuits: {},
  };
}

const NODE_DEFAULT_COLOR: Record<NodeType, string> = {
  bubble: 'slate', input: 'blue', output: 'emerald', note: 'amber', label: 'slate',
  comment: 'amber', group: 'slate', container: 'slate',
};

const NODE_DEFAULT_TITLE: Record<NodeType, string> = {
  bubble: 'Nueva idea', input: 'Inicio', output: 'Meta', note: 'Nota', label: 'Etiqueta',
  comment: 'Comentario', group: 'Grupo', container: 'Contenedor',
};

export interface NodeInit extends Partial<Omit<MapNode, 'id' | 'projectId' | 'type'>> {
  id?: string;
}

export function createNode(projectId: string, type: NodeType, init: NodeInit = {}): {
  node: MapNode;
  ports: Port[];
} {
  const t = now();
  const nodeId = init.id ?? newId('nd');
  const ports: Port[] = [];
  const flowCapable = !['note', 'label', 'comment'].includes(type);
  if (flowCapable) {
    if (type !== 'input') {
      ports.push({ id: newId('pt'), nodeId, name: 'Entrada', direction: 'in', supportedDimensions: null, capacity: null, configuration: {} });
    }
    if (type !== 'output') {
      ports.push({ id: newId('pt'), nodeId, name: 'Salida', direction: 'out', supportedDimensions: null, capacity: null, configuration: {} });
    }
  }
  const shape = type === 'input' || type === 'output' ? 'pill' : type === 'group' || type === 'container' ? 'rect' : 'rounded';
  const node: MapNode = {
    id: nodeId,
    projectId,
    type,
    title: init.title ?? NODE_DEFAULT_TITLE[type],
    description: init.description ?? '',
    position: init.position ?? { x: 0, y: 0 },
    dimensions: init.dimensions ?? (type === 'group' ? { width: 360, height: 240 } : type === 'container' ? { width: 520, height: 340 } : null),
    visualStyle: {
      shape,
      color: NODE_DEFAULT_COLOR[type],
      background: null,
      fontFamily: 'sans',
      fontSize: type === 'label' ? 20 : 14,
      fontWeight: type === 'label' ? 650 : 500,
      icon: null,
      image: null,
      borderStyle: type === 'group' ? 'dashed' : 'solid',
      // las notas se leen mejor a la izquierda; lo demás, centrado
      textAlign: type === 'note' || type === 'comment' ? 'left' : 'center',
      ...init.visualStyle,
    },
    tags: init.tags ?? [],
    layerIds: init.layerIds ?? [],
    metadata: {
      category: '', documentation: '', links: [], attachmentIds: [], confidence: 'estimate', demo: false, custom: {}, discovery: null,
      ...init.metadata,
    },
    behaviorIds: init.behaviorIds ?? [],
    portIds: ports.map((p) => p.id),
    weight: init.weight ?? { importance: null, influence: null, impact: null },
    influenceSource: init.influenceSource ?? 'static',
    influenceReference: init.influenceReference ?? 100,
    dimensionValues: init.dimensionValues ?? {},
    activationConditionId: init.activationConditionId ?? null,
    inactiveMode: init.inactiveMode ?? 'passthrough',
    convergence: init.convergence ?? { rule: 'sum', overlap: 1, formula: 'sum' },
    split: init.split ?? { mode: 'proportional', dynamicSourceNodeId: null },
    mitigationCombination: init.mitigationCombination ?? 'additive',
    parentId: init.parentId ?? null,
    collapsed: init.collapsed ?? false,
    branchCollapsed: init.branchCollapsed ?? false,
    locked: init.locked ?? false,
    hidden: init.hidden ?? false,
    aliasOf: init.aliasOf ?? null,
    zIndex: init.zIndex ?? 0,
    createdAt: t,
    updatedAt: t,
  };
  return { node, ports };
}

export interface EdgeInit extends Partial<Omit<MapEdge, 'id' | 'projectId' | 'behavior' | 'visualStyle'>> {
  id?: string;
  behavior?: Partial<MapEdge['behavior']>;
  visualStyle?: Partial<MapEdge['visualStyle']>;
}

export function defaultEdgeBehavior(): MapEdge['behavior'] {
  return {
    role: 'main', transport: 'transfer', share: 50, weight: 1, priority: 1, multiplier: 1, intensity: 1,
    speed: 1, loss: 0, polarity: 'positive',
    influence: {
      mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.25, compensationType: 'partial',
      compensationUnit: 'points', amount: 1, fromIteration: 1, toIteration: null,
    },
    isFeedback: false, transportedDimensions: null, convergenceWeight: 1,
  };
}

export function createEdge(projectId: string, source: string, target: string, type: EdgeType, init: EdgeInit = {}): MapEdge {
  const t = now();
  const base = defaultEdgeBehavior();
  return {
    id: init.id ?? newId('ed'),
    projectId,
    sourceNodeId: source,
    targetNodeId: target,
    sourcePortId: init.sourcePortId ?? null,
    targetPortId: init.targetPortId ?? null,
    direction: init.direction ?? (type === 'conceptual' ? 'none' : 'forward'),
    type,
    visualStyle: {
      pathType: 'curve', color: null, widthMode: 'auto', width: 2,
      dash: type === 'causal' ? 'dashed' : type === 'informative' ? 'dotted' : 'solid',
      label: '', sourceAnchor: 'right', targetAnchor: 'left',
      ...init.visualStyle,
    },
    behavior: { ...base, ...init.behavior, influence: { ...base.influence, ...init.behavior?.influence } },
    conditions: init.conditions ?? [],
    capacity: init.capacity ?? null,
    resistance: init.resistance ?? 0,
    delay: init.delay ?? 0,
    metadata: {
      description: '', tags: [], layerIds: [], hidden: false, createdAt: t, updatedAt: t,
      ...init.metadata,
    },
  };
}

export function createBehavior(ownerId: string, type: BehaviorType, params: Behavior['parameters'] = {}, init: Partial<Behavior> = {}): Behavior {
  const spec = BEHAVIOR_LIBRARY[type];
  const defaults: Behavior['parameters'] = {};
  for (const p of spec.params) defaults[p.key] = p.default;
  return {
    id: init.id ?? newId('bh'),
    ownerId,
    behaviorType: type,
    label: init.label ?? '',
    enabled: init.enabled ?? true,
    parameters: { ...defaults, ...params },
    affectedDimensions: init.affectedDimensions ?? [...spec.defaultDimensions],
    conditions: init.conditions ?? [],
    combinationRule: init.combinationRule ?? 'sequential',
    elseMode: init.elseMode ?? 'inactive',
    elseParameters: init.elseParameters ?? {},
    ranges: init.ranges ?? {},
    sideEffects: init.sideEffects ?? [],
  };
}

export function exprCompare(nodeId: string, metric: 'in' | 'out' | 'stock' | 'influence' | 'lost' | 'result' | 'dim' | 'active', operator: '>' | '>=' | '<' | '<=' | '==' | '!=', value: number, dimensionId: string | null = null): ConditionExpr {
  return {
    id: newId('cx'),
    conditionType: 'compare',
    operator,
    operands: [{ kind: 'metric', nodeId, metric, dimensionId }, { kind: 'const', value }],
    children: [],
  };
}

export function createCondition(ownerId: string, ownerType: Condition['ownerType'], expr: ConditionExpr, init: Partial<Condition> = {}): Condition {
  return {
    id: init.id ?? newId('cnd'),
    ownerId,
    ownerType,
    label: init.label ?? '',
    conditionType: expr.conditionType,
    operator: expr.operator,
    operands: expr.operands,
    expr,
    result: init.result ?? 'activate',
    activationRules: init.activationRules ?? { mode: 'always', sustain: 1 },
  };
}

export function createAnnotation(ownerType: Annotation['ownerType'], ownerId: string, text: string, init: Partial<Annotation> = {}): Annotation {
  return {
    id: init.id ?? newId('an'),
    ownerType,
    ownerId,
    kind: init.kind ?? 'comment',
    text,
    author: init.author ?? 'Yo',
    createdAt: init.createdAt ?? now(),
    labels: init.labels ?? [],
    resolved: init.resolved ?? false,
  };
}

export function createCircuit(name: string, nodeIds: string[], edgeIds: string[], init: Partial<Circuit> = {}): Circuit {
  return {
    id: init.id ?? newId('cir'),
    name,
    nodeIds,
    edgeIds,
    returnEdgeId: init.returnEdgeId ?? edgeIds[edgeIds.length - 1] ?? null,
    loopType: init.loopType ?? 'auto',
    enabled: init.enabled ?? true,
    intensity: init.intensity ?? 1,
    returnPercent: init.returnPercent ?? 100,
    affectedDimensions: init.affectedDimensions ?? [],
    delay: init.delay ?? 0,
    frequency: init.frequency ?? 1,
    conditionId: init.conditionId ?? null,
    persistence: init.persistence ?? 1,
    saturation: init.saturation ?? null,
    maxLimit: init.maxLimit ?? null,
    minLimit: init.minLimit ?? null,
    description: init.description ?? '',
  };
}

export function createScenario(projectId: string, name: string, init: Partial<Scenario> = {}): Scenario {
  const t = now();
  return {
    id: init.id ?? newId('scn'),
    projectId,
    name,
    description: init.description ?? '',
    isBase: false,
    baseSnapshotId: init.baseSnapshotId ?? null,
    overrides: init.overrides ?? [],
    initialConditions: init.initialConditions ?? {},
    uncertainty: init.uncertainty ?? 'central',
    color: init.color ?? '#6366f1',
    createdAt: t,
    updatedAt: t,
  };
}
