/**
 * 🔇 Silenciar: una idea se calcula como si no estuviera, sin borrar nada.
 * Sirve para ver, de un golpe, cuánto cambia el resultado sin ella.
 *
 * Una idea silenciada:
 *  · no empuja ni frena (su fuerza cuenta como 0);
 *  · no hace nada con lo que le llega (lo deja seguir igual);
 *  · sus líneas «Influye» y sus remedios dejan de contar;
 *  · si es un inicio, no pone nada en marcha.
 * Lo que pasa por ella por una línea «Pasa» sigue su camino: el mapa no se rompe.
 */
import type { MapNode, ProjectDoc } from '../core/model/schema';

export const isMuted = (n: MapNode | undefined): boolean => n?.metadata.custom?.mute === '1';

/** ¿Tiene sentido silenciarla? Solo si cambia algo del resultado. */
export function canMute(doc: ProjectDoc, n: MapNode): boolean {
  if (n.aliasOf) return false;
  if (n.type === 'input') return Object.values(doc.nodes).filter((x) => x.type === 'input' && !x.aliasOf).length > 1;
  if (n.type !== 'bubble') return false;
  const papel = n.metadata.custom?.papel;
  if (papel === 'piedra' || papel === 'ayuda') return true;
  const inf = n.weight.influence;
  if (inf && !(inf.mode !== 'qualitative' && inf.value === 0)) return true;
  if (n.behaviorIds.some((b) => doc.behaviors[b])) return true;
  return Object.values(doc.edges).some((e) => e.sourceNodeId === n.id && e.type === 'causal');
}

/** Copia del mapa en la que las ideas silenciadas no cuentan. */
export function applyMutes(doc: ProjectDoc): ProjectDoc {
  const muted = new Set(Object.values(doc.nodes).filter((n) => isMuted(n)).map((n) => n.id));
  if (muted.size === 0) return doc;
  const nodes = { ...doc.nodes };
  for (const id of muted) {
    const n = nodes[id];
    const quantity = n.dimensionValues.quantity;
    nodes[id] = {
      ...n,
      weight: { ...n.weight, influence: null },
      behaviorIds: [],
      dimensionValues: n.type === 'input'
        ? { ...n.dimensionValues, quantity: { ...(quantity ?? { mode: 'numeric', unit: '', confidence: 'estimate', source: '', range: null }), value: 0 } }
        : n.dimensionValues,
    };
  }
  const edges = { ...doc.edges };
  for (const e of Object.values(doc.edges)) {
    if (e.type !== 'causal' || !muted.has(e.sourceNodeId)) continue;
    const inf = e.behavior.influence;
    edges[e.id] = {
      ...e,
      behavior: {
        ...e.behavior,
        influence: inf.mode === 'compensate' ? { ...inf, compensationType: 'partial', amount: 0 } : { ...inf, sensitivity: 0 },
      },
    };
  }
  return { ...doc, nodes, edges };
}
