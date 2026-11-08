/** Biblioteca de comportamientos: añadir, combinar, configurar (IF/ELSE, incertidumbre, efectos secundarios). */
import { useState } from 'react';
import { ChevronRight, Plus, Trash2, Power } from 'lucide-react';
import type { Behavior, BehaviorType } from '../core/model/schema';
import { BEHAVIOR_KID, BEHAVIOR_LIBRARY, BEHAVIOR_ORDER, FAMILY_LABEL, type ParamSpec } from '../core/model/behaviorLibrary';
import { newId } from '../core/model/factory';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { Badge, Button, Field, IconButton, Menu, NumberInput, Select, TextInput, Toggle, cx } from '../ui/primitives';
import { ConditionsList } from './ConditionEditor';
import { DimSelect, OverrideMark, useInspector, useParam } from './fields';
import { useUI } from '../store/uiStore';

export function behaviorSummary(b: Behavior, dimName: (id: string) => string): string {
  const p = b.parameters;
  const pc = (x: unknown) => `${Math.round(Number(x) * 100)}%`;
  const dims = (list: string[]) => (list.length ? list : ['quantity']).map(dimName).join(', ');
  switch (b.behaviorType) {
    case 'generator': return p.mode === 'once' ? `Crea ${p.amount ?? ''} una sola vez` : `Crea ${p.amount ?? ''} en cada ronda`;
    case 'filter': return p.mode === 'threshold' ? `Pasa si ${dimName(String(p.thresholdDimension))} ${p.operator} ${p.threshold}` : `Deja pasar ${pc(p.passRatio)}`;
    case 'reducer': return p.mode === 'amount' ? `Se escapan ${p.amount}` : `Se escapa el ${pc(p.ratio)}`;
    case 'consumer': return p.mode === 'amount' ? `Se come ${p.amount}` : `Se come el ${pc(p.ratio)}`;
    case 'multiplier': return `Multiplica ${dims(b.affectedDimensions)} por ${p.factor}`;
    case 'accelerator': return `Va ${p.factor} veces más rápido`;
    case 'transformer': return p.mode === 'convert' ? `Convierte el ${pc(p.ratio)} de ${dimName(String(p.from))} en ${dimName(String(p.to))}` : p.mode === 'scale' ? `Multiplica ${dims(b.affectedDimensions)} por ${p.factor}` : p.mode === 'set' ? `Pone ${dims(b.affectedDimensions)} en ${p.value}` : `Suma ${p.value} a ${dims(b.affectedDimensions)}`;
    case 'restrictor': return `Caben ${p.capacity} por ronda · los demás ${p.excess === 'queue' ? 'esperan' : p.excess === 'overflow' ? 'van por otro lado' : 'se pierden'}`;
    case 'diverter': return `Manda el ${pc(p.ratio)} por el desvío`;
    case 'accumulator': return `Guarda el ${pc(p.ratio)}${Number(p.maxStock) > 0 ? ` (caben ${p.maxStock})` : ''}`;
    case 'releaser': return p.mode === 'all' ? 'Suelta todo lo guardado' : p.mode === 'amount' ? `Suelta ${p.amount}` : `Suelta el ${pc(p.ratio)} de lo guardado`;
    case 'compensator': return `Funciona al ${pc(p.efficiency)}`;
    case 'detector': return `Mira ${p.metric === 'out' ? 'lo que sale' : p.metric === 'dim' ? 'otra cosa' : 'lo que le llega'}${Number(p.threshold) > 0 ? ` · avisa al llegar a ${p.threshold}` : ''}`;
    case 'controller': return `Cambia «${p.parameter}» (${p.mode === 'set' ? 'lo pone en' : p.mode === 'add' ? 'le suma' : 'lo multiplica por'} ${p.value})`;
  }
}

