/**
 * Esquemas del Explorador de Flujos (compartidos por cliente y servidor).
 * Toda respuesta de un proveedor de IA se valida con estos esquemas antes de
 * tocar el estado de la aplicación.
 */
import { z } from 'zod';

export const RESEARCH_AREAS = [
  'framing', 'success', 'resources', 'demand', 'acquisition', 'conversion', 'economics', 'capacity', 'logistics', 'retention', 'growth', 'frictions', 'alternatives', 'experiment', 'map',
] as const;
export const AREA_LABEL: Record<(typeof RESEARCH_AREAS)[number], string> = {
  framing: 'Encuadre', success: 'Umbral de éxito', resources: 'Recursos disponibles', demand: 'Demanda y destinatario', acquisition: 'Captación y entradas',
  conversion: 'Conversión', economics: 'Economía y rentabilidad', capacity: 'Capacidad operativa', logistics: 'Logística y fricción', retention: 'Retención y retorno',
  growth: 'Crecimiento y reinversión', frictions: 'Fricciones', alternatives: 'Estrategias alternativas', experiment: 'Prueba inicial', map: 'Construcción del mapa',
};
export const STAGE_LABEL = ['Encuadre', 'Perspectiva', 'Realidad operativa', 'Fricciones', 'Economía y capacidad', 'Estrategias alternativas', 'Prueba inicial', 'Construcción del mapa'];

const str = z.string().catch('');
const strArr = z.array(z.string()).catch([]);
const evidence = z.enum(['confirmed', 'observed', 'estimate', 'hypothesis', 'preference', 'unknown']).catch('unknown');
const frictionCat = z.enum(['personal', 'external', 'system']);
const controllability = z.enum(['direct', 'partial', 'external', 'uncontrollable']);

export const MemoryItemSchema = z.object({ text: str, evidence: evidence.default('unknown') });

export const ExplorerMemorySchema = z.object({
  known: z.array(MemoryItemSchema).catch([]),
  discovered: strArr,
  unknowns: strArr,
  assumptions: strArr,
  contradictions: strArr,
  decisions: strArr,
  alternatives: strArr,
  frictions: z.array(z.object({ name: str, category: frictionCat.catch('external'), note: str })).catch([]),
  resolvedQuestions: strArr,
});
export type ExplorerMemory = z.infer<typeof ExplorerMemorySchema>;
export const emptyMemory = (): ExplorerMemory => ({ known: [], discovered: [], unknowns: [], assumptions: [], contradictions: [], decisions: [], alternatives: [], frictions: [], resolvedQuestions: [] });

/** Respuesta de un turno de entrevista. */
export const ExplorerTurnSchema = z.object({
  /** texto completo que ve el usuario (incluye la pregunta) */
  message: z.string().min(1),
  /** pregunta principal formulada */
  question: str,
  /** por qué importa esta pregunta (se muestra discreto) */
  why: str,
  area: z.enum(RESEARCH_AREAS).catch('framing'),
  stage: z.number().int().min(0).max(7).catch(0),
  systemNature: str,
  memory: ExplorerMemorySchema,
  readyForMap: z.boolean().catch(false),
});
export type ExplorerTurn = z.infer<typeof ExplorerTurnSchema>;

export const ProposalNodeSchema = z.object({
  tempId: z.string().min(1),
  title: z.string().min(1),
  role: z.enum(['input', 'resource', 'condition', 'action', 'transformation', 'result', 'limitation', 'friction', 'mitigator', 'alternative', 'metric', 'experiment', 'unknown']).catch('action'),
  description: str,
  stage: str,
  evidence: evidence,
  /** comportamiento sugerido (opcional) */
  behavior: z.object({
    type: z.enum(['generator', 'consumer', 'filter', 'transformer', 'multiplier', 'reducer', 'accelerator', 'restrictor', 'diverter', 'accumulator', 'releaser', 'compensator', 'detector', 'controller']),
    params: z.record(z.string(), z.union([z.number(), z.string()])).catch({}),
  }).nullable().catch(null),
  /** peso sugerido en escala −5..+5; null si no hay base para estimarlo */
  weight: z.number().min(-5).max(5).nullable().catch(null),
  weightIsSuggestion: z.boolean().catch(true),
  value: z.number().nullable().catch(null),
  unit: z.string().nullable().catch(null),
  frictionCategory: frictionCat.nullable().catch(null),
  controllability: controllability.nullable().catch(null),
  frequency: str, intensity: str, cost: str, probability: str, detectability: str,
  mitigation: str,
  alternativeRoute: str,
  confirmed: z.boolean().catch(false),
  sourceRef: str,
});
export type ProposalNode = z.infer<typeof ProposalNodeSchema>;

