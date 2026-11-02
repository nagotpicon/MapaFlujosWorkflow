/**
 * Escenarios: el modelo base es compartido; cada escenario guarda solo
 * sustituciones (overrides) de parámetros y condiciones iniciales. Así los
 * escenarios nunca comparten estado mutable accidentalmente.
 */
import type { EntityKind, Override, ProjectDoc, Scenario } from '../core/model/schema';
import { getPath, setPath } from '../core/model/paths';

const COLLECTION: Record<EntityKind, keyof ProjectDoc> = {
  node: 'nodes', edge: 'edges', behavior: 'behaviors', condition: 'conditions', circuit: 'circuits', port: 'ports',
};

export function collectionFor(kind: EntityKind): keyof ProjectDoc {
  return COLLECTION[kind];
}

export function applyOverrides(doc: ProjectDoc, overrides: Override[]): ProjectDoc {
  if (overrides.length === 0) return doc;
  const out: ProjectDoc = { ...doc };
  for (const o of overrides) {
    const key = COLLECTION[o.targetType];
    const coll = out[key] as Record<string, unknown>;
    const entity = coll[o.targetId];
    if (!entity) continue;
    (out as Record<string, unknown>)[key] = { ...coll, [o.targetId]: setPath(entity, o.path, o.value) };
  }
  return out;
}

export function applyInitialConditions(doc: ProjectDoc, ic: Scenario['initialConditions']): ProjectDoc {
  const entries = Object.entries(ic);
  if (entries.length === 0) return doc;
  const nodes = { ...doc.nodes };
  for (const [nodeId, dims] of entries) {
    const n = nodes[nodeId];
    if (!n) continue;
    const dv = { ...n.dimensionValues };
    for (const [dimId, value] of Object.entries(dims)) {
      dv[dimId] = { ...(dv[dimId] ?? { mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null }), value };
    }
    nodes[nodeId] = { ...n, dimensionValues: dv };
  }
  return { ...doc, nodes };
}

export function applyUncertainty(doc: ProjectDoc, variant: Scenario['uncertainty']): ProjectDoc {
  if (variant === 'central') return doc;
  const behaviors = { ...doc.behaviors };
  for (const [id, b] of Object.entries(behaviors)) {
    const keys = Object.keys(b.ranges);
    if (!keys.length) continue;
    const params = { ...b.parameters };
    for (const k of keys) params[k] = variant === 'favorable' ? b.ranges[k].favorable : b.ranges[k].unfavorable;
    behaviors[id] = { ...b, parameters: params };
  }
  const nodes = { ...doc.nodes };
  for (const [id, n] of Object.entries(nodes)) {
    let changed = false;
    const dv = { ...n.dimensionValues };
    for (const [dimId, v] of Object.entries(dv)) {
      if (v.range) { dv[dimId] = { ...v, value: variant === 'favorable' ? v.range.high : v.range.low }; changed = true; }
    }
    if (changed) nodes[id] = { ...n, dimensionValues: dv };
  }
  return { ...doc, behaviors, nodes };
}

/** Documento efectivo de un escenario (no modifica el original). */
export function effectiveDoc(doc: ProjectDoc, scenarioId: string | null | undefined): ProjectDoc {
  const s = scenarioId ? doc.scenarios[scenarioId] : undefined;
  if (!s) return doc;
  let d = applyOverrides(doc, s.overrides);
  d = applyInitialConditions(d, s.initialConditions);
  d = applyUncertainty(d, s.uncertainty);
  return d;
}

export function findOverride(s: Scenario | undefined, targetType: EntityKind, targetId: string, path: string): Override | undefined {
  return s?.overrides.find((o) => o.targetType === targetType && o.targetId === targetId && o.path === path);
}

export function readEntityValue(doc: ProjectDoc, kind: EntityKind, id: string, path: string): unknown {
  const coll = doc[COLLECTION[kind]] as Record<string, unknown>;
  return getPath(coll[id], path);
}

/**
 * Huella de los datos relevantes para la simulación: excluye posición,
 * estilos y textos. Si no cambia, los resultados siguen siendo válidos
 * (invalidación selectiva).
 */
export function simulationFingerprint(doc: ProjectDoc, scenarioId: string | null, iterations: number): string {
  const nodes = Object.values(doc.nodes).map((n) => [
    n.id, n.type, n.behaviorIds, n.portIds, n.weight, n.influenceSource, n.influenceReference, n.dimensionValues,
    n.activationConditionId, n.inactiveMode, n.convergence, n.split, n.mitigationCombination, n.aliasOf, n.createdAt,
  ]);
  const edges = Object.values(doc.edges).map((e) => [
    e.id, e.sourceNodeId, e.targetNodeId, e.sourcePortId, e.targetPortId, e.direction, e.type, e.behavior, e.conditions,
    e.capacity, e.resistance, e.delay,
  ]);
  const grid = doc.project.settings.frame?.mode === 'grid'
    ? [doc.project.settings.frame, Object.values(doc.nodes).map((n) => [n.id, n.position, n.parentId, n.dimensions])]
    : null;
  return JSON.stringify([
    grid, nodes, edges, doc.behaviors, doc.conditions, doc.ports, doc.dimensions, doc.circuits,
    doc.project.settings.weightedScale, doc.project.settings.qualitativeScales,
    scenarioId ? doc.scenarios[scenarioId] ? [doc.scenarios[scenarioId].overrides, doc.scenarios[scenarioId].initialConditions, doc.scenarios[scenarioId].uncertainty] : null : null,
    iterations,
  ]);
}