function ParamControl({ b, spec, base = 'parameters' }: { b: Behavior; spec: ParamSpec; base?: 'parameters' | 'elseParameters' }) {
  const { doc } = useInspector();
  const path = `${base}.${spec.key}`;
  const [v, set, o] = useParam<number | string | boolean | null>('behavior', b.id, path);
  const value = v ?? spec.default;
  const label = <span className="inline-flex items-center gap-1">{spec.label}<OverrideMark {...o} /></span>;
  switch (spec.kind) {
    case 'percent': return <Field label={label} help={spec.help}><NumberInput percent value={Number(value)} min={spec.min ?? 0} max={spec.max ?? 1} onChange={set} data-param={spec.key} /></Field>;
    case 'number': return <Field label={label} help={spec.help}><NumberInput value={Number(value)} min={spec.min} max={spec.max} step={spec.step} onChange={set} data-param={spec.key} /></Field>;
    case 'select': return <Field label={label} help={spec.help}><Select label={spec.label} value={String(value)} onChange={set} options={spec.options ?? []} /></Field>;
    case 'dimension': return <Field label={label} help={spec.help}><DimSelect label={spec.label} value={String(value)} onChange={set} /></Field>;
    case 'boolean': return <Field label={label} inline><Toggle label={spec.label} checked={!!value} onChange={set} /></Field>;
    case 'text': return <Field label={label} help={spec.help}><TextInput value={String(value ?? '')} onChange={set} /></Field>;
    case 'behavior': {
      const opts = Object.values(doc.behaviors).filter((x) => x.id !== b.id && x.behaviorType !== 'controller').map((x) => ({ value: x.id, label: `${doc.nodes[x.ownerId]?.title ?? '?'} · ${BEHAVIOR_KID[x.behaviorType].name}` }));
      return <Field label={label}><Select label={spec.label} value={String(value)} onChange={set} options={[{ value: '', label: '— elegir —' }, ...opts]} /></Field>;
    }
    default: return null;
  }
}

