/**
 * Operaciones de edición como funciones puras (doc → doc).
 * El store las envuelve con historial y guardado; aquí se pueden probar aisladas.
 */
import {
  createAnnotation, createBehavior, createCircuit, createCondition, createEdge, createNode, createScenario, newId,
  type EdgeInit, type NodeInit,
} from './model/factory';
import { repairReferences } from './model/migrations';
import { deepEqual, getPath, setPath } from './model/paths';
import type {
  Annotation, Behavior, BehaviorType, ConditionExpr, Condition, EdgeType, EntityKind, Layer, MapEdge, MapNode, NodeType, ProjectDoc, Scenario,
} from './model/schema';
import { collectionFor } from '../engine/scenario';

export const DEFAULT_NODE_SIZE = { width: 190, height: 64 };
export type SizeLookup = (id: string) => { width: number; height: number };

const touch = (doc: ProjectDoc): ProjectDoc => ({ ...doc, project: { ...doc.project, updatedAt: Date.now() } });

/* ---------------- nodos ---------------- */

export function addNode(doc: ProjectDoc, type: NodeType, init: NodeInit = {}): { doc: ProjectDoc; id: string } {
  const { node, ports } = createNode(doc.project.id, type, init);
  const layerIds = init.layerIds ?? [];
  let behaviors = doc.behaviors;
  if (type === 'input' && !init.behaviorIds?.length) {
    const g = createBehavior(node.id, 'generator');
    behaviors = { ...behaviors, [g.id]: g };
    node.behaviorIds = [g.id];
    node.dimensionValues = { quantity: { value: 100, mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null }, ...node.dimensionValues };
  }
  node.layerIds = layerIds;
  const out: ProjectDoc = {
    ...doc,
    nodes: { ...doc.nodes, [node.id]: node },
    ports: { ...doc.ports, ...Object.fromEntries(ports.map((p) => [p.id, p])) },
    behaviors,
  };
  return { doc: touch(out), id: node.id };
}

export function updateNode(doc: ProjectDoc, id: string, patch: Partial<MapNode>): ProjectDoc {
  const n = doc.nodes[id];
  if (!n) return doc;
  return touch({ ...doc, nodes: { ...doc.nodes, [id]: { ...n, ...patch, updatedAt: Date.now() } } });
}

export function updateNodes(doc: ProjectDoc, ids: string[], patch: (n: MapNode) => Partial<MapNode>): ProjectDoc {
  const nodes = { ...doc.nodes };
  for (const id of ids) if (nodes[id]) nodes[id] = { ...nodes[id], ...patch(nodes[id]), updatedAt: Date.now() };
  return touch({ ...doc, nodes });
}

export function moveNodes(doc: ProjectDoc, positions: Record<string, { x: number; y: number }>): ProjectDoc {
  const nodes = { ...doc.nodes };
  let changed = false;
  for (const [id, p] of Object.entries(positions)) {
    const n = nodes[id];
    if (!n || n.locked) continue;
    if (n.position.x === p.x && n.position.y === p.y) continue;
    nodes[id] = { ...n, position: { x: p.x, y: p.y } };
    changed = true;
  }
  return changed ? { ...doc, nodes } : doc;
}

/** Elimina nodos y conexiones con todo lo que dependa de ellos. */
export function deleteElements(doc: ProjectDoc, nodeIds: string[], edgeIds: string[]): ProjectDoc {
  const delNodes = new Set(nodeIds.filter((id) => doc.nodes[id] && !doc.nodes[id].locked));
  // los clones de un nodo eliminado también se eliminan
  for (const n of Object.values(doc.nodes)) if (n.aliasOf && delNodes.has(n.aliasOf)) delNodes.add(n.id);
  const nodes = { ...doc.nodes };
  for (const id of delNodes) {
    const n = nodes[id];
    // hijos de un grupo eliminado: se desagrupan conservando su posición absoluta
    for (const c of Object.values(nodes)) {
      if (c.parentId === id && !delNodes.has(c.id)) nodes[c.id] = { ...c, parentId: n.parentId, position: { x: c.position.x + n.position.x, y: c.position.y + n.position.y } };
    }
    delete nodes[id];
  }
  const delEdges = new Set(edgeIds);
  for (const e of Object.values(doc.edges)) if (delNodes.has(e.sourceNodeId) || delNodes.has(e.targetNodeId)) delEdges.add(e.id);
  const edges = { ...doc.edges };
  for (const id of delEdges) delete edges[id];
  const ports = Object.fromEntries(Object.entries(doc.ports).filter(([, p]) => !delNodes.has(p.nodeId)));
  const behaviors = Object.fromEntries(Object.entries(doc.behaviors).filter(([, b]) => !delNodes.has(b.ownerId)));
  const conditions = Object.fromEntries(Object.entries(doc.conditions).filter(([, c]) =>
    !(c.ownerType === 'node' && delNodes.has(c.ownerId)) && !(c.ownerType === 'edge' && delEdges.has(c.ownerId)) && !(c.ownerType === 'behavior' && !behaviors[c.ownerId])));
  const annotations = Object.fromEntries(Object.entries(doc.annotations).filter(([, a]) => !(a.ownerType === 'node' && delNodes.has(a.ownerId)) && !(a.ownerType === 'edge' && delEdges.has(a.ownerId))));
  const scenarios = Object.fromEntries(Object.entries(doc.scenarios).map(([k, s]) => [k, {
    ...s,
    overrides: s.overrides.filter((o) => !(o.targetType === 'node' && delNodes.has(o.targetId)) && !(o.targetType === 'edge' && delEdges.has(o.targetId)) && !(o.targetType === 'behavior' && !behaviors[o.targetId])),
    initialConditions: Object.fromEntries(Object.entries(s.initialConditions).filter(([nid]) => !delNodes.has(nid))),
  }]));
  const circuits = Object.fromEntries(Object.entries(doc.circuits).filter(([, c]) => c.edgeIds.some((e) => !delEdges.has(e))));
  const { doc: repaired } = repairReferences({ ...doc, nodes, edges, ports, behaviors, conditions, annotations, scenarios, circuits });
  return touch(repaired);
}

