import { createBehavior, createCircuit, createCondition, createEdge, createEmptyDoc, createNode, exprCompare, type EdgeInit, type NodeInit } from './factory';
import type { Behavior, BehaviorType, Circuit, ConditionExpr, NodeType, ProjectDoc } from './schema';

/** Constructor fluido de documentos para pruebas. */
export class DocBuilder {
  doc: ProjectDoc;
  private tick = 0;
  constructor(name = 'Prueba') {
    this.doc = createEmptyDoc(name);
  }
  node(type: NodeType, title: string, init: NodeInit = {}): string {
    const { node, ports } = createNode(this.doc.project.id, type, { title, ...init });
    node.createdAt += this.tick++;
    this.doc.nodes[node.id] = node;
    for (const p of ports) this.doc.ports[p.id] = p;
    return node.id;
  }
  input(title: string, amount: number, extra: Partial<Record<string, number>> = {}): string {
    const id = this.node('input', title);
    const dv: ProjectDoc['nodes'][string]['dimensionValues'] = {
      quantity: { value: amount, mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null },
    };
    for (const [k, v] of Object.entries(extra)) dv[k] = { value: v!, mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null };
    this.doc.nodes[id] = { ...this.doc.nodes[id], dimensionValues: dv };
    this.behavior(id, 'generator');
    return id;
  }
  behavior(nodeId: string, type: BehaviorType, params: Behavior['parameters'] = {}, init: Partial<Behavior> = {}): string {
    const b = createBehavior(nodeId, type, params, init);
    this.doc.behaviors[b.id] = b;
    this.doc.nodes[nodeId] = { ...this.doc.nodes[nodeId], behaviorIds: [...this.doc.nodes[nodeId].behaviorIds, b.id] };
    return b.id;
  }
  edge(from: string, to: string, init: EdgeInit & { type?: 'flow' | 'causal' | 'conceptual' | 'informative' } = {}): string {
    const e = createEdge(this.doc.project.id, from, to, init.type ?? 'flow', init);
    e.metadata.createdAt += this.tick++;
    this.doc.edges[e.id] = e;
    return e.id;
  }
  condition(ownerId: string, ownerType: 'node' | 'edge' | 'behavior' | 'circuit', expr: ConditionExpr): string {
    const c = createCondition(ownerId, ownerType, expr);
    this.doc.conditions[c.id] = c;
    return c.id;
  }
  compare = exprCompare;
  circuit(name: string, nodeIds: string[], edgeIds: string[], init: Partial<Circuit> = {}): string {
    const c = createCircuit(name, nodeIds, edgeIds, init);
    this.doc.circuits[c.id] = c;
    return c.id;
  }
  set<K extends keyof ProjectDoc['nodes'][string]>(nodeId: string, key: K, value: ProjectDoc['nodes'][string][K]) {
    this.doc.nodes[nodeId] = { ...this.doc.nodes[nodeId], [key]: value };
  }
}
