import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, ConnectionMode, MiniMap, ReactFlow, SelectionMode, ViewportPortal, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type OnSelectionChangeParams,
} from '@xyflow/react';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import * as A from '../app/actions';
import { levelOf } from '../app/levels';
import { NODE_TYPES } from './nodes';
import { EDGE_TYPES, EdgeMarkers } from './edges';
import { useFlowElements, type RFEdgeData, type RFNodeData } from './derive';
import { HighlightContext, useComputeHighlight } from './highlight';
import { ContextMenu, type MenuState } from './ContextMenu';
import { FrameGrid } from './FrameGrid';
import { Legend } from './Legend';
import { CanvasControls } from './CanvasControls';
import { setRF } from '../app/io';
import type { NodeType } from '../core/model/schema';

const TOOL_NODE: Partial<Record<string, NodeType>> = {
  bubble: 'bubble', input: 'input', output: 'output', note: 'note', label: 'label', comment: 'comment', container: 'container', group: 'group',
};

export function Canvas({ resolvedTheme, level = 3 }: { resolvedTheme: 'light' | 'dark'; level?: 1 | 2 | 3 }) {
  const rf = useReactFlow<Node<RFNodeData>, Edge<RFEdgeData>>();
  const doc = useProject((s) => s.doc);
  const tool = useUI((s) => s.tool);
  const view = useUI((s) => s.view);
  const animate = useUI((s) => s.animate);
  const trace = useUI((s) => s.trace);
  const showHeat = useUI((s) => s.showHeat);
  const highlight = useComputeHighlight();
  const isolate = useMemo(() => (trace?.isolate && highlight.trace ? new Set(highlight.trace.nodeIds) : null), [trace?.isolate, highlight.trace]);
  const { nodes, edges } = useFlowElements(isolate);
  const [menu, setMenu] = useState<MenuState | null>(null);
  // encuadre inicial solo si el mapa ya tiene contenido (en un mapa vacío no debe moverse al crear)
  const [initialFit] = useState(() => Object.keys(useProject.getState().doc?.nodes ?? {}).length > 0);
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = doc?.project.settings.frame;
  const extraColors = useMemo(() => [...new Set(Object.values(doc?.edges ?? {}).map((e) => e.visualStyle.color).filter((c): c is string => !!c))], [doc?.edges]);

  useEffect(() => {
    setRF(rf as never);
    A.registerViewportCenter(() => {
      const r = wrapper.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    });
    A.registerFit((ids) => {
      // en el modo fácil se deja sitio arriba para el medidor y abajo para la Brújula y la bandeja
      const easy = levelOf(useProject.getState().doc?.project.settings.depth) < 3;
      const padding = easy ? { top: '84px', bottom: '270px', left: '48px', right: '48px' } as const : undefined;
      if (ids?.length) void rf.fitView({ nodes: ids.map((id) => ({ id })), duration: 400, padding: padding ?? 0.5, maxZoom: 1.4 });
      else void rf.fitView({ duration: 400, padding: padding ?? 0.15, maxZoom: 1.2 });
    });
  }, [rf]);

  const onNodesChange = useCallback((changes: NodeChange<Node<RFNodeData>>[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const sizes: Record<string, { width: number; height: number }> = {};
    const resized: Record<string, { width: number; height: number }> = {};
    let selChanged = false;
    const sel = new Set(useUI.getState().selection.nodes);
    for (const c of changes) {
      if (c.type === 'position' && c.position) pos[c.id] = c.position;
      else if (c.type === 'dimensions' && c.dimensions) {
        sizes[c.id] = { width: c.dimensions.width, height: c.dimensions.height };
        if (c.setAttributes) resized[c.id] = { width: Math.round(c.dimensions.width), height: Math.round(c.dimensions.height) };
      } else if (c.type === 'select') {
        selChanged = true;
        if (c.selected) sel.add(c.id); else sel.delete(c.id);
      }
    }
    if (Object.keys(pos).length || Object.keys(resized).length) {
      useProject.getState().apply((d) => {
        let out = Object.keys(pos).length ? op.moveNodes(d, pos) : d;
        for (const [id, dim] of Object.entries(resized)) if (out.nodes[id]) out = { ...out, nodes: { ...out.nodes, [id]: { ...out.nodes[id], dimensions: dim } } };
        return out;
      });
    }
    if (Object.keys(sizes).length) useUI.getState().setSizes(sizes);
    if (selChanged) useUI.setState((s) => ({ selection: { ...s.selection, nodes: [...sel] } }));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge<RFEdgeData>>[]) => {
    const sel = new Set(useUI.getState().selection.edges);
    let changed = false;
    for (const c of changes) if (c.type === 'select') { changed = true; if (c.selected) sel.add(c.id); else sel.delete(c.id); }
    if (changed) useUI.setState((s) => ({ selection: { ...s.selection, edges: [...sel] } }));
  }, []);

  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams) => {
    const cur = useUI.getState().selection;
    const n = ns.map((x) => x.id);
    const e = es.map((x) => x.id);
    if (n.join() !== cur.nodes.join() || e.join() !== cur.edges.join()) useUI.setState({ selection: { nodes: n, edges: e } });
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    const id = A.connect(c.source, c.target, undefined, { sourceAnchor: c.sourceHandle, targetAnchor: c.targetHandle });
    useUI.getState().setSelection([], [id]);
  }, []);

  const onReconnect = useCallback((old: Edge, c: Connection) => {
    if (!c.source || !c.target) return;
    A.apply((d) => {
      const e = d.edges[old.id];
      if (!e) return d;
      return op.updateEdge(d, old.id, {
        sourceNodeId: c.source, targetNodeId: c.target,
        visualStyle: { ...e.visualStyle, sourceAnchor: (c.sourceHandle ?? e.visualStyle.sourceAnchor) as never, targetAnchor: (c.targetHandle ?? e.visualStyle.targetAnchor) as never },
      });
    });
  }, []);

  const toFlow = (ev: { clientX: number; clientY: number }) => rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });

  const onPaneClick = useCallback((ev: React.MouseEvent) => {
    setMenu(null);
    const t = useUI.getState().tool;
    const type = TOOL_NODE[t];
    if (type) A.createNodeAt(type, toFlow(ev));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDoubleClick = (ev: React.MouseEvent) => {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('react-flow__pane')) A.createNodeAt('bubble', toFlow(ev));
  };

  const onNodeClick = useCallback((ev: React.MouseEvent, n: Node) => {
    const t = useUI.getState().tool;
    if (t === 'comment') {
      useUI.getState().setSelection([n.id]);
      A.addCommentToSelection();
      useUI.setState({ tool: 'select' });
    }
    if (t === 'connect') {
      const sel = useUI.getState().selection.nodes;
      if (sel.length === 1 && sel[0] !== n.id) {
        const id = A.connect(sel[0], n.id);
        useUI.getState().setSelection([], [id]);
        ev.stopPropagation();
      }
    }
  }, []);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, n: Node) => {
    const d = useProject.getState().doc?.nodes[n.id];
    if (d && !d.locked) useUI.setState({ editingNodeId: n.id });
  }, []);

  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, e: Edge) => {
    useUI.getState().setSelection([], [e.id]);
    useUI.setState({ inspectorOpen: true });
    setTimeout(() => document.querySelector<HTMLInputElement>('[data-edge-label-input]')?.focus(), 60);
  }, []);

  return (
    <HighlightContext.Provider value={highlight}>
      <div ref={wrapper} className={`relative size-full ${animate ? '' : 'mdf-no-motion'} ${tool !== 'select' ? 'cursor-crosshair' : ''}`} onDoubleClick={onDoubleClick} data-testid="canvas" data-view={view}>
        <EdgeMarkers extra={extraColors} />
        <ReactFlow<Node<RFNodeData>, Edge<RFEdgeData>>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onNodeDragStart={() => useProject.getState().begin()}
          onNodeDragStop={() => useProject.getState().end()}
          onSelectionDragStart={() => useProject.getState().begin()}
          onSelectionDragStop={() => useProject.getState().end()}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeContextMenu={(ev, n) => { ev.preventDefault(); if (!useUI.getState().selection.nodes.includes(n.id)) useUI.getState().setSelection([n.id]); setMenu({ kind: 'node', id: n.id, x: ev.clientX, y: ev.clientY, flow: toFlow(ev) }); }}
          onEdgeContextMenu={(ev, e) => { ev.preventDefault(); useUI.getState().setSelection([], [e.id]); setMenu({ kind: 'edge', id: e.id, x: ev.clientX, y: ev.clientY, flow: toFlow(ev) }); }}
          onPaneContextMenu={(ev) => { ev.preventDefault(); setMenu({ kind: 'pane', id: null, x: ev.clientX, y: ev.clientY, flow: toFlow(ev as React.MouseEvent) }); }}
          onSelectionContextMenu={(ev) => { ev.preventDefault(); setMenu({ kind: 'selection', id: null, x: ev.clientX, y: ev.clientY, flow: toFlow(ev) }); }}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={null}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
          selectionMode={SelectionMode.Partial}
          zoomOnDoubleClick={false}
          minZoom={0.08}
          maxZoom={2.5}
          fitView={initialFit}
          fitViewOptions={{ padding: 0.15, maxZoom: 1.1 }}
          colorMode={resolvedTheme}
          attributionPosition="top-right"
          onlyRenderVisibleElements={nodes.length > 250}
          reconnectRadius={14}
        >
          {frame?.mode === 'grid'
            ? <ViewportPortal><FrameGrid showHeat={showHeat} /></ViewportPortal>
            : <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="var(--grid-dot)" />}
          {level === 3 && <MiniMap pannable zoomable position="bottom-right" ariaLabel="Minimapa"
            nodeColor={(n) => {
              const d = useProject.getState().doc?.nodes[n.id];
              return d ? `var(--n-${d.visualStyle.color}-ac)` : 'var(--concept)';
            }}
            nodeStrokeWidth={0} nodeBorderRadius={6} maskColor="color-mix(in srgb, var(--canvas) 70%, transparent)" style={{ width: 168, height: 112 }} />}
        </ReactFlow>
        <CanvasControls />
        {level === 3 && <Legend />}
        {menu && <ContextMenu state={menu} onClose={() => setMenu(null)} />}
        {level === 3 && <SimCursorBadge />}
      </div>
    </HighlightContext.Provider>
  );
}

function SimCursorBadge() {
  const result = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  const view = useUI((s) => s.view);
  if (!result || view === 'mental') return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-line bg-surface/90 px-3 py-1 text-[11px] font-medium text-ink-2 shadow-sm backdrop-blur" data-testid="iteration-badge">
      Ronda <span className="tabular text-ink">{cursor + 1}</span> / {result.iterationCount}
    </div>
  );
}