export interface ClipboardPayload {
  kind: 'mapa-de-flujos/clipboard';
  nodes: MapNode[];
  edges: MapEdge[];
  ports: ProjectDoc['ports'][string][];
  behaviors: Behavior[];
  conditions: Condition[];
  annotations: Annotation[];
}

export function copyElements(doc: ProjectDoc, nodeIds: string[]): ClipboardPayload {
  const set = new Set(nodeIds);
  // incluir descendientes de grupos
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of Object.values(doc.nodes)) if (n.parentId && set.has(n.parentId) && !set.has(n.id)) { set.add(n.id); grew = true; }
  }
  const nodes = [...set].map((id) => doc.nodes[id]).filter(Boolean);
  const edges = Object.values(doc.edges).filter((e) => set.has(e.sourceNodeId) && set.has(e.targetNodeId));
  const edgeSet = new Set(edges.map((e) => e.id));
  const behaviors = nodes.flatMap((n) => n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean));
  const bset = new Set(behaviors.map((b) => b.id));
  const conditions = Object.values(doc.conditions).filter((c) => (c.ownerType === 'node' && set.has(c.ownerId)) || (c.ownerType === 'edge' && edgeSet.has(c.ownerId)) || (c.ownerType === 'behavior' && bset.has(c.ownerId)));
  return {
    kind: 'mapa-de-flujos/clipboard',
    nodes,
    edges,
    ports: Object.values(doc.ports).filter((p) => set.has(p.nodeId)),
    behaviors,
    conditions,
    annotations: Object.values(doc.annotations).filter((a) => (a.ownerType === 'node' && set.has(a.ownerId)) || (a.ownerType === 'edge' && edgeSet.has(a.ownerId))),
  };
}

function remapExpr(expr: ConditionExpr, map: Map<string, string>): ConditionExpr {
  return {
    ...expr,
    id: newId('cx'),
    operands: expr.operands.map((o) => (o.kind === 'metric' && map.has(o.nodeId) ? { ...o, nodeId: map.get(o.nodeId)! } : o)),
    children: expr.children.map((c) => remapExpr(c, map)),
  };
}

