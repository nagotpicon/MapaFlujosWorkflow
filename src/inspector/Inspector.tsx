/** Inspector contextual: burbuja, conexión, selección múltiple o proyecto. */
import { useDeferredValue, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { effectiveDoc } from '../engine/scenario';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { BEHAVIOR_KID, BEHAVIOR_ORDER } from '../core/model/behaviorLibrary';
import { NODE_COLORS, COLOR_LABEL } from '../ui/icons';
import { Badge, Button, Empty, Field, IconButton, Menu, NumberInput, Section, Segmented, TextArea, TextInput, cx } from '../ui/primitives';
import { InspectorContext } from './fields';
import { NodeInspector } from './NodeInspector';
import { EdgeInspector } from './EdgeInspector';
import type { FlowDimensionDef, MapNode } from '../core/model/schema';
import { newId } from '../core/model/factory';

function MultiInspector({ ids }: { ids: string[] }) {
  const doc = useProject((s) => s.doc)!;
  const nodes = ids.map((id) => doc.nodes[id]).filter(Boolean);
  const [tag, setTag] = useState('');
  const shared = <K extends keyof MapNode['visualStyle']>(k: K) => {
    const vals = new Set(nodes.map((n) => JSON.stringify(n.visualStyle[k])));
    return vals.size === 1 ? nodes[0].visualStyle[k] : null;
  };
  const setStyle = (patch: Partial<MapNode['visualStyle']>) => A.apply((d) => op.updateNodes(d, ids, (n) => ({ visualStyle: { ...n.visualStyle, ...patch } })));
  const color = shared('color');
  const shape = shared('shape');
  const commonTags = nodes.reduce<string[]>((acc, n, i) => (i === 0 ? n.tags : acc.filter((t) => n.tags.includes(t))), []);
  const ws = doc.project.settings.weightedScale;
  const varios = <span className="font-normal text-ink-3"> · ahora son distintas</span>;
  return (
    <div data-testid="multi-inspector">
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <span className="text-[22px] leading-none" aria-hidden>👥</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-medium text-ink">{nodes.length} ideas elegidas</span>
          <span className="block text-[12px] leading-snug text-ink-3">Lo que cambies aquí les pasa a todas a la vez.</span>
        </span>
        <IconButton size="xs" label="Borrar las elegidas" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
      </div>
      <Section emoji="🎨" title="Cambiarlas todas a la vez" hint="Color, forma, etiquetas y lo que hacen.">
        <Field label={<>Color{color == null && varios}</>} help="Píntalas igual para ver de un vistazo que van juntas.">
          <div className="flex flex-wrap gap-1.5">
            {NODE_COLORS.map((c) => <button key={c} type="button" aria-label={COLOR_LABEL[c]} title={COLOR_LABEL[c]} onClick={() => setStyle({ color: c })} className={cx('size-6 rounded-full border-2', color === c ? 'border-accent' : 'border-transparent')} style={{ background: `var(--n-${c}-ac)` }} />)}
          </div>
        </Field>
        <Field label={<>Forma{shape == null && varios}</>}>
          <Segmented size="xs" label="Forma" value={shape ?? ('' as never)} onChange={(s) => setStyle({ shape: s })} options={[{ value: 'rounded', label: 'Redondeada' }, { value: 'pill', label: 'Pastilla' }, { value: 'rect', label: 'Cuadrada' }, { value: 'circle', label: 'Círculo' }, { value: 'diamond', label: 'Rombo' }]} />
        </Field>
        <Field label="Etiquetas que tienen todas" help="Una etiqueta es una palabra para encontrarlas luego (#casa, #dinero…). Pulsa una para quitársela a todas.">
          <div className="flex flex-wrap gap-1">
            {commonTags.map((t) => <button key={t} type="button" title="Quitar a todas" onClick={() => A.apply((d) => op.updateNodes(d, ids, (n) => ({ tags: n.tags.filter((x) => x !== t) })))}><Badge tone="accent">#{t} ×</Badge></button>)}
            <form className="flex-1" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) A.apply((d) => op.updateNodes(d, ids, (n) => ({ tags: [...new Set([...n.tags, tag.trim()])] }))); setTag(''); }}>
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ escribe una y pulsa Intro" aria-label="Etiqueta para todas" className="h-6 w-full bg-transparent text-[12px] outline-none placeholder:text-ink-3" />
            </form>
          </div>
        </Field>
        <Field label="¿De qué tipo son?" help="Una palabra para agruparlas, por ejemplo «dinero» o «familia».">
          <TextInput value={new Set(nodes.map((n) => n.metadata.category)).size === 1 ? nodes[0].metadata.category : ''} placeholder="ahora son distintas" onChange={(category) => A.apply((d) => op.updateNodes(d, ids, (n) => ({ metadata: { ...n.metadata, category } })), 'multi-cat')} />
        </Field>
        <Field label="Cuánto empujan o frenan" help={`De ${ws.min} (frenan mucho) a +${ws.max} (empujan mucho). 0 = ni ayudan ni frenan.`}>
          <NumberInput value={new Set(nodes.map((n) => n.weight.influence?.value)).size === 1 ? nodes[0].weight.influence?.value ?? null : null} placeholder="ahora son distintas" min={ws.min} max={ws.max}
            onChange={(v) => A.apply((d) => ids.reduce((acc, id) => op.setParam(acc, 'node', id, 'weight.influence', { mode: 'weighted', value: v, scaleId: null }), d))} />
        </Field>
        <Menu.Root>
          <Menu.Trigger asChild><Button size="sm" variant="outline"><Plus className="size-3.5" />Darles a todas algo que hacer</Button></Menu.Trigger>
          <Menu.Content>
            {BEHAVIOR_ORDER.map((t) => <Menu.Item key={t} icon={<span aria-hidden>{BEHAVIOR_KID[t].emoji}</span>} onSelect={() => A.apply((d) => ids.reduce((acc, id) => op.addBehavior(acc, id, t).doc, d))}>{BEHAVIOR_KID[t].name}</Menu.Item>)}
          </Menu.Content>
        </Menu.Root>
      </Section>
      <Section emoji="📐" title="Ordenarlas" hint="Juntarlas, ponerlas en fila o cerrar un círculo con ellas.">
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="subtle" onClick={() => A.groupSelection()} title="Las une para moverlas juntas">📦 Hacer un grupo</Button>
          <Button size="sm" variant="subtle" onClick={() => A.groupSelection('container')} title="Las mete en una caja con nombre">🗂️ Meter en una zona</Button>
          <Button size="sm" variant="subtle" onClick={A.createCircuitFromSelection} title="Lo que sale de la última vuelve a la primera, como el boca a boca">🔁 Hacer un bucle</Button>
          <Button size="sm" variant="subtle" onClick={A.autoLayout} title="Las coloca solas, bien repartidas">✨ Ordenar solas</Button>
        </div>
        <Field label="Ponerlas en fila">
          <div className="flex flex-wrap gap-0.5">
            {(['left', 'center', 'right', 'top', 'middle', 'bottom', 'hdist', 'vdist'] as const).map((m) => (
              <IconButton key={m} size="xs" label={({ left: 'Alinear a la izquierda', center: 'Centrar horizontalmente', right: 'Alinear a la derecha', top: 'Alinear arriba', middle: 'Centrar verticalmente', bottom: 'Alinear abajo', hdist: 'Repartir el mismo espacio a lo ancho', vdist: 'Repartir el mismo espacio a lo alto' })[m]} onClick={() => A.align(m)}>
                <span className="text-[13px] leading-none">{({ left: '⇤', center: '↔', right: '⇥', top: '⤒', middle: '↕', bottom: '⤓', hdist: '⋯', vdist: '⋮' })[m]}</span>
              </IconButton>
            ))}
          </div>
        </Field>
        <Button size="sm" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" />Borrar las elegidas</Button>
      </Section>
    </div>
  );
}

