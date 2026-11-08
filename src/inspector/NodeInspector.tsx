/** Inspector de burbujas: identidad y resumen visibles; el detalle se despliega bajo demanda. */
import { Download, FileUp, Fingerprint, ImagePlus, Link2, Lock, Paintbrush, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { DimensionValue, MapNode, ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import * as repo from '../persistence/repository';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { qty } from '../engine/packet';
import { scaleValueToWeighted } from '../engine/scales';
import { BEHAVIOR_KID } from '../core/model/behaviorLibrary';
import { NODE_COLORS, NODE_ICONS, COLOR_LABEL } from '../ui/icons';
import { Badge, Button, Field, IconButton, NumberInput, Popover, Segmented, Select, TextArea, TextInput, Toggle, cx, fmt } from '../ui/primitives';
import { Annotations } from './Annotations';
import { BehaviorList } from './BehaviorEditor';
import { ConditionsList } from './ConditionEditor';
import { NodeSelect, OverrideMark, useInspector, useParam } from './fields';
import { download } from '../app/io';
import { levelOf } from '../app/levels';
import { KidNodeInspector } from '../kid/KidInspector';
import { PAPEL, type Papel } from '../kid/model';
import { canMute, isMuted } from '../engine/mute';
import { toggleMute } from '../app/mute';
import { Ico } from '../ui/ico';

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

/** Nombre y explicación: lo que se lee en la burbuja. */
function TextFields({ n }: { n: MapNode }) {
  const upd = (patch: Partial<MapNode>, key?: string) => A.apply((d) => op.updateNode(d, n.id, patch), key);
  return (
    <div className="space-y-3">
      <Field label="📝 Nombre" help="Lo que pone en la burbuja, en grande."><TextInput value={n.title} onChange={(title) => upd({ title }, `title-${n.id}`)} data-testid="inspector-title" /></Field>
      <Field label="✏️ Explicación" help="Sale en la burbuja, debajo del nombre y en pequeño. Cuéntalo en una frase.">
        <TextArea rows={3} value={n.description} onChange={(description) => upd({ description }, `desc-${n.id}`)} placeholder="Por ejemplo: «Me levanto y vamos viendo»" data-testid="inspector-description" />
      </Field>
    </div>
  );
}

/** ¿Qué es? Inicio, idea, meta, nota… */
function RoleField({ n }: { n: MapNode }) {
  return (
    <div className="space-y-2.5">
      <Select label="¿Qué es?" value={n.type} onChange={(type) => A.apply((d) => op.convertNodeType(d, n.id, type))} options={(['bubble', 'input', 'output', 'note', 'label', 'group', 'container'] as const).map((t) => ({ value: t, label: `${TYPE_INFO[t].emoji} ${TYPE_LABEL[t]}` }))} />
      <ul className="space-y-1 text-[12px] leading-snug text-ink-2">
        <li>🌱 <b>Inicio</b>: de aquí sale lo que mueves (clientes, dinero, horas…).</li>
        <li>💡 <b>Idea</b>: un paso o algo que pasa por el medio.</li>
        <li>🎯 <b>Meta</b>: lo que quieres conseguir. Aquí se cuenta lo que llega.</li>
        <li>📝 <b>Nota</b> y 🔤 <b>Texto suelto</b>: para apuntar. No cambian las cuentas.</li>
        <li>📦 <b>Grupo</b> y 🗺️ <b>Zona</b>: para juntar varias cosas y moverlas a la vez.</li>
      </ul>
    </div>
  );
}

/** ¿Es un dato o lo pones a ojo? */
function ConfidenceField({ n }: { n: MapNode }) {
  return (
    <Segmented size="sm" label="Confianza" value={n.metadata.confidence} onChange={(confidence) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, confidence } }))}
      options={[{ value: 'hypothesis', label: '🤷 A ojo', title: 'Hipótesis: lo supones' }, { value: 'estimate', label: 'Más o menos', title: 'Estimación' }, { value: 'observation', label: 'Lo he visto', title: 'Observado' }, { value: 'verified', label: '✅ Comprobado', title: 'Verificado con datos' }]} />
  );
}