/** Pega (o duplica) elementos con identificadores nuevos. Devuelve los ids de los nodos nuevos. */
export function pasteElements(doc: ProjectDoc, clip: ClipboardPayload, offset = { x: 40, y: 40 }): { doc: ProjectDoc; nodeIds: string[]; edgeIds: string[] } {
  const map = new Map<string, string>();
  const idFor = (old: string, prefix: string) => { if (!map.has(old)) map.set(old, newId(prefix)); return map.get(old)!; };
  for (const n of clip.nodes) idFor(n.id, 'nd');
  for (const e of clip.edges) idFor(e.id, 'ed');
  for (const p of clip.ports) idFor(p.id, 'pt');
  for (const b of clip.behaviors) idFor(b.id, 'bh');
  for (const c of clip.conditions) idFor(c.id, 'cnd');
  const t = Date.now();
  const nodes = { ...doc.nodes };
  const inSet = new Set(clip.nodes.map((n) => n.id));
  for (const n of clip.nodes) {
    const isRoot = !n.parentId || !inSet.has(n.parentId);
    nodes[map.get(n.id)!] = {
      ...n,
      id: map.get(n.id)!,
      projectId: doc.project.id,
      parentId: n.parentId ? (map.get(n.parentId) ?? (doc.nodes[n.parentId] ? n.parentId : null)) : null,
      position: isRoot ? { x: n.position.x + offset.x, y: n.position.y + offset.y } : n.position,
      behaviorIds: n.behaviorIds.map((b) => map.get(b) ?? b).filter((b) => clip.behaviors.some((x) => map.get(x.id) === b)),
      portIds: n.portIds.map((p) => map.get(p) ?? p),
      activationConditionId: n.activationConditionId ? map.get(n.activationConditionId) ?? null : null,
      aliasOf: n.aliasOf && (doc.nodes[n.aliasOf] || inSet.has(n.aliasOf)) ? (map.get(n.aliasOf) ?? n.aliasOf) : null,
      locked: false,
      createdAt: t,
      updatedAt: t,
    };
  }
  const ports = { ...doc.ports };
  for (const p of clip.ports) ports[map.get(p.id)!] = { ...p, id: map.get(p.id)!, nodeId: map.get(p.nodeId)! };
  const behaviors = { ...doc.behaviors };
  for (const b of clip.behaviors) {
    const params = { ...b.parameters };
    if (typeof params.targetBehaviorId === 'string' && map.has(params.targetBehaviorId)) params.targetBehaviorId = map.get(params.targetBehaviorId)!;
    behaviors[map.get(b.id)!] = { ...b, id: map.get(b.id)!, ownerId: map.get(b.ownerId)!, parameters: params, conditions: b.conditions.map((c) => map.get(c) ?? c) };
  }
  const conditions = { ...doc.conditions };
  for (const c of clip.conditions) {
    const expr = remapExpr(c.expr, map);
    conditions[map.get(c.id)!] = { ...c, id: map.get(c.id)!, ownerId: map.get(c.ownerId) ?? c.ownerId, expr, operands: expr.operands };
  }
  const edges = { ...doc.edges };
  for (const e of clip.edges) {
    edges[map.get(e.id)!] = {
      ...e, id: map.get(e.id)!, projectId: doc.project.id, sourceNodeId: map.get(e.sourceNodeId)!, targetNodeId: map.get(e.targetNodeId)!,
      sourcePortId: e.sourcePortId ? map.get(e.sourcePortId) ?? null : null, targetPortId: e.targetPortId ? map.get(e.targetPortId) ?? null : null,
      conditions: e.conditions.map((c) => map.get(c) ?? c), metadata: { ...e.metadata, createdAt: t, updatedAt: t },
    };
  }
  const annotations = { ...doc.annotations };
  for (const a of clip.annotations) {
    const nid = newId('an');
    annotations[nid] = { ...a, id: nid, ownerId: map.get(a.ownerId) ?? a.ownerId };
  }
  return {
    doc: touch({ ...doc, nodes, ports, behaviors, conditions, edges, annotations }),
    nodeIds: clip.nodes.map((n) => map.get(n.id)!),
    edgeIds: clip.edges.map((e) => map.get(e.id)!),
  };
}

export function duplicateNodes(doc: ProjectDoc, nodeIds: string[]) {
  return pasteElements(doc, copyElements(doc, nodeIds));
}

/** Clon: mismo elemento (misma identidad lógica) en otro lugar del lienzo. */
export function cloneNode(doc: ProjectDoc, id: string): { doc: ProjectDoc; id: string } {
  const src = doc.nodes[id];
  const original = src.aliasOf ?? src.id;
  const res = addNode(doc, src.type, {
    title: doc.nodes[original].title,
    position: { x: src.position.x + 60, y: src.position.y + 90 },
    aliasOf: original,
    parentId: src.parentId,
    visualStyle: { ...doc.nodes[original].visualStyle },
    behaviorIds: ['__none'],
  });
  const behaviors = Object.fromEntries(Object.entries(res.doc.behaviors).filter(([, b]) => b.ownerId !== res.id));
  return { doc: { ...res.doc, behaviors, nodes: { ...res.doc.nodes, [res.id]: { ...res.doc.nodes[res.id], behaviorIds: [], dimensionValues: {} } } }, id: res.id };
}

/* ---------------- grupos ---------------- */

export function absolutePos(doc: ProjectDoc, id: string): { x: number; y: number } {
  let n = doc.nodes[id];
  let x = n.position.x;
  let y = n.position.y;
  const seen = new Set<string>();
  while (n.parentId && doc.nodes[n.parentId] && !seen.has(n.parentId)) {
    seen.add(n.parentId);
    n = doc.nodes[n.parentId];
    x += n.position.x;
    y += n.position.y;
  }
  return { x, y };
}

