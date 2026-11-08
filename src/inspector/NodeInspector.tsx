/** Inspector de burbujas: identidad y resumen visibles; el detalle se despliega bajo demanda. */
import {
  Activity, Boxes, Diamond, Download, FileUp, Fingerprint, Gauge, ImagePlus, Link2, Lock, MessageSquare, Paintbrush, Plus, Route,
  ScanSearch, ShieldCheck, Sliders, Trash2, Waypoints, Workflow, Compass,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { DimensionValue, MapNode } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import * as repo from '../persistence/repository';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { qty } from '../engine/packet';
import { HEAT_LABEL } from '../engine/heat';
import { scaleValueToWeighted } from '../engine/scales';
import { BEHAVIOR_KID, BEHAVIOR_LIBRARY } from '../core/model/behaviorLibrary';
import { NODE_COLORS, NODE_ICONS, COLOR_LABEL } from '../ui/icons';
import { Badge, Button, Field, IconButton, NumberInput, Popover, Section, Segmented, Select, TextArea, TextInput, Toggle, cx, fmt } from '../ui/primitives';
import { Annotations } from './Annotations';
import { BehaviorList, behaviorSummary } from './BehaviorEditor';
import { ConditionsList } from './ConditionEditor';
import { NodeSelect, OverrideMark, ScaleValueEditor, useInspector, useParam } from './fields';
import { download } from '../app/io';
import { levelOf } from '../app/levels';
import { KidNodeInspector } from '../kid/KidInspector';
import { PAPEL, type Papel } from '../kid/model';

const TYPE_LABEL: Record<MapNode['type'], string> = {
  bubble: 'Idea', input: 'Inicio', output: 'Meta', note: 'Nota', label: 'Texto suelto', comment: 'Comentario', group: 'Grupo', container: 'Zona',
};
const TYPE_INFO: Record<MapNode['type'], { emoji: string; hint: string }> = {
  bubble: { emoji: '💡', hint: 'Una idea o un paso de tu mapa.' },
  input: { emoji: '🌱', hint: 'De aquí sale todo lo que se mueve por tu mapa (personas, dinero, ganas…).' },
  output: { emoji: '🎯', hint: 'Lo que quieres conseguir. Aquí se cuenta lo que llega.' },
  note: { emoji: '📝', hint: 'Para acordarte de algo. No cambia la cuenta.' },
  label: { emoji: '🔤', hint: 'Un título suelto. No cambia la cuenta.' },
  comment: { emoji: '💬', hint: 'Un comentario. No cambia la cuenta.' },
  group: { emoji: '📦', hint: 'Junta varias cosas para moverlas a la vez.' },
  container: { emoji: '🗺️', hint: 'Marca una parte del mapa (un equipo, una fase…).' },
};

function Identity({ n }: { n: MapNode }) {
  const upd = (patch: Partial<MapNode>, key?: string) => A.apply((d) => op.updateNode(d, n.id, patch), key);
  const [tag, setTag] = useState('');
  return (
    <div className="space-y-3">
      <Field label="📝 Lo que pone"><TextInput value={n.title} onChange={(title) => upd({ title }, `title-${n.id}`)} data-testid="inspector-title" /></Field>
      <Field label="✏️ ¿Quieres explicar algo más?"><TextArea rows={2} value={n.description} onChange={(description) => upd({ description }, `desc-${n.id}`)} placeholder="Qué es, por qué está aquí…" /></Field>
      <Field label="🧩 ¿Qué es?" help="Cambiarlo cambia la cuenta: un Inicio crea cosas y una Meta las recoge.">
        <Select label="Tipo" value={n.type} onChange={(type) => A.apply((d) => op.convertNodeType(d, n.id, type))} options={(['bubble', 'input', 'output', 'note', 'label', 'group', 'container'] as const).map((t) => ({ value: t, label: `${TYPE_INFO[t].emoji} ${TYPE_LABEL[t]}` }))} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="🏷️ De qué tipo es" help="Opcional, para agrupar."><TextInput value={n.metadata.category} onChange={(category) => upd({ metadata: { ...n.metadata, category } }, `cat-${n.id}`)} placeholder="Ej.: colegio, dinero" /></Field>
        <Field label="🔖 Etiquetas" help="Para buscarla y filtrar.">
          <div className="flex flex-wrap items-center gap-1">
            {n.tags.map((t) => (
              <button key={t} type="button" onClick={() => upd({ tags: n.tags.filter((x) => x !== t) })} title="Quitar etiqueta"><Badge tone="accent">#{t} ×</Badge></button>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); if (tag.trim()) upd({ tags: [...new Set([...n.tags, tag.trim()])] }); setTag(''); }} className="min-w-24 flex-1">
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ etiqueta y Enter" aria-label="Añadir etiqueta" className="h-7 w-full rounded-lg border border-line bg-surface px-2 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-accent" data-testid="tag-input" />
            </form>
          </div>
        </Field>
      </div>
      <Field label="🤔 ¿Cuánto estás seguro de esto?" help="Así sabes qué es un dato de verdad y qué es una suposición.">
        <Segmented size="xs" label="Confianza" value={n.metadata.confidence} onChange={(confidence) => upd({ metadata: { ...n.metadata, confidence } })}
          options={[{ value: 'hypothesis', label: 'Me lo imagino', title: 'Hipótesis: lo supones' }, { value: 'estimate', label: 'Más o menos', title: 'Estimación: lo calculas por encima' }, { value: 'observation', label: 'Lo he visto', title: 'Observado: lo has visto pasar' }, { value: 'verified', label: 'Comprobado', title: 'Verificado: lo has comprobado con datos' }]} />
      </Field>
    </div>
  );
}

function Line({ emoji, children, tone, title }: { emoji: string; children: ReactNode; tone?: string; title?: string }) {
  return <p className={cx('flex items-start gap-2 text-[12.5px] leading-snug text-ink-2', tone)} title={title}><span className="w-4 shrink-0 text-center" aria-hidden>{emoji}</span><span className="min-w-0 flex-1">{children}</span></p>;
}

/** −3, +2, 0: con el signo de verdad y sin «-0». */
function signed(v: number): string {
  if (Math.abs(v) < 0.005) return '0';
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`;
}

function strength(v: number): string {
  const a = Math.abs(v);
  const how = a >= 4 ? 'mucho' : a >= 2 ? 'bastante' : 'un poco';
  return v < 0 ? `frena ${how}` : `empuja ${how}`;
}

function SimSummary({ n }: { n: MapNode }) {
  const st = useSim((s) => s.result?.iterations[s.cursor]?.nodes[n.aliasOf ?? n.id]);
  const heat = useSim((s) => s.heat?.nodes[n.aliasOf ?? n.id]?.[s.cursor]);
  const cursor = useSim((s) => s.cursor);
  const { doc } = useInspector();
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  const raw = doc.dimensions.quantity?.unit ?? '';
  const unit = raw && raw !== 'u' && raw !== 'u.' ? ` ${raw}` : '';
  const q = (v: number | undefined) => `${fmt(v ?? 0)}${unit}`;
  const dimName = (id: string) => doc.dimensions[id]?.name ?? id;
  const inf = n.weight.influence;
  const flowEdges = Object.values(doc.edges).filter((e) => e.type === 'flow' && (e.sourceNodeId === n.id || e.targetNodeId === n.id)).length;
  const inQ = st ? qty(st.in) : 0;
  const outQ = st ? Math.max(qty(st.out), qty(st.terminal)) : 0;
  // fuera del camino: nada le llega ni sale por una línea «Pasa» (p. ej., una piedra o una ayuda)
  const offPath = n.type !== 'input' && flowEdges === 0 && inQ <= 1e-9 && outQ <= 1e-9;
  return (
    <div className="space-y-2 rounded-xl bg-surface-2/70 p-3" data-testid="node-summary">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">🔎 Qué está pasando aquí</span>
        {st && <span className="text-[11px] text-ink-3" title="Cada ronda es una vuelta: una semana, un mes… La cambias en el panel de abajo.">ronda {cursor + 1}</span>}
      </div>
      {bhs.length ? (
        <Line emoji="⚙️">Hace: {bhs.map((b, k) => <span key={b.id}>{k ? ', ' : ''}<b className="text-ink" title={BEHAVIOR_LIBRARY[b.behaviorType].label}>{BEHAVIOR_KID[b.behaviorType].emoji} {b.label || BEHAVIOR_KID[b.behaviorType].name}</b> ({behaviorSummary(b, dimName).toLowerCase()})</span>)}.</Line>
      ) : offPath ? null : (
        <Line emoji="⚙️">Aquí no cambia nada: lo que le llega, sale igual.</Line>
      )}
      {inf && inf.mode !== 'qualitative' && inf.value !== 0 && <Line emoji={inf.value < 0 ? '🪨' : '💪'} tone={inf.value < 0 ? 'text-loss' : 'text-gain'}>{inf.value < 0 ? 'Frena' : 'Empuja'} a lo que tiene unido con «Influye»: <b>{signed(inf.value)}</b> ({strength(inf.value)}; va de −5 a +5).</Line>}
      {inf && inf.mode === 'qualitative' && <Line emoji="💪">Empuja o frena «con palabras» (sección «Cuánto empuja o frena»).</Line>}
      {n.activationConditionId && <Line emoji="⏰">Solo funciona a veces: tiene una condición (mira «Cuándo funciona»).</Line>}
      {st && (
        <div className="space-y-1.5 border-t border-line pt-2">
          {(st.generated.quantity ?? 0) > 0 && <Line emoji="✨" tone="text-gain">Crea <b>{q(st.generated.quantity)}</b> nuevas en esta ronda.</Line>}
          {!offPath && n.type !== 'input' && <Line emoji="📥">Le llegan <b>{q(inQ)}</b>.</Line>}
          {!offPath && (n.type === 'output' ? <Line emoji="🎯" tone="text-flow">Llegan a la meta <b>{q(qty(st.terminal))}</b>.</Line> : <Line emoji="📤" tone="text-flow">Salen <b>{q(outQ)}</b>.</Line>)}
          {(st.lost.quantity ?? 0) > 0 && <Line emoji="🕳️" tone="text-loss">Se pierden aquí <b>{q(st.lost.quantity)}</b>.</Line>}
          {(st.consumed.quantity ?? 0) > 0 && <Line emoji="🍽️">Se gastan aquí <b>{q(st.consumed.quantity)}</b>.</Line>}
          {(st.stock.quantity ?? 0) > 0 && <Line emoji="🐷">Guardadas en su hucha: <b>{q(st.stock.quantity)}</b>.</Line>}
          {(st.queue.quantity ?? 0) > 0 && <Line emoji="⏳">Esperando turno: <b>{q(st.queue.quantity)}</b>.</Line>}
          {st.compensation > 0 && <Line emoji="🩹" tone="text-gain">Sus remedios le quitan el <b>{Math.round(st.compensation * 100)} %</b> de su fuerza para frenar.</Line>}
          {inf && Math.abs(st.influence - (inf.mode === 'qualitative' ? st.influence : inf.value)) > 1e-6 && <Line emoji="💪">Su fuerza ahora, con todo: <b>{signed(st.influence)}</b>{Math.abs(st.influence) < 0.005 ? ((inf.mode !== 'qualitative' && inf.value < 0) ? ' (ya no frena nada)' : ' (ahora no empuja)') : ''}.</Line>}
          {Object.entries({ ...st.out.int, ...st.terminal.int }).slice(0, 4).length > 0 && (
            <Line emoji="🧪">Cómo es lo que sale: {Object.entries({ ...st.out.int, ...st.terminal.int }).slice(0, 4).map(([d, v]) => `${doc.dimensions[d]?.name ?? d} ${fmt(v, 2)}`).join(' · ')}.</Line>
          )}
          {!st.active && <Line emoji="💤" tone="text-cond">Ahora está apagada: no se cumple su condición.</Line>}
          {n.type !== 'input' && inQ <= 1e-9 && outQ <= 1e-9 && (
            <Line emoji="💡">{flowEdges ? 'Ahora mismo no le llega nada.' : inf ? 'No está en el camino: es una idea que empuja o frena a otras, y no necesita que le llegue nada.' : 'No le llega nada. Para que le llegue algo, únela con una línea «Pasa» a algo que venga del inicio.'}</Line>
          )}
          <div className="flex flex-wrap gap-1 pt-0.5">{st.flags.filter((f) => !['receiving', 'emitting', 'active'].includes(f)).map((f) => <Badge key={f}>{FLAG[f] ?? f}</Badge>)}</div>
          {heat && heat.state !== 'idle' && <Line emoji="🌡️">Termómetro: <b>{HEAT_LABEL[heat.state]}</b>. {heat.causes.join(' · ')}.</Line>}
        </div>
      )}
      <div className="flex flex-wrap gap-1 border-t border-line pt-2">
        <Button size="xs" variant="subtle" title="Ilumina todo lo que cambia si cambias esto" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'forward', isolate: false } })} data-testid="trace-forward"><Route className="size-3" />¿A qué afecta?</Button>
        <Button size="xs" variant="subtle" title="Ilumina todo lo que llega hasta aquí" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'backward', isolate: false } })} data-testid="trace-backward"><ScanSearch className="size-3" />¿De dónde le viene?</Button>
        <Button size="xs" variant="subtle" title="Apaga lo demás para verlo mejor (Escape para salir)" onClick={() => { useUI.setState({ focusNodeId: n.id }); A.fit([n.id]); }}><Compass className="size-3" />Centrarme en esto</Button>
      </div>
    </div>
  );
}

const FLAG: Record<string, string> = {
  active: '✅ encendida', inactive: '💤 apagada', loss: '🕳️ pierde', blocked: '⛔ corta el paso', transforming: '🔄 cambia cosas', saturated: '🚧 está llena',
  accumulating: '🐷 guarda', compensated: '🩹 tiene remedio', generating: '✨ crea', terminal: '🏁 final',
};

function Weights({ n }: { n: MapNode }) {
  const [imp, setImp, o1] = useParam<MapNode['weight']['importance']>('node', n.id, 'weight.importance');
  const [inf, setInf, o2] = useParam<MapNode['weight']['influence']>('node', n.id, 'weight.influence');
  const [impact, setImpact] = useParam<MapNode['weight']['impact']>('node', n.id, 'weight.impact');
  const [src, setSrc] = useParam<MapNode['influenceSource']>('node', n.id, 'influenceSource');
  const [ref, setRef] = useParam<number>('node', n.id, 'influenceReference');
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-1"><div className="flex-1"><ScaleValueEditor label="💪 Empuja o frena" id="Influencia" value={inf} onChange={setInf}
        help="Más (+) empuja y menos (−) frena, de −5 a +5. Solo hace efecto en lo que esta idea tenga unido con una línea «Influye»." /></div><OverrideMark {...o2} /></div>
      {inf && (
        <div className={cx('grid gap-2', src !== 'static' && 'grid-cols-2')}>
          <Field label="¿De qué depende su fuerza?" help="Por ejemplo, un rumor empuja más cuanta más gente lo oye.">
            <Select label="Origen de la influencia" value={src} onChange={setSrc} options={[{ value: 'static', label: 'Siempre la misma' }, { value: 'throughput', label: 'De lo que le llega' }, { value: 'stock', label: 'De lo que tiene guardado' }]} />
          </Field>
          {src !== 'static' && <Field label="Con cuánto llega a toda su fuerza" help="Cuando le llegue (o guarde) esta cantidad, empujará o frenará del todo."><NumberInput value={ref} min={0.0001} onChange={setRef} /></Field>}
        </div>
      )}
      <div className="flex items-start gap-1"><div className="flex-1"><ScaleValueEditor label="⭐ Lo importante que es para ti" id="Importancia" value={imp} onChange={setImp}
        help="Solo para ti, para ordenar. No cambia la cuenta." /></div><OverrideMark {...o1} /></div>
      <ScaleValueEditor label="🎯 Lo que esperas que pase" id="Impacto" value={impact} onChange={setImpact}
        help="Tu apuesta sobre cuánto cambiará el resultado. El Marcador calcula lo que pasa de verdad." />
    </div>
  );
}

/** Qué es cada cosa que viaja por el mapa, dicho para un niño. */
const DIM_KID: Record<string, string> = {
  quantity: 'Cuántas cosas salen en cada ronda.',
  quality: 'Cómo de buenas son: de 0 (nada) a 1 (perfectas).',
  speed: 'Lo rápido que van: 1 es normal y 2, el doble de rápido.',
  potential: 'Lo que pueden llegar a dar: de 0 a 1.',
  load: 'El trabajo que cuestan, en horas.',
};
const unitWord = (u: string) => (u === 'h' ? 'horas' : u === 'u' || u === 'u.' || u === '×' ? '' : u);

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
      <p className="text-[12px] leading-snug text-ink-3">{isGen ? 'Dile cuánto sale de aquí en cada ronda y cómo es: la cantidad, la calidad (de 0 a 1), la rapidez… Pulsa «Dar un valor» en lo que quieras.' : 'Esto solo cuenta en un Inicio o en una idea con «✨ Fábrica»: es lo que sale de ella.'}</p>
      {Object.values(doc.dimensions).map((d) => {
        const v = dv[d.id];
        return (
          <div key={d.id} className="rounded-lg border border-line p-2" data-testid={`dim-${d.id}`}>
            <div className="flex items-start gap-2">
              <span className="mt-[5px] size-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-ink">{d.name}{unitWord(d.unit) ? <span className="font-normal text-ink-3"> · en {unitWord(d.unit)}</span> : null}</span>
                {(DIM_KID[d.key] ?? d.description) && <span className="block text-[11px] leading-snug text-ink-3">{d.builtin ? DIM_KID[d.key] ?? d.description : d.description}</span>}
              </span>
              {v ? (
                <IconButton size="xs" label="Quitar este valor" onClick={() => { const next = { ...dv }; delete next[d.id]; A.apply((x) => op.setParam(x, 'node', n.id, 'dimensionValues', next)); }}><Trash2 className="size-3" /></IconButton>
              ) : (
                <Button size="xs" variant="subtle" onClick={() => setDim(d.id, {})}><Plus className="size-3" />Dar un valor</Button>
              )}
            </div>
            {v && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Segmented size="xs" label="Cómo lo dices" value={v.mode} onChange={(mode) => setDim(d.id, { mode, value: mode === 'qualitative' ? 2 : v.value })}
                    options={[{ value: 'numeric', label: 'Número', title: 'Numérica' }, { value: 'weighted', label: '−5…+5', title: 'Ponderada' }, { value: 'qualitative', label: 'Palabras', title: 'Cualitativa' }]} />
                  {v.mode === 'qualitative' ? (
                    <Select label="Nivel" className="flex-1" value={String(Math.round(v.value))} onChange={(x) => setDim(d.id, { value: Number(x) })}
                      options={(doc.project.settings.qualitativeScales.find((s) => s.id === (d.scaleId ?? doc.project.settings.defaultScaleId)) ?? doc.project.settings.qualitativeScales[0]).levels.map((l, i) => ({ value: String(i), label: l.label }))} />
                  ) : (
                    <NumberInput className="flex-1" value={v.value} onChange={(value) => setDim(d.id, { value })} data-param={`dim-${d.id}`} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Field label="¿Estás seguro?">
                    <Select label="¿Cuánto estás seguro?" value={v.confidence} onChange={(confidence) => setDim(d.id, { confidence })}
                      options={[{ value: 'hypothesis', label: 'Me lo imagino' }, { value: 'estimate', label: 'Más o menos' }, { value: 'observation', label: 'Lo he visto' }, { value: 'verified', label: 'Comprobado' }]} />
                  </Field>
                  <Field label="¿De dónde lo sacas?">
                    <TextInput value={v.source} onChange={(source) => setDim(d.id, { source })} placeholder="Una web, un amigo…" aria-label="¿De dónde lo sacas?" />
                  </Field>
                </div>
                {doc.project.settings.depth === 'expert' && v.mode !== 'qualitative' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    Si sale mal / si sale bien:
                    <NumberInput className="flex-1" value={v.range?.low ?? null} placeholder="mal" onChange={(low) => setDim(d.id, { range: { low, high: v.range?.high ?? v.value } })} />
                    <NumberInput className="flex-1" value={v.range?.high ?? null} placeholder="bien" onChange={(high) => setDim(d.id, { range: { high, low: v.range?.low ?? v.value } })} />
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
      <p className="text-[12px] leading-snug text-ink-3">Un remedio es algo que hace que esta idea frene menos (y pierda menos). Por ejemplo: si «No tengo tiempo» frena, un remedio puede ser «Hacer un horario».</p>
      {edges.map((e) => <MitigatorRow key={e.id} edgeId={e.id} />)}
      {edges.length > 1 && (
        <Field label="Si hay varios remedios…" help="¿Ayudan todos juntos o se pisan un poco?">
          <Select label="Combinación" value={comb} onChange={setComb} options={[{ value: 'additive', label: 'Se suman' }, { value: 'max', label: 'Solo cuenta el más fuerte' }, { value: 'diminishing', label: 'Se pisan un poco (cada uno ayuda algo menos)' }]} />
        </Field>
      )}
      <Button size="sm" variant="subtle" onClick={() => addMitigator(null)} data-testid="add-mitigator">🩹 Poner un remedio nuevo</Button>
      <Field label="¿Ya tienes en el mapa algo que lo arregle?" help="Elígelo y pulsa «Usarla»: se unirá con una línea de remedio.">
        <div className="flex gap-1.5">
          <div className="flex-1"><NodeSelect label="Usar una idea que ya tengo como remedio" value={pick || null} allowNone onChange={setPick} exclude={[n.id]} /></div>
          <Button size="sm" variant="outline" disabled={!pick} onClick={() => addMitigator(pick)}>Usarla</Button>
        </div>
      </Field>
    </div>
  );
}

function MitigatorRow({ edgeId }: { edgeId: string }) {
  const { doc, eff } = useInspector();
  const e = doc.edges[edgeId];
  // mismo cálculo que el motor: los puntos se cuentan sobre lo que frena la idea (o sobre 5 si no frena)
  const target = eff.nodes[e.targetNodeId] ?? doc.nodes[e.targetNodeId];
  const base = target ? scaleValueToWeighted(target.weight.influence, doc.project.settings).value : 0;
  const wmax = doc.project.settings.weightedScale.max;
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
 <IconButton size="xs" label="Quitar este remedio" variant="danger" onClick={() => A.apply((d) => op.deleteElements(d, [], [edgeId]))}><Trash2 className="size-3" /></IconButton>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
        <span className="shrink-0">¿Cuánto lo arregla?</span>
        <Select label="¿Cuánto lo arregla?" className="flex-1" value={type} onChange={setType} options={[{ value: 'partial', label: 'Una parte' }, { value: 'total', label: 'Del todo' }, { value: 'conditional', label: 'Solo si pasa algo' }, { value: 'temporal', label: 'Solo un tiempo' }]} />
      </div>
      {type !== 'total' ? (
        <div className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className="shrink-0">Le quita</span>
          <NumberInput className="w-16" value={amount} min={0} onChange={setAmount} data-param="compensation-amount" />
          <Select label="Unidad" className="w-28" value={unit} onChange={setUnit} options={[{ value: 'points', label: 'puntos' }, { value: 'percent', label: '% de fuerza' }]} />
          <span className="shrink-0">al freno</span>
        </div>
      ) : null}
      <p className="text-[11px] leading-snug text-ink-3" data-testid="mitigator-explain">{(() => {
        const frac = type === 'total' ? 1 : Math.min(1, Math.max(0, unit === 'percent' ? amount / 100 : amount / (base < 0 ? -base : wmax)));
        const cuando = type === 'conditional' ? ' (solo cuando se cumple lo de abajo)' : type === 'temporal' ? ' (solo en esas rondas)' : '';
        if (base < 0) return frac >= 1 ? `Ahora frena ${signed(base)}: con este remedio deja de frenar del todo${cuando}.` : `Ahora frena ${signed(base)}: con este remedio se queda en ${signed(base * (1 - frac))}${cuando}.`;
        return frac >= 1 ? `Arregla del todo lo que se pierde aquí${cuando}.` : `Arregla el ${fmt(frac * 100, 0)} % de lo que se pierde aquí${cuando}${unit === 'points' ? ` (${fmt(amount)} de ${wmax} puntos)` : ''}.`;
      })()}</p>
      {type === 'temporal' && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">Desde la ronda<NumberInput className="w-14" value={from} min={1} onChange={(v) => setFrom(Math.round(v))} />hasta la<NumberInput className="w-14" value={to} placeholder="∞" min={1} onChange={(v) => setTo(Math.round(v))} /></div>
      )}
      {type === 'conditional' && <ConditionsList ownerType="edge" ownerId={edgeId} ids={e.conditions} ownerNode={e.sourceNodeId} emptyText="Dime cuándo funciona este remedio." />}
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
  const T: Record<string, string> = { flow: 'pasa', causal: 'influye', conceptual: 'tienen que ver', informative: 'info' };
  return (
    <div className="space-y-0.5">
      {(ins.length > 0 || outs.length > 0) && <p className="pb-1 text-[12px] leading-snug text-ink-3">← le llega de… · → va hacia… Pulsa una línea para verla.</p>}
      {!ins.length && !outs.length && <p className="text-[12px] leading-snug text-ink-3">Aún no está unida a nada. Arrastra desde un punto del borde hasta otra idea.</p>}
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
      <Field label={<span className="inline-flex items-center gap-1">📥 Si le llegan cosas de varios sitios… <OverrideMark {...o1} /></span>} hint={`le llegan ${ins.length} líneas`} help="¿Cómo las junta?">
        <Select label="Convergencia" value={rule} onChange={setRule} options={[
          { value: 'sum', label: 'Las suma todas' }, { value: 'weighted', label: 'Las mezcla según su peso' }, { value: 'priority', label: 'Primero la más importante' }, { value: 'max', label: 'Se queda con la mayor' },
          { value: 'min', label: 'Se queda con la menor' }, { value: 'dedupe', label: 'No cuenta dos veces lo mismo' }, ...(expert ? [{ value: 'custom' as const, label: 'Con una fórmula (para expertos)' }] : []),
        ]} />
      </Field>
      {rule === 'dedupe' && <Field label="¿Cuánto se repiten?" help="100 % = lo que llega por cada lado es lo mismo (por ejemplo, la misma persona por dos caminos)."><NumberInput percent value={overlap} min={0} max={1} onChange={setOverlap} /></Field>}
      {rule === 'custom' && <Field label="Fórmula" help="Usa in1, in2… (cada línea que llega) y sum, max, min, count."><TextInput value={formula} onChange={setFormula} className="font-mono" /></Field>}
      <Field label={<span className="inline-flex items-center gap-1">📤 Si sale hacia varios sitios… <OverrideMark {...o2} /></span>} hint={`salen ${outs.length} líneas`} help="¿Cómo lo reparte?">
        <Select label="Reparto" value={mode} onChange={setMode} options={[
          { value: 'proportional', label: 'Según el peso de cada línea' }, { value: 'fixed', label: 'Con porcentajes fijos' }, { value: 'conditional', label: 'Según una condición en cada línea' },
          { value: 'priority', label: 'Llena la primera y luego la siguiente' }, { value: 'competitive', label: 'Según cuánto cabe en cada una' }, { value: 'dynamic', label: 'Según la fuerza de otra idea' },
        ]} />
      </Field>
      {mode === 'dynamic' && <Field label="¿Qué idea decide el reparto?"><NodeSelect label="Nodo de referencia" value={dyn} onChange={setDyn} exclude={[n.id]} /></Field>}
      {outs.length > 0 && (
        <div className="space-y-1 rounded-lg bg-surface-2/70 p-2">
          {outs.map((e) => <ShareRow key={e.id} edgeId={e.id} mode={mode} />)}
        </div>
      )}
      <Field label="💤 Si está apagada (no se cumple su condición)…">
        <Segmented size="xs" label="Modo inactivo" value={inactiveMode} onChange={setInactiveMode} options={[{ value: 'passthrough', label: 'Deja pasar todo igual' }, { value: 'block', label: 'No deja pasar nada' }]} />
      </Field>
    </div>
  );
}

function ShareRow({ edgeId, mode }: { edgeId: string; mode: string }) {
  const { doc } = useInspector();
  const e = doc.edges[edgeId];
  const path = mode === 'fixed' ? 'behavior.share' : mode === 'priority' ? 'behavior.priority' : 'behavior.weight';
  const [v, set, o] = useParam<number>('edge', edgeId, path);
  if (mode === 'conditional') return <div className="text-[11.5px] text-ink-3">→ {doc.nodes[e.targetNodeId]?.title}: {e.conditions.length ? 'tiene condición' : 'sin condición (ponla en la línea)'}</div>;
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
      <Field label="🔷 Forma">
        <Segmented size="xs" label="Forma" value={n.visualStyle.shape} onChange={(shape) => upd({ shape })}
          options={[{ value: 'rounded', label: 'Redondeado' }, { value: 'pill', label: 'Píldora' }, { value: 'rect', label: 'Recto' }, { value: 'circle', label: 'Círculo' }, { value: 'diamond', label: 'Rombo' }, { value: 'hexagon', label: 'Hex.' }]} />
      </Field>
      <Field label="🎨 Color">
        <div className="flex flex-wrap gap-1.5">
          {NODE_COLORS.map((c) => (
            <button key={c} type="button" aria-label={COLOR_LABEL[c]} title={COLOR_LABEL[c]} onClick={() => upd({ color: c })}
              className={cx('size-6 rounded-full border-2 transition-transform hover:scale-110', n.visualStyle.color === c ? 'border-accent' : 'border-transparent')} style={{ background: `var(--n-${c}-ac)` }} />
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Otro color de fondo">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color de fondo" value={n.visualStyle.background ?? '#ffffff'} onChange={(e) => upd({ background: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" />
            {n.visualStyle.background && <button type="button" className="text-[11px] text-ink-3 underline" onClick={() => upd({ background: null })}>quitar</button>}
          </div>
        </Field>
        <Field label="Borde (la raya de fuera)">
          <Select label="Borde" value={n.visualStyle.borderStyle} onChange={(borderStyle) => upd({ borderStyle })} options={[{ value: 'solid', label: 'Continuo' }, { value: 'dashed', label: 'Discontinuo' }, { value: 'dotted', label: 'Punteado' }, { value: 'none', label: 'Sin borde' }]} />
        </Field>
        <Field label="Tipo de letra">
          <Select label="Tipografía" value={n.visualStyle.fontFamily} onChange={(fontFamily) => upd({ fontFamily })} options={[{ value: 'sans', label: 'Normal' }, { value: 'serif', label: 'De libro' }, { value: 'mono', label: 'De máquina' }]} />
        </Field>
        <Field label="Tamaño y grosor de la letra">
          <div className="flex gap-1">
            <NumberInput value={n.visualStyle.fontSize} min={9} max={48} onChange={(fontSize) => upd({ fontSize })} />
            <Select label="Peso" value={String(n.visualStyle.fontWeight)} onChange={(w) => upd({ fontWeight: Number(w) })} options={[{ value: '400', label: 'Normal' }, { value: '500', label: 'Medio' }, { value: '650', label: 'Fuerte' }]} />
          </div>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover className="w-72" trigger={<Button size="sm" variant="outline">{Icon ? <Icon className="size-3.5" /> : <Paintbrush className="size-3.5" />}Dibujito</Button>}>
          <div className="grid grid-cols-8 gap-1">
            <button type="button" className="col-span-2 rounded-md text-[11px] text-ink-3 hover:bg-surface-2" onClick={() => upd({ icon: null })}>Ninguno</button>
            {Object.entries(NODE_ICONS).map(([name, I]) => (
              <button key={name} type="button" title={name} aria-label={name} onClick={() => upd({ icon: name })} className={cx('flex size-7 items-center justify-center rounded-md hover:bg-surface-2', n.visualStyle.icon === name && 'bg-accent-soft text-accent-text')}><I className="size-4" /></button>
            ))}
          </div>
        </Popover>
        <Button size="sm" variant="outline" onClick={onImage}><ImagePlus className="size-3.5" />Poner una foto</Button>
        {n.visualStyle.image && <Button size="sm" variant="ghost" onClick={() => upd({ image: null })}>Quitar la foto</Button>}
        {n.dimensions && <Button size="sm" variant="ghost" onClick={() => A.apply((d) => op.updateNode(d, n.id, { dimensions: null }))}>Volver a su tamaño</Button>}
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
          <IconButton size="xs" label="Quitar este archivo" variant="danger" onClick={async () => { await repo.deleteAttachment(r.id); A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, attachmentIds: d.nodes[n.id].metadata.attachmentIds.filter((x) => x !== r.id) } })); }}><Trash2 className="size-3" /></IconButton>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}><FileUp className="size-3.5" />Guardar un archivo aquí</Button>
    </div>
  );
}

function Advanced({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const upd = (patch: Partial<MapNode>) => A.apply((d) => op.updateNode(d, n.id, patch));
  const ports = n.portIds.map((p) => doc.ports[p]).filter(Boolean);
  return (
    <div className="space-y-3">
      <Field label="🔒 Bloqueada (para no moverla sin querer)" inline><Toggle label="Bloqueado" checked={n.locked} onChange={(locked) => upd({ locked })} /></Field>
      <Field label="🙈 Esconder lo que cuelga de ella" inline><Toggle label="Rama plegada" checked={n.branchCollapsed} onChange={(branchCollapsed) => upd({ branchCollapsed })} /></Field>
      <Field label="🗂️ Capas" help="Pulsa una capa para meter o sacar esta idea.">
        <div className="flex flex-wrap gap-1">
          {Object.values(doc.layers).sort((a, b) => a.order - b.order).map((l) => {
            const on = n.layerIds.includes(l.id);
            return <button key={l.id} type="button" onClick={() => A.apply((d) => op.setNodeLayers(d, [n.id], l.id, !on))}><Badge tone={on ? 'accent' : 'neutral'}><span className="size-1.5 rounded-full" style={{ background: l.color }} />{l.name}</Badge></button>;
          })}
        </div>
      </Field>
      {doc.project.settings.depth === 'expert' && (
        <Field label="🔌 Puertas de entrada y salida" help="Para expertos: puntos con nombre por donde entra y sale, cada uno con lo que cabe.">
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
      <Field label="🔗 Enlaces y apuntes"><TextArea rows={2} value={n.metadata.documentation} onChange={(documentation) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, documentation } }), `doc-${n.id}`)} placeholder="Páginas, libros, de dónde lo sacaste…" /></Field>
      <div className="text-[10.5px] text-ink-3">Código interno: <span className="font-mono">{n.id}</span> · creada el {new Date(n.createdAt).toLocaleString('es-ES')}</div>
    </div>
  );
}

function DiscoveryBlock({ n }: { n: MapNode }) {
  const disc = n.metadata.discovery;
  if (!disc) return null;
  const upd = (patch: Partial<NonNullable<MapNode['metadata']['discovery']>>) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, discovery: { ...d.nodes[n.id].metadata.discovery!, ...patch } } }));
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--transform)_45%,transparent)] bg-[color-mix(in_srgb,var(--transform)_5%,transparent)] p-2.5" data-testid="discovery-block">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-transform"><Fingerprint className="size-3.5" />{disc.origin === 'ai' ? 'Te lo propuso la IA' : disc.origin === 'template' ? 'Te lo propuso una plantilla' : 'Lo descubriste tú'} · {disc.status === 'confirmed' ? '¡confirmado!' : disc.status === 'rejected' ? 'descartado' : 'sin confirmar'}</div>
      <p className="text-[11.5px] leading-snug text-ink-3">¿Es verdad? Confírmalo si lo es, márcalo como dudoso o quítalo.</p>
      <div className="flex gap-1">
        <Button size="xs" variant={disc.status === 'confirmed' ? 'solid' : 'subtle'} onClick={() => upd({ status: 'confirmed' })}>✅ Sí, es así</Button>
        <Button size="xs" variant="subtle" onClick={() => upd({ status: 'suggested' })}>🤔 No estoy seguro</Button>
        <Button size="xs" variant="danger" onClick={() => A.apply((d) => op.deleteElements(d, [n.id], []))}>🗑️ Quitar</Button>
      </div>
      {(disc.role === 'friction' || disc.frictionCategory) && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="¿De dónde viene este freno?">
              <Select label="¿De dónde viene este freno?" value={disc.frictionCategory ?? 'external'} onChange={(frictionCategory) => upd({ frictionCategory })} options={[{ value: 'personal', label: '🙋 De mí' }, { value: 'external', label: '🌍 De fuera' }, { value: 'system', label: '⚙️ De cómo está montado' }]} />
            </Field>
            <Field label="¿Puedes cambiarlo?">
              <Select label="¿Puedes cambiarlo?" value={disc.controllability ?? 'partial'} onChange={(controllability) => upd({ controllability })} options={[{ value: 'direct', label: 'Sí, depende de mí' }, { value: 'partial', label: 'Un poco' }, { value: 'external', label: 'Depende de otros' }, { value: 'uncontrollable', label: 'No se puede' }]} />
            </Field>
          </div>
          <Field label="¿Qué hacemos con este freno?">
            <Segmented size="xs" label="Resolución" value={disc.resolution} onChange={(resolution) => upd({ resolution })}
              options={[{ value: 'pending', label: 'Aún no sé' }, { value: 'eliminate', label: 'Quitarlo' }, { value: 'accept', label: 'Vivir con él' }, { value: 'compensate', label: 'Ponerle remedio' }, { value: 'reroute', label: 'Buscar otro camino' }]} />
          </Field>
          {disc.resolution === 'compensate' && <p className="text-[11.5px] text-ink-3">Añade un remedio en «🩹 Remedios» (más abajo) para que cuente.</p>}
        </>
      )}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {disc.stage && <span className="text-ink-3">En qué momento: <b className="text-ink-2">{disc.stage}</b></span>}
        <span className="text-ink-3">¿Cómo lo sabemos?: <b className="text-ink-2">{({ confirmed: 'es un dato', observed: 'lo has visto', estimate: 'más o menos', hypothesis: 'lo imaginas', preference: 'es lo que prefieres', unknown: 'no se sabe' } as Record<string, string>)[disc.evidence]}</b></span>
      </div>
      {disc.sourceRef && <p className="text-[10.5px] text-ink-3">Sale de: {disc.sourceRef}</p>}
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
        <p className="text-[12px] leading-snug text-ink-3">Un clon es la misma idea puesta en otro sitio del mapa, como una foto suya: si cambias la original, cambia también esta, y en la cuenta solo se cuenta una vez.</p>
        <Button size="sm" variant="outline" onClick={() => useUI.getState().setSelection([n.aliasOf!])}>Ir a la original</Button>
        <Button size="sm" variant="ghost" onClick={() => A.apply((d) => op.updateNode(d, n.id, { aliasOf: null, title: d.nodes[n.aliasOf!].title }))}>Separarla (que sea una idea distinta)</Button>
      </div>
    );
  }
  const level = levelOf(depth);
  if (level < 3) return <KidNodeInspector id={n.id} />;
  const papel = n.metadata.custom?.papel && n.metadata.custom.papel in PAPEL ? PAPEL[n.metadata.custom.papel as Papel] : null;
  const head = papel ? { emoji: papel.emoji, name: papel.name, hint: papel.hint } : { emoji: TYPE_INFO[n.type].emoji, name: TYPE_LABEL[n.type], hint: TYPE_INFO[n.type].hint };
  return (
    <div data-testid="node-inspector">
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <span className="text-[22px] leading-none" aria-hidden>{head.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-display text-[16px] font-medium text-ink">{head.name}{n.locked && <Lock className="size-3.5 text-ink-3" aria-label="Bloqueada" />}</span>
          <span className="block text-[12px] leading-snug text-ink-3">{head.hint}</span>
        </span>
        <IconButton size="xs" label="Borrar" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
      </div>
      <div className="space-y-3 border-b border-line px-4 py-3">
        <Identity n={n} />
        <DiscoveryBlock n={n} />
        {!isMeta && !isGroup && <SimSummary n={n} />}
      </div>
      {!isMeta && !isGroup && depth !== 'basic' && (
        <>
          <Section emoji="💪" title="Cuánto empuja o frena" hint="Si esta idea ayuda (+) o frena (−) a otras, y cuánto." icon={<Gauge />} defaultOpen={false} testId="section-weights"><Weights n={n} /></Section>
          <Section emoji="⚙️" title="Qué hace" hint="Lo que hace con lo que le llega: colarlo, guardarlo, multiplicarlo…" icon={<Workflow />} count={behaviorsCount} defaultOpen={behaviorsCount > 0} testId="section-behaviors"><BehaviorList nodeId={n.id} /></Section>
          <Section emoji="⏰" title="Cuándo funciona" hint="Si solo funciona a veces; por ejemplo, desde la ronda 4." icon={<Diamond />} count={n.activationConditionId ? 1 : 0} defaultOpen={false} testId="section-conditions">
            <ConditionsList ownerType="node" ownerId={n.id} ids={n.activationConditionId ? [n.activationConditionId] : []} ownerNode={n.id} emptyText="Ahora funciona siempre. Añade una condición si solo debe funcionar a veces." />
          </Section>
          <Section emoji="🩹" title="Remedios" hint="Cosas que le quitan fuerza cuando frena." icon={<ShieldCheck />} count={mitigCount} defaultOpen={false} testId="section-mitigators"><Mitigators n={n} /></Section>
          <Section emoji="✨" title="Qué sale de aquí" hint="Cuánto sale y cómo es (sobre todo en los inicios)." icon={<Sliders />} defaultOpen={n.type === 'input'} testId="section-dimensions"><DimensionValues n={n} /></Section>
          <Section emoji="🔀" title="Cómo reparte y cómo junta" hint="Qué hace si le llegan cosas de varios sitios o si salen hacia varios." icon={<Waypoints />} defaultOpen={false}><Routing n={n} /></Section>
        </>
      )}
      <Section emoji="🔗" title="Con quién está unida" hint="Las líneas que le llegan (←) y las que salen (→)." icon={<Activity />} defaultOpen={false}><Relations n={n} /></Section>
      <Section emoji="🎨" title="Cómo se ve" hint="Forma, color, letra, dibujito o foto." icon={<Paintbrush />} defaultOpen={false}><StyleSection n={n} /></Section>
      <Section emoji="💬" title="Comentarios" hint="Notas para ti: dudas, ideas, pruebas." icon={<MessageSquare />} count={annCount} defaultOpen={annCount > 0} testId="section-comments"><Annotations ownerType="node" ownerId={n.id} /></Section>
      <Section emoji="📎" title="Archivos" hint="Documentos que quieras guardar con esta idea." icon={<FileUp />} count={n.metadata.attachmentIds.length} defaultOpen={false}><Attachments n={n} /></Section>
      <Section emoji="🧰" title="Más opciones" hint="Bloquear, capas y cosas para expertos." icon={<Boxes />} defaultOpen={false}><Advanced n={n} /></Section>
    </div>
  );
}