/** Grupo y etiquetas: para encontrarla luego. */
function TagFields({ n }: { n: MapNode }) {
  const upd = (patch: Partial<MapNode>, key?: string) => A.apply((d) => op.updateNode(d, n.id, patch), key);
  const [tag, setTag] = useState('');
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="🏷️ Grupo" help="Para juntarla con otras parecidas."><TextInput value={n.metadata.category} onChange={(category) => upd({ metadata: { ...n.metadata, category } }, `cat-${n.id}`)} placeholder="Ej.: dinero, casa" /></Field>
      <Field label="🔖 Etiquetas" help="Para encontrarla con el buscador.">
        <div className="flex flex-wrap items-center gap-1">
          {n.tags.map((t) => (
            <button key={t} type="button" onClick={() => upd({ tags: n.tags.filter((x) => x !== t) })} title="Quitar etiqueta"><Badge tone="accent">#{t} ×</Badge></button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (tag.trim()) upd({ tags: [...new Set([...n.tags, tag.trim()])] }); setTag(''); }} className="min-w-24 flex-1">
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ una y Enter" aria-label="Añadir etiqueta" className="h-7 w-full rounded-lg border border-line bg-surface px-2 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-accent" data-testid="tag-input" />
          </form>
        </div>
      </Field>
    </div>
  );
}

function Line({ emoji, children, tone, title }: { emoji: string; children: ReactNode; tone?: string; title?: string }) {
  return <p className={cx('flex items-start gap-2 text-[12.5px] leading-snug text-ink-2', tone)} title={title}><Ico e={emoji} size={15} className="mt-[1px]" /><span className="min-w-0 flex-1">{children}</span></p>;
}

/** −3, +2, 0: con el signo de verdad y sin «-0». */
function signed(v: number): string {
  if (Math.abs(v) < 0.005) return '0';
  return `${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}`;
}

const howMuch = (v: number) => { const a = Math.abs(v); return a >= 4 ? 'mucho' : a >= 2 ? 'bastante' : 'un poco'; };

/** Lo que pasa ahora en esta idea, contado en una o dos frases (se actualiza al momento). */
export function NodeLive({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const id = n.aliasOf ?? n.id;
  const st = useSim((s) => s.result?.iterations[s.cursor]?.nodes[id]);
  const edgeSt = useSim((s) => s.result?.iterations[s.cursor]?.edges);
  const total = useSim((s) => (n.type === 'output' && s.result ? s.result.iterations.reduce((a, it) => a + (it.nodes[id] ? qty(it.nodes[id].terminal) : 0), 0) : null));
  const heat = useSim((s) => s.heat?.nodes[id]?.[s.cursor]);
  const raw = doc.dimensions.quantity?.unit ?? '';
  const unit = raw && raw !== 'u' && raw !== 'u.' ? ` ${raw}` : '';
  const q = (v: number | undefined) => `${fmt(v ?? 0)}${unit}`;
  const lines: { e: string; t: ReactNode; tone?: string }[] = [];
  const causalOut = Object.values(doc.edges).filter((e) => e.sourceNodeId === id && e.type === 'causal');
  const linked = Object.values(doc.edges).some((e) => e.sourceNodeId === id || e.targetNodeId === id);
  if (isMuted(n)) lines.push({ e: '🔇', t: <>Silenciada: ahora se calcula como si no estuviera. Pulsa <b>🔊 Volver a activar</b> para que cuente.</>, tone: 'text-ink-3' });
  else if (st) {
    const inQ = qty(st.in);
    const outQ = Math.max(qty(st.out), qty(st.terminal));
    const lost = (st.lost.quantity ?? 0) + (st.consumed.quantity ?? 0);
    if (n.type === 'input') lines.push({ e: '🌱', t: <>De aquí salen <b>{q(outQ)}</b> en cada vuelta.</> });
    else if (n.type === 'output') lines.push({ e: '🎯', t: <>Aquí llegan <b>{q(qty(st.terminal))}</b> en esta vuelta{total != null ? <> y <b>{q(total)}</b> sumando todas</> : null}.</>, tone: 'text-flow' });
    else if (inQ > 1e-9 || outQ > 1e-9) lines.push({ e: '📥', t: <>Le llegan <b>{q(inQ)}</b> y siguen <b>{q(outQ)}</b>{lost > 1e-9 ? <>: aquí se quedan <b>{q(lost)}</b></> : null}.</> });
    for (const e of causalOut) {
      const es = edgeSt?.[e.id];
      const to = doc.nodes[e.targetNodeId]?.title ?? '?';
      if (e.behavior.influence.mode === 'compensate') {
        const f = es?.compensationApplied ?? 0;
        if (f > 1e-6) lines.push({ e: '🩹', t: <>A «{to}» le quita el <b>{Math.round(f * 100)} %</b> de su fuerza para frenar.</>, tone: 'text-gain' });
      } else if (es?.influenceFactor != null && e.behavior.influence.targetDimension !== '__influence' && Math.abs(es.influenceFactor - 1) > 1e-4) {
        const pc = Math.round((es.influenceFactor - 1) * 100);
        lines.push(pc < 0 ? { e: '🪨', t: <>A «{to}» le quita el <b>{-pc} %</b>.</>, tone: 'text-loss' } : { e: '💪', t: <>A «{to}» le suma un <b>{pc} %</b>.</>, tone: 'text-gain' });
      }
    }
    if (st.compensation > 1e-6) lines.push({ e: '🩹', t: <>Tus remedios le quitan el <b>{Math.round(st.compensation * 100)} %</b> de su fuerza para frenar.</>, tone: 'text-gain' });
    if ((st.queue.quantity ?? 0) > 1e-9) lines.push({ e: '⏳', t: <>Esperan turno <b>{q(st.queue.quantity)}</b>: no caben todos.</>, tone: 'text-cond' });
    if ((st.stock.quantity ?? 0) > 1e-9) lines.push({ e: '🐷', t: <>Tiene guardadas <b>{q(st.stock.quantity)}</b>.</> });
    if (!st.active) lines.push({ e: '💤', t: <>Ahora está apagada: no se cumple lo que pusiste en «⏰ ¿Funciona siempre?».</>, tone: 'text-cond' });
    if (heat && (heat.state === 'warm' || heat.state === 'overheated')) lines.push({ e: '🌡️', t: <>Ojo: {heat.causes.join(' · ')}.</>, tone: 'text-cond' });
  }
  if (!lines.length) lines.push({ e: '💡', t: linked ? 'Ahora mismo no le llega nada.' : 'Está suelta: todavía no cambia nada. Únela a otra idea para que cuente.' });
  return <div className="space-y-1.5" data-testid="node-live">{lines.map((l, i) => <Line key={i} emoji={l.e} tone={l.tone}>{l.t}</Line>)}</div>;
}

/** Tres botones para entender el mapa desde esta idea. */
function TraceButtons({ n }: { n: MapNode }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="xs" variant="subtle" title="Te ilumino en el mapa todo lo que cambiaría si cambias esta idea" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'forward', isolate: false } })} data-testid="trace-forward">🔦 ¿Qué cambia si la toco?</Button>
      <Button size="xs" variant="subtle" title="Te ilumino todo lo que llega hasta aquí" onClick={() => useUI.setState({ trace: { rootId: n.id, direction: 'backward', isolate: false } })} data-testid="trace-backward">🔍 ¿De qué depende?</Button>
      <Button size="xs" variant="subtle" title="Apago lo demás para que la veas bien (Escape para salir)" onClick={() => { useUI.setState({ focusNodeId: n.id }); A.fit([n.id]); }}>🎯 Ver solo esto</Button>
    </div>
  );
}