export function groupNodes(doc: ProjectDoc, nodeIds: string[], size: SizeLookup, type: 'group' | 'container' = 'group', title?: string): { doc: ProjectDoc; id: string } | null {
  const ids = nodeIds.filter((id) => doc.nodes[id]);
  if (ids.length === 0) return null;
  // padre común (si todos comparten el mismo)
  const parents = new Set(ids.map((id) => doc.nodes[id].parentId));
  const parentId = parents.size === 1 ? [...parents][0] : null;
  const parentAbs = parentId ? absolutePos(doc, parentId) : { x: 0, y: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const p = absolutePos(doc, id);
    const s = size(id);
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width); maxY = Math.max(maxY, p.y + s.height);
  }
  const pad = 32;
  const gx = minX - pad;
  const gy = minY - pad - 20;
  const res = addNode(doc, type, {
    title: title ?? (type === 'group' ? 'Grupo' : 'Contenedor'),
    position: { x: gx - parentAbs.x, y: gy - parentAbs.y },
    dimensions: { width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 + 20 },
    parentId,
    zIndex: -1,
  });
  const nodes = { ...res.doc.nodes };
  for (const id of ids) {
    const abs = absolutePos(doc, id);
    nodes[id] = { ...nodes[id], parentId: res.id, position: { x: abs.x - gx, y: abs.y - gy } };
  }
  return { doc: { ...res.doc, nodes: orderParentsFirst(nodes) }, id: res.id };
}

export function ungroup(doc: ProjectDoc, groupId: string): ProjectDoc {
  const g = doc.nodes[groupId];
  if (!g || (g.type !== 'group' && g.type !== 'container')) return doc;
  return deleteElements(doc, [groupId], []);
}

/** React Flow necesita que los padres aparezcan antes que sus hijos. */
export function orderParentsFirst(nodes: Record<string, MapNode>): Record<string, MapNode> {
  const out: Record<string, MapNode> = {};
  const visit = (id: string, depth = 0) => {
    if (out[id] || !nodes[id] || depth > 50) return;
    const p = nodes[id].parentId;
    if (p && nodes[p]) visit(p, depth + 1);
    out[id] = nodes[id];
  };
  for (const id of Object.keys(nodes)) visit(id);
  return out;
}

/** Ids de nodos ocultos por ramas plegadas (descendientes dominados por el nodo plegado). */
export function branchHiddenIds(doc: ProjectDoc): Set<string> {
  const collapsed = Object.values(doc.nodes).filter((n) => n.branchCollapsed);
  const hidden = new Set<string>();
  if (!collapsed.length) return hidden;
  const out = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const e of Object.values(doc.edges)) {
    if (!out.has(e.sourceNodeId)) out.set(e.sourceNodeId, []);
    out.get(e.sourceNodeId)!.push(e.targetNodeId);
    indeg.set(e.targetNodeId, (indeg.get(e.targetNodeId) ?? 0) + 1);
  }
  const roots = Object.keys(doc.nodes).filter((id) => !indeg.get(id));
  const reach = (starts: string[], blocked: string | null) => {
    const seen = new Set(starts.filter((s) => s !== blocked));
    const q = [...seen];
    while (q.length) {
      const v = q.shift()!;
      for (const w of out.get(v) ?? []) if (w !== blocked && !seen.has(w)) { seen.add(w); q.push(w); }
    }
    return seen;
  };
  for (const c of collapsed) {
    const desc = reach([c.id], null);
    desc.delete(c.id);
    const without = reach(roots.length ? roots : Object.keys(doc.nodes).filter((x) => x !== c.id), c.id);
    for (const d of desc) if (!without.has(d)) hidden.add(d);
  }
  return hidden;
}

/* ---------------- conexiones ---------------- */

export function addEdge(doc: ProjectDoc, source: string, target: string, type: EdgeType, init: EdgeInit = {}): { doc: ProjectDoc; id: string } {
  const pathType = init.visualStyle?.pathType ?? doc.project.settings.defaultEdgePath;
  const srcOut = doc.nodes[source]?.portIds.find((p) => doc.ports[p]?.direction !== 'in') ?? null;
  const tgtIn = doc.nodes[target]?.portIds.find((p) => doc.ports[p]?.direction !== 'out') ?? null;
  const e = createEdge(doc.project.id, source, target, type, { sourcePortId: srcOut, targetPortId: tgtIn, ...init, visualStyle: { ...init.visualStyle, pathType } });
  return { doc: touch({ ...doc, edges: { ...doc.edges, [e.id]: e } }), id: e.id };
}

