/** Biblioteca de comportamientos: añadir, combinar, configurar (IF/ELSE, incertidumbre, efectos secundarios). */
import { useState } from 'react';
import { ChevronRight, Plus, Trash2, Power } from 'lucide-react';
import type { Behavior, BehaviorType } from '../core/model/schema';
import { BEHAVIOR_LIBRARY, BEHAVIOR_ORDER, FAMILY_LABEL, type ParamSpec } from '../core/model/behaviorLibrary';
import { newId } from '../core/model/factory';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { BehaviorIcon } from '../ui/behaviorIcon';
import { Badge, Button, Field, IconButton, Menu, NumberInput, Select, TextInput, Toggle, cx } from '../ui/primitives';
import { ConditionsList } from './ConditionEditor';
import { DimSelect, OverrideMark, useInspector, useParam } from './fields';
import { useUI } from '../store/uiStore';

export function behaviorSummary(b: Behavior, dimName: (id: string) => string): string {
  const p = b.parameters;
  const pc = (x: unknown) => `${Math.round(Number(x) * 100)}%`;
  switch (b.behaviorType) {
    case 'generator': return `Genera ${p.amount ?? ''} por ronda${p.mode === 'once' ? ' (pulso)' : ''}`;
    case 'filter': return p.mode === 'threshold' ? `Pasa si ${dimName(String(p.thresholdDimension))} ${p.operator} ${p.threshold}` : `Deja pasar ${pc(p.passRatio)}`;
    case 'reducer': return p.mode === 'amount' ? `Resta ${p.amount}` : `Reduce ${pc(p.ratio)}`;
    case 'consumer': return p.mode === 'amount' ? `Consume ${p.amount}` : `Consume ${pc(p.ratio)}`;
    case 'multiplier': return `× ${p.factor} sobre ${(b.affectedDimensions.length ? b.affectedDimensions : ['quantity']).map(dimName).join(', ')}`;
    case 'accelerator': return `Velocidad × ${p.factor}`;
    case 'transformer': return p.mode === 'convert' ? `Convierte ${pc(p.ratio)} de ${dimName(String(p.from))} en ${dimName(String(p.to))}` : p.mode === 'scale' ? `× ${p.factor} ${b.affectedDimensions.map(dimName).join(', ')}` : `${p.mode === 'set' ? 'Fija' : 'Suma'} ${p.value} a ${b.affectedDimensions.map(dimName).join(', ')}`;
    case 'restrictor': return `Capacidad ${p.capacity} · exceso: ${p.excess === 'queue' ? 'cola' : p.excess === 'overflow' ? 'desborde' : 'se pierde'}`;
    case 'diverter': return `Desvía ${pc(p.ratio)}`;
    case 'accumulator': return `Almacena ${pc(p.ratio)}${Number(p.maxStock) > 0 ? ` (máx. ${p.maxStock})` : ''}`;
    case 'releaser': return p.mode === 'all' ? 'Libera todo el stock' : p.mode === 'amount' ? `Libera ${p.amount}` : `Libera ${pc(p.ratio)} del stock`;
    case 'compensator': return `Eficacia ${pc(p.efficiency)}`;
    case 'detector': return `Mide ${p.metric}${Number(p.threshold) > 0 ? ` · avisa ≥ ${p.threshold}` : ''}`;
    case 'controller': return `Ajusta ${p.parameter} (${p.mode} ${p.value})`;
  }
}

