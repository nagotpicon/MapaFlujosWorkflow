import { DocBuilder } from '../core/model/builder';
import type { ProjectDoc } from '../core/model/schema';

/** Mapa sintético: capas de nodos con bifurcaciones, filtros, capacidades, influencias y un retorno. */
export function bigMap(n: number): ProjectDoc {
  const b = new DocBuilder(`Mapa grande ${n}`);
  const inputs = [b.input('Entrada A', 1000), b.input('Entrada B', 500)];
  inputs.forEach((id, i) => { b.doc.nodes[id] = { ...b.doc.nodes[id], position: { x: 0, y: i * 200 } }; });
  const perLayer = 10;
  let prev = [...inputs];
  const all: string[] = [];
  for (let i = 0; i < n; i++) {
    const layer = Math.floor(i / perLayer);
    const id = b.node(i % 37 === 0 ? 'output' : 'bubble', `N${i}`, { position: { x: (layer + 1) * 260, y: (i % perLayer) * 110 } });
    if (i % 3 === 0) b.behavior(id, 'filter', { passRatio: 0.9 });
    if (i % 7 === 0) b.behavior(id, 'restrictor', { capacity: 300, excess: 'queue' });
    if (i % 11 === 0) b.behavior(id, 'multiplier', { factor: 1.05 });
    if (i % 13 === 0) b.set(id, 'weight', { importance: null, influence: { mode: 'weighted', value: -2, scaleId: null }, impact: null });
    b.edge(prev[i % prev.length], id);
    if (i % 4 === 0 && all.length > 3) b.edge(all[all.length - 3], id);
    if (i % 13 === 0 && all.length > 5) b.edge(id, all[all.length - 5], { type: 'causal', behavior: { influence: { mode: 'modulate', targetDimension: 'quantity', sensitivity: 0.2 } as never } });
    all.push(id);
    if ((i + 1) % perLayer === 0) prev = all.slice(-perLayer);
  }
  const out = b.node('output', 'Resultado final', { position: { x: (n / perLayer + 2) * 260, y: 300 } });
  for (const id of all.slice(-perLayer)) b.edge(id, out);
  b.edge(out, inputs[0], { behavior: { transport: 'replicate', multiplier: 0.1 } });
  return b.doc;
}

