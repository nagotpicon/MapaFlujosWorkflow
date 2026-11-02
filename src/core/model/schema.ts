/**
 * MAPA DE FLUJOS — Modelo de datos.
 *
 * Los esquemas Zod son la fuente única de verdad: los tipos TypeScript se infieren
 * de ellos. Todas las relaciones se expresan mediante IDs (nunca referencias de
 * objeto), por lo que un proyecto es siempre serializable a JSON.
 */
import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 2;

const id = z.string().min(1);
const timestamp = z.number();
const primitive = z.union([z.number(), z.string(), z.boolean(), z.null()]);

/* ------------------------------------------------------------------ */
/* Escalas y valores                                                   */
/* ------------------------------------------------------------------ */

/** Modalidad de medición: cualitativa, ponderada o numérica. */
export const ScaleModeSchema = z.enum(['qualitative', 'weighted', 'numeric']);

export const ScaleValueSchema = z.object({
  mode: ScaleModeSchema,
  /** qualitative: índice del nivel en la escala; weighted: valor en la escala ponderada; numeric: valor libre */
  value: z.number(),
  scaleId: z.string().nullable().default(null),
});

export const QualitativeLevelSchema = z.object({
  label: z.string(),
  /** Interpretación numérica (0..1) usada solo cuando hay que simular. Es una aproximación configurable. */
  value: z.number(),
});

export const QualitativeScaleSchema = z.object({
  id,
  name: z.string(),
  levels: z.array(QualitativeLevelSchema).min(2),
});

export const ConfidenceSchema = z.enum(['hypothesis', 'estimate', 'observation', 'verified']);

/* ------------------------------------------------------------------ */
/* Dimensiones de flujo                                                */
/* ------------------------------------------------------------------ */

export const FlowDimensionDefSchema = z.object({
  id,
  key: z.string(),
  name: z.string(),
  description: z.string().default(''),
  /** Tipo de dato / modo de medición por defecto */
  dataType: ScaleModeSchema,
  measurementMode: z.enum(['per-iteration', 'cumulative', 'instant']).default('per-iteration'),
  unit: z.string().default(''),
  range: z.object({ min: z.number(), max: z.number() }),
  /** extensive: se suma y se reparte (cantidad, carga). intensive: se promedia ponderado (calidad, velocidad). */
  aggregation: z.enum(['extensive', 'intensive']),
  confidence: ConfidenceSchema.default('estimate'),
  source: z.string().default(''),
  color: z.string(),
  scaleId: z.string().nullable().default(null),
  builtin: z.boolean().default(false),
  /** Valor por defecto de una dimensión intensiva cuando un flujo no la define */
  defaultValue: z.number().default(0),
});

/** Valor concreto de una dimensión (en entradas, condiciones iniciales…) */
export const DimensionValueSchema = z.object({
  value: z.number(),
  mode: ScaleModeSchema.default('numeric'),
  unit: z.string().default(''),
  confidence: ConfidenceSchema.default('estimate'),
  source: z.string().default(''),
  range: z.object({ low: z.number(), high: z.number() }).nullable().default(null),
});

/* ------------------------------------------------------------------ */
/* Condiciones                                                         */
/* ------------------------------------------------------------------ */

export const OperandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('const'), value: z.number() }),
  z.object({
    kind: z.literal('metric'),
    nodeId: id,
    metric: z.enum(['in', 'out', 'stock', 'influence', 'lost', 'result', 'dim', 'active']),
    dimensionId: z.string().nullable().default(null),
  }),
  z.object({ kind: z.literal('iteration') }),
]);

export const ConditionOperatorSchema = z.enum([
  '>', '>=', '<', '<=', '==', '!=', 'between', 'outside', 'above', 'below',
]);

export const ConditionExprTypeSchema = z.enum([
  'compare', 'range', 'threshold', 'and', 'or', 'not', 'iteration', 'active', 'const',
]);

export interface ConditionExpr {
  id: string;
  conditionType: z.infer<typeof ConditionExprTypeSchema>;
  operator: z.infer<typeof ConditionOperatorSchema> | null;
  operands: z.infer<typeof OperandSchema>[];
  children: ConditionExpr[];
  /** Para 'const' */
  value?: boolean;
}