export function updateEdge(doc: ProjectDoc, id: string, patch: Partial<MapEdge>): ProjectDoc {
  const e = doc.edges[id];
  if (!e) return doc;
  return touch({ ...doc, edges: { ...doc.edges, [id]: { ...e, ...patch, metadata: { ...e.metadata, ...patch.metadata, updatedAt: Date.now() } } } });
}

export function reverseEdge(doc: ProjectDoc, id: string): ProjectDoc {
  const e = doc.edges[id];
  if (!e) return doc;
  return updateEdge(doc, id, {
    sourceNodeId: e.targetNodeId, targetNodeId: e.sourceNodeId,
    sourcePortId: doc.nodes[e.targetNodeId]?.portIds.find((p) => doc.ports[p]?.direction !== 'in') ?? null,
    targetPortId: doc.nodes[e.sourceNodeId]?.portIds.find((p) => doc.ports[p]?.direction !== 'out') ?? null,
    visualStyle: { ...e.visualStyle, sourceAnchor: e.visualStyle.targetAnchor, targetAnchor: e.visualStyle.sourceAnchor },
  });
}

export function duplicateEdge(doc: ProjectDoc, id: string): { doc: ProjectDoc; id: string } {
  const e = doc.edges[id];
  const copy: MapEdge = { ...structuredClone(e), id: newId('ed'), conditions: [], metadata: { ...e.metadata, createdAt: Date.now(), updatedAt: Date.now() } };
  return { doc: touch({ ...doc, edges: { ...doc.edges, [copy.id]: copy } }), id: copy.id };
}

/* ---------------- comportamientos y condiciones ---------------- */

export function addBehavior(doc: ProjectDoc, nodeId: string, type: BehaviorType, params: Behavior['parameters'] = {}): { doc: ProjectDoc; id: string } {
  const b = createBehavior(nodeId, type, params);
  const n = doc.nodes[nodeId];
  return {
    doc: touch({ ...doc, behaviors: { ...doc.behaviors, [b.id]: b }, nodes: { ...doc.nodes, [nodeId]: { ...n, behaviorIds: [...n.behaviorIds, b.id] } } }),
    id: b.id,
  };
}

export function removeBehavior(doc: ProjectDoc, behaviorId: string): ProjectDoc {
  const b = doc.behaviors[behaviorId];
  if (!b) return doc;
  const n = doc.nodes[b.ownerId];
  const behaviors = { ...doc.behaviors };
  delete behaviors[behaviorId];
  const conditions = Object.fromEntries(Object.entries(doc.conditions).filter(([, c]) => !(c.ownerType === 'behavior' && c.ownerId === behaviorId)));
  const scenarios = Object.fromEntries(Object.entries(doc.scenarios).map(([k, s]) => [k, { ...s, overrides: s.overrides.filter((o) => o.targetId !== behaviorId) }]));
  return touch({ ...doc, behaviors, conditions, scenarios, nodes: n ? { ...doc.nodes, [n.id]: { ...n, behaviorIds: n.behaviorIds.filter((x) => x !== behaviorId) } } : doc.nodes });
}

export function updateBehavior(doc: ProjectDoc, id: string, patch: Partial<Behavior>): ProjectDoc {
  const b = doc.behaviors[id];
  if (!b) return doc;
  return touch({ ...doc, behaviors: { ...doc.behaviors, [id]: { ...b, ...patch } } });
}

/** Crea una condición y la enlaza a su propietario (nodo: activación; conexión/comportamiento: lista). */
export function addCondition(doc: ProjectDoc, ownerType: Condition['ownerType'], ownerId: string, expr: ConditionExpr, label = ''): { doc: ProjectDoc; id: string } {
  const c = createCondition(ownerId, ownerType, expr, { label });
  let out: ProjectDoc = { ...doc, conditions: { ...doc.conditions, [c.id]: c } };
  if (ownerType === 'node') out = { ...out, nodes: { ...out.nodes, [ownerId]: { ...out.nodes[ownerId], activationConditionId: c.id } } };
  if (ownerType === 'edge') out = { ...out, edges: { ...out.edges, [ownerId]: { ...out.edges[ownerId], conditions: [...out.edges[ownerId].conditions, c.id] } } };
  if (ownerType === 'behavior') out = { ...out, behaviors: { ...out.behaviors, [ownerId]: { ...out.behaviors[ownerId], conditions: [...out.behaviors[ownerId].conditions, c.id] } } };
  if (ownerType === 'circuit') out = { ...out, circuits: { ...out.circuits, [ownerId]: { ...out.circuits[ownerId], conditionId: c.id } } };
  return { doc: touch(out), id: c.id };
}

