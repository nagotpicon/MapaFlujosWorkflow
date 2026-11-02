import { describe, expect, it } from 'vitest';
import { createEmptyDoc, exprCompare } from '../src/core/model/factory';
import * as op from '../src/core/operations';
import { useProject } from '../src/store/projectStore';
import { ProjectDocSchema } from '../src/core/model/schema';
import { simulate } from '../src/engine/simulate';

const size = () => op.DEFAULT_NODE_SIZE;

describe('Operaciones del editor', () => {
  it('crear, editar, redimensionar, mover, duplicar y eliminar burbujas', () => {
    let doc = createEmptyDoc();
    let r = op.addNode(doc, 'bubble', { position: { x: 10, y: 20 } });
    doc = r.doc;
    const id = r.id;
    doc = op.updateNode(doc, id, { title: 'Idea editada' });
    doc = op.updateNode(doc, id, { dimensions: { width: 300, height: 120 } });
    doc = op.moveNodes(doc, { [id]: { x: 200, y: 50 } });
    expect(doc.nodes[id]).toMatchObject({ title: 'Idea editada', dimensions: { width: 300, height: 120 }, position: { x: 200, y: 50 } });
    const dup = op.duplicateNodes(doc, [id]);
    doc = dup.doc;
    expect(Object.keys(doc.nodes)).toHaveLength(2);
    expect(doc.nodes[dup.nodeIds[0]].title).toBe('Idea editada');
    doc = op.deleteElements(doc, [id], []);
    expect(doc.nodes[id]).toBeUndefined();
    expect(ProjectDocSchema.safeParse(doc).success).toBe(true);
  });

  it('conexiones múltiples, cruzadas, autolazo, inversión y bloqueo', () => {
    let doc = createEmptyDoc();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) { const r = op.addNode(doc, 'bubble', { position: { x: i * 200, y: (i % 2) * 200 } }); doc = r.doc; ids.push(r.id); }
    const e1 = op.addEdge(doc, ids[0], ids[3], 'flow'); doc = e1.doc;
    const e2 = op.addEdge(doc, ids[1], ids[2], 'flow'); doc = e2.doc; // cruza visualmente a e1
    const e3 = op.addEdge(doc, ids[2], ids[2], 'causal'); doc = e3.doc; // autolazo
    const e4 = op.addEdge(doc, ids[0], ids[1], 'conceptual'); doc = e4.doc;
    expect(Object.keys(doc.edges)).toHaveLength(4);
    doc = op.reverseEdge(doc, e1.id);
    expect(doc.edges[e1.id].sourceNodeId).toBe(ids[3]);
    const d = op.duplicateEdge(doc, e2.id); doc = d.doc;
    expect(doc.edges[d.id].sourceNodeId).toBe(ids[1]);
    doc = op.updateNode(doc, ids[0], { locked: true });
    doc = op.deleteElements(doc, [ids[0]], []);
    expect(doc.nodes[ids[0]]).toBeDefined();
    doc = op.deleteElements(doc, [ids[2]], []);
    expect(Object.values(doc.edges).some((e) => e.sourceNodeId === ids[2] || e.targetNodeId === ids[2])).toBe(false);
  });

  it('grupos, subgrupos, plegado y desagrupar', () => {
    let doc = createEmptyDoc();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) { const r = op.addNode(doc, 'bubble', { position: { x: 100 + i * 220, y: 100 } }); doc = r.doc; ids.push(r.id); }
    const g = op.groupNodes(doc, ids.slice(0, 2), size)!;
    doc = g.doc;
    expect(doc.nodes[ids[0]].parentId).toBe(g.id);
    const abs = op.absolutePos(doc, ids[0]);
    expect(abs).toEqual({ x: 100, y: 100 });
    const g2 = op.groupNodes(doc, [g.id, ids[2]], size, 'container')!;
    doc = g2.doc;
    expect(doc.nodes[g.id].parentId).toBe(g2.id);
    expect(op.absolutePos(doc, ids[0])).toEqual({ x: 100, y: 100 });
    const keys = Object.keys(doc.nodes);
    expect(keys.indexOf(g2.id)).toBeLessThan(keys.indexOf(g.id));
    doc = op.updateNode(doc, g.id, { collapsed: true });
    expect(doc.nodes[g.id].collapsed).toBe(true);
    doc = op.ungroup(doc, g.id);
    expect(doc.nodes[ids[0]].parentId).toBe(g2.id);
    expect(op.absolutePos(doc, ids[0])).toEqual({ x: 100, y: 100 });
  });

  it('capas: pertenencia múltiple sin duplicar identidad', () => {
    let doc = createEmptyDoc();
    const r = op.addNode(doc, 'bubble'); doc = r.doc;
    const l1 = op.addLayer(doc, 'Riesgos'); doc = l1.doc;
    const l2 = op.addLayer(doc, 'Soluciones'); doc = l2.doc;
    doc = op.setNodeLayers(doc, [r.id], l1.id, true);
    doc = op.setNodeLayers(doc, [r.id], l2.id, true);
    expect(doc.nodes[r.id].layerIds).toEqual([l1.id, l2.id]);
    doc = op.updateLayer(doc, l1.id, { visible: false });
    expect(op.layerVisibility(doc, doc.nodes[r.id]).visible).toBe(true);
    doc = op.updateLayer(doc, l2.id, { visible: false });
    expect(op.layerVisibility(doc, doc.nodes[r.id]).visible).toBe(false);
  });

  it('plegar ramas oculta descendientes dominados', () => {
    let doc = createEmptyDoc();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) { const r = op.addNode(doc, 'bubble'); doc = r.doc; ids.push(r.id); }
    doc = op.addEdge(doc, ids[0], ids[1], 'conceptual').doc;
    doc = op.addEdge(doc, ids[1], ids[2], 'conceptual').doc;
    doc = op.addEdge(doc, ids[0], ids[3], 'conceptual').doc;
    doc = op.updateNode(doc, ids[1], { branchCollapsed: true });
    expect([...op.branchHiddenIds(doc)]).toEqual([ids[2]]);
  });

  it('propiedades: peso, polaridad, comportamiento, condición, mitigador y efecto', () => {
    let doc = createEmptyDoc();
    const inp = op.addNode(doc, 'input'); doc = inp.doc;
    const n = op.addNode(doc, 'bubble'); doc = n.doc;
    const out = op.addNode(doc, 'output'); doc = out.doc;
    doc = op.addEdge(doc, inp.id, n.id, 'flow').doc;
    doc = op.addEdge(doc, n.id, out.id, 'flow').doc;
    doc = op.setParam(doc, 'node', n.id, 'weight.influence', { mode: 'weighted', value: -4, scaleId: null });
    doc = op.setParam(doc, 'node', n.id, 'weight.influence.value', 4);
    expect(doc.nodes[n.id].weight.influence?.value).toBe(4);
    doc = op.setParam(doc, 'node', n.id, 'weight.influence.value', -4);
    const b = op.addBehavior(doc, n.id, 'reducer', { ratio: 0.5 }); doc = b.doc;
    const c = op.addCondition(doc, 'behavior', b.id, exprCompare(inp.id, 'out', '>', 10)); doc = c.doc;
    const m = op.addNode(doc, 'bubble', { title: 'Mitigador' }); doc = m.doc;
    const me = op.addEdge(doc, m.id, n.id, 'causal', { behavior: { influence: { mode: 'compensate', compensationUnit: 'points', amount: 2 } as never } }); doc = me.doc;
    let r = simulate(doc, { iterations: 1 });
    expect(r.metrics.resultSeries[0]).toBeCloseTo(75); // −4 con 2 puntos compensados = 50%
    doc = op.setParam(doc, 'edge', me.id, 'behavior.influence.amount', 4);
    r = simulate(doc, { iterations: 1 });
    expect(r.metrics.resultSeries[0]).toBeCloseTo(100); // compensación total
    doc = op.removeCondition(doc, c.id);
    expect(doc.behaviors[b.id].conditions).toEqual([]);
  });

  it('escenarios: setParam en escenario no base crea una sustitución', () => {
    let doc = createEmptyDoc();
    const n = op.addNode(doc, 'bubble'); doc = n.doc;
    const b = op.addBehavior(doc, n.id, 'filter', { passRatio: 0.5 }); doc = b.doc;
    const s = op.addScenario(doc, 'Alternativo'); doc = s.doc;
    doc = op.setActiveScenario(doc, s.id);
    doc = op.setParam(doc, 'behavior', b.id, 'parameters.passRatio', 0.8);
    expect(doc.behaviors[b.id].parameters.passRatio).toBe(0.5);
    expect(doc.scenarios[s.id].overrides).toHaveLength(1);
    doc = op.setParam(doc, 'behavior', b.id, 'parameters.passRatio', 0.5);
    expect(doc.scenarios[s.id].overrides).toHaveLength(0);
    const dup = op.addScenario(doc, 'Copia', s.id); doc = dup.doc;
    doc = op.setActiveScenario(doc, dup.id);
    doc = op.setParam(doc, 'behavior', b.id, 'parameters.passRatio', 0.9);
    expect(doc.scenarios[s.id].overrides).toHaveLength(0);
    expect(doc.scenarios[dup.id].overrides).toHaveLength(1);
  });

  it('deshacer y rehacer (con agrupación de cambios y transacciones)', () => {
    const st = useProject.getState();
    st.load(createEmptyDoc());
    let id = '';
    useProject.getState().apply((d) => { const r = op.addNode(d, 'bubble'); id = r.id; return r.doc; });
    useProject.getState().apply((d) => op.updateNode(d, id, { title: 'a' }), { coalesceKey: 'title' });
    useProject.getState().apply((d) => op.updateNode(d, id, { title: 'ab' }), { coalesceKey: 'title' });
    expect(useProject.getState().past).toHaveLength(2);
    useProject.getState().begin();
    for (let i = 0; i < 10; i++) useProject.getState().apply((d) => op.moveNodes(d, { [id]: { x: i, y: i } }));
    useProject.getState().end();
    expect(useProject.getState().past).toHaveLength(3);
    useProject.getState().undo();
    expect(useProject.getState().doc!.nodes[id].position).toEqual({ x: 0, y: 0 });
    useProject.getState().undo();
    expect(useProject.getState().doc!.nodes[id].title).toBe('Nueva idea');
    useProject.getState().redo();
    expect(useProject.getState().doc!.nodes[id].title).toBe('ab');
    useProject.getState().undo();
    useProject.getState().undo();
    expect(Object.keys(useProject.getState().doc!.nodes)).toHaveLength(0);
  });

  it('distribución automática y alineación', () => {
    let doc = createEmptyDoc();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) { const r = op.addNode(doc, 'bubble', { position: { x: Math.random() * 500, y: Math.random() * 500 } }); doc = r.doc; ids.push(r.id); }
    doc = op.addEdge(doc, ids[0], ids[1], 'flow').doc;
    doc = op.addEdge(doc, ids[1], ids[2], 'flow').doc;
    doc = op.autoLayout(doc, size);
    expect(doc.nodes[ids[0]].position.x).toBeLessThan(doc.nodes[ids[1]].position.x);
    expect(doc.nodes[ids[1]].position.x).toBeLessThan(doc.nodes[ids[2]].position.x);
    doc = op.alignNodes(doc, ids, 'top', size);
    expect(new Set(ids.map((i) => doc.nodes[i].position.y)).size).toBe(1);
  });

  it('clon comparte identidad lógica en el motor', () => {
    let doc = createEmptyDoc();
    const inp = op.addNode(doc, 'input'); doc = inp.doc;
    const a = op.addNode(doc, 'bubble'); doc = a.doc;
    const out = op.addNode(doc, 'output'); doc = out.doc;
    const cl = op.cloneNode(doc, a.id); doc = cl.doc;
    doc = op.addEdge(doc, inp.id, a.id, 'flow').doc;
    doc = op.addEdge(doc, cl.id, out.id, 'flow').doc; // sale del clon = sale del original
    expect(simulate(doc, { iterations: 1 }).metrics.resultSeries[0]).toBe(100);
  });
});