export const ProposalEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['flow', 'causal', 'conceptual', 'informative']).catch('flow'),
  label: str,
  role: z.enum(['main', 'reject', 'overflow', 'divert']).catch('main'),
  mode: z.enum(['modulate', 'compensate']).catch('modulate'),
  polarity: z.enum(['positive', 'negative']).catch('positive'),
});

export const AlternativeSchema = z.object({
  name: z.string().min(1), description: str, audience: str, channel: str, resources: str, setupTime: str, initialCost: str, complexity: str,
  dependencies: str, risks: str, advantages: str, limitations: str, timeToInfo: str, firstExperiment: str, successIndicators: str, continueOrStop: str,
  fit: str,
});

export const ExperimentSchema = z.object({
  name: z.string().min(1), hypothesis: str, test: str, duration: str, resources: str, confirmIf: str, questionIf: str, stopWhen: str, record: strArr,
});

export const ProposalSchema = z.object({
  discovery: z.object({ topic: str, objective: str, strategy: str, summary: str }),
  startingPoint: z.object({
    description: str, type: str, initialValue: z.number().nullable().catch(null), unit: z.string().nullable().catch(null),
    confidence: z.enum(['confirmed', 'estimate', 'hypothesis', 'unknown']).catch('unknown'),
  }),
  nodes: z.array(ProposalNodeSchema).min(1),
  edges: z.array(ProposalEdgeSchema).catch([]),
  frictions: z.object({ personal: strArr, external: strArr, system: strArr }).catch({ personal: [], external: [], system: [] }),
  mitigators: strArr,
  alternatives: z.array(AlternativeSchema).catch([]),
  assumptions: strArr,
  unknowns: strArr,
  metrics: z.array(z.object({ name: z.string(), why: str })).catch([]),
  experiments: z.array(ExperimentSchema).catch([]),
  feedbackLoops: z.array(z.object({ from: str, to: str, description: str, type: z.enum(['reinforcing', 'balancing']).catch('reinforcing') })).catch([]),
  recommendedNextAction: str,
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const PlanSummarySchema = z.object({
  objectives: strArr, goals: strArr, deadlines: strArr, resources: strArr, constraints: strArr, kpis: strArr, strategy: strArr, risks: strArr,
  summary: str,
});
export type PlanSummary = z.infer<typeof PlanSummarySchema>;

/** Fragmento de documento recuperado (plan maestro / notas / transcripciones). */
export const KnowledgeSnippetSchema = z.object({ documentName: z.string(), section: z.string(), text: z.string() });
export type KnowledgeSnippet = z.infer<typeof KnowledgeSnippetSchema>;

export const ChatMessageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string() });

export const TurnRequestSchema = z.object({
  inputs: z.object({ topic: z.string(), objective: z.string().catch(''), strategy: z.string().catch(''), context: z.string().catch('') }),
  messages: z.array(ChatMessageSchema).max(60),
  memory: ExplorerMemorySchema,
  command: z.string().nullable().catch(null),
  knowledge: z.array(KnowledgeSnippetSchema).max(8).catch([]),
  plan: PlanSummarySchema.nullable().catch(null),
});
export type TurnRequest = z.infer<typeof TurnRequestSchema>;

export const ProposalRequestSchema = z.object({
  inputs: TurnRequestSchema.shape.inputs,
  messages: z.array(ChatMessageSchema).max(80).catch([]),
  memory: ExplorerMemorySchema,
  knowledge: z.array(KnowledgeSnippetSchema).max(12).catch([]),
  plan: PlanSummarySchema.nullable().catch(null),
  /** texto libre (creador de estrategias: notas, transcripciones, documentos) */
  freeText: z.string().max(200_000).catch(''),
  mode: z.enum(['interview', 'strategy']).catch('interview'),
});
export type ProposalRequest = z.infer<typeof ProposalRequestSchema>;

/** Esquema JSON (subconjunto) para pedir salida estructurada a los proveedores. */
export const TURN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' }, question: { type: 'string' }, why: { type: 'string' },
    area: { type: 'string', enum: [...RESEARCH_AREAS] }, stage: { type: 'integer' }, systemNature: { type: 'string' }, readyForMap: { type: 'boolean' },
    memory: {
      type: 'object',
      properties: {
        known: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, evidence: { type: 'string', enum: ['confirmed', 'observed', 'estimate', 'hypothesis', 'preference', 'unknown'] } }, required: ['text', 'evidence'] } },
        discovered: { type: 'array', items: { type: 'string' } }, unknowns: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array', items: { type: 'string' } },
        contradictions: { type: 'array', items: { type: 'string' } }, decisions: { type: 'array', items: { type: 'string' } }, alternatives: { type: 'array', items: { type: 'string' } },
        frictions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string', enum: ['personal', 'external', 'system'] }, note: { type: 'string' } }, required: ['name', 'category'] } },
        resolvedQuestions: { type: 'array', items: { type: 'string' } },
      },
      required: ['known', 'discovered', 'unknowns', 'assumptions', 'contradictions', 'frictions'],
    },
  },
  required: ['message', 'question', 'why', 'area', 'stage', 'memory', 'readyForMap'],
} as const;