export function updateCondition(doc: ProjectDoc, id: string, patch: Partial<Condition>): ProjectDoc {
  const c = doc.conditions[id];
  if (!c) return doc;
  const next = { ...c, ...patch };
  if (patch.expr) { next.conditionType = patch.expr.conditionType; next.operator = patch.expr.operator; next.operands = patch.expr.operands; }
  return touch({ ...doc, conditions: { ...doc.conditions, [id]: next } });
}

export function removeCondition(doc: ProjectDoc, id: string): ProjectDoc {
  const c = doc.conditions[id];
  if (!c) return doc;
  const conditions = { ...doc.conditions };
  delete conditions[id];
  let out: ProjectDoc = { ...doc, conditions };
  if (c.ownerType === 'node' && out.nodes[c.ownerId]?.activationConditionId === id) out = { ...out, nodes: { ...out.nodes, [c.ownerId]: { ...out.nodes[c.ownerId], activationConditionId: null } } };
  if (c.ownerType === 'edge' && out.edges[c.ownerId]) out = { ...out, edges: { ...out.edges, [c.ownerId]: { ...out.edges[c.ownerId], conditions: out.edges[c.ownerId].conditions.filter((x) => x !== id) } } };
  if (c.ownerType === 'behavior' && out.behaviors[c.ownerId]) out = { ...out, behaviors: { ...out.behaviors, [c.ownerId]: { ...out.behaviors[c.ownerId], conditions: out.behaviors[c.ownerId].conditions.filter((x) => x !== id) } } };
  if (c.ownerType === 'circuit' && out.circuits[c.ownerId]) out = { ...out, circuits: { ...out.circuits, [c.ownerId]: { ...out.circuits[c.ownerId], conditionId: null } } };
  return touch(out);
}

/* ---------------- parámetros conscientes del escenario ---------------- */

export function isBaseScenario(doc: ProjectDoc): boolean {
  const s = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  return !s || s.isBase;
}

/**
 * Escribe un parámetro de simulación. En el escenario base modifica el
 * modelo; en otro escenario guarda (o elimina) una sustitución.
 */
export function setParam(doc: ProjectDoc, kind: EntityKind, id: string, path: string, value: unknown): ProjectDoc {
  const key = collectionFor(kind);
  const coll = doc[key] as Record<string, unknown>;
  if (!coll[id]) return doc;
  if (isBaseScenario(doc)) return touch({ ...doc, [key]: { ...coll, [id]: setPath(coll[id], path, value) } } as ProjectDoc);
  const s = doc.scenarios[doc.project.activeScenarioId!];
  const baseValue = getPath(coll[id], path);
  const rest = s.overrides.filter((o) => !(o.targetType === kind && o.targetId === id && o.path === path));
  const overrides = deepEqual(baseValue, value) ? rest : [...rest, { id: newId('ov'), targetType: kind, targetId: id, path, value, note: '' }];
  return touch({ ...doc, scenarios: { ...doc.scenarios, [s.id]: { ...s, overrides, updatedAt: Date.now() } } });
}

export function clearOverride(doc: ProjectDoc, scenarioId: string, kind: EntityKind, id: string, path: string): ProjectDoc {
  const s = doc.scenarios[scenarioId];
  if (!s) return doc;
  return touch({ ...doc, scenarios: { ...doc.scenarios, [scenarioId]: { ...s, overrides: s.overrides.filter((o) => !(o.targetType === kind && o.targetId === id && o.path.startsWith(path))) } } });
}

/* ---------------- escenarios ---------------- */

export function addScenario(doc: ProjectDoc, name: string, fromId?: string): { doc: ProjectDoc; id: string } {
  const from = fromId ? doc.scenarios[fromId] : undefined;
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444'];
  const s: Scenario = createScenario(doc.project.id, name, {
    description: from ? `Copia de «${from.name}»` : '',
    overrides: from ? from.overrides.map((o) => ({ ...structuredClone(o), id: newId('ov') })) : [],
    initialConditions: from ? structuredClone(from.initialConditions) : {},
    uncertainty: from?.uncertainty ?? 'central',
    color: palette[Object.keys(doc.scenarios).length % palette.length],
  });
  return { doc: touch({ ...doc, scenarios: { ...doc.scenarios, [s.id]: s } }), id: s.id };
}

export function updateScenario(doc: ProjectDoc, id: string, patch: Partial<Scenario>): ProjectDoc {
  const s = doc.scenarios[id];
  if (!s) return doc;
  return touch({ ...doc, scenarios: { ...doc.scenarios, [id]: { ...s, ...patch, updatedAt: Date.now() } } });
}

export function deleteScenario(doc: ProjectDoc, id: string): ProjectDoc {
  const s = doc.scenarios[id];
  if (!s || s.isBase) return doc;
  const scenarios = { ...doc.scenarios };
  delete scenarios[id];
  const base = Object.values(scenarios).find((x) => x.isBase)!;
  return touch({ ...doc, scenarios, project: { ...doc.project, activeScenarioId: doc.project.activeScenarioId === id ? base.id : doc.project.activeScenarioId } });
}