export const ConditionExprSchema: z.ZodType<ConditionExpr> = z.lazy(() =>
  z.object({
    id,
    conditionType: ConditionExprTypeSchema,
    operator: ConditionOperatorSchema.nullable(),
    operands: z.array(OperandSchema),
    children: z.array(ConditionExprSchema),
    value: z.boolean().optional(),
  }),
) as z.ZodType<ConditionExpr>;

export const ConditionSchema = z.object({
  id,
  ownerId: id,
  ownerType: z.enum(['node', 'edge', 'behavior', 'circuit']),
  label: z.string().default(''),
  /** Tipo de la raíz (redundante con expr, útil para listados) */
  conditionType: ConditionExprTypeSchema,
  operator: ConditionOperatorSchema.nullable().default(null),
  operands: z.array(OperandSchema).default([]),
  expr: ConditionExprSchema,
  /** Resultado: 'activate' => si la expresión es cierta el propietario actúa. 'deactivate' => lo inverso. */
  result: z.enum(['activate', 'deactivate']).default('activate'),
  activationRules: z.object({
    /** always: se evalúa cada iteración; latch: una vez cierta permanece cierta; once: solo actúa la primera vez */
    mode: z.enum(['always', 'latch', 'once']).default('always'),
    /** Número de iteraciones consecutivas en que debe cumplirse antes de activar */
    sustain: z.number().int().min(1).default(1),
  }).default({ mode: 'always', sustain: 1 }),
});

/* ------------------------------------------------------------------ */
/* Comportamientos                                                     */
/* ------------------------------------------------------------------ */

export const BehaviorTypeSchema = z.enum([
  'generator', 'consumer', 'filter', 'transformer', 'multiplier', 'reducer', 'accelerator',
  'restrictor', 'diverter', 'accumulator', 'releaser', 'compensator', 'detector', 'controller',
]);

export const CombinationRuleSchema = z.enum(['sequential', 'multiplicative', 'additive', 'max', 'min']);

export const BehaviorSchema = z.object({
  id,
  ownerId: id,
  behaviorType: BehaviorTypeSchema,
  label: z.string().default(''),
  enabled: z.boolean().default(true),
  parameters: z.record(z.string(), primitive),
  affectedDimensions: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  combinationRule: CombinationRuleSchema.default('sequential'),
  /** IF / ELSE: qué hacer si las condiciones no se cumplen */
  elseMode: z.enum(['inactive', 'alternate']).default('inactive'),
  elseParameters: z.record(z.string(), primitive).default({}),
  /** Incertidumbre: valores favorable / desfavorable para parámetros numéricos (el central es el valor actual) */
  ranges: z.record(z.string(), z.object({ favorable: z.number(), unfavorable: z.number() })).default({}),
  /** Efectos secundarios declarados (descriptivos) */
  sideEffects: z.array(z.object({
    id,
    description: z.string(),
    polarity: z.enum(['positive', 'negative']),
    dimensionId: z.string().nullable().default(null),
  })).default([]),
});

/* ------------------------------------------------------------------ */
/* Nodos y puertos                                                     */
/* ------------------------------------------------------------------ */

export const NodeTypeSchema = z.enum([
  'bubble', 'input', 'output', 'note', 'label', 'comment', 'group', 'container',
]);

export const NodeShapeSchema = z.enum(['rounded', 'pill', 'rect', 'circle', 'diamond', 'hexagon']);

export const VisualStyleSchema = z.object({
  shape: NodeShapeSchema.default('rounded'),
  color: z.string().default('slate'),
  background: z.string().nullable().default(null),
  fontFamily: z.enum(['sans', 'serif', 'mono']).default('sans'),
  fontSize: z.number().default(14),
  fontWeight: z.number().default(500),
  icon: z.string().nullable().default(null),
  image: z.string().nullable().default(null),
  borderStyle: z.enum(['solid', 'dashed', 'dotted', 'none']).default('solid'),
});

export const WeightSchema = z.object({
  importance: ScaleValueSchema.nullable().default(null),
  influence: ScaleValueSchema.nullable().default(null),
  impact: ScaleValueSchema.nullable().default(null),
});

export const ConvergenceSchema = z.object({
  rule: z.enum(['sum', 'weighted', 'priority', 'max', 'min', 'dedupe', 'custom']).default('sum'),
  /** dedupe: grado de solapamiento 0 (independientes) .. 1 (misma entidad) */
  overlap: z.number().min(0).max(1).default(1),
  /** custom: fórmula con variables in1..inN, sum, max, min, count */
  formula: z.string().default('sum'),
});

