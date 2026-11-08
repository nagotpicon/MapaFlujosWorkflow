/** Vistas de nodos del lienzo. Cada nodo se suscribe solo a su propio estado. */
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Handle, NodeResizer, Position, type NodeProps, type Node } from '@xyflow/react';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import type { MapNode } from '../core/model/schema';
import { BEHAVIOR_KID } from '../core/model/behaviorLibrary';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { nodeIcon } from '../ui/icons';
import { cx, fmt } from '../ui/primitives';
import { qty } from '../engine/packet';
import { HEAT_LABEL } from '../engine/heat';
import { PAPEL, type Papel } from '../kid/model';
import { useHighlight } from './highlight';
import type { RFNodeData } from './derive';
import { isMuted } from '../engine/mute';
import { toggleMute } from '../app/mute';
import { Ico } from '../ui/ico';

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


interface Chip { key: string; e: string; text: string; title: string; tone?: 'neutral' | 'loss' | 'gain' | 'cond' | 'flow'; feature?: string; testId?: string }
const CHIP_TONE: Record<NonNullable<Chip['tone']>, string> = {
  neutral: 'border-line bg-surface text-ink-2',
  loss: 'border-[color-mix(in_srgb,var(--loss)_35%,transparent)] bg-[color-mix(in_srgb,var(--loss)_8%,var(--surface))] text-loss',
  gain: 'border-[color-mix(in_srgb,var(--gain)_35%,transparent)] bg-[color-mix(in_srgb,var(--gain)_8%,var(--surface))] text-gain',
  cond: 'border-[color-mix(in_srgb,var(--condition)_40%,transparent)] bg-[color-mix(in_srgb,var(--condition)_10%,var(--surface))] text-cond',
  flow: 'border-[color-mix(in_srgb,var(--flow)_35%,transparent)] bg-[color-mix(in_srgb,var(--flow)_8%,var(--surface))] text-flow',
};
const pctOf = (v: unknown) => `${Math.round(Number(v ?? 0) * 100)} %`;
const fmtSigned = (v: number) => (Math.abs(v) < 0.005 ? '0' : `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`);
/** Lo que hace, en dos o tres palabras: «pasa el 65 %», «caben 50»… */
function behaviorChip(b: { behaviorType: string; parameters: Record<string, unknown> }): string {
  const p = b.parameters;
  switch (b.behaviorType) {
    case 'generator': return p.mode === 'once' ? `crea ${fmt(Number(p.amount ?? 0))} una vez` : `crea ${fmt(Number(p.amount ?? 0))}`;
    case 'filter': return p.mode === 'threshold' ? 'pasa si cumple' : `pasa el ${pctOf(p.passRatio)}`;
    case 'consumer': return p.mode === 'amount' ? `gasta ${fmt(Number(p.amount ?? 0))}` : `gasta el ${pctOf(p.ratio)}`;
    case 'reducer': return p.mode === 'amount' ? `se escapan ${fmt(Number(p.amount ?? 0))}` : `se escapa el ${pctOf(p.ratio)}`;
    case 'multiplier': return `×${fmt(Number(p.factor ?? 1))}`;
    case 'accelerator': return `×${fmt(Number(p.factor ?? 1))} de rápido`;
    case 'restrictor': return `caben ${fmt(Number(p.capacity ?? 0))}`;
    case 'diverter': return `desvía el ${pctOf(p.ratio)}`;
    case 'accumulator': return 'guarda';
    case 'releaser': return 'suelta lo guardado';
    case 'compensator': return 'remedio';
    case 'detector': return Number(p.threshold ?? 0) > 0 ? `avisa en ${fmt(Number(p.threshold))}` : 'vigila';
    case 'controller': return 'manda en otra';
    default: return 'cambia lo que pasa';
  }
}