export function setActiveScenario(doc: ProjectDoc, id: string): ProjectDoc {
  if (!doc.scenarios[id]) return doc;
  return { ...doc, project: { ...doc.project, activeScenarioId: id } };
}

/* ---------------- capas, anotaciones, circuitos ---------------- */

export function addLayer(doc: ProjectDoc, name: string, color = '#64748b'): { doc: ProjectDoc; id: string } {
  const l: Layer = { id: newId('lyr'), name, color, visible: true, locked: false, order: Object.keys(doc.layers).length };
  return { doc: touch({ ...doc, layers: { ...doc.layers, [l.id]: l } }), id: l.id };
}

export function updateLayer(doc: ProjectDoc, id: string, patch: Partial<Layer>): ProjectDoc {
  return touch({ ...doc, layers: { ...doc.layers, [id]: { ...doc.layers[id], ...patch } } });
}

export function deleteLayer(doc: ProjectDoc, id: string): ProjectDoc {
  const layers = { ...doc.layers };
  delete layers[id];
  const nodes = Object.fromEntries(Object.entries(doc.nodes).map(([k, n]) => [k, n.layerIds.includes(id) ? { ...n, layerIds: n.layerIds.filter((l) => l !== id) } : n]));
  return touch({ ...doc, layers, nodes });
}

export function reorderLayer(doc: ProjectDoc, id: string, dir: -1 | 1): ProjectDoc {
  const list = Object.values(doc.layers).sort((a, b) => a.order - b.order);
  const i = list.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return doc;
  [list[i], list[j]] = [list[j], list[i]];
  return touch({ ...doc, layers: Object.fromEntries(list.map((l, k) => [l.id, { ...l, order: k }])) });
}

export function setNodeLayers(doc: ProjectDoc, nodeIds: string[], layerId: string, member: boolean): ProjectDoc {
  return updateNodes(doc, nodeIds, (n) => ({ layerIds: member ? [...new Set([...n.layerIds, layerId])] : n.layerIds.filter((l) => l !== layerId) }));
}

/** Visibilidad efectiva: un nodo en varias capas es visible si alguna lo es. */
export function layerVisibility(doc: ProjectDoc, n: MapNode): { visible: boolean; locked: boolean } {
  if (!n.layerIds.length) return { visible: true, locked: false };
  const ls = n.layerIds.map((l) => doc.layers[l]).filter(Boolean);
  if (!ls.length) return { visible: true, locked: false };
  return { visible: ls.some((l) => l.visible), locked: ls.every((l) => l.locked) };
}

export function addAnnotation(doc: ProjectDoc, ownerType: Annotation['ownerType'], ownerId: string, text: string, kind: Annotation['kind'] = 'comment'): { doc: ProjectDoc; id: string } {
  const a = createAnnotation(ownerType, ownerId, text, { kind });
  return { doc: touch({ ...doc, annotations: { ...doc.annotations, [a.id]: a } }), id: a.id };
}

export function updateAnnotation(doc: ProjectDoc, id: string, patch: Partial<Annotation>): ProjectDoc {
  return touch({ ...doc, annotations: { ...doc.annotations, [id]: { ...doc.annotations[id], ...patch } } });
}

export function deleteAnnotation(doc: ProjectDoc, id: string): ProjectDoc {
  const annotations = { ...doc.annotations };
  delete annotations[id];
  return touch({ ...doc, annotations });
}

export function addCircuit(doc: ProjectDoc, name: string, nodeIds: string[], edgeIds: string[], returnEdgeId: string | null): { doc: ProjectDoc; id: string } {
  const c = createCircuit(name, nodeIds, edgeIds, { returnEdgeId: returnEdgeId ?? edgeIds[edgeIds.length - 1] ?? null });
  return { doc: touch({ ...doc, circuits: { ...doc.circuits, [c.id]: c } }), id: c.id };
}

export function deleteCircuit(doc: ProjectDoc, id: string): ProjectDoc {
  const circuits = { ...doc.circuits };
  delete circuits[id];
  return touch({ ...doc, circuits });
}

/* ---------------- distribución ---------------- */

