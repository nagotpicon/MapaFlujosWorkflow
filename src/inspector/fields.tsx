/** Campos del inspector conscientes del escenario activo. */
import { createContext, useContext, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { EntityKind, ProjectDoc, ScaleValue } from '../core/model/schema';
import { getPath } from '../core/model/paths';
import * as op from '../core/operations';
import { findOverride } from '../engine/scenario';
import { findScale } from '../engine/scales';
import * as A from '../app/actions';
import { Field, NumberInput, Segmented, Select, Slider, Tip, cx } from '../ui/primitives';
import { useProject } from '../store/projectStore';

export interface InspectorCtx { doc: ProjectDoc; eff: ProjectDoc; scenarioIsBase: boolean }
export const InspectorContext = createContext<InspectorCtx | null>(null);
export const useInspector = () => useContext(InspectorContext)!;

/** Lee el valor efectivo (con escenario) y escribe de forma consciente del escenario. */
export function useParam<T>(kind: EntityKind, id: string, path: string): [T, (v: T) => void, { overridden: boolean; reset: () => void }] {
  const { eff, doc } = useInspector();
  const coll = eff[collection(kind)] as Record<string, unknown>;
  const value = getPath(coll[id], path) as T;
  const s = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  const overridden = !!s && !s.isBase && s.overrides.some((o) => o.targetType === kind && o.targetId === id && (o.path === path || o.path.startsWith(`${path}.`) || path.startsWith(`${o.path}.`)));
  void findOverride;
  const set = (v: T) => A.apply((d) => op.setParam(d, kind, id, path, v), `${kind}:${id}:${path}`);
  const reset = () => s && A.apply((d) => op.clearOverride(d, s.id, kind, id, path));
  return [value, set, { overridden, reset }];
}

function collection(kind: EntityKind): keyof ProjectDoc {
  return ({ node: 'nodes', edge: 'edges', behavior: 'behaviors', condition: 'conditions', circuit: 'circuits', port: 'ports' } as const)[kind];
}

export function OverrideMark({ overridden, reset }: { overridden: boolean; reset: () => void }) {
  const scenario = useProject((s) => (s.doc?.project.activeScenarioId ? s.doc.scenarios[s.doc.project.activeScenarioId] : undefined));
  if (!overridden) return null;
  return (
    <Tip label={`Modificado en «${scenario?.name}». Restaurar el valor base`}>
      <button type="button" onClick={reset} className="inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-medium text-accent-text hover:bg-accent-soft" data-testid="override-mark">
        <span className="size-1.5 rounded-full bg-accent" /><RotateCcw className="size-2.5" />
      </button>
    </Tip>
  );
}

export function ParamNumber({ kind, id, path, label, hint, percent, min, max, step, suffix }: {
  kind: EntityKind; id: string; path: string; label: ReactNode; hint?: string; percent?: boolean; min?: number; max?: number; step?: number; suffix?: string;
}) {
  const [v, set, o] = useParam<number | null>(kind, id, path);
  return (
    <Field label={<span className="inline-flex items-center gap-1">{label}<OverrideMark {...o} /></span>} hint={hint}>
      <NumberInput value={v ?? null} onChange={set} percent={percent} min={min} max={max} step={step} suffix={suffix} data-param={path} />
    </Field>
  );
}

export function ParamSelect<T extends string>({ kind, id, path, label, options, hint }: { kind: EntityKind; id: string; path: string; label: ReactNode; options: { value: T; label: string }[]; hint?: string }) {
  const [v, set, o] = useParam<T>(kind, id, path);
  return (
    <Field label={<span className="inline-flex items-center gap-1">{label}<OverrideMark {...o} /></span>} hint={hint}>
      <Select value={v} onChange={set} options={options} label={typeof label === 'string' ? label : undefined} />
    </Field>
  );
}

export function NodeSelect({ value, onChange, exclude, label, allowNone }: { value: string | null; onChange: (id: string) => void; exclude?: string[]; label: string; allowNone?: boolean }) {
  const { doc } = useInspector();
  const opts = Object.values(doc.nodes).filter((n) => !['note', 'label', 'comment'].includes(n.type) && !exclude?.includes(n.id))
    .sort((a, b) => a.title.localeCompare(b.title, 'es')).map((n) => ({ value: n.id, label: n.title || 'Sin título' }));
  return <Select label={label} value={value ?? ''} onChange={onChange} options={[...(allowNone || !value ? [{ value: '', label: '— elegir —' }] : []), ...opts]} />;
}

export function DimSelect({ value, onChange, label, includeInfluence }: { value: string; onChange: (v: string) => void; label: string; includeInfluence?: boolean }) {
  const { doc } = useInspector();
  const opts = Object.values(doc.dimensions).map((d) => ({ value: d.id, label: d.name }));
  if (includeInfluence) opts.push({ value: '__influence', label: 'Influencia del nodo' });
  return <Select label={label} value={value} onChange={onChange} options={opts} />;
}

/** Editor de un valor en escala cualitativa, ponderada o numérica. */
export function ScaleValueEditor({ value, onChange, label, allowNull = true }: { value: ScaleValue | null; onChange: (v: ScaleValue | null) => void; label: string; allowNull?: boolean }) {
  const { doc } = useInspector();
  const ws = doc.project.settings.weightedScale;
  const scale = findScale(doc.project.settings, value?.scaleId ?? null);
  const mode = value?.mode ?? 'none';
  const setMode = (m: string) => {
    if (m === 'none') return onChange(null);
    if (m === 'qualitative') return onChange({ mode: 'qualitative', value: Math.floor(scale.levels.length / 2), scaleId: scale.id });
    if (m === 'weighted') return onChange({ mode: 'weighted', value: value?.mode === 'weighted' ? value.value : 0, scaleId: null });
    return onChange({ mode: 'numeric', value: value?.value ?? 0, scaleId: null });
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-ink-2">{label}</span>
        <Segmented size="xs" label={`Modo de ${label}`} value={mode} onChange={setMode}
          options={[...(allowNull ? [{ value: 'none', label: '—', title: 'Sin valor' }] : []), { value: 'qualitative', label: 'Cual.', title: 'Cualitativa' }, { value: 'weighted', label: 'Pond.', title: `Ponderada ${ws.min}…${ws.max}` }, { value: 'numeric', label: 'Núm.', title: 'Numérica' }]} />
      </div>
      {value?.mode === 'qualitative' && (
        <div className="flex gap-1">
          {scale.levels.map((l, i) => (
            <button key={l.label} type="button" onClick={() => onChange({ ...value, value: i, scaleId: scale.id })}
              className={cx('h-6 flex-1 rounded-md text-[10.5px] font-medium transition-colors', Math.round(value.value) === i ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink-3 hover:text-ink')} title={l.label}>
              {l.label}
            </button>
          ))}
        </div>
      )}
      {value?.mode === 'weighted' && (
        <div className="flex items-center gap-2">
          <span className="w-6 text-right text-[10px] text-ink-3">{ws.min}</span>
          <div className="flex-1"><Slider label={label} value={value.value} min={ws.min} max={ws.max} step={0.5} onChange={(v) => onChange({ ...value, value: v })} /></div>
          <span className="w-6 text-[10px] text-ink-3">+{ws.max}</span>
          <span className={cx('w-9 rounded-md px-1 text-center text-[12px] font-semibold tabular', value.value < 0 ? 'text-loss' : value.value > 0 ? 'text-gain' : 'text-ink-3')} data-testid={`scale-${label}`}>
            {value.value > 0 ? '+' : ''}{value.value}
          </span>
        </div>
      )}
      {value?.mode === 'numeric' && <NumberInput value={value.value} onChange={(v) => onChange({ ...value, value: v })} step={0.1} />}
      {value?.mode === 'qualitative' && <p className="text-[10.5px] text-ink-3">≈ Para simular se interpreta como {(scale.levels[Math.round(value.value)]?.value * ws.max).toFixed(1)} (aproximación configurable en Ajustes).</p>}
    </div>
  );
}

export function KV({ k, v, tone }: { k: ReactNode; v: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="text-ink-3">{k}</span>
      <span className={cx('tabular font-medium text-ink', tone)}>{v}</span>
    </div>
  );
}