function visible(spec: ParamSpec, params: Behavior['parameters']) {
  if (!spec.showIf) return true;
  return spec.showIf.equals.includes(params[spec.showIf.key] as never);
}

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
  const kid = BEHAVIOR_KID[b.behaviorType];
  const numericParams = spec.params.filter((p) => p.kind === 'number' || p.kind === 'percent');
  return (
    <div className={cx('rounded-xl border border-line transition-colors', !enabled && 'opacity-60')} data-testid="behavior-card" data-behavior={b.behaviorType}>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronRight className={cx('size-3.5 shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[15px]" aria-hidden title={spec.label}>{kid.emoji}</span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-ink">{b.label || kid.name}</span>
            <span className="block truncate text-[11.5px] text-ink-3">{behaviorSummary(effB, dimName)}{b.conditions.length ? ' · solo a veces' : ''}{!enabled ? ' · apagado' : ''}</span>
          </span>
        </button>
        <IconButton size="xs" label={enabled ? 'Apagarlo un rato (sin borrarlo)' : 'Volver a encenderlo'} onClick={() => setEnabled(!enabled)}><Power className={cx('size-3', enabled ? 'text-gain' : 'text-ink-3')} /></IconButton>
        <IconButton size="xs" label="Quitar" variant="danger" onClick={() => A.apply((d) => op.removeBehavior(d, b.id))}><Trash2 className="size-3" /></IconButton>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 mdf-fade-in">
          <p className="rounded-lg bg-surface-2/70 px-2.5 py-2 text-[12px] leading-snug text-ink-2"><b className="text-ink">{kid.emoji} {kid.name}:</b> {kid.hint}</p>
          <div className="grid grid-cols-2 gap-2">{params.map((p) => <div key={p.key} className={p.kind === 'select' || p.kind === 'behavior' || p.kind === 'text' ? 'col-span-2' : ''}><ParamControl b={b} spec={p} /></div>)}</div>
          {depth === 'expert' && ['multiplier', 'reducer', 'transformer', 'accelerator', 'consumer'].includes(b.behaviorType) && (
            <Field label="¿A qué le afecta?" help="Elige qué cambia (cantidad, calidad…). Lo demás no se toca.">
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
          <Field label="Ponle un nombre (si quieres)" help="Por ejemplo: «Solo contestan algunos»."><TextInput value={b.label} onChange={(label) => update({ label })} placeholder={kid.name} /></Field>
          {depth === 'expert' && (
            <div className="space-y-2 rounded-lg bg-surface-2/60 p-2">
              <div className="text-[12px] font-semibold text-ink-2">⏰ ¿Solo a veces?</div>
              <p className="text-[11.5px] leading-snug text-ink-3">Si pones una condición, solo hará esto cuando se cumpla (por ejemplo, a partir de la ronda 4).</p>
              <ConditionsList ownerType="behavior" ownerId={b.id} ids={b.conditions} ownerNode={ownerNode} emptyText="Siempre lo hace." addLabel="Añadir «solo si…»" />
              {b.conditions.length > 0 && (
                <>
                  <Field label="Y si no se cumple…">
                    <Select label="Si no se cumple" value={b.elseMode} onChange={(elseMode) => update({ elseMode, elseParameters: elseMode === 'alternate' && !Object.keys(b.elseParameters).length ? { ...b.parameters } : b.elseParameters })}
                      options={[{ value: 'inactive', label: 'No hace nada' }, { value: 'alternate', label: 'Lo hace con otros números' }]} />
                  </Field>
                  {b.elseMode === 'alternate' && (
                    <div className="grid grid-cols-2 gap-2">{spec.params.filter((p) => (p.kind === 'number' || p.kind === 'percent') && visible(p, effB.parameters)).map((p) => <ParamControl key={p.key} b={b} spec={p} base="elseParameters" />)}</div>
                  )}
                </>
              )}
            </div>
          )}
          {depth === 'expert' && spec.params.length > 0 && (
            <Field label="Si hay varios iguales…" help="Por si esta idea tiene, por ejemplo, dos coladores.">
              <Select label="Regla de combinación" value={b.combinationRule} onChange={(combinationRule) => update({ combinationRule })}
                options={[{ value: 'sequential', label: 'Uno detrás de otro' }, { value: 'additive', label: 'Se suman' }, { value: 'multiplicative', label: 'Se multiplican' }, { value: 'max', label: 'Solo cuenta el mayor' }, { value: 'min', label: 'Solo cuenta el menor' }]} />
            </Field>
          )}
          {depth === 'expert' && numericParams.length > 0 && (
            <details className="rounded-lg border border-line p-2">
              <summary className="cursor-pointer text-[12px] font-semibold text-ink-2">🎲 ¿Y si sale mejor o peor?</summary>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-3">Pon cuánto sería si todo sale bien y si sale mal. Sirve para ver lo mejor y lo peor que puede pasar.</p>
              <div className="mt-1.5 grid grid-cols-[1fr_70px_70px] gap-1.5 text-[10.5px] font-semibold text-ink-3"><span /><span>Si sale bien</span><span>Si sale mal</span></div>
              <div className="mt-2 space-y-1.5">
                {numericParams.map((p) => {
                  const r = b.ranges[p.key];
                  return (
                    <div key={p.key} className="grid grid-cols-[1fr_70px_70px] items-center gap-1.5 text-[11px]">
                      <span className="text-ink-2">{p.label}</span>
                      <NumberInput aria-label="Favorable" percent={p.kind === 'percent'} value={r?.favorable ?? null} placeholder="bien" onChange={(v) => update({ ranges: { ...b.ranges, [p.key]: { favorable: v, unfavorable: r?.unfavorable ?? Number(b.parameters[p.key]) } } })} />
                      <NumberInput aria-label="Desfavorable" percent={p.kind === 'percent'} value={r?.unfavorable ?? null} placeholder="mal" onChange={(v) => update({ ranges: { ...b.ranges, [p.key]: { unfavorable: v, favorable: r?.favorable ?? Number(b.parameters[p.key]) } } })} />
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
      <div className="text-[12px] font-semibold text-ink-2">🌀 Otras cosas que provoca</div>
      <p className="text-[11.5px] leading-snug text-ink-3">Para apuntar lo bueno (+) o lo malo (−) que trae, aunque no cambie la cuenta.</p>
      {b.sideEffects.map((s) => (
        <div key={s.id} className="flex items-center gap-1.5 text-[11.5px]">
          <button type="button" className={cx('w-5 font-bold', s.polarity === 'positive' ? 'text-gain' : 'text-loss')} onClick={() => update(b.sideEffects.map((x) => (x.id === s.id ? { ...x, polarity: x.polarity === 'positive' ? 'negative' : 'positive' } : x)))} aria-label="Cambiar entre bueno (+) y malo (−)">{s.polarity === 'positive' ? '+' : '−'}</button>
          <span className="flex-1 text-ink-2">{s.description}</span>
          <IconButton size="xs" label="Quitar" onClick={() => update(b.sideEffects.filter((x) => x.id !== s.id))}><Trash2 className="size-3" /></IconButton>
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; update([...b.sideEffects, { id: newId('se'), description: text.trim(), polarity: 'negative', dimensionId: null }]); setText(''); }}>
        <TextInput value={text} onChange={setText} placeholder="Ej.: me cansa más · y pulsa Enter" aria-label="Nuevo efecto secundario" />
      </form>
    </div>
  );
}

export function AddBehaviorMenu({ nodeId, label = 'Añadir lo que hace' }: { nodeId: string; label?: string }) {
  const families = [...new Set(BEHAVIOR_ORDER.map((t) => BEHAVIOR_LIBRARY[t].family))];
  return (
    <Menu.Root>
      <Menu.Trigger asChild><Button size="sm" variant="outline" data-testid="add-behavior"><Plus className="size-3.5" />{label}</Button></Menu.Trigger>
      <Menu.Content>
        {families.map((f) => (
          <div key={f}>
            <Menu.Label>{FAMILY_LABEL[f]}</Menu.Label>
            {BEHAVIOR_ORDER.filter((t) => BEHAVIOR_LIBRARY[t].family === f).map((t: BehaviorType) => (
              <Menu.Item key={t} icon={<span className="text-[14px]" aria-hidden>{BEHAVIOR_KID[t].emoji}</span>} onSelect={() => { A.apply((d) => op.addBehavior(d, nodeId, t).doc); useUI.getState().notify(`${BEHAVIOR_KID[t].emoji} ${BEHAVIOR_KID[t].name}: añadido`, 'success'); }}>
                <span data-testid={`behavior-option-${t}`} className="flex max-w-[260px] flex-col leading-tight" title={BEHAVIOR_LIBRARY[t].label}>
                  <span>{BEHAVIOR_KID[t].name}</span>
                  <span className="text-[11px] text-ink-3">{BEHAVIOR_KID[t].hint}</span>
                </span>
              </Menu.Item>
            ))}
          </div>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}

export function BehaviorList({ nodeId }: { nodeId: string }) {
  const { doc } = useInspector();
  const node = doc.nodes[nodeId];
  const bhs = node.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  return (
    <div className="space-y-2">
      {bhs.length === 0 && <p className="text-[12px] leading-snug text-ink-3">Ahora no hace nada especial: lo que le llega, sigue igual. Si quieres que haga algo (colar, guardar, multiplicar…), pulsa «Añadir lo que hace».</p>}
      {bhs.map((b) => <BehaviorCard key={b.id} b={b} ownerNode={nodeId} />)}
      <AddBehaviorMenu nodeId={nodeId} />
    </div>
  );
}

export { NumberInput };
