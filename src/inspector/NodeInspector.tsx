/** Inspector de burbujas: identidad y resumen visibles; el detalle se despliega bajo demanda. */
import {
  Activity, Boxes, Diamond, Download, FileUp, Fingerprint, Gauge, ImagePlus, Link2, Lock, MessageSquare, Paintbrush, Plus, Route,
  ScanSearch, ShieldCheck, Sliders, Trash2, Waypoints, Workflow, Compass, Thermometer,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DimensionValue, MapNode } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import * as repo from '../persistence/repository';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { qty } from '../engine/packet';
import { HEAT_LABEL } from '../engine/heat';
import { BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import { NODE_COLORS, NODE_ICONS, COLOR_LABEL } from '../ui/icons';
import { Badge, Button, Field, IconButton, NumberInput, Popover, Section, Segmented, Select, TextArea, TextInput, Toggle, cx, fmt } from '../ui/primitives';
import { Annotations } from './Annotations';
import { BehaviorList } from './BehaviorEditor';
import { ConditionsList } from './ConditionEditor';
import { KV, NodeSelect, OverrideMark, ScaleValueEditor, useInspector, useParam } from './fields';
import { download } from '../app/io';

const TYPE_LABEL: Record<MapNode['type'], string> = {
  bubble: 'Burbuja', input: 'Entrada', output: 'Salida', note: 'Nota', label: 'Etiqueta', comment: 'Comentario', group: 'Grupo', container: 'Contenedor',
};

function Identity({ n }: { n: MapNode }) {
  const upd = (patch: Partial<MapNode>, key?: string) => A.apply((d) => op.updateNode(d, n.id, patch), key);
  const [tag, setTag] = useState('');
  return (
    <div className="space-y-2.5">
      <Field label="Nombre"><TextInput value={n.title} onChange={(title) => upd({ title }, `title-${n.id}`)} data-testid="inspector-title" /></Field>
      <Field label="Descripción"><TextArea rows={2} value={n.description} onChange={(description) => upd({ description }, `desc-${n.id}`)} placeholder="Qué representa, por qué existe…" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tipo">
          <Select label="Tipo" value={n.type} onChange={(type) => upd({ type })} options={(['bubble', 'input', 'output', 'note', 'label', 'group', 'container'] as const).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
        </Field>
        <Field label="Categoría"><TextInput value={n.metadata.category} onChange={(category) => upd({ metadata: { ...n.metadata, category } }, `cat-${n.id}`)} placeholder="p.ej. Operativa" /></Field>
      </div>
      <Field label="Etiquetas">
        <div className="flex flex-wrap items-center gap-1">
          {n.tags.map((t) => (
            <button key={t} type="button" onClick={() => upd({ tags: n.tags.filter((x) => x !== t) })} title="Quitar etiqueta"><Badge tone="accent">#{t} ×</Badge></button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (tag.trim()) upd({ tags: [...new Set([...n.tags, tag.trim()])] }); setTag(''); }} className="min-w-24 flex-1">
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ etiqueta" aria-label="Añadir etiqueta" className="h-6 w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3" data-testid="tag-input" />
          </form>
        </div>
      </Field>
      <Field label="Grado de confianza">
        <Segmented size="xs" label="Confianza" value={n.metadata.confidence} onChange={(confidence) => upd({ metadata: { ...n.metadata, confidence } })}
          options={[{ value: 'hypothesis', label: 'Hipótesis' }, { value: 'estimate', label: 'Estimación' }, { value: 'observation', label: 'Observado' }, { value: 'verified', label: 'Verificado' }]} />
      </Field>
    </div>
  );
}

function SimSummary({ n }: { n: MapNode }) {
  const st = useSim((s) => s.result?.iterations[s.cursor]?.nodes[n.aliasOf ?? n.id]);
  const heat = useSim((s) => s.heat?.nodes[n.aliasOf ?? n.id]?.[s.cursor]);
  const cursor = useSim((s) => s.cursor);
  const { doc } = useInspector();
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  const unit = doc.dimensions.quantity?.unit ?? '';
  return (
    <div className="space-y-2 rounded-xl bg-surface-2/70 p-2.5" data-testid="node-summary">
      <div className="flex flex-wrap gap-1">
        {bhs.length ? bhs.map((b) => <Badge key={b.id} tone={['reducer', 'consumer', 'restrictor'].includes(b.behaviorType) ? 'loss' : ['multiplier', 'generator', 'compensator'].includes(b.behaviorType) ? 'gain' : 'transform'}>{b.label || BEHAVIOR_LIBRARY[b.behaviorType].label}</Badge>)
          : <span className="text-[11px] text-ink-3">Elemento conceptual (sin comportamiento)</span>}
        {n.weight.influence && <Badge tone={n.weight.influence.value < 0 && n.weight.influence.mode !== 'qualitative' ? 'loss' : 'gain'}>influencia {n.weight.influence.mode === 'qualitative' ? '≈' : ''}{n.weight.influence.mode !== 'qualitative' && n.weight.influence.value > 0 ? '+' : ''}{n.weight.influence.mode === 'qualitative' ? '' : n.weight.influence.value}</Badge>}
        {n.activationConditionId && <Badge tone="cond"><Diamond className="size-2.5" />condicionado</Badge>}
      </div>
      {st && (
        <div className="space-y-1 border-t border-line pt-2">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Iteración {cursor + 1}</div>
          <KV k="Entra" v={`${fmt(qty(st.in))} ${unit}`} />
          <KV k={n.type === 'output' ? 'Resultado' : 'Sale'} v={`${fmt(Math.max(qty(st.out), qty(st.terminal)))} ${unit}`} tone="text-flow" />
          {(st.generated.quantity ?? 0) > 0 && <KV k="Generado" v={`+${fmt(st.generated.quantity)}`} tone="text-gain" />}
          {(st.lost.quantity ?? 0) > 0 && <KV k="Perdido" v={`−${fmt(st.lost.quantity)}`} tone="text-loss" />}
          {(st.consumed.quantity ?? 0) > 0 && <KV k="Consumido" v={fmt(st.consumed.quantity)} />}
          {(st.stock.quantity ?? 0) > 0 && <KV k="Stock" v={fmt(st.stock.quantity)} tone="text-cond" />}
          {(st.queue.quantity ?? 0) > 0 && <KV k="En cola" v={fmt(st.queue.quantity)} tone="text-cond" />}
          {st.compensation > 0 && <KV k="Compensado" v={`${Math.round(st.compensation * 100)} %`} tone="text-gain" />}
          {n.weight.influence && <KV k="Influencia neta" v={fmt(st.influence)} tone={st.influence < 0 ? 'text-loss' : 'text-gain'} />}
          {Object.entries(st.out.int).concat(Object.entries(st.terminal.int)).slice(0, 4).map(([d, v]) => <KV key={d} k={doc.dimensions[d]?.name ?? d} v={fmt(v, 2)} />)}
          <div className="flex flex-wrap gap-1 pt-1">{st.flags.filter((f) => !['receiving', 'emitting'].includes(f)).map((f) => <Badge key={f}>{FLAG[f] ?? f}</Badge>)}</div>
          {heat && heat.state !== 'idle' && <div className="flex items-start gap-1.5 pt-1 text-[11px] text-ink-2"><Thermometer className="mt-0.5 size-3.5 text-ink-3" /><span><b>{HEAT_LABEL[heat.state]}</b> · {heat.causes.join(' · ')}</span></div>}
        </div>
      )}
      <div className="flex flex-wrap gap-1 pt-1">
        <Button size="xs" variant="subtle" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'forward', isolate: false } })} data-testid="trace-forward"><Route className="size-3" />Rastrear adelante</Button>
        <Button size="xs" variant="subtle" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'backward', isolate: false } })} data-testid="trace-backward"><ScanSearch className="size-3" />Rastrear atrás</Button>
        <Button size="xs" variant="subtle" onClick={() => { useUI.setState({ focusNodeId: n.id }); A.fit([n.id]); }}><Compass className="size-3" />Enfocar</Button>
      </div>
    </div>
  );
}

