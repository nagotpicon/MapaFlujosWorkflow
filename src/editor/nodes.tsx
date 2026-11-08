/** Vistas de nodos del lienzo. Cada nodo se suscribe solo a su propio estado. */
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Handle, NodeResizer, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Ban, ChevronDown, ChevronRight, Database, Gauge, Link2, Lock, MessageSquare, Moon, ShieldCheck, Shuffle, Sparkles, Thermometer, TrendingDown, Waypoints,
} from 'lucide-react';
import type { MapNode } from '../core/model/schema';
import { BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { nodeIcon } from '../ui/icons';
import { BehaviorIcon } from '../ui/behaviorIcon';
import { cx, fmt } from '../ui/primitives';
import { qty } from '../engine/packet';
import { HEAT_LABEL } from '../engine/heat';
import { PAPEL, type Papel } from '../kid/model';
import { useHighlight } from './highlight';
import type { RFNodeData } from './derive';

type P = NodeProps<Node<RFNodeData>>;

const SIDES: { id: 'top' | 'right' | 'bottom' | 'left'; pos: Position }[] = [
  { id: 'top', pos: Position.Top }, { id: 'right', pos: Position.Right }, { id: 'bottom', pos: Position.Bottom }, { id: 'left', pos: Position.Left },
];

function Handles() {
  return <>{SIDES.map((s) => <Handle key={s.id} id={s.id} type="source" position={s.pos} className="mdf-handle" />)}</>;
}

const FONT: Record<string, string> = { sans: 'var(--font-sans)', serif: 'ui-serif, Georgia, "Times New Roman", serif', mono: 'var(--font-mono)' };
const HEAT_VAR: Record<string, string> = { cold: 'var(--heat-cold)', rhythm: 'var(--heat-rhythm)', warm: 'var(--heat-warm)', overheated: 'var(--heat-hot)', idle: 'var(--border-strong)' };

function InlineTitle({ node, className, multiline }: { node: MapNode; className?: string; multiline?: boolean }) {
  const editing = useUI((s) => s.editingNodeId === node.id);
  const [draft, setDraft] = useState(node.title);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!editing) return;
    setDraft(node.title);
    // el lienzo dibuja la idea nueva un instante después: se reintenta hasta tener el foco
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const grab = () => {
      const el = ref.current;
      if (el && document.activeElement !== el) { el.focus(); if (document.activeElement === el) el.select(); }
      if (document.activeElement !== el && tries++ < 15) timer = setTimeout(grab, 40);
    };
    const raf = requestAnimationFrame(grab);
    return () => { cancelAnimationFrame(raf); if (timer) clearTimeout(timer); };
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!editing) return <div className={className}>{node.title || <span className="opacity-40">Escribe aquí…</span>}</div>;
  const commit = () => {
    useUI.setState({ editingNodeId: null });
    if (draft !== node.title) useProject.getState().apply((d) => op.updateNode(d, node.id, { title: draft.trim() || node.title }));
  };
  return (
    <textarea
      ref={ref}
      aria-label="Texto de la idea"
      data-testid="node-title-input"
      className={cx('nodrag nopan w-full resize-none bg-transparent outline-none', className)}
      value={draft}
      rows={Math.max(1, Math.min(6, draft.split('\n').length))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey && !multiline) { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { setDraft(node.title); useUI.setState({ editingNodeId: null }); }
      }}
    />
  );
}

function ShapeBg({ shape, color, border, dashed }: { shape: string; color: string; border: string; dashed?: string }) {
  if (shape !== 'diamond' && shape !== 'hexagon') return null;
  const pts = shape === 'diamond' ? '50,1 99,50 50,99 1,50' : '25,1 75,1 99,50 75,99 25,99 1,50';
  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <polygon points={pts} fill={color} stroke={border} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray={dashed} />
    </svg>
  );
}

