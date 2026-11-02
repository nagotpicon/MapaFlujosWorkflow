/**
 * Derivación de los elementos de React Flow a partir del modelo. Se reutiliza
 * el objeto de cada nodo mientras su entidad, selección y visibilidad no
 * cambien, para que React Flow solo vuelva a renderizar lo necesario.
 */
import { useMemo, useRef } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type { MapEdge, MapNode, ProjectDoc } from '../core/model/schema';
import { branchHiddenIds, layerVisibility } from '../core/operations';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';

export type RFNodeData = { id: string };
export type RFEdgeData = { id: string; parallel: number; remapped: boolean };

const NODE_TYPE: Record<MapNode['type'], string> = {
  bubble: 'mapNode', input: 'mapNode', output: 'mapNode', note: 'noteNode', label: 'labelNode', comment: 'noteNode', group: 'groupNode', container: 'groupNode',
};

interface CacheEntry { src: MapNode; key: string; node: Node<RFNodeData> }

export function computeHidden(doc: ProjectDoc, isolate: Set<string> | null): { hidden: Set<string>; collapsedOwner: Map<string, string> } {
  const hidden = new Set<string>();
  const branch = branchHiddenIds(doc);
  const collapsedOwner = new Map<string, string>();
  for (const n of Object.values(doc.nodes)) {
    if (n.hidden || branch.has(n.id) || !layerVisibility(doc, n).visible) hidden.add(n.id);
    if (isolate && !isolate.has(n.id) && !['group', 'container', 'note', 'label', 'comment'].includes(n.type)) hidden.add(n.id);
    // ancestros plegados
    let p = n.parentId ? doc.nodes[n.parentId] : undefined;
    const seen = new Set<string>();
    let top: string | null = null;
    while (p && !seen.has(p.id)) {
      seen.add(p.id);
      if (p.collapsed) top = p.id;
      p = p.parentId ? doc.nodes[p.parentId] : undefined;
    }
    if (top) { hidden.add(n.id); collapsedOwner.set(n.id, top); }
  }
  return { hidden, collapsedOwner };
}

export function useFlowElements(isolate: Set<string> | null) {
  const doc = useProject((s) => s.doc);
  const selection = useUI((s) => s.selection);
  const sizes = useUI((s) => s.sizes);
  const cache = useRef(new Map<string, CacheEntry>());
  const edgeCache = useRef(new Map<string, { src: MapEdge; key: string; edge: Edge<RFEdgeData> }>());

  const vis = useMemo(() => (doc ? computeHidden(doc, isolate) : null), [doc?.nodes, doc?.layers, doc?.edges, isolate]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = useMemo(() => {
    if (!doc || !vis) return [] as Node<RFNodeData>[];
    const sel = new Set(selection.nodes);
    const out: Node<RFNodeData>[] = [];
    const next = new Map<string, CacheEntry>();
    for (const n of Object.values(doc.nodes)) {
      const hidden = vis.hidden.has(n.id);
      const lv = layerVisibility(doc, n);
      const isGroup = n.type === 'group' || n.type === 'container';
      const collapsed = isGroup && n.collapsed;
      const m = sizes[n.id];
      const key = `${sel.has(n.id)}|${hidden}|${lv.locked}|${m?.width}x${m?.height}`;
      const prev = cache.current.get(n.id);
      if (prev && prev.src === n && prev.key === key) { out.push(prev.node); next.set(n.id, prev); continue; }
      const fixed = collapsed ? { width: 230, height: 58 } : n.dimensions ?? null;
      const node: Node<RFNodeData> = {
        id: n.id,
        type: NODE_TYPE[n.type],
        position: n.position,
        data: { id: n.id },
        parentId: n.parentId && doc.nodes[n.parentId] ? n.parentId : undefined,
        selected: sel.has(n.id),
        hidden,
        draggable: !n.locked && !lv.locked,
        deletable: false,
        zIndex: isGroup ? -1 + n.zIndex : n.zIndex,
        ...(fixed ? { width: fixed.width, height: fixed.height } : {}),
        ...(m ? { measured: m } : {}),
        ...(isGroup ? { style: { zIndex: -1 } } : {}),
      };
      const entry = { src: n, key, node };
      next.set(n.id, entry);
      out.push(node);
    }
    cache.current = next;
    return out;
  }, [doc, vis, selection.nodes, sizes]);

  const edges = useMemo(() => {
    if (!doc || !vis) return [] as Edge<RFEdgeData>[];
    const sel = new Set(selection.edges);
    const pairCount = new Map<string, number>();
    const out: Edge<RFEdgeData>[] = [];
    const next = new Map<string, { src: MapEdge; key: string; edge: Edge<RFEdgeData> }>();
    for (const e of Object.values(doc.edges)) {
      let source = e.sourceNodeId;
      let target = e.targetNodeId;
      const remapped = vis.collapsedOwner.has(source) || vis.collapsedOwner.has(target);
      source = vis.collapsedOwner.get(source) ?? source;
      target = vis.collapsedOwner.get(target) ?? target;
      const hidden = e.metadata.hidden || (vis.hidden.has(source) && !vis.collapsedOwner.has(e.sourceNodeId)) || (vis.hidden.has(target) && !vis.collapsedOwner.has(e.targetNodeId)) || (remapped && source === target && e.sourceNodeId !== e.targetNodeId);
      const pk = [source, target].sort().join('|');
      const parallel = pairCount.get(pk) ?? 0;
      pairCount.set(pk, parallel + 1);
      const key = `${sel.has(e.id)}|${hidden}|${source}|${target}|${parallel}`;
      const prev = edgeCache.current.get(e.id);
      if (prev && prev.src === e && prev.key === key) { out.push(prev.edge); next.set(e.id, prev); continue; }
      const self = source === target;
      const edge: Edge<RFEdgeData> = {
        id: e.id,
        source,
        target,
        sourceHandle: self ? 'right' : e.visualStyle.sourceAnchor,
        targetHandle: self ? 'top' : e.visualStyle.targetAnchor,
        type: 'mapEdge',
        data: { id: e.id, parallel, remapped },
        selected: sel.has(e.id),
        hidden,
        deletable: false,
        reconnectable: true,
      };
      const entry = { src: e, key, edge };
      next.set(e.id, entry);
      out.push(edge);
    }
    edgeCache.current = next;
    return out;
  }, [doc, vis, selection.edges]);

  return { nodes, edges };
}
