/**
 * Tipos de resultado del motor de simulación.
 * Todo es serializable (se transfiere desde el Web Worker).
 */

export type DimMap = Record<string, number>;

/** Paquete de flujo: dimensiones extensivas (se suman), intensivas (se promedian) y composición de origen. */
export interface Packet {
  ext: DimMap;
  int: DimMap;
  /** Cantidad (dimensión primaria) desglosada por origen: nodeId o mecanismo de generación */
  origins: Record<string, number>;
}

export type LedgerKey =
  | 'generated' | 'consumed' | 'lost' | 'accumulated' | 'released' | 'terminal' | 'deduplicated';

export type NodeStateFlag =
  | 'inactive' | 'active' | 'receiving' | 'emitting' | 'loss' | 'blocked' | 'transforming'
  | 'saturated' | 'accumulating' | 'compensated' | 'generating' | 'terminal';

export interface NodeIterState {
  nodeId: string;
  active: boolean;
  /** entrada combinada (tras convergencia) */
  in: Packet;
  /** salida enviada a conexiones (antes de procesar aristas) */
  out: Packet;
  /** flujo que termina en el nodo (resultado si es salida) */
  terminal: Packet;
  generated: DimMap;
  consumed: DimMap;
  lost: DimMap;
  accumulated: DimMap;
  released: DimMap;
  deduplicated: DimMap;
  stock: DimMap;
  queue: DimMap;
  /** influencia neta (escala ponderada) tras compensaciones */
  influence: number;
  baseInfluence: number;
  compensation: number;
  saturated: boolean;
  blocked: boolean;
  transformed: boolean;
  flags: NodeStateFlag[];
  /** valor medido por un detector */
  detected: number | null;
}

export interface EdgeIterState {
  edgeId: string;
  active: boolean;
  /** cantidad asignada desde el nodo origen */
  assigned: number;
  /** paquete entregado (o programado) al destino */
  delivered: Packet;
  lost: number;
  generated: number;
  blocked: boolean;
  saturated: boolean;
  /** iteración en la que llega al destino */
  arrivesAt: number;
  /** multiplicador efectivo de influencia (causales) */
  influenceFactor: number | null;
  /** compensación aplicada (aristas de compensación) */
  compensationApplied: number | null;
  feedback: boolean;
  inhibition: boolean;
}

export type EventKind =
  | 'generate' | 'filter' | 'transform' | 'multiply' | 'reduce' | 'consume' | 'accelerate' | 'restrict'
  | 'saturate' | 'queue' | 'overflow' | 'accumulate' | 'release' | 'leak' | 'divert' | 'split' | 'merge'
  | 'dedupe' | 'block' | 'condition' | 'influence' | 'compensate' | 'loss' | 'delay' | 'feedback'
  | 'inhibit' | 'detect' | 'control' | 'terminal' | 'warning' | 'circuit';

export interface SimEvent {
  iteration: number;
  /** fase del pipeline (1..12) */
  phase: number;
  kind: EventKind;
  nodeId?: string;
  edgeId?: string;
  dimension?: string;
  amount?: number;
  /** mecanismo responsable (regla, comportamiento o conexión) */
  mechanism: string;
  message: string;
}

export interface Ledger {
  /** por dimensión extensiva */
  generated: DimMap;
  consumed: DimMap;
  lost: DimMap;
  accumulated: DimMap;
  released: DimMap;
  terminal: DimMap;
  deduplicated: DimMap;
  /** en tránsito al inicio y al final de la iteración (retardos) */
  inFlightStart: DimMap;
  inFlightEnd: DimMap;
  /** diferencia no explicada (debe ser ~0) */
  unexplained: DimMap;
}

export interface IterationResult {
  iteration: number;
  nodes: Record<string, NodeIterState>;
  edges: Record<string, EdgeIterState>;
  events: SimEvent[];
  ledger: Ledger;
  /** resultado (flujo terminal en nodos de salida) */
  result: Packet;
}

export interface LoopInfo {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  polarity: 'reinforcing' | 'balancing' | 'mixed';
  /** circuito configurado asociado, si existe */
  circuitId: string | null;
  label: string;
  hasDelay: boolean;
  hasLimit: boolean;
}

export interface Approximation {
  elementId: string;
  message: string;
}

export interface SimulationConfig {
  iterations: number;
}

export interface RunMetrics {
  /** suma del resultado de todas las iteraciones por dimensión extensiva */
  totalResult: DimMap;
  /** resultado de la última iteración */
  finalResult: Packet;
  totalGenerated: DimMap;
  totalLost: DimMap;
  totalConsumed: DimMap;
  /** resultado / generado (cantidad) */
  efficiency: number;
  /** serie temporal del resultado (cantidad) */
  resultSeries: number[];
  /** valor máximo de conservación no explicada */
  maxUnexplained: number;
  perOutput: Record<string, { total: number; last: number; int: DimMap }>;
}

export interface SimulationResult {
  id: string;
  scenarioId: string | null;
  configuration: SimulationConfig;
  iterationCount: number;
  /** orden determinista de procesamiento */
  order: string[];
  /** dependencias de retorno (procesadas con el estado de la iteración anterior) */
  backEdges: string[];
  iterations: IterationResult[];
  loops: LoopInfo[];
  metrics: RunMetrics;
  warnings: string[];
  approximations: Approximation[];
  /** parámetros con hipótesis / rangos que afectan al resultado */
  hypotheses: string[];
  /** efectos derivados de la posición en el marco espacial (modo cuadrícula) */
  frameNotes: string[];
  executionDate: number;
  durationMs: number;
}