const FLAG: Record<string, string> = {
  active: 'activo', inactive: 'inactivo', loss: 'pérdida', blocked: 'bloqueo', transforming: 'transformación', saturated: 'saturación',
  accumulating: 'acumulación', compensated: 'compensación', generating: 'generación', terminal: 'final',
};

function Weights({ n }: { n: MapNode }) {
  const [imp, setImp, o1] = useParam<MapNode['weight']['importance']>('node', n.id, 'weight.importance');
  const [inf, setInf, o2] = useParam<MapNode['weight']['influence']>('node', n.id, 'weight.influence');
  const [impact, setImpact] = useParam<MapNode['weight']['impact']>('node', n.id, 'weight.impact');
  const [src, setSrc] = useParam<MapNode['influenceSource']>('node', n.id, 'influenceSource');
  const [ref, setRef] = useParam<number>('node', n.id, 'influenceReference');
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-ink-3"><b className="text-ink-2">Importancia</b>: cuánto interesa atenderlo. <b className="text-ink-2">Influencia</b>: cuánto modifica a otros (positiva, negativa o neutra; la usa el motor). <b className="text-ink-2">Impacto</b>: tu expectativa sobre el resultado (el monitor calcula el real).</p>
      <div className="flex items-center gap-1"><div className="flex-1"><ScaleValueEditor label="Importancia" value={imp} onChange={setImp} /></div><OverrideMark {...o1} /></div>
      <div className="flex items-center gap-1"><div className="flex-1"><ScaleValueEditor label="Influencia" value={inf} onChange={setInf} /></div><OverrideMark {...o2} /></div>
      <ScaleValueEditor label="Impacto esperado" value={impact} onChange={setImpact} />
      {inf && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="La influencia depende de">
            <Select label="Origen de la influencia" value={src} onChange={setSrc} options={[{ value: 'static', label: 'Su peso (fijo)' }, { value: 'throughput', label: 'El flujo que recibe' }, { value: 'stock', label: 'Su stock' }]} />
          </Field>
          {src !== 'static' && <Field label="Flujo de referencia" hint="influencia máxima"><NumberInput value={ref} min={0.0001} onChange={setRef} /></Field>}
        </div>
      )}
    </div>
  );
}