export const SplitSchema = z.object({
  mode: z.enum(['fixed', 'proportional', 'conditional', 'priority', 'competitive', 'dynamic']).default('proportional'),
  dynamicSourceNodeId: z.string().nullable().default(null),
});

/** Origen y estado de un elemento propuesto por el Explorador / Creador de estrategias. */
export const DiscoverySchema = z.object({
  origin: z.enum(['ai', 'template', 'user']).default('ai'),
  status: z.enum(['suggested', 'confirmed', 'rejected']).default('suggested'),
  role: z.enum(['input', 'resource', 'condition', 'action', 'transformation', 'result', 'limitation', 'friction', 'mitigator', 'alternative', 'metric', 'experiment', 'unknown']).nullable().default(null),
  frictionCategory: z.enum(['personal', 'external', 'system']).nullable().default(null),
  controllability: z.enum(['direct', 'partial', 'external', 'uncontrollable']).nullable().default(null),
  /** ¿eliminar, convivir, compensar o ruta alternativa? */
  resolution: z.enum(['pending', 'eliminate', 'accept', 'compensate', 'reroute']).default('pending'),
  frequency: z.string().default(''),
  intensity: z.string().default(''),
  cost: z.string().default(''),
  probability: z.string().default(''),
  detectability: z.string().default(''),
  stage: z.string().default(''),
  evidence: z.enum(['confirmed', 'observed', 'estimate', 'hypothesis', 'preference', 'unknown']).default('unknown'),
  sourceRef: z.string().default(''),
  sessionId: z.string().nullable().default(null),
});

