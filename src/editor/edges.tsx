/**
 * Conexiones. Código visual distinto por dimensión:
 *  - cantidad → grosor        - velocidad → velocidad de partículas
 *  - calidad → opacidad       - potencial → halo
 *  - pérdida → marcador rojo  - bloqueo → trazo discontinuo + icono
 * La representación nunca altera el cálculo.
 */
import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps, type Edge } from '@xyflow/react';
import { Ban, RotateCcw } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { qty } from '../engine/packet';
import { cx, fmt } from '../ui/primitives';
import { useHighlight } from './highlight';
import type { RFEdgeData } from './derive';

type P = EdgeProps<Edge<RFEdgeData>>;

const TYPE_COLOR = { flow: 'var(--flow)', causal: 'var(--transform)', informative: 'var(--concept)', conceptual: 'var(--concept)' } as const;

function selfLoopPath(sx: number, sy: number, tx: number, ty: number): [string, number, number] {
  const p = `M ${sx} ${sy} C ${sx + 90} ${sy}, ${tx} ${ty - 90}, ${tx} ${ty}`;
  return [p, (sx + tx) / 2 + 40, (sy + ty) / 2 - 50];
}

export const MapEdgeView = memo(function MapEdgeView(props: P) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, source, target, selected, data } = props;
  const edge = useProject((s) => s.doc?.edges[id]);
  const st = useSim((s) => s.result?.iterations[s.cursor]?.edges[id]);
  const stRev = useSim((s) => s.result?.iterations[s.cursor]?.edges[`${id}~rev`]);
  const isBack = useSim((s) => s.result?.backEdges.includes(id) ?? false);
  const view = useUI((s) => s.view);
  const animate = useUI((s) => s.animate);
  const particlesOn = useProject((s) => s.doc?.project.settings.animation.particles ?? true);
  const hl = useHighlight();
  if (!edge) return null;

  const parallel = data?.parallel ?? 0;
  const vs = edge.visualStyle;
  let path: string, lx: number, ly: number;
  const sameSide = vs.sourceAnchor === vs.targetAnchor && (vs.sourceAnchor === 'top' || vs.sourceAnchor === 'bottom') && source !== target && vs.pathType !== 'straight';
  if (source === target) [path, lx, ly] = selfLoopPath(sourceX, sourceY, targetX, targetY);
  else if (sameSide) {
    const dir = vs.sourceAnchor === 'top' ? -1 : 1;
    const k = (70 + Math.abs(targetX - sourceX) * 0.18 + parallel * 30) * dir;
    const edgeY = dir < 0 ? Math.min(sourceY, targetY) : Math.max(sourceY, targetY);
    path = `M ${sourceX} ${sourceY} C ${sourceX} ${edgeY + k}, ${targetX} ${edgeY + k}, ${targetX} ${targetY}`;
    lx = (sourceX + targetX) / 2;
    ly = edgeY + k * 0.75;
  }
  else if (vs.pathType === 'straight') [path, lx, ly] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  else if (vs.pathType === 'orthogonal') [path, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 10, offset: 18 + parallel * 12 });
  else [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.25 + parallel * 0.22 });

  const isFlow = edge.type === 'flow';
  const isCausal = edge.type === 'causal';
  const compensate = isCausal && edge.behavior.influence.mode === 'compensate';
  const negative = edge.behavior.polarity === 'negative';
  const q = (st ? qty(st.delivered) : 0) + (stRev ? qty(stRev.delivered) : 0);
  const active = !!(st?.active || stRev?.active);
  const blocked = !!st?.blocked;
  const dimmed = hl.active && !hl.edges.has(id);
  const traceInactive = hl.inactiveEdges.has(id);
  const flowViews = view === 'flow' || view === 'simulation';

  // color
  let color: string = vs.color ?? TYPE_COLOR[edge.type];
  if (view === 'mental') color = vs.color ?? 'var(--concept)';
  if (view === 'energy') {
    if (isFlow) color = (st?.lost ?? 0) > 1e-6 ? 'var(--loss)' : (st?.generated ?? 0) > 1e-6 ? 'var(--gain)' : 'var(--flow)';
    else if (isCausal) color = compensate ? 'var(--gain)' : negative ? 'var(--loss)' : 'var(--gain)';
  }
  if (view === 'system' && isCausal) color = compensate ? 'var(--gain)' : negative ? 'var(--loss)' : 'var(--transform)';
  if (blocked && view !== 'mental') color = 'var(--loss)';
  if (selected) color = 'var(--accent)';

  // grosor (cantidad)
  let width = vs.widthMode === 'manual' ? vs.width : isFlow ? 2 : 1.5;
  if (vs.widthMode === 'auto' && isFlow && view !== 'mental' && view !== 'system' && st) {
    width = q > 1e-9 ? 1.5 + 11 * Math.sqrt(q / Math.max(1e-9, hl.maxFlow)) : 1.2;
  }
  if (vs.widthMode === 'auto' && isCausal && (view === 'energy' || view === 'system') && st?.influenceFactor != null) {
    width = 1.5 + Math.min(5, Math.abs(st.influenceFactor - (compensate ? 0 : 1)) * 10);
  }

  // opacidad (calidad del flujo)
  const quality = st?.delivered.int.quality;
  let opacity = 1;
  if (flowViews && isFlow && quality != null) opacity = 0.45 + 0.55 * Math.max(0, Math.min(1, quality));
  if (!isFlow && (view === 'flow' || view === 'simulation')) opacity = 0.45;
  if (view === 'simulation' && isFlow && !active && st) opacity = 0.28;
  if (dimmed) opacity = 0.08;
  if (traceInactive) opacity = 0.3;

  const dash = blocked && view !== 'mental' ? '6 5'
    : view === 'simulation' && isFlow && st && !active ? '2 5'
      : vs.dash === 'dashed' ? '7 5' : vs.dash === 'dotted' ? '1.5 4' : undefined;

  const potential = st?.delivered.int.potential;
  const glow = flowViews && isFlow && active && potential != null && potential > 0.55 && !dimmed;
  const markerEnd = edge.direction === 'none' ? undefined : `url(#mdf-arrow-${markerKey(color)})`;
  const markerStart = edge.direction === 'both' ? `url(#mdf-arrow-start-${markerKey(color)})` : undefined;

  const speed = Math.max(0.15, st?.delivered.int.speed ?? 1);
  const showParticles = animate && particlesOn && flowViews && isFlow && active && q > 1e-6 && !dimmed && hl.particles.has(id);
  const nParticles = showParticles ? Math.max(1, Math.min(4, Math.round(1 + 3 * Math.sqrt(q / Math.max(1e-9, hl.maxFlow))))) : 0;
  const dur = 2.8 / speed;
  const lostAmt = st?.lost ?? 0;

  return (
    <>
      {glow && <path d={path} fill="none" stroke={color} strokeOpacity={0.18 * ((potential ?? 0.5) + 0.2)} strokeWidth={width + 8} strokeLinecap="round" style={{ filter: 'blur(3px)' }} />}
      <BaseEdge id={id} path={path} interactionWidth={18} markerEnd={markerEnd} markerStart={markerStart}
        style={{ stroke: color, strokeWidth: width, strokeOpacity: opacity, strokeDasharray: dash, strokeLinecap: 'round',
          animation: animate && view === 'simulation' && isFlow && active && !showParticles && hl.particles.size > 0 ? `mdf-dash ${1.2 / speed}s linear infinite` : undefined }} />
      {showParticles && Array.from({ length: nParticles }).map((_, i) => (
        <circle key={i} r={Math.min(4, 1.8 + width / 5)} fill={color} opacity={0.9}>
          <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={path} begin={`${(i * dur) / nParticles}s`} />
        </circle>
      ))}
      <EdgeLabelRenderer>
        <div className={cx('nodrag nopan pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 transition-opacity', dimmed && 'opacity-10')}
          style={{ left: lx, top: ly, zIndex: selected ? 10 : 2 }}>
          {vs.label && (view !== 'flow' || !st || q <= 0) && (
            <span className="rounded-md border border-line bg-surface/95 px-1.5 py-px text-[10.5px] font-medium text-ink-2 shadow-sm">{vs.label}</span>
          )}
          {view === 'system' && isCausal && (
            <span className={cx('rounded-full px-1.5 text-[10.5px] font-bold', compensate ? 'bg-[color-mix(in_srgb,var(--gain)_14%,transparent)] text-gain' : negative ? 'bg-[color-mix(in_srgb,var(--loss)_14%,transparent)] text-loss' : 'bg-[color-mix(in_srgb,var(--transform)_14%,transparent)] text-transform')}
              title={compensate ? 'Compensa' : negative ? 'Polaridad negativa' : 'Polaridad positiva'}>
              {compensate ? '⊕' : negative ? '−' : '+'}
            </span>
          )}
          {view === 'system' && edge.conditions.length > 0 && <span className="text-[11px] text-cond" title="Conexión condicionada">◆</span>}
          {flowViews && isFlow && st && q > 1e-6 && (
            <span className="rounded-md border border-line bg-surface/95 px-1.5 py-px text-[10.5px] font-semibold tabular text-flow shadow-sm" data-testid="edge-flow">{fmt(q)}</span>
          )}
          {view === 'energy' && lostAmt > 1e-6 && <span className="rounded-md bg-[color-mix(in_srgb,var(--loss)_14%,transparent)] px-1 text-[10.5px] font-semibold tabular text-loss" title="Pérdida en la conexión">−{fmt(lostAmt)}</span>}
          {blocked && view !== 'mental' && <span className="rounded-full bg-surface p-0.5 text-loss shadow-sm" title="Bloqueada por condición"><Ban className="size-3" /></span>}
          {(isBack || edge.behavior.isFeedback || edge.behavior.transport === 'replicate') && view !== 'mental' && (
            <span className="rounded-full bg-surface p-0.5 text-gain shadow-sm" title={edge.behavior.transport === 'replicate' ? 'Retroalimentación (réplica)' : 'Retorno: llega en la iteración siguiente'}><RotateCcw className="size-3" /></span>
          )}
          {edge.delay > 0 && view !== 'mental' && <span className="rounded-md bg-surface-2 px-1 text-[10px] tabular text-ink-3" title="Retardo en iteraciones">⏱{edge.delay}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

export const markerKey = (c: string) => c.replace(/[^a-z0-9]/gi, '');
export const MARKER_COLORS = ['var(--flow)', 'var(--transform)', 'var(--concept)', 'var(--gain)', 'var(--loss)', 'var(--accent)', 'var(--condition)'];

/** Definiciones SVG de puntas de flecha (una por color semántico). */
export function EdgeMarkers({ extra = [] }: { extra?: string[] }) {
  const colors = [...new Set([...MARKER_COLORS, ...extra])];
  return (
    <svg className="absolute size-0" aria-hidden>
      <defs>
        {colors.map((c) => (
          <g key={c}>
            <marker id={`mdf-arrow-${markerKey(c)}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M2,2 L10,6 L2,10 z" fill={c} />
            </marker>
            <marker id={`mdf-arrow-start-${markerKey(c)}`} viewBox="0 0 12 12" refX="2" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M10,2 L2,6 L10,10 z" fill={c} />
            </marker>
          </g>
        ))}
      </defs>
    </svg>
  );
}

export const EDGE_TYPES = { mapEdge: MapEdgeView };