const StateIcon = ({ flag }: { flag: string }) => {
  const map: Record<string, [typeof Gauge, string, string]> = {
    saturated: [Gauge, 'text-loss', 'Saturado'],
    blocked: [Ban, 'text-loss', 'Bloqueo'],
    accumulating: [Database, 'text-cond', 'Acumulando'],
    compensated: [ShieldCheck, 'text-gain', 'Compensado'],
    loss: [TrendingDown, 'text-loss', 'Pérdida'],
    transforming: [Shuffle, 'text-transform', 'Transformando'],
    generating: [Sparkles, 'text-flow', 'Generando'],
    inactive: [Moon, 'text-ink-3', 'Inactivo'],
  };
  const e = map[flag];
  if (!e) return null;
  const [I, c, label] = e;
  return <span title={label} aria-label={label} className={cx('inline-flex', c)}><I className="size-3" /></span>;
};

export const MapNodeView = memo(function MapNodeView({ id, selected }: P) {
  const raw = useProject((s) => s.doc?.nodes[id]);
  const original = useProject((s) => (raw?.aliasOf ? s.doc?.nodes[raw.aliasOf] : undefined));
  const node = raw ? (original ? { ...original, id: raw.id, position: raw.position, dimensions: raw.dimensions } : raw) : undefined;
  const logicalId = raw?.aliasOf ?? id;
  const behaviors = useProject((s) => s.doc?.behaviors);
  const annCount = useProject((s) => (s.doc ? Object.values(s.doc.annotations).filter((a) => a.ownerId === logicalId).length : 0));
  const unit = useProject((s) => s.doc?.dimensions.quantity?.unit ?? '');
  const st = useSim((s) => s.result?.iterations[s.cursor]?.nodes[logicalId]);
  const heat = useSim((s) => s.heat?.nodes[logicalId]?.[s.cursor]);
  const stepActive = useSim((s) => s.step >= 0 && s.result?.order[s.step] === logicalId);
  const stepDone = useSim((s) => s.step < 0 || (s.result ? s.result.order.indexOf(logicalId) <= s.step : true));
  const view = useUI((s) => s.view);
  // en el modo fácil (niveles 1 y 2) no se enseñan iconos ni números técnicos dentro de las ideas
  const easy = useProject((s) => s.doc?.project.settings.depth !== 'expert');
  const showHeat = useUI((s) => s.showHeat);
  const animate = useUI((s) => s.animate);
  const hl = useHighlight();
  if (!node || !raw) return null;
  const vs = node.visualStyle;
  const color = vs.color || 'slate';
  const bg = vs.background ?? `var(--n-${color}-bg)`;
  const bd = `var(--n-${color}-bd)`;
  const ac = `var(--n-${color}-ac)`;
  const Icon = nodeIcon(vs.icon);
  const custom = node.metadata.custom ?? {};
  const papel = custom.papel && custom.papel in PAPEL ? (custom.papel as Papel) : null;
  const shape = vs.shape;
  const svgShape = shape === 'diamond' || shape === 'hexagon';
  const dims = node.dimensions;
  const dimmed = hl.active && !hl.nodes.has(id);
  const flowView = view !== 'mental';
  const bhs = node.behaviorIds.map((b) => behaviors?.[b]).filter(Boolean);
  const q = st ? Math.max(qty(st.out), qty(st.terminal)) : 0;
  const inQ = st ? qty(st.in) : 0;
  const isIO = node.type === 'input' || node.type === 'output';
  const inactive = st && !st.active;
  const showState = view === 'simulation' && st && stepDone;
  const radius = shape === 'pill' ? 999 : shape === 'circle' ? 9999 : shape === 'rect' ? 8 : 16;
  const borderStyle = vs.borderStyle === 'none' ? 'none' : `1px ${vs.borderStyle} ${selected ? 'var(--accent)' : bd}`;
  const style: CSSProperties = {
    width: dims ? '100%' : undefined,
    height: dims ? '100%' : undefined,
    minWidth: dims ? undefined : shape === 'circle' ? 120 : 140,
    maxWidth: dims ? undefined : 300,
    aspectRatio: shape === 'circle' && !dims ? '1 / 1' : undefined,
    background: svgShape ? 'transparent' : bg,
    border: svgShape ? 'none' : borderStyle,
    borderRadius: radius,
    fontFamily: FONT[vs.fontFamily],
    fontSize: vs.fontSize,
    fontWeight: vs.fontWeight,
    boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent), var(--shadow-md)' : '0 1px 2px rgba(60, 45, 25, 0.05), 0 4px 12px -6px rgba(60, 45, 25, 0.12)',
    opacity: dimmed ? 0.18 : inactive && view === 'simulation' ? 0.55 : 1,
    ['--pulse' as string]: ac,
  };
  const heatColor = heat ? HEAT_VAR[heat.state] : undefined;
  return (
    <div
      className={cx('mdf-pop group relative flex text-ink transition-[opacity,box-shadow] duration-200',
        shape === 'circle' || svgShape ? 'items-center justify-center text-center' : 'flex-col',
        view === 'simulation' && animate && st?.active && q > 0 && !dimmed && 'mdf-glow',
        stepActive && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--canvas)]')}
      style={style}
      data-testid="map-node"
      data-node-id={id}
      data-node-title={node.title}
    >
      <ShapeBg shape={shape} color={bg} border={selected ? 'var(--accent)' : bd} dashed={vs.borderStyle === 'dashed' ? '6 4' : vs.borderStyle === 'dotted' ? '1.5 3' : undefined} />
      <NodeResizer isVisible={selected && !raw.locked} minWidth={100} minHeight={40} color="var(--accent)"
        onResizeStart={() => useProject.getState().begin()}
        onResizeEnd={() => useProject.getState().end()} />
      {showHeat && heat && heat.state !== 'idle' && (
        <div className="absolute -left-[3px] top-2 bottom-2 w-[4px] rounded-full" style={{ background: heatColor }} title={`${HEAT_LABEL[heat.state]}: ${heat.causes.join(' · ')}`} aria-label={`Termómetro: ${HEAT_LABEL[heat.state]}`} />
      )}
      {vs.image && !svgShape && <img src={vs.image} alt="" className="w-full rounded-t-[13px] object-cover" style={{ maxHeight: dims ? '55%' : 110 }} draggable={false} />}
      <div className={cx('relative flex min-w-0 items-start gap-2', shape === 'pill' ? 'px-4' : 'px-3.5', svgShape ? 'max-w-[70%] py-1' : 'py-3', shape === 'circle' && 'flex-col items-center')}>
        {Icon && <span className="mt-[1px] shrink-0" style={{ color: ac }}><Icon className="size-4" strokeWidth={1.75} /></span>}
        {papel ? <span className="shrink-0 leading-snug" aria-hidden title={PAPEL[papel].name} data-testid="node-papel">{PAPEL[papel].emoji}</span>
          : !Icon && isIO && <span className="mt-[6px] size-2 shrink-0 rounded-full" style={{ background: ac }} aria-hidden title={node.type === 'input' ? 'Inicio' : 'Meta'} />}
        <InlineTitle node={raw.aliasOf ? { ...node, id: raw.aliasOf } : node} className={cx('min-w-0 flex-1 whitespace-pre-wrap break-words leading-snug', custom.hecho === '1' && 'text-ink-2')} />
        {(custom.primero === '1' || custom.hecho === '1' || custom.conseguido === '1') && (
          <span className="shrink-0 leading-snug" data-testid="node-marks" title={[custom.primero === '1' && 'Primer paso', custom.hecho === '1' && 'Hecho', custom.conseguido === '1' && '¡Conseguido!'].filter(Boolean).join(' · ')}>
            {custom.conseguido === '1' ? '🎉' : ''}{custom.primero === '1' ? '⭐' : ''}{custom.hecho === '1' ? '✅' : ''}
          </span>
        )}
      </div>
      {!easy && (flowView || annCount > 0 || raw.aliasOf || raw.locked || node.branchCollapsed) && (
        <div className={cx('relative flex flex-wrap items-center gap-1 px-3 pb-2 text-[10.5px] text-ink-3', (shape === 'circle' || svgShape) && 'justify-center')}>
          {flowView && bhs.slice(0, 5).map((b) => (
            <span key={b!.id} title={BEHAVIOR_LIBRARY[b!.behaviorType].label} className="inline-flex size-[18px] items-center justify-center rounded-md bg-[color-mix(in_srgb,currentColor_8%,transparent)]" style={{ color: ac }}>
              <BehaviorIcon type={b!.behaviorType} className="size-3" />
            </span>
          ))}
          {view === 'system' && node.weight.influence && (
            <span className={cx('rounded px-1 font-semibold tabular', (st?.influence ?? node.weight.influence.value) < 0 ? 'text-loss' : 'text-gain')} title="Influencia neta">
              {(() => { const v = st ? st.influence : node.weight.influence!.value; return `${v > 0 ? '+' : ''}${fmt(v)}`; })()}
            </span>
          )}
          {view === 'system' && node.activationConditionId && <span className="text-cond" title="Tiene condición de activación">◆</span>}
          {(view === 'flow' || view === 'simulation') && st && (q > 0 || inQ > 0) && (
            <span className="ml-auto rounded-md bg-[color-mix(in_srgb,var(--flow)_12%,transparent)] px-1.5 py-px font-semibold tabular text-flow" title="Lo que pasa por aquí en esta ronda" data-testid="node-flow">
              {fmt(q)}{unit ? ` ${unit}` : ''}
            </span>
          )}
          {view === 'energy' && st && (
            <span className="ml-auto flex gap-1 tabular font-semibold">
              {(st.generated.quantity ?? 0) > 0 && <span className="text-gain" title="Generado">+{fmt(st.generated.quantity)}</span>}
              {(st.lost.quantity ?? 0) > 0 && <span className="text-loss" title="Perdido">−{fmt(st.lost.quantity)}</span>}
              {(st.consumed.quantity ?? 0) > 0 && <span className="text-cond" title="Consumido">◦{fmt(st.consumed.quantity)}</span>}
            </span>
          )}
          {showState && st.flags.filter((f) => !['active', 'receiving', 'emitting', 'terminal'].includes(f)).map((f) => <StateIcon key={f} flag={f} />)}
          {annCount > 0 && <span className="inline-flex items-center gap-0.5" title={`${annCount} comentario(s)`}><MessageSquare className="size-3" />{annCount}</span>}
          {raw.aliasOf && <span title="Clon (misma identidad)"><Link2 className="size-3" /></span>}
          {raw.locked && <span title="Bloqueado"><Lock className="size-3" /></span>}
          {node.branchCollapsed && <span title="Rama plegada" className="text-accent"><Waypoints className="size-3" /></span>}
          {showHeat && heat && heat.state !== 'idle' && <span title={heat.causes.join(' · ')} style={{ color: heatColor }}><Thermometer className="size-3" /></span>}
        </div>
      )}
      {node.type === 'output' && view === 'simulation' && st && (
        <div className="relative mx-3 mb-2 h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-gain transition-all duration-500" style={{ width: `${Math.min(100, (qty(st.terminal) / Math.max(1e-9, hl.maxFlow)) * 100)}%` }} />
        </div>
      )}
      {(st?.stock.quantity ?? 0) > 0 && flowView && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden rounded-b-[inherit]" aria-hidden>
          <div className="h-full bg-cond opacity-70" style={{ width: `${Math.min(100, ((st!.stock.quantity ?? 0) / Math.max(1, hl.maxFlow * 3)) * 100)}%` }} />
        </div>
      )}
      <Handles />
    </div>
  );
});