function DimensionValues({ n }: { n: MapNode }) {
  const { doc, eff } = useInspector();
  const dv = eff.nodes[n.id]?.dimensionValues ?? {};
  const isGen = n.behaviorIds.some((b) => doc.behaviors[b]?.behaviorType === 'generator');
  const setDim = (dim: string, patch: Partial<DimensionValue>) => {
    const cur: DimensionValue = dv[dim] ?? { value: doc.dimensions[dim]?.defaultValue ?? 0, mode: 'numeric', unit: doc.dimensions[dim]?.unit ?? '', confidence: 'estimate', source: '', range: null };
    A.apply((d) => op.setParam(d, 'node', n.id, `dimensionValues.${dim}`, { ...cur, ...patch }), `dv-${n.id}-${dim}`);
  };
  return (
    <div className="space-y-2">
      {!isGen && <p className="text-[11px] text-ink-3">Estas dimensiones se usan cuando el elemento genera flujo (entrada o generador).</p>}
      {Object.values(doc.dimensions).map((d) => {
        const v = dv[d.id];
        return (
          <div key={d.id} className="rounded-lg border border-line p-2" data-testid={`dim-${d.id}`}>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: d.color }} />
              <span className="flex-1 text-[12px] font-medium text-ink">{d.name}{d.unit ? <span className="text-ink-3"> · {d.unit}</span> : null}</span>
              {v ? (
                <IconButton size="xs" label="Quitar valor" onClick={() => { const next = { ...dv }; delete next[d.id]; A.apply((x) => op.setParam(x, 'node', n.id, 'dimensionValues', next)); }}><Trash2 className="size-3" /></IconButton>
              ) : (
                <Button size="xs" variant="subtle" onClick={() => setDim(d.id, {})}><Plus className="size-3" />Definir</Button>
              )}
            </div>
            {v && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Segmented size="xs" label="Modo" value={v.mode} onChange={(mode) => setDim(d.id, { mode, value: mode === 'qualitative' ? 2 : v.value })}
                    options={[{ value: 'numeric', label: 'Núm.' }, { value: 'weighted', label: 'Pond.' }, { value: 'qualitative', label: 'Cual.' }]} />
                  {v.mode === 'qualitative' ? (
                    <Select label="Nivel" className="flex-1" value={String(Math.round(v.value))} onChange={(x) => setDim(d.id, { value: Number(x) })}
                      options={(doc.project.settings.qualitativeScales.find((s) => s.id === (d.scaleId ?? doc.project.settings.defaultScaleId)) ?? doc.project.settings.qualitativeScales[0]).levels.map((l, i) => ({ value: String(i), label: l.label }))} />
                  ) : (
                    <NumberInput className="flex-1" value={v.value} onChange={(value) => setDim(d.id, { value })} data-param={`dim-${d.id}`} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Select label="Confianza" value={v.confidence} onChange={(confidence) => setDim(d.id, { confidence })}
                    options={[{ value: 'hypothesis', label: 'Hipótesis' }, { value: 'estimate', label: 'Estimación' }, { value: 'observation', label: 'Observado' }, { value: 'verified', label: 'Verificado' }]} />
                  <TextInput value={v.source} onChange={(source) => setDim(d.id, { source })} placeholder="Origen del dato" />
                </div>
                {doc.project.settings.depth === 'expert' && v.mode !== 'qualitative' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    Rango
                    <NumberInput className="flex-1" value={v.range?.low ?? null} placeholder="bajo" onChange={(low) => setDim(d.id, { range: { low, high: v.range?.high ?? v.value } })} />
                    <NumberInput className="flex-1" value={v.range?.high ?? null} placeholder="alto" onChange={(high) => setDim(d.id, { range: { high, low: v.range?.low ?? v.value } })} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Mitigators({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const [comb, setComb] = useParam<MapNode['mitigationCombination']>('node', n.id, 'mitigationCombination');
  const [pick, setPick] = useState<string>('');
  const edges = Object.values(doc.edges).filter((e) => e.targetNodeId === n.id && e.type === 'causal' && e.behavior.influence.mode === 'compensate');
  const addMitigator = (sourceId: string | null) => {
    A.apply((d) => {
      let out = d;
      let src = sourceId;
      if (!src) {
        const r = op.addNode(out, 'bubble', { title: 'Medida compensatoria', position: { x: n.position.x - 40, y: n.position.y - 140 }, parentId: n.parentId, visualStyle: { color: 'emerald', icon: 'ShieldCheck' } as never });
        out = r.doc;
        src = r.id;
      }
      return op.addEdge(out, src, n.id, 'causal', { behavior: { influence: { mode: 'compensate', compensationUnit: 'points', amount: 1 } as never }, visualStyle: { label: 'mitiga', sourceAnchor: 'bottom', targetAnchor: 'top' } }).doc;
    });
    setPick('');
  };
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-ink-3">Medidas que reducen el efecto negativo de este elemento (su influencia negativa y sus pérdidas).</p>
      {edges.map((e) => <MitigatorRow key={e.id} edgeId={e.id} />)}
      {edges.length > 1 && (
        <Field label={<span className="inline-flex items-center gap-1">Cómo se combinan varias medidas</span>}>
          <Select label="Combinación" value={comb} onChange={setComb} options={[{ value: 'additive', label: 'Se suman' }, { value: 'max', label: 'Solo cuenta la mayor' }, { value: 'diminishing', label: 'Rendimientos decrecientes (se solapan)' }]} />
        </Field>
      )}
      <div className="flex gap-1.5">
        <div className="flex-1"><NodeSelect label="Medida existente" value={pick || null} allowNone onChange={setPick} exclude={[n.id]} /></div>
        <Button size="sm" variant="outline" disabled={!pick} onClick={() => addMitigator(pick)}>Vincular</Button>
      </div>
      <Button size="sm" variant="subtle" onClick={() => addMitigator(null)} data-testid="add-mitigator"><ShieldCheck className="size-3.5" />Nueva medida compensatoria</Button>
    </div>
  );
}

function MitigatorRow({ edgeId }: { edgeId: string }) {
  const { doc } = useInspector();
  const e = doc.edges[edgeId];
  const [type, setType] = useParam<string>('edge', edgeId, 'behavior.influence.compensationType');
  const [unit, setUnit] = useParam<string>('edge', edgeId, 'behavior.influence.compensationUnit');
  const [amount, setAmount, o] = useParam<number>('edge', edgeId, 'behavior.influence.amount');
  const [from, setFrom] = useParam<number>('edge', edgeId, 'behavior.influence.fromIteration');
  const [to, setTo] = useParam<number | null>('edge', edgeId, 'behavior.influence.toIteration');
  return (
    <div className="space-y-1.5 rounded-lg border border-line p-2" data-testid="mitigator-row">
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-gain" />
        <button type="button" className="flex-1 truncate text-left text-[12px] font-medium text-ink hover:underline" onClick={() => useUI.getState().setSelection([e.sourceNodeId])}>{doc.nodes[e.sourceNodeId]?.title}</button>
        <OverrideMark {...o} />
        <IconButton size="xs" label="Quitar medida" variant="danger" onClick={() => A.apply((d) => op.deleteElements(d, [], [edgeId]))}><Trash2 className="size-3" /></IconButton>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Select label="Tipo de compensación" value={type} onChange={setType} options={[{ value: 'partial', label: 'Parcial' }, { value: 'total', label: 'Total' }, { value: 'conditional', label: 'Condicionada' }, { value: 'temporal', label: 'Temporal' }]} />
        {type !== 'total' && (
          <div className="flex gap-1">
            <NumberInput className="flex-1" value={amount} min={0} onChange={setAmount} data-param="compensation-amount" />
            <Select label="Unidad" className="w-16" value={unit} onChange={setUnit} options={[{ value: 'points', label: 'pt' }, { value: 'percent', label: '%' }]} />
          </div>
        )}
      </div>
      {type === 'temporal' && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">De la iteración<NumberInput className="w-14" value={from} min={1} onChange={(v) => setFrom(Math.round(v))} />a<NumberInput className="w-14" value={to} placeholder="∞" min={1} onChange={(v) => setTo(Math.round(v))} /></div>
      )}
      {type === 'conditional' && <ConditionsList ownerType="edge" ownerId={edgeId} ids={e.conditions} ownerNode={e.sourceNodeId} emptyText="Añade la condición que activa la compensación." />}
    </div>
  );
}

function Relations({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const ins = Object.values(doc.edges).filter((e) => e.targetNodeId === n.id);
  const outs = Object.values(doc.edges).filter((e) => e.sourceNodeId === n.id);
  const row = (eid: string, other: string, dir: '←' | '→', type: string) => (
    <button key={eid} type="button" onClick={() => useUI.getState().setSelection([], [eid])} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-surface-2">
      <span className="text-ink-3">{dir}</span><span className="flex-1 truncate text-ink">{doc.nodes[other]?.title}</span><Badge>{type}</Badge>
    </button>
  );
  const T: Record<string, string> = { flow: 'flujo', causal: 'causal', conceptual: 'idea', informative: 'info' };
  return (
    <div className="space-y-0.5">
      {!ins.length && !outs.length && <p className="text-[11.5px] text-ink-3">Sin conexiones. Arrastra desde un punto del borde para conectar.</p>}
      {ins.map((e) => row(e.id, e.sourceNodeId, '←', T[e.type]))}
      {outs.map((e) => row(e.id, e.targetNodeId, '→', T[e.type]))}
    </div>
  );
}

function Routing({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const [rule, setRule, o1] = useParam<MapNode['convergence']['rule']>('node', n.id, 'convergence.rule');
  const [overlap, setOverlap] = useParam<number>('node', n.id, 'convergence.overlap');
  const [formula, setFormula] = useParam<string>('node', n.id, 'convergence.formula');
  const [mode, setMode, o2] = useParam<MapNode['split']['mode']>('node', n.id, 'split.mode');
  const [dyn, setDyn] = useParam<string | null>('node', n.id, 'split.dynamicSourceNodeId');
  const [inactiveMode, setInactiveMode] = useParam<MapNode['inactiveMode']>('node', n.id, 'inactiveMode');
  const outs = Object.values(doc.edges).filter((e) => e.sourceNodeId === n.id && e.type === 'flow' && e.behavior.transport === 'transfer' && e.behavior.role === 'main');
  const ins = Object.values(doc.edges).filter((e) => e.targetNodeId === n.id && e.type === 'flow');
  const expert = doc.project.settings.depth === 'expert';
  return (
    <div className="space-y-3">
      <Field label={<span className="inline-flex items-center gap-1">Convergencia (cuando llegan varios flujos) <OverrideMark {...o1} /></span>} hint={`${ins.length} entradas`}>
        <Select label="Convergencia" value={rule} onChange={setRule} options={[
          { value: 'sum', label: 'Suma' }, { value: 'weighted', label: 'Combinación ponderada' }, { value: 'priority', label: 'Prioridad' }, { value: 'max', label: 'Máximo' },
          { value: 'min', label: 'Mínimo' }, { value: 'dedupe', label: 'Deduplicación (misma entidad)' }, ...(expert ? [{ value: 'custom' as const, label: 'Fórmula personalizada' }] : []),
        ]} />
      </Field>
      {rule === 'dedupe' && <Field label="Solapamiento entre rutas" hint="100% = son la misma oportunidad"><NumberInput percent value={overlap} min={0} max={1} onChange={setOverlap} /></Field>}
      {rule === 'custom' && <Field label="Fórmula" hint="in1, in2…, sum, max, min, count"><TextInput value={formula} onChange={setFormula} className="font-mono" /></Field>}
      <Field label={<span className="inline-flex items-center gap-1">Bifurcación (reparto entre salidas) <OverrideMark {...o2} /></span>} hint={`${outs.length} salidas principales`}>
        <Select label="Reparto" value={mode} onChange={setMode} options={[
          { value: 'proportional', label: 'Proporcional al peso' }, { value: 'fixed', label: 'Porcentajes fijos' }, { value: 'conditional', label: 'Condicionado' },
          { value: 'priority', label: 'Prioritario (llena por orden)' }, { value: 'competitive', label: 'Competitivo (por capacidad)' }, { value: 'dynamic', label: 'Dinámico (según influencia)' },
        ]} />
      </Field>
      {mode === 'dynamic' && <Field label="Influencia que reparte"><NodeSelect label="Nodo de referencia" value={dyn} onChange={setDyn} exclude={[n.id]} /></Field>}
      {outs.length > 0 && (
        <div className="space-y-1 rounded-lg bg-surface-2/70 p-2">
          {outs.map((e) => <ShareRow key={e.id} edgeId={e.id} mode={mode} />)}
        </div>
      )}
      <Field label="Si el elemento está inactivo">
        <Segmented size="xs" label="Modo inactivo" value={inactiveMode} onChange={setInactiveMode} options={[{ value: 'passthrough', label: 'Deja pasar' }, { value: 'block', label: 'Bloquea' }]} />
      </Field>
    </div>
  );
}

function ShareRow({ edgeId, mode }: { edgeId: string; mode: string }) {
  const { doc } = useInspector();
  const e = doc.edges[edgeId];
  const path = mode === 'fixed' ? 'behavior.share' : mode === 'priority' ? 'behavior.priority' : 'behavior.weight';
  const [v, set, o] = useParam<number>('edge', edgeId, path);
  if (mode === 'conditional') return <div className="text-[11px] text-ink-3">→ {doc.nodes[e.targetNodeId]?.title}: {e.conditions.length ? 'con condición' : 'sin condición (añádela en la conexión)'}</div>;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="flex-1 truncate text-ink-2">→ {doc.nodes[e.targetNodeId]?.title}</span>
      <OverrideMark {...o} />
      <NumberInput className="w-20" value={v} min={0} onChange={set} suffix={mode === 'fixed' ? '%' : mode === 'priority' ? '#' : '×'} />
    </div>
  );
}

function StyleSection({ n }: { n: MapNode }) {
  const upd = (patch: Partial<MapNode['visualStyle']>) => A.apply((d) => op.updateNode(d, n.id, { visualStyle: { ...d.nodes[n.id].visualStyle, ...patch } }));
  const Icon = n.visualStyle.icon ? NODE_ICONS[n.visualStyle.icon] : null;
  const onImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 1.5e6) { useUI.getState().notify('La imagen supera 1,5 MB', 'error'); return; }
      const r = new FileReader();
      r.onload = () => upd({ image: String(r.result) });
      r.readAsDataURL(f);
    };
    input.click();
  };
  return (
    <div className="space-y-3">
      <Field label="Forma">
        <Segmented size="xs" label="Forma" value={n.visualStyle.shape} onChange={(shape) => upd({ shape })}
          options={[{ value: 'rounded', label: 'Burbuja' }, { value: 'pill', label: 'Píldora' }, { value: 'rect', label: 'Recto' }, { value: 'circle', label: 'Círculo' }, { value: 'diamond', label: 'Rombo' }, { value: 'hexagon', label: 'Hex.' }]} />
      </Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-1.5">
          {NODE_COLORS.map((c) => (
            <button key={c} type="button" aria-label={COLOR_LABEL[c]} title={COLOR_LABEL[c]} onClick={() => upd({ color: c })}
              className={cx('size-6 rounded-full border-2 transition-transform hover:scale-110', n.visualStyle.color === c ? 'border-accent' : 'border-transparent')} style={{ background: `var(--n-${c}-ac)` }} />
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fondo propio">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color de fondo" value={n.visualStyle.background ?? '#ffffff'} onChange={(e) => upd({ background: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" />
            {n.visualStyle.background && <button type="button" className="text-[11px] text-ink-3 underline" onClick={() => upd({ background: null })}>quitar</button>}
          </div>
        </Field>
        <Field label="Borde">
          <Select label="Borde" value={n.visualStyle.borderStyle} onChange={(borderStyle) => upd({ borderStyle })} options={[{ value: 'solid', label: 'Continuo' }, { value: 'dashed', label: 'Discontinuo' }, { value: 'dotted', label: 'Punteado' }, { value: 'none', label: 'Sin borde' }]} />
        </Field>
        <Field label="Tipografía">
          <Select label="Tipografía" value={n.visualStyle.fontFamily} onChange={(fontFamily) => upd({ fontFamily })} options={[{ value: 'sans', label: 'Sans' }, { value: 'serif', label: 'Serif' }, { value: 'mono', label: 'Mono' }]} />
        </Field>
        <Field label="Tamaño / peso">
          <div className="flex gap-1">
            <NumberInput value={n.visualStyle.fontSize} min={9} max={48} onChange={(fontSize) => upd({ fontSize })} />
            <Select label="Peso" value={String(n.visualStyle.fontWeight)} onChange={(w) => upd({ fontWeight: Number(w) })} options={[{ value: '400', label: 'Normal' }, { value: '500', label: 'Medio' }, { value: '650', label: 'Fuerte' }]} />
          </div>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover className="w-72" trigger={<Button size="sm" variant="outline">{Icon ? <Icon className="size-3.5" /> : <Paintbrush className="size-3.5" />}Icono</Button>}>
          <div className="grid grid-cols-8 gap-1">
            <button type="button" className="col-span-2 rounded-md text-[11px] text-ink-3 hover:bg-surface-2" onClick={() => upd({ icon: null })}>Ninguno</button>
            {Object.entries(NODE_ICONS).map(([name, I]) => (
              <button key={name} type="button" title={name} aria-label={name} onClick={() => upd({ icon: name })} className={cx('flex size-7 items-center justify-center rounded-md hover:bg-surface-2', n.visualStyle.icon === name && 'bg-accent-soft text-accent-text')}><I className="size-4" /></button>
            ))}
          </div>
        </Popover>
        <Button size="sm" variant="outline" onClick={onImage}><ImagePlus className="size-3.5" />Imagen</Button>
        {n.visualStyle.image && <Button size="sm" variant="ghost" onClick={() => upd({ image: null })}>Quitar imagen</Button>}
        {n.dimensions && <Button size="sm" variant="ghost" onClick={() => A.apply((d) => op.updateNode(d, n.id, { dimensions: null }))}>Tamaño automático</Button>}
      </div>
    </div>
  );
}

function Attachments({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const [rows, setRows] = useState<{ id: string; name: string; size: number }[]>([]);
  const ids = n.metadata.attachmentIds;
  useEffect(() => { void Promise.all(ids.map((id) => repo.getAttachment(id))).then((r) => setRows(r.filter(Boolean).map((a) => ({ id: a!.id, name: a!.name, size: a!.size })))); }, [ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      if (f.size > 20e6) { useUI.getState().notify('El archivo supera 20 MB', 'error'); return; }
      const a = await repo.addAttachment(doc.project.id, n.id, f);
      A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, attachmentIds: [...d.nodes[n.id].metadata.attachmentIds, a.id] } }));
    };
    input.click();
  };
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-1.5 text-[12px]">
          <span className="flex-1 truncate text-ink">{r.name}</span><span className="text-[10.5px] text-ink-3">{Math.ceil(r.size / 1024)} KB</span>
          <IconButton size="xs" label="Descargar" onClick={async () => { const a = await repo.getAttachment(r.id); if (a) download(a.blob, a.name); }}><Download className="size-3" /></IconButton>
          <IconButton size="xs" label="Eliminar adjunto" variant="danger" onClick={async () => { await repo.deleteAttachment(r.id); A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, attachmentIds: d.nodes[n.id].metadata.attachmentIds.filter((x) => x !== r.id) } })); }}><Trash2 className="size-3" /></IconButton>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><FileUp className="size-3.5" />Adjuntar documento</Button>
    </div>
  );
}

function Advanced({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const upd = (patch: Partial<MapNode>) => A.apply((d) => op.updateNode(d, n.id, patch));
  const ports = n.portIds.map((p) => doc.ports[p]).filter(Boolean);
  return (
    <div className="space-y-3">
      <Field label="Bloqueado" inline><Toggle label="Bloqueado" checked={n.locked} onChange={(locked) => upd({ locked })} /></Field>
      <Field label="Rama plegada" inline><Toggle label="Rama plegada" checked={n.branchCollapsed} onChange={(branchCollapsed) => upd({ branchCollapsed })} /></Field>
      <Field label="Capas">
        <div className="flex flex-wrap gap-1">
          {Object.values(doc.layers).sort((a, b) => a.order - b.order).map((l) => {
            const on = n.layerIds.includes(l.id);
            return <button key={l.id} type="button" onClick={() => A.apply((d) => op.setNodeLayers(d, [n.id], l.id, !on))}><Badge tone={on ? 'accent' : 'neutral'}><span className="size-1.5 rounded-full" style={{ background: l.color }} />{l.name}</Badge></button>;
          })}
        </div>
      </Field>
      {doc.project.settings.depth === 'expert' && (
        <Field label="Puertos" hint="entradas y salidas lógicas">
          <div className="space-y-1">
            {ports.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5 text-[11.5px]">
                <Badge>{p.direction === 'in' ? 'entra' : p.direction === 'out' ? 'sale' : 'e/s'}</Badge>
                <input aria-label="Nombre del puerto" className="h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-ink outline-none focus:bg-surface-2" value={p.name} onChange={(e) => A.apply((d) => ({ ...d, ports: { ...d.ports, [p.id]: { ...p, name: e.target.value } } }), `port-${p.id}`)} />
                <NumberInput className="w-20" value={p.capacity} placeholder="cap. ∞" min={0} onChange={(capacity) => A.apply((d) => op.setParam(d, 'port', p.id, 'capacity', capacity))} />
              </div>
            ))}
            <Button size="xs" variant="ghost" onClick={() => A.apply((d) => { const id = `pt_${Math.random().toString(36).slice(2, 10)}`; return { ...d, ports: { ...d.ports, [id]: { id, nodeId: n.id, name: `Puerto ${ports.length + 1}`, direction: 'in', supportedDimensions: null, capacity: null, configuration: {} } }, nodes: { ...d.nodes, [n.id]: { ...d.nodes[n.id], portIds: [...d.nodes[n.id].portIds, id] } } }; })}><Plus className="size-3" />Puerto</Button>
          </div>
        </Field>
      )}
      <Field label="Documentación / enlaces"><TextArea rows={2} value={n.metadata.documentation} onChange={(documentation) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, documentation } }), `doc-${n.id}`)} placeholder="Referencias, enlaces, fuentes…" /></Field>
      <div className="text-[10.5px] text-ink-3">ID: <span className="font-mono">{n.id}</span> · creado {new Date(n.createdAt).toLocaleString('es-ES')}</div>
    </div>
  );
}