function ParamControl({ b, spec, base = 'parameters' }: { b: Behavior; spec: ParamSpec; base?: 'parameters' | 'elseParameters' }) {
  const { doc } = useInspector();
  const path = `${base}.${spec.key}`;
  const [v, set, o] = useParam<number | string | boolean | null>('behavior', b.id, path);
  const value = v ?? spec.default;
  const label = <span className="inline-flex items-center gap-1">{spec.label}<OverrideMark {...o} /></span>;
  switch (spec.kind) {
    case 'percent': return <Field label={label} hint={spec.help}><NumberInput percent value={Number(value)} min={spec.min ?? 0} max={spec.max ?? 1} onChange={set} data-param={spec.key} /></Field>;
    case 'number': return <Field label={label} hint={spec.help}><NumberInput value={Number(value)} min={spec.min} max={spec.max} step={spec.step} onChange={set} data-param={spec.key} /></Field>;
    case 'select': return <Field label={label}><Select label={spec.label} value={String(value)} onChange={set} options={spec.options ?? []} /></Field>;
    case 'dimension': return <Field label={label}><DimSelect label={spec.label} value={String(value)} onChange={set} /></Field>;
    case 'boolean': return <Field label={label} inline><Toggle label={spec.label} checked={!!value} onChange={set} /></Field>;
    case 'text': return <Field label={label}><TextInput value={String(value ?? '')} onChange={set} /></Field>;
    case 'behavior': {
      const opts = Object.values(doc.behaviors).filter((x) => x.id !== b.id && x.behaviorType !== 'controller').map((x) => ({ value: x.id, label: `${doc.nodes[x.ownerId]?.title ?? '?'} · ${BEHAVIOR_LIBRARY[x.behaviorType].label}` }));
      return <Field label={label}><Select label={spec.label} value={String(value)} onChange={set} options={[{ value: '', label: '— elegir —' }, ...opts]} /></Field>;
    }
    default: return null;
  }
}

function visible(spec: ParamSpec, params: Behavior['parameters']) {
  if (!spec.showIf) return true;
  return spec.showIf.equals.includes(params[spec.showIf.key] as never);
}

/** Nombres sencillos de los comportamientos que se ofrecen en el nivel 2 («Movimiento»). */
export const KID_BEHAVIOR: Partial<Record<BehaviorType, { label: string; hint: string }>> = {
  filter: { label: 'Colador', hint: 'Solo pasa una parte de lo que llega.' },
  restrictor: { label: 'Límite', hint: 'Solo caben unos cuantos en cada ronda; el resto espera o se pierde.' },
  reducer: { label: 'Se escapa algo', hint: 'Por el camino se pierde un poco.' },
  multiplier: { label: 'Multiplica', hint: 'Lo que llega se hace más grande.' },
  accumulator: { label: 'Hucha', hint: 'Lo va guardando para más adelante.' },
  releaser: { label: 'Suelta lo guardado', hint: 'Saca lo que había en la hucha.' },
};
const KID_ORDER: BehaviorType[] = ['filter', 'restrictor', 'reducer', 'multiplier', 'accumulator', 'releaser'];