function DimensionEditor() {
  const doc = useProject((s) => s.doc)!;
  const upd = (id: string, patch: Partial<FlowDimensionDef>) => A.apply((d) => ({ ...d, dimensions: { ...d.dimensions, [id]: { ...d.dimensions[id], ...patch } } }), `dim-${id}`);
  return (
    <div className="space-y-1.5">
      <p className="text-[11.5px] leading-snug text-ink-3">Por tu mapa viajan cosas: cuántas hay (cantidad), cómo de buenas son (calidad)… Aquí puedes medir otras, como confianza, dinero o ganas.</p>
      {Object.values(doc.dimensions).map((d) => (
        <div key={d.id} className="rounded-lg border border-line p-2">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color" title="Color" value={d.color} onChange={(e) => upd(d.id, { color: e.target.value })} className="size-5 cursor-pointer rounded border-0 bg-transparent" />
            <input aria-label="Nombre de lo que se mide" value={d.name} onChange={(e) => upd(d.id, { name: e.target.value })} className="h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-[12.5px] font-medium text-ink outline-none focus:bg-surface-2" />
            {d.builtin ? <Badge>{d.aggregation === 'extensive' ? 'se suma' : 'se hace la media'}</Badge> : (
              <Segmented size="xs" label="¿Cómo se juntan?" value={d.aggregation} onChange={(aggregation) => upd(d.id, { aggregation })} options={[{ value: 'extensive', label: 'Se suman' }, { value: 'intensive', label: 'Media' }]} />
            )}
            {!d.builtin && <IconButton size="xs" label="Dejar de medir esto" variant="danger" onClick={() => A.apply((x) => { const dims = { ...x.dimensions }; delete dims[d.id]; return { ...x, dimensions: dims }; })}><Trash2 className="size-3" /></IconButton>}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            <label className="space-y-0.5"><span className="block text-[10.5px] text-ink-3">Se cuenta en…</span><TextInput value={d.unit} onChange={(unit) => upd(d.id, { unit })} placeholder="€, personas…" aria-label="Unidad" /></label>
            <label className="space-y-0.5"><span className="block text-[10.5px] text-ink-3">Lo menos</span><NumberInput value={d.range.min} onChange={(min) => upd(d.id, { range: { ...d.range, min } })} aria-label="Mínimo" /></label>
            <label className="space-y-0.5"><span className="block text-[10.5px] text-ink-3">Lo más</span><NumberInput value={d.range.max} onChange={(max) => upd(d.id, { range: { ...d.range, max } })} aria-label="Máximo" /></label>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => A.apply((d) => { const id = newId('dim'); return { ...d, dimensions: { ...d.dimensions, [id]: { id, key: id, name: 'Nueva dimensión', description: '', dataType: 'numeric', measurementMode: 'instant', unit: '', range: { min: 0, max: 1 }, aggregation: 'intensive', confidence: 'estimate', source: '', color: '#ec4899', scaleId: null, builtin: false, defaultValue: 0.5 } } }; })}>
        <Plus className="size-3.5" />Medir otra cosa
      </Button>
      <p className="text-[11px] leading-snug text-ink-3">«Se suman» para lo que se cuenta (personas, euros): si llegan 3 y 2, hay 5. «Media» para cómo son las cosas (calidad, confianza): si llega un 8 y un 6, queda un 7.</p>
    </div>
  );
}

function ProjectPanel() {
  const doc = useProject((s) => s.doc)!;
  const set = (patch: Partial<typeof doc.project.settings>) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, ...patch } } }));
  const circuits = Object.values(doc.circuits);
  return (
    <div data-testid="project-panel">
      <div className="flex items-start gap-2.5 border-b border-line px-4 py-3">
        <span className="text-[22px] leading-none" aria-hidden>🗺️</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-medium text-ink">Tu mapa</span>
          <span className="block text-[12px] leading-snug text-ink-3">No has elegido nada, así que aquí ves cosas de todo el mapa.</span>
        </span>
      </div>
      <div className="space-y-2.5 border-b border-line px-4 py-3">
        <Field label="¿Cómo se llama?"><TextInput value={doc.project.name} onChange={(name) => A.apply((d) => ({ ...d, project: { ...d.project, name } }), 'pname')} /></Field>
        <Field label="¿De qué va?"><TextArea rows={2} value={doc.project.description} onChange={(description) => A.apply((d) => ({ ...d, project: { ...d.project, description } }), 'pdesc')} placeholder="Cuéntalo en una frase…" /></Field>
        <p className="rounded-lg bg-surface-2/70 px-3 py-2 text-[12px] leading-snug text-ink-2">👉 Pulsa una idea o una línea para ver lo suyo. Doble clic en un hueco vacío para poner una idea nueva.</p>
      </div>
      <Section emoji="⏱️" title="Cuánto tiempo pruebo" hint="Cuántas vueltas da tu mapa cuando lo pruebas.">
        <Field label="¿Cuántas rondas?" help="Una ronda es un trozo de tiempo: una semana, un mes… lo que tú quieras. Más rondas = ver más lejos.">
          <NumberInput value={doc.project.settings.simulation.iterations} min={1} max={500} onChange={(v) => set({ simulation: { iterations: Math.round(v) } })} data-testid="iterations-input" />
        </Field>
      </Section>
      <Section emoji="🔁" title="Bucles" hint="Círculos que se alimentan solos, como el boca a boca." count={circuits.length} defaultOpen={circuits.length > 0}>
        {circuits.length === 0 ? <p className="text-[11.5px] leading-snug text-ink-3">Aún no hay. Elige varias ideas en orden (con Mayús) y pulsa «🔁 Hacer un bucle»: lo que sale de la última vuelve a la primera.</p> : circuits.map((c) => (
          <button key={c.id} type="button" onClick={() => c.returnEdgeId && useUI.getState().setSelection([], [c.returnEdgeId])} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-surface-2" title={`Vuelve al principio el ${c.returnPercent} % de lo que sale`}>
            <span aria-hidden>🔁</span><span className="flex-1 truncate">{c.name}</span><Badge>vuelve {c.returnPercent} %</Badge>
          </button>
        ))}
      </Section>
      <Section emoji="📏" title="Qué se mide" hint="Lo que viaja por el mapa: cantidad, calidad… y lo que tú inventes." defaultOpen={false}><DimensionEditor /></Section>
      <Section emoji="🧰" title="Ajustes" hint="Escalas, colores, leyenda y atajos de teclado." defaultOpen={false}>
        <Button size="sm" variant="outline" onClick={() => useUI.setState({ overlay: 'settings' })}>Abrir los ajustes…</Button>
      </Section>
    </div>
  );
}