export const MapNodeView = memo(function MapNodeView({ id, selected }: P) {
  const raw = useProject((s) => s.doc?.nodes[id]);
  const original = useProject((s) => (raw?.aliasOf ? s.doc?.nodes[raw.aliasOf] : undefined));
  const node = raw ? (original ? { ...original, id: raw.id, position: raw.position, dimensions: raw.dimensions } : raw) : undefined;
  const logicalId = raw?.aliasOf ?? id;
  const behaviors = useProject((s) => s.doc?.behaviors);
  const remedyCount = useProject((s) => (s.doc ? Object.values(s.doc.edges).filter((e) => e.targetNodeId === logicalId && e.type === 'causal' && e.behavior.influence.mode === 'compensate').length : 0));
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
  // dibujito y texto centrados salvo que se elija «a la izquierda» en Detalles
  const centered = vs.textAlign !== 'left';
  // 🔇 silenciada: se calcula como si no estuviera
  const muted = isMuted(node);
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
    opacity: dimmed ? 0.18 : muted ? 0.5 : inactive && view === 'simulation' ? 0.55 : 1,
    filter: muted ? 'grayscale(0.7)' : undefined,
    ['--pulse' as string]: ac,
  };
  const heatColor = heat ? HEAT_VAR[heat.state] : undefined;
  // chips: lo que pasa en la burbuja, con dibujito y palabras; al pulsarlos se abre ahí mismo
  const chips: Chip[] = [];
  if (!easy) {
    if (flowView) for (const b of bhs.slice(0, 3)) chips.push({ key: b!.id, e: BEHAVIOR_KID[b!.behaviorType].emoji, text: behaviorChip(b!), title: `${BEHAVIOR_KID[b!.behaviorType].name}: ${BEHAVIOR_KID[b!.behaviorType].hint} Pulsa para cambiarlo.`, feature: 'behaviors' });
    const inf = node.weight.influence;
    if (view !== 'mental' && inf && inf.mode !== 'qualitative' && inf.value !== 0) {
      const v = st ? st.influence : inf.value;
      chips.push(inf.value < 0
        ? { key: 'inf', e: '🪨', text: `frena ${fmtSigned(v)}`, tone: 'loss', title: 'Estorba a lo que tiene unido con «Influye». Pulsa para cambiarlo.', feature: 'influence' }
        : { key: 'inf', e: '💪', text: `ayuda ${fmtSigned(v)}`, tone: 'gain', title: 'Ayuda a lo que tiene unido con «Influye». Pulsa para cambiarlo.', feature: 'influence' });
    }
    if (view !== 'mental' && remedyCount > 0) chips.push({ key: 'rem', e: '🩹', text: remedyCount > 1 ? `${remedyCount} remedios` : 'con remedio', tone: 'gain', title: 'Tiene remedios que le quitan fuerza. Pulsa para verlos.', feature: 'remedies' });
    if (view !== 'mental' && node.activationConditionId) chips.push({ key: 'cond', e: '⏰', text: 'a veces', tone: 'cond', title: 'Solo funciona cuando se cumple una condición. Pulsa para verla.', feature: 'conditions' });
    if ((view === 'flow' || view === 'simulation') && st && (q > 0 || inQ > 0)) chips.push({ key: 'flow', e: node.type === 'input' ? '🌱' : node.type === 'output' ? '🎯' : '📥', text: `${fmt(q)}${unit && unit !== 'u' && unit !== 'u.' ? ` ${unit}` : ''} ${node.type === 'input' ? 'salen' : node.type === 'output' ? 'llegan' : 'pasan'}`, tone: 'flow', title: 'Lo que pasa por aquí en esta vuelta.', testId: 'node-flow' });
    if (view === 'energy' && st) {
      if ((st.generated.quantity ?? 0) > 0) chips.push({ key: 'gen', e: '✨', text: `+${fmt(st.generated.quantity)} nuevas`, tone: 'gain', title: 'Lo que se crea aquí en esta vuelta.' });
      if ((st.lost.quantity ?? 0) > 0) chips.push({ key: 'lost', e: '🕳️', text: `−${fmt(st.lost.quantity)} perdidas`, tone: 'loss', title: 'Lo que se pierde aquí en esta vuelta.' });
      if ((st.consumed.quantity ?? 0) > 0) chips.push({ key: 'cons', e: '🍽️', text: `${fmt(st.consumed.quantity)} gastadas`, tone: 'cond', title: 'Lo que se gasta aquí en esta vuelta.' });
    }
    if (showState && st?.blocked) chips.push({ key: 'blk', e: '⛔', text: 'corta el paso', tone: 'loss', title: 'Ahora no deja pasar nada.' });
    if (showState && st?.saturated) chips.push({ key: 'sat', e: '🚧', text: 'lleno', tone: 'cond', title: 'No caben más: los demás esperan o se pierden.' });
    if (showState && st && !st.active) chips.push({ key: 'off', e: '💤', text: 'apagada', tone: 'neutral', title: 'Ahora está apagada: no se cumple su condición.' });
    if (annCount > 0) chips.push({ key: 'ann', e: '💬', text: String(annCount), title: `${annCount} comentario(s). Pulsa para verlos.`, feature: 'comments' });
    if (raw.aliasOf) chips.push({ key: 'alias', e: '🔗', text: 'clon', title: 'Es la misma idea puesta en otro sitio: si cambias la original, cambia esta.' });
    if (raw.locked) chips.push({ key: 'lock', e: '🔒', text: 'bloqueada', title: 'No se mueve sin querer. Desbloquéala en «Más cosas».', feature: 'more' });
    if (node.branchCollapsed) chips.push({ key: 'fold', e: '🙈', text: 'hay más', title: 'Tiene cosas escondidas que cuelgan de ella.', feature: 'more' });
    if (showHeat && heat && (heat.state === 'warm' || heat.state === 'overheated' || heat.state === 'cold')) chips.push({ key: 'heat', e: '🌡️', text: HEAT_LABEL[heat.state].toLowerCase(), tone: heat.state === 'cold' ? 'flow' : 'cond', title: heat.causes.join(' · ') });
  }
  return (
    <div
      className={cx('mdf-pop group relative flex text-ink transition-[opacity,box-shadow] duration-200',
        shape === 'circle' || svgShape ? 'items-center justify-center text-center' : cx('flex-col', centered && 'justify-center'),
        view === 'simulation' && animate && st?.active && q > 0 && !dimmed && 'mdf-glow',
        stepActive && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--canvas)]')}
      style={style}
      data-testid="map-node"
      data-node-id={id}
      data-node-title={node.title}
    >
      <ShapeBg shape={shape} color={bg} border={selected ? 'var(--accent)' : bd} dashed={vs.borderStyle === 'dashed' ? '6 4' : vs.borderStyle === 'dotted' ? '1.5 3' : undefined} />
      <NodeResizer isVisible={selected && !raw.locked} minWidth={130} minHeight={44} color="var(--accent)"
        onResizeStart={() => useProject.getState().begin()}
        onResizeEnd={() => useProject.getState().end()} />
      {showHeat && heat && heat.state !== 'idle' && (
        <div className="absolute -left-[3px] top-2 bottom-2 w-[4px] rounded-full" style={{ background: heatColor }} title={`${HEAT_LABEL[heat.state]}: ${heat.causes.join(' · ')}`} aria-label={`Termómetro: ${HEAT_LABEL[heat.state]}`} />
      )}
      {vs.image && !svgShape && <img src={vs.image} alt="" className="w-full rounded-t-[13px] object-cover" style={{ maxHeight: dims ? '55%' : 110 }} draggable={false} />}
      <div className={cx('relative flex min-w-0 gap-2', centered ? 'items-center justify-center text-center' : 'items-start', shape === 'pill' ? 'px-4' : 'px-3.5', svgShape ? 'max-w-[70%] py-1' : 'py-3', shape === 'circle' && 'flex-col items-center')}>
        {Icon && <span className={cx('shrink-0', !centered && 'mt-[1px]')} style={{ color: ac }}><Icon className="size-4" strokeWidth={1.75} /></span>}
        {papel ? <span className="inline-flex shrink-0" title={PAPEL[papel].name} data-testid="node-papel" data-papel={papel}><Ico e={PAPEL[papel].emoji} size={17} /></span>
          : !Icon && isIO && <span className="inline-flex shrink-0" title={node.type === 'input' ? 'Inicio: de aquí sale lo que mueves' : 'Meta: aquí se cuenta lo que llega'}><Ico e={node.type === 'input' ? '🌱' : '🎯'} size={17} /></span>}
        {/* las palabras se cortan por sílabas (con guion), nunca letra a letra */}
        <InlineTitle node={raw.aliasOf ? { ...node, id: raw.aliasOf } : node} className={cx('min-w-0 whitespace-pre-wrap break-words hyphens-auto leading-snug', centered ? 'text-center' : 'flex-1', custom.hecho === '1' && 'text-ink-2')} />
        {(custom.primero === '1' || custom.hecho === '1' || custom.conseguido === '1') && (
          <span className="shrink-0 leading-snug" data-testid="node-marks" title={[custom.primero === '1' && 'Primer paso', custom.hecho === '1' && 'Hecho', custom.conseguido === '1' && '¡Conseguido!'].filter(Boolean).join(' · ')}>
            <span className="inline-flex gap-0.5">{custom.conseguido === '1' && <Ico e="🎉" size={15} />}{custom.primero === '1' && <Ico e="⭐" size={15} />}{custom.hecho === '1' && <Ico e="✅" size={15} />}</span>
          </span>
        )}
      </div>
      {node.description.trim() && !svgShape && (
        <p className={cx('relative -mt-2 line-clamp-4 whitespace-pre-wrap break-words hyphens-auto px-3.5 pb-2.5 leading-snug text-ink-2', centered && 'text-center')}
          style={{ fontSize: Math.max(10.5, Math.round(vs.fontSize * 0.82)), fontWeight: 400 }} data-testid="node-description">
          {node.description.trim()}
        </p>
      )}
      {!easy && chips.length > 0 && (
        <div className={cx('relative flex flex-wrap items-center gap-1 px-3 pb-2', (shape === 'circle' || svgShape || centered) && 'justify-center')} data-testid="node-chips">
          {chips.map((c) => (
            <button key={c.key} type="button" title={c.title} data-testid={c.testId}
              className={cx('nodrag nopan inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[10.5px] font-medium leading-tight transition-colors hover:border-accent', CHIP_TONE[c.tone ?? 'neutral'])}
              onPointerDown={(ev) => ev.stopPropagation()}
              onClick={(ev) => { ev.stopPropagation(); useUI.getState().setSelection([logicalId]); if (c.feature) useUI.setState({ actionFeature: { id: logicalId, feature: c.feature } }); }}>
              <Ico e={c.e} size={12} />{c.text}
            </button>
          ))}
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
      {muted && (
        <button type="button" className="nodrag nopan absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-line bg-surface text-[12px] shadow-sm hover:scale-110"
          title="Silenciada: ahora no cuenta. Pulsa para que vuelva a contar" aria-label="Volver a activarla" data-testid="node-unmute"
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); toggleMute(logicalId); }}>🔇</button>
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