export const MapNodeSchema = z.object({
  id,
  projectId: id,
  type: NodeTypeSchema,
  title: z.string(),
  description: z.string().default(''),
  position: z.object({ x: z.number(), y: z.number() }),
  dimensions: z.object({ width: z.number(), height: z.number() }).nullable().default(null),
  visualStyle: VisualStyleSchema,
  tags: z.array(z.string()).default([]),
  layerIds: z.array(z.string()).default([]),
  metadata: z.object({
    category: z.string().default(''),
    documentation: z.string().default(''),
    links: z.array(z.string()).default([]),
    attachmentIds: z.array(z.string()).default([]),
    confidence: ConfidenceSchema.default('estimate'),
    demo: z.boolean().default(false),
    custom: z.record(z.string(), z.string()).default({}),
    /** Información de descubrimiento (Explorador / Creador de estrategias) */
    discovery: DiscoverySchema.nullable().default(null),
  }),
  behaviorIds: z.array(z.string()).default([]),
  portIds: z.array(z.string()).default([]),
  weight: WeightSchema.default({ importance: null, influence: null, impact: null }),
  /** Origen de la influencia: estática (peso) o dinámica a partir del flujo/stock del nodo */
  influenceSource: z.enum(['static', 'throughput', 'stock']).default('static'),
  influenceReference: z.number().default(100),
  /** Valores de las dimensiones del flujo que genera (entradas) */
  dimensionValues: z.record(z.string(), DimensionValueSchema).default({}),
  activationConditionId: z.string().nullable().default(null),
  inactiveMode: z.enum(['passthrough', 'block']).default('passthrough'),
  convergence: ConvergenceSchema.default({ rule: 'sum', overlap: 1, formula: 'sum' }),
  split: SplitSchema.default({ mode: 'proportional', dynamicSourceNodeId: null }),
  mitigationCombination: z.enum(['additive', 'max', 'diminishing']).default('additive'),
  parentId: z.string().nullable().default(null),
  collapsed: z.boolean().default(false),
  branchCollapsed: z.boolean().default(false),
  locked: z.boolean().default(false),
  hidden: z.boolean().default(false),
  /** Clon: referencia a la identidad original (mismo elemento en otro lugar del lienzo) */
  aliasOf: z.string().nullable().default(null),
  zIndex: z.number().default(0),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const PortSchema = z.object({
  id,
  nodeId: id,
  name: z.string(),
  direction: z.enum(['in', 'out', 'inout']),
  /** null = todas las dimensiones */
  supportedDimensions: z.array(z.string()).nullable().default(null),
  capacity: z.number().nullable().default(null),
  configuration: z.record(z.string(), primitive).default({}),
});

/* ------------------------------------------------------------------ */
/* Conexiones                                                          */
/* ------------------------------------------------------------------ */

export const EdgeTypeSchema = z.enum(['conceptual', 'causal', 'informative', 'flow']);
export const AnchorSchema = z.enum(['top', 'right', 'bottom', 'left']);

export const EdgeVisualStyleSchema = z.object({
  pathType: z.enum(['curve', 'straight', 'orthogonal']).default('curve'),
  color: z.string().nullable().default(null),
  widthMode: z.enum(['auto', 'manual']).default('auto'),
  width: z.number().default(2),
  dash: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  label: z.string().default(''),
  sourceAnchor: AnchorSchema.default('right'),
  targetAnchor: AnchorSchema.default('left'),
});

export const InfluenceSchema = z.object({
  mode: z.enum(['modulate', 'compensate']).default('modulate'),
  /** modulate: dimensión del nodo destino afectada */
  targetDimension: z.string().default('quantity'),
  /** modulate: cambio relativo máximo cuando la influencia está a fondo de escala */
  sensitivity: z.number().default(0.25),
  /** compensate */
  compensationType: z.enum(['partial', 'total', 'conditional', 'temporal']).default('partial'),
  compensationUnit: z.enum(['percent', 'points']).default('points'),
  amount: z.number().default(1),
  fromIteration: z.number().int().default(1),
  toIteration: z.number().int().nullable().default(null),
});

export const EdgeBehaviorSchema = z.object({
  /** Rol de la conexión de flujo en el reparto del nodo origen */
  role: z.enum(['main', 'reject', 'overflow', 'divert']).default('main'),
  /** transfer: transporta el flujo. replicate: genera en destino una réplica proporcional (retroalimentación) */
  transport: z.enum(['transfer', 'replicate']).default('transfer'),
  share: z.number().default(50),
  weight: z.number().default(1),
  priority: z.number().default(1),
  multiplier: z.number().default(1),
  intensity: z.number().default(1),
  speed: z.number().default(1),
  loss: z.number().min(0).max(1).default(0),
  polarity: z.enum(['positive', 'negative']).default('positive'),
  influence: InfluenceSchema.default({
    mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.25, compensationType: 'partial',
    compensationUnit: 'points', amount: 1, fromIteration: 1, toIteration: null,
  }),
  isFeedback: z.boolean().default(false),
  transportedDimensions: z.array(z.string()).nullable().default(null),
  convergenceWeight: z.number().default(1),
});

export const MapEdgeSchema = z.object({
  id,
  projectId: id,
  sourceNodeId: id,
  targetNodeId: id,
  sourcePortId: z.string().nullable().default(null),
  targetPortId: z.string().nullable().default(null),
  direction: z.enum(['forward', 'both', 'none']).default('forward'),
  type: EdgeTypeSchema,
  visualStyle: EdgeVisualStyleSchema,
  behavior: EdgeBehaviorSchema,
  conditions: z.array(z.string()).default([]),
  capacity: z.number().nullable().default(null),
  /** 0..1: fricción que reduce la velocidad del flujo */
  resistance: z.number().min(0).max(1).default(0),
  /** iteraciones de retardo */
  delay: z.number().int().min(0).default(0),
  metadata: z.object({
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    layerIds: z.array(z.string()).default([]),
    hidden: z.boolean().default(false),
    createdAt: timestamp,
    updatedAt: timestamp,
  }),
});

/* ------------------------------------------------------------------ */
/* Anotaciones, capas, circuitos                                       */
/* ------------------------------------------------------------------ */

export const AnnotationSchema = z.object({
  id,
  ownerType: z.enum(['node', 'edge', 'project', 'scenario']),
  ownerId: id,
  kind: z.enum(['comment', 'note', 'hypothesis', 'evidence', 'question']).default('comment'),
  text: z.string(),
  author: z.string().default('Yo'),
  createdAt: timestamp,
  labels: z.array(z.string()).default([]),
  resolved: z.boolean().default(false),
});

export const LayerSchema = z.object({
  id,
  name: z.string(),
  color: z.string(),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  order: z.number(),
});

export const CircuitSchema = z.object({
  id,
  name: z.string(),
  nodeIds: z.array(z.string()),
  edgeIds: z.array(z.string()),
  /** Conexión de retorno donde se aplican los parámetros del circuito */
  returnEdgeId: z.string().nullable().default(null),
  loopType: z.enum(['auto', 'reinforcing', 'balancing', 'mixed']).default('auto'),
  enabled: z.boolean().default(true),
  intensity: z.number().default(1),
  returnPercent: z.number().min(0).default(100),
  affectedDimensions: z.array(z.string()).default([]),
  delay: z.number().int().min(0).default(0),
  frequency: z.number().int().min(1).default(1),
  conditionId: z.string().nullable().default(null),
  persistence: z.number().int().min(1).default(1),
  saturation: z.number().nullable().default(null),
  maxLimit: z.number().nullable().default(null),
  minLimit: z.number().nullable().default(null),
  description: z.string().default(''),
});

/* ------------------------------------------------------------------ */
/* Escenarios                                                          */
/* ------------------------------------------------------------------ */

export const OverrideSchema = z.object({
  id,
  targetType: z.enum(['node', 'edge', 'behavior', 'condition', 'circuit', 'port']),
  targetId: id,
  /** Ruta con puntos dentro de la entidad, p.ej. "parameters.passRatio" */
  path: z.string(),
  value: z.unknown(),
  note: z.string().default(''),
});

export const ScenarioSchema = z.object({
  id,
  projectId: id,
  name: z.string(),
  description: z.string().default(''),
  isBase: z.boolean().default(false),
  baseSnapshotId: z.string().nullable().default(null),
  overrides: z.array(OverrideSchema).default([]),
  /** Condiciones iniciales: nodeId -> dimensionId -> valor */
  initialConditions: z.record(z.string(), z.record(z.string(), z.number())).default({}),
  uncertainty: z.enum(['central', 'favorable', 'unfavorable']).default('central'),
  color: z.string().default('#6366f1'),
  createdAt: timestamp,
  updatedAt: timestamp,
});

/* ------------------------------------------------------------------ */
/* Proyecto                                                            */
/* ------------------------------------------------------------------ */

export const PaletteSchema = z.object({
  flow: z.string(),
  gain: z.string(),
  loss: z.string(),
  condition: z.string(),
  transform: z.string(),
  concept: z.string(),
});

export const FrameSchema = z.object({
  /** free: tapiz conceptual (la posición no computa). grid: la posición tiene significado */
  mode: z.enum(['free', 'grid']).default('free'),
  cellWidth: z.number().min(40).default(260),
  cellHeight: z.number().min(40).default(140),
  origin: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  time: z.object({
    enabled: z.boolean().default(true),
    unitLabel: z.string().default('Semana'),
    /** columna (1-based) de la fecha límite; null = sin límite */
    deadline: z.number().int().min(1).nullable().default(null),
    latePolicy: z.enum(['penalize', 'cut']).default('penalize'),
    /** fracción que se conserva de lo que llega fuera de plazo (penalize) */
    lateKeep: z.number().min(0).max(1).default(0.5),
    /** pérdida por columna de inversión temporal (efecto antes que su causa) */
    inversionPenalty: z.number().min(0).max(1).default(0.15),
  }).default({ enabled: true, unitLabel: 'Semana', deadline: null, latePolicy: 'penalize', lateKeep: 0.5, inversionPenalty: 0.15 }),
  support: z.object({
    enabled: z.boolean().default(false),
    /** efecto relativo por fila de distancia al eje (p.ej. 0.08 = ±8% por fila) */
    effectPerRow: z.number().min(0).max(1).default(0.08),
    /** puntos de influencia por fila */
    influencePerRow: z.number().min(0).default(1),
  }).default({ enabled: false, effectPerRow: 0.08, influencePerRow: 1 }),
});

export const ProjectSettingsSchema = z.object({
  weightedScale: z.object({ min: z.number(), max: z.number() }),
  qualitativeScales: z.array(QualitativeScaleSchema),
  defaultScaleId: z.string(),
  palette: PaletteSchema,
  legend: z.object({
    visible: z.boolean().default(true),
    items: z.record(z.string(), z.boolean()).default({}),
  }),
  simulation: z.object({
    iterations: z.number().int().min(1).max(500).default(12),
  }),
  animation: z.object({
    enabled: z.boolean().default(true),
    particles: z.boolean().default(true),
  }),
  depth: z.enum(['basic', 'advanced', 'expert']).default('advanced'),
  shortcuts: z.record(z.string(), z.string()).default({}),
  defaultEdgePath: z.enum(['curve', 'straight', 'orthogonal']).default('curve'),
  frame: FrameSchema.default({
    mode: 'free', cellWidth: 260, cellHeight: 140, origin: { x: 0, y: 0 },
    time: { enabled: true, unitLabel: 'Semana', deadline: null, latePolicy: 'penalize', lateKeep: 0.5, inversionPenalty: 0.15 },
    support: { enabled: false, effectPerRow: 0.08, influencePerRow: 1 },
  }),
});

export const ProjectSchema = z.object({
  id,
  name: z.string(),
  description: z.string().default(''),
  createdAt: timestamp,
  updatedAt: timestamp,
  settings: ProjectSettingsSchema,
  themePreference: z.enum(['light', 'dark', 'system']).default('system'),
  activeScenarioId: z.string().nullable().default(null),
  schemaVersion: z.number().int(),
  isDemo: z.boolean().default(false),
});

export const ProjectDocSchema = z.object({
  schemaVersion: z.number().int(),
  project: ProjectSchema,
  nodes: z.record(z.string(), MapNodeSchema),
  ports: z.record(z.string(), PortSchema),
  edges: z.record(z.string(), MapEdgeSchema),
  behaviors: z.record(z.string(), BehaviorSchema),
  conditions: z.record(z.string(), ConditionSchema),
  annotations: z.record(z.string(), AnnotationSchema),
  layers: z.record(z.string(), LayerSchema),
  dimensions: z.record(z.string(), FlowDimensionDefSchema),
  scenarios: z.record(z.string(), ScenarioSchema),
  circuits: z.record(z.string(), CircuitSchema),
});

/* ------------------------------------------------------------------ */
/* Snapshot y ejecuciones (persistidas en tablas propias)              */
/* ------------------------------------------------------------------ */

export const SnapshotSchema = z.object({
  id,
  projectId: id,
  version: z.number().int(),
  label: z.string().default(''),
  auto: z.boolean().default(false),
  data: ProjectDocSchema,
  createdAt: timestamp,
});

export const SimulationRunSummarySchema = z.object({
  id,
  projectId: id,
  scenarioId: id,
  configuration: z.object({ iterations: z.number() }),
  iterationCount: z.number(),
  initialState: z.unknown(),
  finalState: z.unknown(),
  metrics: z.unknown(),
  events: z.array(z.unknown()),
  warnings: z.array(z.string()),
  executionDate: timestamp,
});

/* ------------------------------------------------------------------ */
/* Tipos inferidos                                                     */
/* ------------------------------------------------------------------ */

export type ScaleMode = z.infer<typeof ScaleModeSchema>;
export type ScaleValue = z.infer<typeof ScaleValueSchema>;
export type QualitativeScale = z.infer<typeof QualitativeScaleSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type FlowDimensionDef = z.infer<typeof FlowDimensionDefSchema>;
export type DimensionValue = z.infer<typeof DimensionValueSchema>;
export type Operand = z.infer<typeof OperandSchema>;
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;
export type ConditionExprType = z.infer<typeof ConditionExprTypeSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type BehaviorType = z.infer<typeof BehaviorTypeSchema>;
export type CombinationRule = z.infer<typeof CombinationRuleSchema>;
export type Behavior = z.infer<typeof BehaviorSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type NodeShape = z.infer<typeof NodeShapeSchema>;
export type VisualStyle = z.infer<typeof VisualStyleSchema>;
export type MapNode = z.infer<typeof MapNodeSchema>;
export type Port = z.infer<typeof PortSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type Anchor = z.infer<typeof AnchorSchema>;
export type EdgeVisualStyle = z.infer<typeof EdgeVisualStyleSchema>;
export type Influence = z.infer<typeof InfluenceSchema>;
export type EdgeBehavior = z.infer<typeof EdgeBehaviorSchema>;
export type MapEdge = z.infer<typeof MapEdgeSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type Circuit = z.infer<typeof CircuitSchema>;
export type Override = z.infer<typeof OverrideSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Palette = z.infer<typeof PaletteSchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectDoc = z.infer<typeof ProjectDocSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type SimulationRunSummary = z.infer<typeof SimulationRunSummarySchema>;

export type EntityKind = Override['targetType'];
export type Discovery = z.infer<typeof DiscoverySchema>;
export type Frame = z.infer<typeof FrameSchema>;