function DiscoveryBlock({ n }: { n: MapNode }) {
  const disc = n.metadata.discovery;
  if (!disc) return null;
  const upd = (patch: Partial<NonNullable<MapNode['metadata']['discovery']>>) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, discovery: { ...d.nodes[n.id].metadata.discovery!, ...patch } } }));
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--transform)_45%,transparent)] bg-[color-mix(in_srgb,var(--transform)_5%,transparent)] p-2.5" data-testid="discovery-block">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-transform"><Fingerprint className="size-3.5" />{disc.origin === 'ai' ? 'Propuesto por IA' : disc.origin === 'template' ? 'Propuesto por plantilla' : 'Descubrimiento'} · {disc.status === 'confirmed' ? 'confirmado' : disc.status === 'rejected' ? 'descartado' : 'sin confirmar'}</div>
      <div className="flex gap-1">
        <Button size="xs" variant={disc.status === 'confirmed' ? 'solid' : 'subtle'} onClick={() => upd({ status: 'confirmed' })}>Confirmar</Button>
        <Button size="xs" variant="subtle" onClick={() => upd({ status: 'suggested' })}>Dudoso</Button>
        <Button size="xs" variant="danger" onClick={() => A.apply((d) => op.deleteElements(d, [n.id], []))}>Descartar</Button>
      </div>
      {(disc.role === 'friction' || disc.frictionCategory) && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <Select label="Categoría" value={disc.frictionCategory ?? 'external'} onChange={(frictionCategory) => upd({ frictionCategory })} options={[{ value: 'personal', label: 'Fricción propia' }, { value: 'external', label: 'Fricción externa' }, { value: 'system', label: 'Fricción del sistema' }]} />
            <Select label="Control" value={disc.controllability ?? 'partial'} onChange={(controllability) => upd({ controllability })} options={[{ value: 'direct', label: 'Control directo' }, { value: 'partial', label: 'Influencia parcial' }, { value: 'external', label: 'Dependencia externa' }, { value: 'uncontrollable', label: 'Incontrolable' }]} />
          </div>
          <Field label="¿Qué hacemos con ella?">
            <Segmented size="xs" label="Resolución" value={disc.resolution} onChange={(resolution) => upd({ resolution })}
              options={[{ value: 'pending', label: 'Pendiente' }, { value: 'eliminate', label: 'Eliminar' }, { value: 'accept', label: 'Convivir' }, { value: 'compensate', label: 'Compensar' }, { value: 'reroute', label: 'Otra ruta' }]} />
          </Field>
          {disc.resolution === 'compensate' && <p className="text-[11px] text-ink-3">Añade abajo una medida compensatoria para que el motor lo tenga en cuenta.</p>}
        </>
      )}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {disc.stage && <span className="text-ink-3">Etapa: <b className="text-ink-2">{disc.stage}</b></span>}
        <span className="text-ink-3">Evidencia: <b className="text-ink-2">{({ confirmed: 'dato confirmado', observed: 'observado', estimate: 'estimación', hypothesis: 'hipótesis', preference: 'preferencia', unknown: 'desconocido' } as Record<string, string>)[disc.evidence]}</b></span>
      </div>
      {disc.sourceRef && <p className="text-[10.5px] text-ink-3">Fuente: {disc.sourceRef}</p>}
    </div>
  );
}