/** ¿Ayuda o estorba a otra? Una barra de −5 a +5, sin modos raros. */
export function Weights({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const [inf, setInf, o2] = useParam<MapNode['weight']['influence']>('node', n.id, 'weight.influence');
  const [src, setSrc] = useParam<MapNode['influenceSource']>('node', n.id, 'influenceSource');
  const [ref, setRef] = useParam<number>('node', n.id, 'influenceReference');
  const [pick, setPick] = useState('');
  const ws = doc.project.settings.weightedScale;
  const v = inf ? Math.round(scaleValueToWeighted(inf, doc.project.settings).value * 10) / 10 : 0;
  const targets = Object.values(doc.edges).filter((e) => e.sourceNodeId === n.id && e.type === 'causal' && e.behavior.influence.mode !== 'compensate');
  const word = v < 0 ? 'estorba' : 'ayuda';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11.5px] font-medium text-loss">😣 Estorba</span>
        <input type="range" className="mdf-range min-w-0 flex-1" min={ws.min} max={ws.max} step={1} value={v} aria-label="¿Ayuda o estorba?" data-testid="influence-slider"
          onChange={(e) => { const x = Number(e.target.value); setInf(x === 0 ? null : { mode: 'weighted', value: x, scaleId: null }); }} />
        <span className="shrink-0 text-[11.5px] font-medium text-gain">Ayuda 😀</span>
        <OverrideMark {...o2} />
      </div>
      <p className={cx('text-center text-[13px] font-semibold', v < 0 ? 'text-loss' : v > 0 ? 'text-gain' : 'text-ink-2')} data-testid="scale-Influencia">
        {v === 0 ? 'Ni ayuda ni estorba (0)' : `${v < 0 ? 'Estorba' : 'Ayuda'} ${howMuch(v)} (${signed(v)})`}
      </p>
      {v !== 0 && (targets.length > 0 ? (
        <p className="text-[12px] leading-snug text-ink-2">Ahora {word} a {targets.map((e, i) => <span key={e.id}>{i ? ', ' : ''}<b>«{doc.nodes[e.targetNodeId]?.title}»</b></span>)}. Si quieres que {word} a otra, únela también con una línea «Influye».</p>
      ) : (
        <div className="space-y-1.5 rounded-lg bg-[color-mix(in_srgb,var(--condition)_10%,transparent)] p-2.5">
          <p className="text-[12px] leading-snug text-ink-2">⚠️ Ojo: así todavía no cuenta. Dime a quién {word} y la uno yo:</p>
          <div className="flex gap-1.5">
            <div className="min-w-0 flex-1"><NodeSelect label={`¿A quién ${word}?`} value={pick || null} allowNone onChange={setPick} exclude={[n.id]} /></div>
            <Button size="sm" variant="solid" disabled={!pick} onClick={() => { A.connect(n.id, pick, 'causal'); setPick(''); }} data-testid="influence-link">Unir</Button>
          </div>
        </div>
      ))}
      {v !== 0 && (
        <details className="text-[12px] text-ink-2">
          <summary className="cursor-pointer text-ink-3">Para expertos: ¿su fuerza cambia con lo que le llega?</summary>
          <div className={cx('mt-2 grid gap-2', src !== 'static' && 'grid-cols-2')}>
            <Field label="¿De qué depende su fuerza?" help="Ejemplo: un rumor empuja más cuanta más gente lo oye.">
              <Select label="Origen de la influencia" value={src} onChange={setSrc} options={[{ value: 'static', label: 'Siempre igual' }, { value: 'throughput', label: 'De lo que le llega' }, { value: 'stock', label: 'De lo que tiene guardado' }]} />
            </Field>
            {src !== 'static' && <Field label="¿Con cuánto llega a toda su fuerza?" help="Cuando le llegue (o guarde) esto, empuja o frena del todo."><NumberInput value={ref} min={0.0001} onChange={setRef} /></Field>}
          </div>
        </details>
      )}
    </div>
  );
}