export const GroupNodeView = memo(function GroupNodeView({ id, selected }: P) {
  const node = useProject((s) => s.doc?.nodes[id]);
  const childCount = useProject((s) => (s.doc ? Object.values(s.doc.nodes).filter((n) => n.parentId === id).length : 0));
  const hl = useHighlight();
  if (!node) return null;
  const isContainer = node.type === 'container';
  const color = node.visualStyle.color || 'slate';
  const toggle = () => useProject.getState().apply((d) => op.updateNode(d, id, { collapsed: !node.collapsed }));
  return (
    <div className="relative size-full" data-testid="group-node" data-node-id={id} data-node-title={node.title}
      style={{
        borderRadius: isContainer ? 22 : 18,
        background: color === 'slate'
          ? `color-mix(in srgb, var(--wood-soft) ${isContainer ? 75 : 45}%, transparent)`
          : isContainer ? `color-mix(in srgb, var(--n-${color}-bg) 70%, transparent)` : `color-mix(in srgb, var(--n-${color}-bg) 35%, transparent)`,
        border: `1px ${node.visualStyle.borderStyle === 'solid' ? 'solid' : 'dashed'} ${selected ? 'var(--accent)' : color === 'slate' ? 'var(--wood-line)' : `var(--n-${color}-bd)`}`,
        opacity: hl.active && !hl.nodes.has(id) ? 0.4 : 1,
      }}>
      <NodeResizer isVisible={selected && !node.collapsed && !node.locked} minWidth={160} minHeight={80} color="var(--accent)"
        onResizeStart={() => useProject.getState().begin()}
        onResizeEnd={() => useProject.getState().end()} />
      <div className="flex items-center gap-1.5 px-2.5 pt-2">
        <button type="button" className="nodrag rounded p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink" onClick={toggle} aria-label={node.collapsed ? 'Abrir grupo' : 'Cerrar grupo'} data-testid="group-toggle">
          {node.collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>
        <InlineTitle node={node} className={cx('min-w-0 flex-1 truncate text-[12px] font-semibold tracking-wide', isContainer ? 'text-ink' : 'text-ink-2')} />
        {node.collapsed && <span className="rounded-md bg-surface-2 px-1.5 text-[10.5px] text-ink-3 tabular">{childCount}</span>}
      </div>
      <Handles />
    </div>
  );
});

export const NoteNodeView = memo(function NoteNodeView({ id, selected }: P) {
  const node = useProject((s) => s.doc?.nodes[id]);
  const hl = useHighlight();
  if (!node) return null;
  const isComment = node.type === 'comment';
  return (
    <div data-testid="map-node" data-node-id={id} data-node-title={node.title}
      className={cx('mdf-pop relative size-full min-h-[60px] min-w-[150px] rounded-lg border px-3 py-2 text-[12.5px] leading-snug text-ink shadow-sm', isComment && 'rounded-bl-sm')}
      style={{ background: 'var(--n-amber-bg)', borderColor: selected ? 'var(--accent)' : 'var(--n-amber-bd)', opacity: hl.active && !hl.nodes.has(id) ? 0.3 : 1, maxWidth: node.dimensions ? undefined : 260 }}>
      <NodeResizer isVisible={selected && !node.locked} minWidth={120} minHeight={50} color="var(--accent)"
        onResizeStart={() => useProject.getState().begin()} onResizeEnd={() => useProject.getState().end()} />
      {isComment && <MessageSquare className="mb-1 size-3.5 text-cond" />}
      <InlineTitle node={node} multiline className="whitespace-pre-wrap" />
      <Handles />
    </div>
  );
});

export const LabelNodeView = memo(function LabelNodeView({ id, selected }: P) {
  const node = useProject((s) => s.doc?.nodes[id]);
  if (!node) return null;
  return (
    <div data-testid="map-node" data-node-id={id} data-node-title={node.title} className={cx('rounded-md px-1 tracking-tight text-ink', selected && 'ring-2 ring-accent/40')}
      style={{ fontSize: node.visualStyle.fontSize, fontWeight: node.visualStyle.fontWeight, fontFamily: FONT[node.visualStyle.fontFamily], color: `var(--n-${node.visualStyle.color}-ac)` }}>
      <InlineTitle node={node} className="whitespace-pre-wrap" />
      <Handles />
    </div>
  );
});

export const NODE_TYPES = { mapNode: MapNodeView, groupNode: GroupNodeView, noteNode: NoteNodeView, labelNode: LabelNodeView };