export function NodeInspector({ id }: { id: string }) {
  const { doc } = useInspector();
  const n = doc.nodes[id];
  const depth = doc.project.settings.depth;
  if (!n) return null;
  const isMeta = ['note', 'label', 'comment'].includes(n.type);
  const isGroup = n.type === 'group' || n.type === 'container';
  const behaviorsCount = n.behaviorIds.length;
  const mitigCount = Object.values(doc.edges).filter((e) => e.targetNodeId === n.id && e.type === 'causal' && e.behavior.influence.mode === 'compensate').length;
  const annCount = Object.values(doc.annotations).filter((a) => a.ownerId === n.id).length;
  if (n.aliasOf && doc.nodes[n.aliasOf]) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-[12px] text-ink-2"><Link2 className="size-4 text-accent" />Clon de «{doc.nodes[n.aliasOf].title}»</div>
        <p className="text-[11.5px] text-ink-3">Un clon es el mismo elemento colocado en otro lugar. Sus propiedades y su comportamiento son los del original; el motor lo trata como una sola identidad.</p>
        <Button size="sm" variant="outline" onClick={() => useUI.getState().setSelection([n.aliasOf!])}>Ir al original</Button>
        <Button size="sm" variant="ghost" onClick={() => A.apply((d) => op.updateNode(d, n.id, { aliasOf: null, title: d.nodes[n.aliasOf!].title }))}>Convertir en elemento independiente</Button>
      </div>
    );
  }
  return (
    <div data-testid="node-inspector">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Badge>{TYPE_LABEL[n.type]}</Badge>
        {n.locked && <Lock className="size-3.5 text-ink-3" />}
        <span className="flex-1" />
        <IconButton size="xs" label="Eliminar" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
      </div>
      <div className="space-y-3 border-b border-line px-4 py-3">
        <Identity n={n} />
        <DiscoveryBlock n={n} />
        {!isMeta && !isGroup && <SimSummary n={n} />}
      </div>
      {!isMeta && !isGroup && depth !== 'basic' && (
        <>
          <Section title="Peso e influencia" icon={<Gauge />} defaultOpen={false} testId="section-weights"><Weights n={n} /></Section>
          <Section title="Comportamientos" icon={<Workflow />} count={behaviorsCount} defaultOpen={behaviorsCount > 0} testId="section-behaviors"><BehaviorList nodeId={n.id} /></Section>
          <Section title="Condiciones de activación" icon={<Diamond />} count={n.activationConditionId ? 1 : 0} defaultOpen={false} testId="section-conditions">
            <ConditionsList ownerType="node" ownerId={n.id} ids={n.activationConditionId ? [n.activationConditionId] : []} ownerNode={n.id} emptyText="Siempre activo." />
          </Section>
          <Section title="Mitigadores y compensaciones" icon={<ShieldCheck />} count={mitigCount} defaultOpen={false} testId="section-mitigators"><Mitigators n={n} /></Section>
          <Section title="Dimensiones del flujo" icon={<Sliders />} defaultOpen={n.type === 'input'} testId="section-dimensions"><DimensionValues n={n} /></Section>
          <Section title="Bifurcación y convergencia" icon={<Waypoints />} defaultOpen={false}><Routing n={n} /></Section>
        </>
      )}
      <Section title="Relaciones" icon={<Activity />} defaultOpen={false}><Relations n={n} /></Section>
      <Section title="Estilo" icon={<Paintbrush />} defaultOpen={false}><StyleSection n={n} /></Section>
      <Section title="Comentarios y notas" icon={<MessageSquare />} count={annCount} defaultOpen={annCount > 0} testId="section-comments"><Annotations ownerType="node" ownerId={n.id} /></Section>
      <Section title="Documentos adjuntos" icon={<FileUp />} count={n.metadata.attachmentIds.length} defaultOpen={false}><Attachments n={n} /></Section>
      <Section title="Avanzado" icon={<Boxes />} defaultOpen={false}><Advanced n={n} /></Section>
    </div>
  );
}