function BehaviorCard({ b, ownerNode }: { b: Behavior; ownerNode: string }) {
  const { eff, doc } = useInspector();
  const depth = doc.project.settings.depth;
  const [open, setOpen] = useState(false);
  const effB = eff.behaviors[b.id] ?? b;
  const spec = BEHAVIOR_LIBRARY[b.behaviorType];
  const dimName = (id: string) => doc.dimensions[id]?.name ?? id;
  const [enabled, setEnabled] = useParam<boolean>('behavior', b.id, 'enabled');
  const update = (patch: Partial<Behavior>) => A.apply((d) => op.updateBehavior(d, b.id, patch));
  const params = spec.params.filter((p) => visible(p, effB.parameters) && (depth === 'expert' || !p.advanced));
  const kid = depth !== 'expert' ? KID_BEHAVIOR[b.behaviorType] : undefined;
  const numericParams = spec.params.filter((p) => p.kind === 'number' || p.kind === 'percent');
  return (
    <div className={cx('rounded-xl border border-line transition-colors', !enabled && 'opacity-60')} data-testid="behavior-card" data-behavior={b.behaviorType}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronRight className={cx('size-3.5 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2"><BehaviorIcon type={b.behaviorType} className="size-3.5" /></span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-medium text-ink">{b.label || kid?.label || spec.label}</span>
            <span className="block truncate text-[11px] text-ink-3">{behaviorSummary(effB, dimName)}{b.conditions.length ? ' · condicionado' : ''}</span>
          </span>
        </button>
        <IconButton size="xs" label={enabled ? 'Desactivar' : 'Activar'} onClick={() => setEnabled(!enabled)}><Power className={cx('size-3', enabled ? 'text-gain' : 'text-ink-3')} /></IconButton>
        <IconButton size="xs" label="Eliminar comportamiento" variant="danger" onClick={() => A.apply((d) => op.removeBehavior(d, b.id))}><Trash2 className="size-3" /></IconButton>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 mdf-fade-in">
          <p className="text-[11.5px] leading-snug text-ink-3">{kid?.hint ?? spec.description}</p>
          <div className="grid grid-cols-2 gap-2">{params.map((p) => <div key={p.key} className={p.kind === 'select' || p.kind === 'behavior' || p.kind === 'text' ? 'col-span-2' : ''}><ParamControl b={b} spec={p} /></div>)}</div>
          {depth === 'expert' && ['multiplier', 'reducer', 'transformer', 'accelerator', 'consumer'].includes(b.behaviorType) && (
            <Field label="Dimensiones afectadas" hint="las demás no cambian">
              <div className="flex flex-wrap gap-1">
                {Object.values(doc.dimensions).map((d) => {
                  const on = (b.affectedDimensions.length ? b.affectedDimensions : spec.defaultDimensions).includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => update({ affectedDimensions: on ? b.affectedDimensions.filter((x) => x !== d.id) : [...(b.affectedDimensions.length ? b.affectedDimensions : spec.defaultDimensions), d.id] })}>
                      <Badge tone={on ? 'accent' : 'neutral'}>{d.name}</Badge>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label="Nombre propio"><TextInput value={b.label} onChange={(label) => update({ label })} placeholder={spec.label} /></Field>
          {depth === 'expert' && (
            <div className="space-y-2 rounded-lg bg-surface-2/60 p-2">
              <div className="text-[11px] font-semibold text-ink-2">SI … (condiciones)</div>
              <ConditionsList ownerType="behavior" ownerId={b.id} ids={b.conditions} ownerNode={ownerNode} emptyText="Siempre activo." addLabel="Añadir SI" />
              {b.conditions.length > 0 && (
                <>
                  <Field label="SI NO">
                    <Select label="Si no se cumple" value={b.elseMode} onChange={(elseMode) => update({ elseMode, elseParameters: elseMode === 'alternate' && !Object.keys(b.elseParameters).length ? { ...b.parameters } : b.elseParameters })}
                      options={[{ value: 'inactive', label: 'No actúa' }, { value: 'alternate', label: 'Actúa con otros valores' }]} />
                  </Field>
                  {b.elseMode === 'alternate' && (
                    <div className="grid grid-cols-2 gap-2">{spec.params.filter((p) => (p.kind === 'number' || p.kind === 'percent') && visible(p, effB.parameters)).map((p) => <ParamControl key={p.key} b={b} spec={p} base="elseParameters" />)}</div>
                  )}
                </>
              )}
            </div>
          )}
          {depth === 'expert' && spec.params.length > 0 && (
            <Field label="Combinación con otros del mismo tipo">
              <Select label="Regla de combinación" value={b.combinationRule} onChange={(combinationRule) => update({ combinationRule })}
                options={[{ value: 'sequential', label: 'Encadenada (uno tras otro)' }, { value: 'additive', label: 'Aditiva' }, { value: 'multiplicative', label: 'Multiplicativa' }, { value: 'max', label: 'El mayor' }, { value: 'min', label: 'El menor' }]} />
            </Field>
          )}
          {depth === 'expert' && numericParams.length > 0 && (
            <details className="rounded-lg border border-line p-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-ink-2">Incertidumbre (escenario favorable / desfavorable)</summary>
              <div className="mt-2 space-y-1.5">
                {numericParams.map((p) => {
                  const r = b.ranges[p.key];
                  return (
                    <div key={p.key} className="grid grid-cols-[1fr_70px_70px] items-center gap-1.5 text-[11px]">
                      <span className="text-ink-2">{p.label}</span>
                      <NumberInput aria-label="Favorable" percent={p.kind === 'percent'} value={r?.favorable ?? null} placeholder="fav." onChange={(v) => update({ ranges: { ...b.ranges, [p.key]: { favorable: v, unfavorable: r?.unfavorable ?? Number(b.parameters[p.key]) } } })} />
                      <NumberInput aria-label="Desfavorable" percent={p.kind === 'percent'} value={r?.unfavorable ?? null} placeholder="desf." onChange={(v) => update({ ranges: { ...b.ranges, [p.key]: { unfavorable: v, favorable: r?.favorable ?? Number(b.parameters[p.key]) } } })} />
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          <SideEffects b={b} />
        </div>
      )}
    </div>
  );
}

function SideEffects({ b }: { b: Behavior }) {
  const [text, setText] = useState('');
  const update = (sideEffects: Behavior['sideEffects']) => A.apply((d) => op.updateBehavior(d, b.id, { sideEffects }));
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-ink-2">Efectos secundarios</div>
      {b.sideEffects.map((s) => (
        <div key={s.id} className="flex items-center gap-1.5 text-[11.5px]">
          <button type="button" className={cx('w-5 font-bold', s.polarity === 'positive' ? 'text-gain' : 'text-loss')} onClick={() => update(b.sideEffects.map((x) => (x.id === s.id ? { ...x, polarity: x.polarity === 'positive' ? 'negative' : 'positive' } : x)))} aria-label="Cambiar polaridad">{s.polarity === 'positive' ? '+' : '−'}</button>
          <span className="flex-1 text-ink-2">{s.description}</span>
          <IconButton size="xs" label="Quitar" onClick={() => update(b.sideEffects.filter((x) => x.id !== s.id))}><Trash2 className="size-3" /></IconButton>
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; update([...b.sideEffects, { id: newId('se'), description: text.trim(), polarity: 'negative', dimensionId: null }]); setText(''); }}>
        <TextInput value={text} onChange={setText} placeholder="Ej.: consume tiempo del operador" aria-label="Nuevo efecto secundario" />
      </form>
    </div>
  );
}

export function AddBehaviorMenu({ nodeId, label = 'Añadir comportamiento', simple }: { nodeId: string; label?: string; simple?: boolean }) {
  const families = [...new Set(BEHAVIOR_ORDER.map((t) => BEHAVIOR_LIBRARY[t].family))];
  if (simple) {
    return (
      <Menu.Root>
        <Menu.Trigger asChild><Button size="sm" variant="outline" data-testid="add-behavior"><Plus className="size-3.5" />{label}</Button></Menu.Trigger>
        <Menu.Content>
          <Menu.Label>¿Qué pasa en este paso?</Menu.Label>
          {KID_ORDER.map((t) => (
            <Menu.Item key={t} icon={<BehaviorIcon type={t} />} onSelect={() => { A.apply((d) => op.addBehavior(d, nodeId, t).doc); useUI.getState().notify(`${KID_BEHAVIOR[t]!.label}: hecho`, 'success'); }}>
              <span data-testid={`behavior-option-${t}`} className="flex flex-col leading-tight"><span>{KID_BEHAVIOR[t]!.label}</span><span className="text-[11px] text-ink-3">{KID_BEHAVIOR[t]!.hint}</span></span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    );
  }
  return (
    <Menu.Root>
      <Menu.Trigger asChild><Button size="sm" variant="outline" data-testid="add-behavior"><Plus className="size-3.5" />{label}</Button></Menu.Trigger>
      <Menu.Content>
        {families.map((f) => (
          <div key={f}>
            <Menu.Label>{FAMILY_LABEL[f]}</Menu.Label>
            {BEHAVIOR_ORDER.filter((t) => BEHAVIOR_LIBRARY[t].family === f).map((t: BehaviorType) => (
              <Menu.Item key={t} icon={<BehaviorIcon type={t} />} onSelect={() => { A.apply((d) => op.addBehavior(d, nodeId, t).doc); useUI.getState().notify(`${BEHAVIOR_LIBRARY[t].label} añadido`, 'success'); }}>
                <span data-testid={`behavior-option-${t}`}>{BEHAVIOR_LIBRARY[t].label}</span>
              </Menu.Item>
            ))}
          </div>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}

export function BehaviorList({ nodeId, simple }: { nodeId: string; simple?: boolean }) {
  const { doc } = useInspector();
  const node = doc.nodes[nodeId];
  const bhs = node.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  return (
    <div className="space-y-2">
      {bhs.length === 0 && <p className="text-[12px] text-ink-3">{simple ? 'Aquí no pasa nada especial: todo lo que llega, sigue adelante.' : 'Sin comportamiento: el elemento es conceptual o deja pasar el flujo sin cambios.'}</p>}
      {bhs.map((b) => <BehaviorCard key={b.id} b={b} ownerNode={nodeId} />)}
      <AddBehaviorMenu nodeId={nodeId} simple={simple} label={simple ? '¿Qué pasa aquí?' : undefined} />
    </div>
  );
}

export { NumberInput };
