/**
 * Gráficos SVG ligeros. Reglas: un solo eje, trazos de 2px, marcas finas con
 * extremos redondeados, leyenda con ≥2 series + etiquetas directas, texto en
 * tinta (nunca del color de la serie), tooltip con cruceta en líneas.
 */
import { useMemo, useRef, useState } from 'react';
import { fmt } from './primitives';

export interface Series { id: string; label: string; color: string; values: number[]; dashed?: boolean }

export function LineChart({ series, height = 160, xLabel = 'Iteración', band, unit = '', testId }: {
  series: Series[]; height?: number; xLabel?: string; band?: { low: number[]; high: number[]; color: string }; unit?: string; testId?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { l: 40, r: series.length <= 4 ? 64 : 12, t: 10, b: 24 };
  const n = Math.max(1, ...series.map((s) => s.values.length));
  const all = [...series.flatMap((s) => s.values), ...(band ? [...band.low, ...band.high] : [])].filter(Number.isFinite);
  const max = Math.max(1e-9, ...all) * 1.08;
  const min = Math.min(0, ...all);
  const x = (i: number) => pad.l + (n <= 1 ? 0.5 : i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const ticks = useMemo(() => [0, 0.5, 1].map((t) => min + t * (max - min)), [min, max]);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  return (
    <div className="relative" data-testid={testId}>
      {series.length >= 2 && (
        <div className="mb-1 flex flex-wrap gap-3 text-[11px] text-ink-2">
          {series.map((s) => <span key={s.id} className="inline-flex items-center gap-1.5"><svg width="16" height="6" aria-hidden><line x1="1" y1="3" x2="15" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? '3 2' : undefined} strokeLinecap="round" /></svg>{s.label}</span>)}
        </div>
      )}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Gráfico: ${series.map((s) => s.label).join(', ')} por ${xLabel.toLowerCase()}`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-3)" className="tabular">{fmt(t, 0)}</text>
          </g>
        ))}
        {band && <path d={`${path(band.high)} ${band.low.map((_v, i) => `L${x(band.low.length - 1 - i).toFixed(1)},${y(band.low[band.low.length - 1 - i]).toFixed(1)}`).join(' ')} Z`} fill={band.color} opacity={0.12} />}
        {series.map((s) => <path key={s.id} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '5 4' : undefined} />)}
        {series.length <= 4 && series.map((s) => s.values.length > 0 && (
          <text key={s.id} x={x(s.values.length - 1) + 6} y={y(s.values[s.values.length - 1]) + 3.5} fontSize={10.5} fill="var(--text-2)" className="tabular">{fmt(s.values[s.values.length - 1])}</text>
        ))}
        {[0, n - 1].filter((val, i, a) => a.indexOf(val) === i).map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--text-3)">{i + 1}</text>)}
        <text x={(pad.l + W - pad.r) / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--text-3)">{xLabel}</text>
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--text-3)" strokeDasharray="3 3" />
            {series.map((s) => s.values[hover] != null && <circle key={s.id} cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
          </g>
        )}
        <rect x={0} y={0} width={W} height={H} fill="transparent" />
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-6 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] shadow-soft" style={{ left: `${Math.min(70, (x(hover) / W) * 100)}%` }}>
          <div className="mb-0.5 font-semibold text-ink">{xLabel} {hover + 1}</div>
          {series.map((s) => <div key={s.id} className="flex items-center gap-1.5 text-ink-2"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}: <b className="tabular text-ink">{fmt(s.values[hover])}{unit ? ` ${unit}` : ''}</b></div>)}
          {band && <div className="text-ink-3">Banda: {fmt(band.low[hover])} – {fmt(band.high[hover])}</div>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = 'var(--flow)', width = 120, height = 28, cursor }: { values: number[]; color?: string; width?: number; height?: number; cursor?: number }) {
  if (!values.length) return null;
  const max = Math.max(1e-9, ...values);
  const min = Math.min(0, ...values);
  const x = (i: number) => (values.length <= 1 ? width / 2 : (i / (values.length - 1)) * (width - 4) + 2);
  const y = (v: number) => 2 + (1 - (v - min) / (max - min || 1)) * (height - 4);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {cursor != null && values[cursor] != null && <circle cx={x(cursor)} cy={y(values[cursor])} r={3} fill={color} stroke="var(--surface)" strokeWidth={1.5} />}
    </svg>
  );
}

export interface BarItem { id: string; label: string; value: number; color: string; detail?: string; onClick?: () => void; badge?: string }

/** Barras horizontales para una sola magnitud (ranking). */
export function BarList({ items, unit = '', max: maxIn, signed, testId }: { items: BarItem[]; unit?: string; max?: number; signed?: boolean; testId?: string }) {
  const max = maxIn ?? Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="space-y-1.5" data-testid={testId}>
      {items.map((it) => (
        <li key={it.id}>
          <button type="button" onClick={it.onClick} disabled={!it.onClick} title={it.detail} className="group w-full text-left disabled:cursor-default">
            <div className="flex items-baseline gap-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate text-ink group-hover:underline">{it.label}</span>
              {it.badge && <span className="text-[10.5px] text-ink-3">{it.badge}</span>}
              <span className="tabular font-semibold text-ink">{signed && it.value > 0 ? '+' : ''}{fmt(it.value)}{unit ? ` ${unit}` : ''}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (Math.abs(it.value) / max) * 100)}%`, background: it.color }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