export function alignNodes(doc: ProjectDoc, ids: string[], mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'hdist' | 'vdist', size: SizeLookup): ProjectDoc {
  const ns = ids.map((id) => doc.nodes[id]).filter((n) => n && !n.locked);
  if (ns.length < 2) return doc;
  const box = ns.map((n) => ({ n, ...n.position, ...size(n.id) }));
  const pos: Record<string, { x: number; y: number }> = {};
  const minX = Math.min(...box.map((b) => b.x)), maxX = Math.max(...box.map((b) => b.x + b.width));
  const minY = Math.min(...box.map((b) => b.y)), maxY = Math.max(...box.map((b) => b.y + b.height));
  for (const b of box) {
    if (mode === 'left') pos[b.n.id] = { x: minX, y: b.y };
    if (mode === 'right') pos[b.n.id] = { x: maxX - b.width, y: b.y };
    if (mode === 'center') pos[b.n.id] = { x: (minX + maxX) / 2 - b.width / 2, y: b.y };
    if (mode === 'top') pos[b.n.id] = { x: b.x, y: minY };
    if (mode === 'bottom') pos[b.n.id] = { x: b.x, y: maxY - b.height };
    if (mode === 'middle') pos[b.n.id] = { x: b.x, y: (minY + maxY) / 2 - b.height / 2 };
  }
  if (mode === 'hdist' || mode === 'vdist') {
    const sorted = [...box].sort((a, b) => (mode === 'hdist' ? a.x - b.x : a.y - b.y));
    const total = mode === 'hdist' ? maxX - minX - sorted.reduce((s, b) => s + b.width, 0) : maxY - minY - sorted.reduce((s, b) => s + b.height, 0);
    const gap = total / (sorted.length - 1);
    let cur = mode === 'hdist' ? minX : minY;
    for (const b of sorted) {
      pos[b.n.id] = mode === 'hdist' ? { x: cur, y: b.y } : { x: b.x, y: cur };
      cur += (mode === 'hdist' ? b.width : b.height) + gap;
    }
  }
  return touch(moveNodes(doc, pos));
}

/** Distribución automática opcional: capas por camino más largo (sin ciclos) y baricentro. */
export function autoLayout(doc: ProjectDoc, size: SizeLookup, nodeIds?: string[]): ProjectDoc {
  const ids = (nodeIds ?? Object.keys(doc.nodes)).filter((id) => {
    const n = doc.nodes[id];
    return n && !n.parentId && !n.locked && !['note', 'comment', 'label', 'group', 'container'].includes(n.type);
  });
  const set = new Set(ids);
  const edges = Object.values(doc.edges).filter((e) => set.has(e.sourceNodeId) && set.has(e.targetNodeId) && e.sourceNodeId !== e.targetNodeId && !e.behavior.isFeedback && e.behavior.transport !== 'replicate');
  // eliminar ciclos con DFS
  const adj = new Map<string, string[]>(ids.map((i) => [i, []]));
  for (const e of edges) adj.get(e.sourceNodeId)!.push(e.targetNodeId);
  const state = new Map<string, number>();
  const dag: [string, string][] = [];
  const dfs = (v: string) => {
    state.set(v, 1);
    for (const w of adj.get(v)!) {
      if (state.get(w) === 1) continue;
      dag.push([v, w]);
      if (!state.get(w)) dfs(w);
    }
    state.set(v, 2);
  };
  const sortedIds = [...ids].sort((a, b) => doc.nodes[a].position.x - doc.nodes[b].position.x);
  for (const id of sortedIds) if (!state.get(id)) dfs(id);
  const layer = new Map<string, number>(ids.map((i) => [i, 0]));
  for (let k = 0; k < ids.length; k++) {
    let changed = false;
    for (const [a, b] of dag) if (layer.get(b)! < layer.get(a)! + 1) { layer.set(b, layer.get(a)! + 1); changed = true; }
    if (!changed) break;
  }
  const layers: string[][] = [];
  for (const id of ids) { const l = layer.get(id)!; (layers[l] ??= []).push(id); }
  const order = new Map<string, number>();
  layers.forEach((ls) => ls.sort((a, b) => doc.nodes[a].position.y - doc.nodes[b].position.y).forEach((id, i) => order.set(id, i)));
  for (let pass = 0; pass < 4; pass++) {
    for (let l = 1; l < layers.length; l++) {
      const bary = (id: string) => {
        const preds = dag.filter(([, b]) => b === id).map(([a]) => order.get(a)!);
        return preds.length ? preds.reduce((s, x) => s + x, 0) / preds.length : order.get(id)!;
      };
      layers[l]?.sort((a, b) => bary(a) - bary(b)).forEach((id, i) => order.set(id, i));
    }
  }
  const pos: Record<string, { x: number; y: number }> = {};
  const colW = 280;
  const rowH = 120;
  layers.forEach((ls, l) => {
    if (!ls) return;
    const h = ls.length * rowH;
    ls.forEach((id, i) => { pos[id] = { x: l * colW, y: i * rowH - h / 2 + size(id).height / 2 }; });
  });
  return touch(moveNodes(doc, pos));
}