/** Qué es cada cosa que viaja por el mapa, dicho para un niño. */
const DIM_KID: Record<string, string> = {
  quantity: 'Cuántas cosas salen en cada vuelta.',
  quality: 'Cómo de buenas son: de 0 (nada) a 1 (perfectas).',
  speed: 'Lo rápido que van: 1 es normal y 2, el doble de rápido.',
  potential: 'Lo que pueden llegar a dar: de 0 a 1.',
  load: 'El trabajo que cuestan, en horas.',
};
const unitWord = (u: string) => (u === 'h' ? 'horas' : u === 'u' || u === 'u.' || u === '×' ? '' : u);

function DimensionValues({ n }: { n: MapNode }) {
  const { doc, eff } = useInspector();
  const dv = eff.nodes[n.id]?.dimensionValues ?? {};
  const setDim = (dim: string, patch: Partial<DimensionValue>) => {
    const cur: DimensionValue = dv[dim] ?? { value: doc.dimensions[dim]?.defaultValue ?? 0, mode: 'numeric', unit: doc.dimensions[dim]?.unit ?? '', confidence: 'estimate', source: '', range: null };
    A.apply((d) => op.setParam(d, 'node', n.id, `dimensionValues.${dim}`, { ...cur, ...patch }), `dv-${n.id}-${dim}`);
  };
  const qv = dv.quantity;
  const others = Object.values(doc.dimensions).filter((d) => d.id !== 'quantity');
  return (
    <div className="space-y-3">
      <Field label="¿Cuántos salen de aquí en cada vuelta?" help="Por ejemplo: 100 llamadas, 20 clientes o 500 €.">
        <NumberInput value={qv?.value ?? null} placeholder="pon un número" min={0} onChange={(value) => setDim('quantity', { value, mode: 'numeric' })} data-param="dim-quantity" />
      </Field>
      {qv && (
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="¿Es un dato o a ojo?">
            <Select label="¿Cuánto estás seguro?" value={qv.confidence} onChange={(confidence) => setDim('quantity', { confidence })}
              options={[{ value: 'hypothesis', label: '🤷 A ojo' }, { value: 'estimate', label: 'Más o menos' }, { value: 'observation', label: 'Lo he visto' }, { value: 'verified', label: '✅ Comprobado' }]} />
          </Field>
          <Field label="¿De dónde lo sacas?">
            <TextInput value={qv.source} onChange={(source) => setDim('quantity', { source })} placeholder="Una web, un amigo…" aria-label="¿De dónde lo sacas?" />
          </Field>
        </div>
      )}
      <details className="text-[12px]">
        <summary className="cursor-pointer text-ink-3">Para expertos: otras cosas que se pueden medir (calidad, rapidez…)</summary>
        <div className="mt-2 space-y-2">
          {others.map((d) => {
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
                  <div className="mt-2 flex items-center gap-1.5">
                    <Segmented size="xs" label="Cómo lo dices" value={v.mode} onChange={(mode) => setDim(d.id, { mode, value: mode === 'qualitative' ? 2 : v.value })}
                      options={[{ value: 'numeric', label: 'Número', title: 'Numérica' }, { value: 'weighted', label: '−5…+5', title: 'Ponderada' }, { value: 'qualitative', label: 'Palabras', title: 'Cualitativa' }]} />
                    {v.mode === 'qualitative' ? (
                      <Select label="Nivel" className="flex-1" value={String(Math.round(v.value))} onChange={(x) => setDim(d.id, { value: Number(x) })}
                        options={(doc.project.settings.qualitativeScales.find((s) => s.id === (d.scaleId ?? doc.project.settings.defaultScaleId)) ?? doc.project.settings.qualitativeScales[0]).levels.map((l, i) => ({ value: String(i), label: l.label }))} />
                    ) : (
                      <NumberInput className="flex-1" value={v.value} onChange={(value) => setDim(d.id, { value })} data-param={`dim-${d.id}`} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {doc.project.settings.depth === 'expert' && qv && qv.mode !== 'qualitative' && (
            <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
              Cuántos salen si va mal / si va bien:
              <NumberInput className="flex-1" value={qv.range?.low ?? null} placeholder="mal" onChange={(low) => setDim('quantity', { range: { low, high: qv.range?.high ?? qv.value } })} />
              <NumberInput className="flex-1" value={qv.range?.high ?? null} placeholder="bien" onChange={(high) => setDim('quantity', { range: { high, low: qv.range?.low ?? qv.value } })} />
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function Mitigators({ n }: { n: MapNode }) {
  const { doc } = useInspector();
  const [comb, setComb] = useParam<MapNode['mitigationCombination']>('node', n.id, 'mitigationCombination');
  const [pick, setPick] = useState<string>('');
  const edges = Object.values(doc.edges).filter((e) => e.targetNodeId === n.id && e.type === 'causal' && e.behavior.influence.mode === 'compensate');
  const addMitigator = (sourceId: string | null) => { A.addRemedy(n.id, sourceId); setPick(''); };
  return (
    <div className="space-y-2">
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

export function MitigatorRow({ edgeId }: { edgeId: string }) {
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
        const cuando = type === 'conditional' ? ' (solo cuando se cumple lo de abajo)' : type === 'temporal' ? ' (solo en esas vueltas)' : '';
        if (base < 0) return frac >= 1 ? `Ahora frena ${signed(base)}: con este remedio deja de frenar del todo${cuando}.` : `Ahora frena ${signed(base)}: con este remedio se queda en ${signed(base * (1 - frac))}${cuando}.`;
        return frac >= 1 ? `Arregla del todo lo que se pierde aquí${cuando}.` : `Arregla el ${fmt(frac * 100, 0)} % de lo que se pierde aquí${cuando}${unit === 'points' ? ` (${fmt(amount)} de ${wmax} puntos)` : ''}.`;
      })()}</p>
      {type === 'temporal' && (
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">Desde la vuelta<NumberInput className="w-14" value={from} min={1} onChange={(v) => setFrom(Math.round(v))} />hasta la<NumberInput className="w-14" value={to} placeholder="∞" min={1} onChange={(v) => setTo(Math.round(v))} /></div>
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
      {ins.length < 2 && outs.length < 2 && <p className="text-[12px] leading-snug text-ink-3">Ahora no hace falta: le llega una sola línea y sale una sola. Cuando le lleguen varias, aquí decides cómo se juntan o se reparten.</p>}
      {ins.length >= 2 && (<>
      <Field label={<span className="inline-flex items-center gap-1">📥 Le llegan cosas de {ins.length} sitios: ¿cómo las junta? <OverrideMark {...o1} /></span>}>
        <Select label="Convergencia" value={rule} onChange={setRule} options={[
          { value: 'sum', label: 'Las suma todas' }, { value: 'weighted', label: 'Las mezcla según su peso' }, { value: 'priority', label: 'Primero la más importante' }, { value: 'max', label: 'Se queda con la mayor' },
          { value: 'min', label: 'Se queda con la menor' }, { value: 'dedupe', label: 'No cuenta dos veces lo mismo' }, ...(expert ? [{ value: 'custom' as const, label: 'Con una fórmula (para expertos)' }] : []),
        ]} />
      </Field>
      {rule === 'dedupe' && <Field label="¿Cuánto se repiten?" help="100 % = lo que llega por cada lado es lo mismo (por ejemplo, la misma persona por dos caminos)."><NumberInput percent value={overlap} min={0} max={1} onChange={setOverlap} /></Field>}
      {rule === 'custom' && <Field label="Fórmula" help="Usa in1, in2… (cada línea que llega) y sum, max, min, count."><TextInput value={formula} onChange={setFormula} className="font-mono" /></Field>}
      </>)}
      {outs.length >= 2 && (<>
      <Field label={<span className="inline-flex items-center gap-1">📤 Sale hacia {outs.length} sitios: ¿cómo lo reparte? <OverrideMark {...o2} /></span>}>
        <Select label="Reparto" value={mode} onChange={setMode} options={[
          { value: 'proportional', label: 'Según el peso de cada línea' }, { value: 'fixed', label: 'Con porcentajes fijos' }, { value: 'conditional', label: 'Según una condición en cada línea' },
          { value: 'priority', label: 'Llena la primera y luego la siguiente' }, { value: 'competitive', label: 'Según cuánto cabe en cada una' }, { value: 'dynamic', label: 'Según la fuerza de otra idea' },
        ]} />
      </Field>
      {mode === 'dynamic' && <Field label="¿Qué idea decide el reparto?"><NodeSelect label="Nodo de referencia" value={dyn} onChange={setDyn} exclude={[n.id]} /></Field>}
      {mode === 'dynamic' && dyn && doc.nodes[dyn] && (
        <div className="space-y-1.5 rounded-lg border border-line p-2" data-testid="door-dynamic">
          <p className="text-[12px] leading-snug text-ink-2">Esta es la fuerza de «{doc.nodes[dyn].title}»: cuanto más empuje, más se lleva su lado. Cámbiala aquí mismo.</p>
          <Weights n={doc.nodes[dyn]} />
        </div>
      )}
      <div className="space-y-1 rounded-lg bg-surface-2/70 p-2">
        {outs.map((e) => <ShareRow key={e.id} edgeId={e.id} mode={mode} />)}
      </div>
      </>)}
      {n.activationConditionId && <Field label="💤 Cuando está apagada (no se cumple su condición)…">
        <Segmented size="xs" label="Modo inactivo" value={inactiveMode} onChange={setInactiveMode} options={[{ value: 'passthrough', label: 'Deja pasar todo igual' }, { value: 'block', label: 'No deja pasar nada' }]} />
      </Field>}
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
      <Field label="↔️ ¿Dónde va el texto?" help="Centrado queda más limpio; a la izquierda se lee mejor si es largo.">
        <Segmented size="xs" label="Alineación" value={n.visualStyle.textAlign ?? 'center'} onChange={(textAlign) => upd({ textAlign })}
          options={[{ value: 'center', label: 'Centrado' }, { value: 'left', label: 'A la izquierda' }]} />
      </Field>
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
      <TagFields n={n} />
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

export function DiscoveryBlock({ n }: { n: MapNode }) {
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

/* ------------------------------------------------------------------ */
/* Lo que puedes hacer con una idea: cada cosa dice para qué te sirve   */
/* ------------------------------------------------------------------ */

export interface NodeFeature {
  id: string;
  emoji: string;
  /** lo que pone en el botón */
  title: string;
  /** para qué te sirve, en una línea */
  sub: string;
  /** lo que te cuento al abrirlo, como un colega */
  intro: string;
  testId: string;
  badge?: string | null;
  tone?: 'loss' | 'gain' | 'cond' | null;
  render: () => ReactNode;
}

export function nodeFeatures(doc: ProjectDoc, n: MapNode): NodeFeature[] {
  const isMeta = ['note', 'label', 'comment'].includes(n.type);
  const isGroup = n.type === 'group' || n.type === 'container';
  const edges = Object.values(doc.edges);
  const flowIn = edges.filter((e) => e.type === 'flow' && e.targetNodeId === n.id).length;
  const flowOut = edges.filter((e) => e.type === 'flow' && e.sourceNodeId === n.id).length;
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  const v = n.weight.influence ? scaleValueToWeighted(n.weight.influence, doc.project.settings).value : 0;
  const loses = bhs.some((b) => ['filter', 'reducer', 'consumer', 'restrictor'].includes(b.behaviorType));
  const mitig = edges.filter((e) => e.targetNodeId === n.id && e.type === 'causal' && e.behavior.influence.mode === 'compensate').length;
  const isGen = n.type === 'input' || bhs.some((b) => b.behaviorType === 'generator');
  const linkCount = edges.filter((e) => e.sourceNodeId === n.id || e.targetNodeId === n.id).length;
  const annCount = Object.values(doc.annotations).filter((x) => x.ownerId === n.id).length;
  const qv = n.dimensionValues.quantity?.value;
  const f: NodeFeature[] = [];
  f.push({ id: 'text', emoji: '✏️', title: 'Nombre y explicación', sub: 'Lo que se lee en la burbuja.', testId: 'section-text', badge: n.description.trim() ? 'con explicación' : null,
    intro: 'Lo que pongas en «Explicación» sale dentro de la burbuja, debajo del nombre. Así, cuando mires el mapa, sabes de qué va cada cosa sin abrir nada.', render: () => <TextFields n={n} /> });
  if (!isMeta && !isGroup) {
    if (isGen) f.push({ id: 'output', emoji: '✨', title: '¿Cuánto sale de aquí?', sub: 'Lo que pones en marcha en cada vuelta.', testId: 'section-dimensions', badge: qv != null ? `${fmt(qv)} por vuelta` : null,
      intro: 'De aquí sale lo que mueves por el mapa. Pon cuántos salen en cada vuelta. Una vuelta es un trozo de tiempo: una semana, un mes… lo que tú decidas. Luego ves cuántos llegan a tu meta.', render: () => <DimensionValues n={n} /> });
    f.push({ id: 'behaviors', emoji: '⚙️', title: '¿Qué le pasa a lo que llega?', sub: 'Si aquí se pierde algo, se guarda o se multiplica.', testId: 'section-behaviors',
      badge: bhs.length ? `${BEHAVIOR_KID[bhs[0]!.behaviorType].emoji} ${BEHAVIOR_KID[bhs[0]!.behaviorType].name}${bhs.length > 1 ? ` +${bhs.length - 1}` : ''}` : null,
      intro: 'Aquí dices qué pasa con lo que llega a esta idea. Por ejemplo: de 100 llamadas solo valen 65; eso es un 🧺 Colador que deja pasar el 65 %. Si no pones nada, lo que llega sigue igual.', render: () => <BehaviorList nodeId={n.id} /> });
    f.push({ id: 'influence', emoji: '💪', title: '¿Ayuda o estorba a otra?', sub: 'Para que cuente lo que te facilita o te complica.', testId: 'section-weights',
      badge: v < 0 ? `estorba ${signed(v)}` : v > 0 ? `ayuda ${signed(v)}` : null, tone: v < 0 ? 'loss' : v > 0 ? 'gain' : null,
      intro: 'Si esto te pone las cosas más fáciles o más difíciles, díselo aquí. Ejemplo: «la lluvia» estorba a «ir en bici». Mueve la barra y dime a quién: yo hago la línea.', render: () => <Weights n={n} /> });
    if (v < 0 || loses || mitig > 0) f.push({ id: 'remedies', emoji: '🩹', title: '¿Qué haces contra esto?', sub: 'Apunta tu remedio y mira cuánto lo arregla.', testId: 'section-mitigators', badge: mitig ? `${mitig} remedio${mitig > 1 ? 's' : ''}` : null, tone: mitig ? 'gain' : null,
      intro: 'Si esto te frena o aquí se pierde algo, apunta lo que haces para que frene menos. Por ejemplo: si «No tengo tiempo» frena, un remedio es «Hacer un horario». Te digo al momento cuánto lo arregla.', render: () => <Mitigators n={n} /> });
    f.push({ id: 'conditions', emoji: '⏰', title: '¿Funciona siempre?', sub: 'Por si solo cuenta a veces.', testId: 'section-conditions', badge: n.activationConditionId ? 'solo a veces' : null, tone: n.activationConditionId ? 'cond' : null,
      intro: '¿Esto solo funciona a veces? Por ejemplo, a partir de la semana 4 o cuando a otra idea le llegue bastante. Si no pones nada, funciona siempre.',
      render: () => <ConditionsList ownerType="node" ownerId={n.id} ids={n.activationConditionId ? [n.activationConditionId] : []} ownerNode={n.id} emptyText="Ahora funciona siempre." /> });
    if (flowIn >= 2 || flowOut >= 2 || n.activationConditionId) f.push({ id: 'routing', emoji: '🔀', title: '¿Cómo junta y reparte?', sub: 'Le llega de varios sitios o sale hacia varios.', testId: 'section-routing',
      intro: 'A esta idea le llegan cosas de varios sitios o salen hacia varios. Aquí decides cómo las junta y cómo las reparte.', render: () => <Routing n={n} /> });
  }
  f.push({ id: 'links', emoji: '🔗', title: '¿Con quién está unida?', sub: 'Sus líneas, para saltar a ellas.', testId: 'section-links', badge: linkCount ? `${linkCount} línea${linkCount > 1 ? 's' : ''}` : 'suelta',
    intro: 'Estas son sus líneas: ← lo que le llega y → adónde va. Pulsa una para verla. Para unirla a otra idea, arrastra desde uno de los puntos de su borde.', render: () => <Relations n={n} /> });
  if (!isGroup) f.push({ id: 'role', emoji: '🧩', title: '¿Qué es esto?', sub: 'Inicio, meta, idea, nota…', testId: 'section-role', badge: TYPE_LABEL[n.type],
    intro: 'Cambiarlo cambia las cuentas: de un inicio sale todo y en una meta se cuenta lo que llega.', render: () => <RoleField n={n} /> });
  if (!isMeta && !isGroup) f.push({ id: 'confidence', emoji: '🤔', title: '¿Es un dato o a ojo?', sub: 'Para saber qué tienes que comprobar.', testId: 'section-confidence', badge: n.metadata.confidence === 'hypothesis' ? 'a ojo' : n.metadata.confidence === 'verified' ? 'comprobado' : null, tone: n.metadata.confidence === 'hypothesis' ? 'cond' : null,
    intro: '¿Esto lo sabes seguro o lo pones a ojo? Si es a ojo, márcalo: el Marcador te avisará de que ese resultado hay que cogerlo con pinzas.', render: () => <ConfidenceField n={n} /> });
  f.push({ id: 'style', emoji: '🎨', title: 'Cómo se ve', sub: 'Color, forma, texto centrado, foto…', testId: 'section-style',
    intro: 'Para que se vea a tu gusto y lo distingas de un vistazo. No cambia las cuentas.', render: () => <StyleSection n={n} /> });
  f.push({ id: 'comments', emoji: '💬', title: 'Apuntar algo', sub: 'Dudas o cosas que tienes que mirar.', testId: 'section-comments', badge: annCount ? `${annCount}` : null,
    intro: 'Apunta aquí dudas o cosas pendientes. No salen en la burbuja; para eso está la explicación.', render: () => <Annotations ownerType="node" ownerId={n.id} /> });
  if (!isGroup) f.push({ id: 'files', emoji: '📎', title: 'Guardar un archivo', sub: 'Un presupuesto, una foto, un PDF…', testId: 'section-files', badge: n.metadata.attachmentIds.length ? `${n.metadata.attachmentIds.length}` : null,
    intro: 'Guarda aquí un documento que tenga que ver con esta idea, para tenerlo a mano.', render: () => <Attachments n={n} /> });
  f.push({ id: 'more', emoji: '🧰', title: 'Más cosas', sub: 'Etiquetas, bloquearla, capas…', testId: 'section-more',
    intro: 'Lo que se usa menos: etiquetas para encontrarla, bloquearla para no moverla sin querer o esconder lo que cuelga de ella.', render: () => <Advanced n={n} /> });
  return f;
}

const TONE: Record<string, string> = {
  loss: 'bg-[color-mix(in_srgb,var(--loss)_12%,transparent)] text-loss',
  gain: 'bg-[color-mix(in_srgb,var(--gain)_13%,transparent)] text-gain',
  cond: 'bg-[color-mix(in_srgb,var(--condition)_15%,transparent)] text-cond',
};

/** Las opciones como botones a la vista; al pulsar una, se abre solo esa. */
export function FeatureMenu({ features, open, onOpen, cols = 2 }: { features: NodeFeature[]; open: string | null; onOpen: (id: string | null) => void; cols?: 2 | 3 }) {
  const f = open ? features.find((x) => x.id === open) : null;
  if (f) {
    return (
      <div className="space-y-2.5" data-testid={f.testId}>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="subtle" onClick={() => onOpen(null)} data-testid="feature-back">← Volver</Button>
          <Ico e={f.emoji} size={16} />
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{f.title}</span>
        </div>
        <p className="rounded-lg bg-surface-2/70 px-2.5 py-2 text-[12px] leading-snug text-ink-2">{f.intro}</p>
        {f.render()}
      </div>
    );
  }
  return (
    <div className={cx('grid gap-1.5', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {features.map((x) => (
        <button key={x.id} type="button" onClick={() => onOpen(x.id)} data-testid={`tile-${x.id}`} title={x.intro}
          className="flex items-start gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-accent hover:bg-accent-soft/40">
          <Ico e={x.emoji} size={16} className="mt-[1px]" />
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold leading-tight text-ink">{x.title}</span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-3">{x.sub}</span>
            {x.badge && <span className={cx('mt-1 inline-block rounded-full px-1.5 py-px text-[10.5px] font-medium', x.tone ? TONE[x.tone] : 'bg-surface-2 text-ink-2')}>{x.badge}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export function NodeInspector({ id }: { id: string }) {
  const { doc } = useInspector();
  const [open, setOpen] = useState<string | null>(null);
  const n = doc.nodes[id];
  if (!n) return null;
  const isMeta = ['note', 'label', 'comment'].includes(n.type);
  const isGroup = n.type === 'group' || n.type === 'container';
  if (n.aliasOf && doc.nodes[n.aliasOf]) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-[12px] text-ink-2"><Link2 className="size-4 text-accent" />Clon de «{doc.nodes[n.aliasOf].title}»</div>
        <p className="text-[12px] leading-snug text-ink-3">Un clon es la misma idea puesta en otro sitio del mapa, como una foto suya: si cambias la original, cambia también esta, y en las cuentas solo se cuenta una vez.</p>
        <Button size="sm" variant="outline" onClick={() => useUI.getState().setSelection([n.aliasOf!])}>Ir a la original</Button>
        <Button size="sm" variant="ghost" onClick={() => A.apply((d) => op.updateNode(d, n.id, { aliasOf: null, title: d.nodes[n.aliasOf!].title }))}>Separarla (que sea una idea distinta)</Button>
      </div>
    );
  }
  if (levelOf(doc.project.settings.depth) < 3) return <KidNodeInspector id={n.id} />;
  const papel = n.metadata.custom?.papel && n.metadata.custom.papel in PAPEL ? PAPEL[n.metadata.custom.papel as Papel] : null;
  const head = papel ? { emoji: papel.emoji, name: papel.name, hint: papel.hint } : { emoji: TYPE_INFO[n.type].emoji, name: TYPE_LABEL[n.type], hint: TYPE_INFO[n.type].hint };
  const muted = isMuted(n);
  return (
    <div data-testid="node-inspector">
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <Ico e={head.emoji} size={22} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-display text-[16px] font-medium text-ink">{head.name}{n.locked && <Lock className="size-3.5 text-ink-3" aria-label="Bloqueada" />}</span>
          <span className="block text-[12px] leading-snug text-ink-3">{head.hint}</span>
        </span>
        {(muted || canMute(doc, n)) && <IconButton size="xs" label={muted ? '🔊 Volver a activar' : '🔇 Silenciar: mira qué pasa sin ella'} onClick={() => toggleMute(n.id)} data-testid="inspector-mute"><span className="text-[13px] leading-none">{muted ? '🔇' : '🔊'}</span></IconButton>}
        <IconButton size="xs" label="Borrar" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
      </div>
      <div className="space-y-3 border-b border-line px-4 py-3">
        <DiscoveryBlock n={n} />
        {!isMeta && !isGroup && (
          <div className="space-y-2 rounded-xl bg-surface-2/70 p-3" data-testid="node-summary">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink"><Ico e="🔎" size={14} />Cómo va ahora</div>
            <NodeLive n={n} />
            <TraceButtons n={n} />
          </div>
        )}
      </div>
      <div className="space-y-2 px-4 py-3">
        {!open && <p className="text-[12.5px] font-semibold text-ink">¿Qué quieres hacer con ella?</p>}
        <FeatureMenu features={nodeFeatures(doc, n)} open={open} onOpen={setOpen} />
      </div>
    </div>
  );
}