const S = { type: 'string' } as const;
const SA = { type: 'array', items: S } as const;
export const PROPOSAL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    discovery: { type: 'object', properties: { topic: S, objective: S, strategy: S, summary: S }, required: ['topic', 'objective', 'strategy', 'summary'] },
    startingPoint: { type: 'object', properties: { description: S, type: S, initialValue: { type: ['number', 'null'] }, unit: { type: ['string', 'null'] }, confidence: { type: 'string', enum: ['confirmed', 'estimate', 'hypothesis', 'unknown'] } }, required: ['description', 'initialValue', 'confidence'] },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tempId: S, title: S, role: { type: 'string', enum: ['input', 'resource', 'condition', 'action', 'transformation', 'result', 'limitation', 'friction', 'mitigator', 'alternative', 'metric', 'experiment', 'unknown'] },
          description: S, stage: S, evidence: { type: 'string', enum: ['confirmed', 'observed', 'estimate', 'hypothesis', 'preference', 'unknown'] },
          behavior: { type: ['object', 'null'], properties: { type: S, params: { type: 'object' } } },
          weight: { type: ['number', 'null'] }, weightIsSuggestion: { type: 'boolean' }, value: { type: ['number', 'null'] }, unit: { type: ['string', 'null'] },
          frictionCategory: { type: ['string', 'null'], enum: ['personal', 'external', 'system', null] }, controllability: { type: ['string', 'null'], enum: ['direct', 'partial', 'external', 'uncontrollable', null] },
          frequency: S, intensity: S, cost: S, probability: S, detectability: S, mitigation: S, alternativeRoute: S, confirmed: { type: 'boolean' }, sourceRef: S,
        },
        required: ['tempId', 'title', 'role', 'description', 'evidence', 'weight'],
      },
    },
    edges: { type: 'array', items: { type: 'object', properties: { from: S, to: S, type: { type: 'string', enum: ['flow', 'causal', 'conceptual', 'informative'] }, label: S, role: { type: 'string', enum: ['main', 'reject', 'overflow', 'divert'] }, mode: { type: 'string', enum: ['modulate', 'compensate'] }, polarity: { type: 'string', enum: ['positive', 'negative'] } }, required: ['from', 'to', 'type'] } },
    frictions: { type: 'object', properties: { personal: SA, external: SA, system: SA } },
    mitigators: SA,
    alternatives: { type: 'array', items: { type: 'object', properties: { name: S, description: S, audience: S, channel: S, resources: S, setupTime: S, initialCost: S, complexity: S, dependencies: S, risks: S, advantages: S, limitations: S, timeToInfo: S, firstExperiment: S, successIndicators: S, continueOrStop: S, fit: S }, required: ['name', 'description'] } },
    assumptions: SA, unknowns: SA,
    metrics: { type: 'array', items: { type: 'object', properties: { name: S, why: S }, required: ['name'] } },
    experiments: { type: 'array', items: { type: 'object', properties: { name: S, hypothesis: S, test: S, duration: S, resources: S, confirmIf: S, questionIf: S, stopWhen: S, record: SA }, required: ['name', 'test'] } },
    feedbackLoops: { type: 'array', items: { type: 'object', properties: { from: S, to: S, description: S, type: { type: 'string', enum: ['reinforcing', 'balancing'] } } } },
    recommendedNextAction: S,
  },
  required: ['discovery', 'startingPoint', 'nodes', 'edges', 'frictions', 'assumptions', 'unknowns', 'experiments', 'recommendedNextAction'],
} as const;

export const PLAN_JSON_SCHEMA = {
  type: 'object',
  properties: { objectives: SA, goals: SA, deadlines: SA, resources: SA, constraints: SA, kpis: SA, strategy: SA, risks: SA, summary: S },
  required: ['objectives', 'goals', 'deadlines', 'resources', 'constraints', 'kpis', 'summary'],
} as const;

/** Extrae el primer objeto JSON de un texto (tolerante a ```json …```). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch { /* buscar el primer objeto */ }
  const start = t.indexOf('{');
  if (start < 0) throw new Error('La respuesta no contiene JSON');
  let depth = 0;
  let inStr = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return JSON.parse(t.slice(start, i + 1)); }
  }
  throw new Error('JSON incompleto en la respuesta');
}