export function Inspector() {
  // prioridad baja: durante un arrastre el lienzo va primero
  const doc = useDeferredValue(useProject((s) => s.doc));
  const sel = useUI((s) => s.selection);
  const eff = useMemo(() => (doc ? effectiveDoc(doc, doc.project.activeScenarioId) : null), [doc]);
  if (!doc || !eff) return null;
  const scenario = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  const nodeIds = sel.nodes.filter((id) => doc.nodes[id]);
  const edgeIds = sel.edges.filter((id) => doc.edges[id]);
  let body;
  if (nodeIds.length === 1 && edgeIds.length === 0) body = <NodeInspector id={nodeIds[0]} />;
  else if (nodeIds.length === 0 && edgeIds.length === 1) body = <EdgeInspector id={edgeIds[0]} />;
  else if (nodeIds.length > 1) body = <MultiInspector ids={nodeIds} />;
  else if (edgeIds.length > 1) body = <Empty title={`${edgeIds.length} líneas elegidas`}>Elige solo una para ver qué pasa por ella y cambiarla.</Empty>;
  else body = <ProjectPanel />;
  return (
    <InspectorContext.Provider value={{ doc, eff, scenarioIsBase: !scenario || scenario.isBase }}>
      <aside className="flex w-[340px] shrink-0 flex-col border-l border-line bg-surface mdf-slide-r" aria-label="Detalles" data-testid="inspector">
        {scenario && !scenario.isBase && (
          <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-4 py-1.5 text-[11.5px] text-accent-text" data-testid="scenario-banner">
            <span className="size-2 rounded-full" style={{ background: scenario.color }} />
            🧪 Estás cambiando el «¿y si…?» «{scenario.name}». Tu mapa de verdad no cambia.
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </aside>
    </InspectorContext.Provider>
  );
}
