/**
 * Migraciones de esquema y validación de documentos.
 *
 * Cada migración transforma un documento de la versión N a la N+1. Los
 * documentos se validan con Zod tras migrar, lo que además rellena los
 * campos nuevos con sus valores por defecto.
 */
import { CURRENT_SCHEMA_VERSION, ProjectDocSchema, type ProjectDoc } from './schema';
import { defaultDimensions, defaultSettings } from './factory';

type Raw = Record<string, unknown>;

const COLLECTIONS = ['nodes', 'ports', 'edges', 'behaviors', 'conditions', 'annotations', 'layers', 'dimensions', 'scenarios', 'circuits'] as const;

function toRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    const out: Record<string, unknown> = {};
    for (const item of value) {
      if (item && typeof item === 'object' && 'id' in item) out[String((item as { id: unknown }).id)] = item;
    }
    return out;
  }
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return {};
}

/**
 * v1 (formato previo): colecciones como arrays, sin dimensiones ni circuitos,
 * peso del nodo como número simple.
 */
function migrate1to2(doc: Raw): Raw {
  const out: Raw = { ...doc };
  for (const c of COLLECTIONS) out[c] = toRecord(doc[c]);
  if (Object.keys(out.dimensions as object).length === 0) out.dimensions = defaultDimensions();
  const nodes = out.nodes as Record<string, Raw>;
  for (const [k, n] of Object.entries(nodes)) {
    const w = n.weight;
    if (typeof w === 'number') {
      nodes[k] = { ...n, weight: { importance: null, influence: { mode: 'weighted', value: w, scaleId: null }, impact: null } };
    }
  }
  const project = { ...(out.project as Raw) };
  project.settings = { ...defaultSettings(), ...(project.settings as Raw | undefined) };
  project.schemaVersion = 2;
  out.project = project;
  out.schemaVersion = 2;
  return out;
}

const MIGRATIONS: Record<number, (doc: Raw) => Raw> = {
  1: migrate1to2,
};

export class DocValidationError extends Error {
  issues: string[];
  constructor(message: string, issues: string[]) {
    super(message);
    this.issues = issues;
  }
}

export function migrateRaw(raw: unknown): Raw {
  if (!raw || typeof raw !== 'object') throw new DocValidationError('El documento no es un objeto JSON válido', []);
  let doc = raw as Raw;
  let version = typeof doc.schemaVersion === 'number' ? doc.schemaVersion : 1;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new DocValidationError(`El archivo usa una versión de esquema más reciente (${version}) que la soportada (${CURRENT_SCHEMA_VERSION}).`, []);
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const m = MIGRATIONS[version];
    if (!m) throw new DocValidationError(`No existe migración desde la versión ${version}`, []);
    doc = m(doc);
    version = doc.schemaVersion as number;
  }
  return doc;
}

/** Elimina referencias rotas para que el documento sea internamente consistente. */
export function repairReferences(doc: ProjectDoc): { doc: ProjectDoc; repairs: string[] } {
  const repairs: string[] = [];
  const nodes = { ...doc.nodes };
  const edges = { ...doc.edges };
  for (const [id, e] of Object.entries(edges)) {
    if (!nodes[e.sourceNodeId] || !nodes[e.targetNodeId]) {
      delete edges[id];
      repairs.push(`Conexión ${id} eliminada: apunta a un nodo inexistente`);
    }
  }
  for (const [id, n] of Object.entries(nodes)) {
    let changed = n;
    if (n.parentId && !nodes[n.parentId]) {
      changed = { ...changed, parentId: null };
      repairs.push(`Nodo ${id}: grupo padre inexistente eliminado`);
    }
    if (n.aliasOf && !nodes[n.aliasOf]) {
      changed = { ...changed, aliasOf: null };
      repairs.push(`Nodo ${id}: referencia de clon rota eliminada`);
    }
    const behaviorIds = n.behaviorIds.filter((b) => doc.behaviors[b]);
    if (behaviorIds.length !== n.behaviorIds.length) {
      changed = { ...changed, behaviorIds };
      repairs.push(`Nodo ${id}: comportamientos inexistentes eliminados`);
    }
    const layerIds = n.layerIds.filter((l) => doc.layers[l]);
    if (layerIds.length !== n.layerIds.length) changed = { ...changed, layerIds };
    if (n.activationConditionId && !doc.conditions[n.activationConditionId]) changed = { ...changed, activationConditionId: null };
    if (changed !== n) nodes[id] = changed;
  }
  const behaviors = { ...doc.behaviors };
  for (const [id, b] of Object.entries(behaviors)) {
    if (!nodes[b.ownerId]) {
      delete behaviors[id];
      repairs.push(`Comportamiento ${id} huérfano eliminado`);
    }
  }
  const annotations = { ...doc.annotations };
  for (const [id, a] of Object.entries(annotations)) {
    if ((a.ownerType === 'node' && !nodes[a.ownerId]) || (a.ownerType === 'edge' && !edges[a.ownerId])) delete annotations[id];
  }
  const circuits = { ...doc.circuits };
  for (const [id, c] of Object.entries(circuits)) {
    const edgeIds = c.edgeIds.filter((e) => edges[e]);
    if (edgeIds.length !== c.edgeIds.length) {
      circuits[id] = { ...c, edgeIds, returnEdgeId: c.returnEdgeId && edges[c.returnEdgeId] ? c.returnEdgeId : edgeIds[edgeIds.length - 1] ?? null };
      repairs.push(`Circuito ${c.name}: conexiones inexistentes eliminadas`);
    }
  }
  let activeScenarioId = doc.project.activeScenarioId;
  if (!activeScenarioId || !doc.scenarios[activeScenarioId]) {
    activeScenarioId = Object.values(doc.scenarios).find((s) => s.isBase)?.id ?? Object.keys(doc.scenarios)[0] ?? null;
  }
  return {
    doc: { ...doc, nodes, edges, behaviors, annotations, circuits, project: { ...doc.project, activeScenarioId } },
    repairs,
  };
}

/** Migra, valida y repara un documento desconocido. Lanza DocValidationError si no es recuperable. */
export function parseProjectDoc(raw: unknown): { doc: ProjectDoc; repairs: string[] } {
  const migrated = migrateRaw(raw);
  const result = ProjectDocSchema.safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 12).map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new DocValidationError('El documento no cumple el esquema de MAPA DE FLUJOS', issues);
  }
  return repairReferences(result.data);
}
