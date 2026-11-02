/** Inspector contextual: burbuja, conexión, selección múltiple o proyecto. */
import { useMemo, useState } from 'react';
import { Layers, Plus, RefreshCcw, Ruler, Settings2, Sigma, Trash2, Users } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { effectiveDoc } from '../engine/scenario';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { BEHAVIOR_LIBRARY, BEHAVIOR_ORDER } from '../core/model/behaviorLibrary';
import { NODE_COLORS, COLOR_LABEL } from '../ui/icons';
import { Badge, Button, Empty, Field, IconButton, Menu, NumberInput, Section, Segmented, TextArea, TextInput, cx } from '../ui/primitives';
import { InspectorContext } from './fields';
import { NodeInspector } from './NodeInspector';
import { EdgeInspector } from './EdgeInspector';
import { BehaviorIcon } from '../ui/behaviorIcon';
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
  return (
    <div data-testid="multi-inspector">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Users className="size-4 text-ink-3" />{nodes.length} elementos seleccionados</div>
        <p className="mt-1 text-[11px] text-ink-3">Los cambios se aplican a todos. «Varios» indica que hoy tienen valores distintos.</p>
      </div>
      <Section title="Edición conjunta">
        <Field label={<>Color {color == null && <span className="text-ink-3">· varios</span>}</>}>
          <div className="flex flex-wrap gap-1.5">
            {NODE_COLORS.map((c) => <button key={c} type="button" aria-label={COLOR_LABEL[c]} onClick={() => setStyle({ color: c })} className={cx('size-6 rounded-full border-2', color === c ? 'border-accent' : 'border-transparent')} style={{ background: `var(--n-${c}-ac)` }} />)}
          </div>
        </Field>
        <Field label={<>Forma {shape == null && <span className="text-ink-3">· varias</span>}</>}>
          <Segmented size="xs" label="Forma" value={shape ?? ('' as never)} onChange={(s) => setStyle({ shape: s })} options={[{ value: 'rounded', label: 'Burbuja' }, { value: 'pill', label: 'Píldora' }, { value: 'rect', label: 'Recto' }, { value: 'circle', label: 'Círculo' }, { value: 'diamond', label: 'Rombo' }]} />
        </Field>
        <Field label="Etiquetas comunes">
          <div className="flex flex-wrap gap-1">
            {commonTags.map((t) => <button key={t} type="button" onClick={() => A.apply((d) => op.updateNodes(d, ids, (n) => ({ tags: n.tags.filter((x) => x !== t) })))}><Badge tone="accent">#{t} ×</Badge></button>)}
            <form className="flex-1" onSubmit={(e) => { e.preventDefault(); if (tag.trim()) A.apply((d) => op.updateNodes(d, ids, (n) => ({ tags: [...new Set([...n.tags, tag.trim()])] }))); setTag(''); }}>
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ etiqueta para todos" aria-label="Etiqueta para todos" className="h-6 w-full bg-transparent text-[12px] outline-none placeholder:text-ink-3" />
            </form>
          </div>
        </Field>
        <Field label="Categoría">
          <TextInput value={new Set(nodes.map((n) => n.metadata.category)).size === 1 ? nodes[0].metadata.category : ''} placeholder="varias" onChange={(category) => A.apply((d) => op.updateNodes(d, ids, (n) => ({ metadata: { ...n.metadata, category } })), 'multi-cat')} />
        </Field>
        <Menu.Root>
          <Menu.Trigger asChild><Button size="sm" variant="outline"><Plus className="size-3.5" />Asignar comportamiento a todos</Button></Menu.Trigger>
          <Menu.Content>
            {BEHAVIOR_ORDER.map((t) => <Menu.Item key={t} icon={<BehaviorIcon type={t} />} onSelect={() => A.apply((d) => ids.reduce((acc, id) => op.addBehavior(acc, id, t).doc, d))}>{BEHAVIOR_LIBRARY[t].label}</Menu.Item>)}
          </Menu.Content>
        </Menu.Root>
        <Field label="Influencia (ponderada) para todos">
          <NumberInput value={new Set(nodes.map((n) => n.weight.influence?.value)).size === 1 ? nodes[0].weight.influence?.value ?? null : null} placeholder="varios" min={doc.project.settings.weightedScale.min} max={doc.project.settings.weightedScale.max}
            onChange={(v) => A.apply((d) => ids.reduce((acc, id) => op.setParam(acc, 'node', id, 'weight.influence', { mode: 'weighted', value: v, scaleId: null }), d))} />
        </Field>
      </Section>
      <Section title="Organizar" icon={<Layers />}>
        <div className="flex flex-wrap gap-1">
          <Button size="xs" variant="subtle" onClick={() => A.groupSelection()}>Agrupar</Button>
          <Button size="xs" variant="subtle" onClick={() => A.groupSelection('container')}>Contenedor</Button>
          <Button size="xs" variant="subtle" onClick={A.createCircuitFromSelection}>Crear circuito</Button>
          <Button size="xs" variant="subtle" onClick={A.autoLayout}>Distribuir</Button>
          {(['left', 'center', 'right', 'top', 'middle', 'bottom', 'hdist', 'vdist'] as const).map((m) => (
            <Button key={m} size="xs" variant="ghost" onClick={() => A.align(m)}>{({ left: '⇤', center: '↔', right: '⇥', top: '⤒', middle: '↕', bottom: '⤓', hdist: '⋯', vdist: '⋮' })[m]}</Button>
          ))}
        </div>
        <Button size="sm" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" />Eliminar selección</Button>
      </Section>
    </div>
  );
}

function DimensionEditor() {
  const doc = useProject((s) => s.doc)!;
  const upd = (id: string, patch: Partial<FlowDimensionDef>) => A.apply((d) => ({ ...d, dimensions: { ...d.dimensions, [id]: { ...d.dimensions[id], ...patch } } }), `dim-${id}`);
  return (
    <div className="space-y-1.5">
      {Object.values(doc.dimensions).map((d) => (
        <div key={d.id} className="rounded-lg border border-line p-2">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color" value={d.color} onChange={(e) => upd(d.id, { color: e.target.value })} className="size-5 cursor-pointer rounded border-0 bg-transparent" />
            <input aria-label="Nombre de la dimensión" value={d.name} onChange={(e) => upd(d.id, { name: e.target.value })} className="h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-[12.5px] font-medium text-ink outline-none focus:bg-surface-2" />
            {d.builtin ? <Badge>{d.aggregation === 'extensive' ? 'se suma' : 'se promedia'}</Badge> : (
              <Segmented size="xs" label="Agregación" value={d.aggregation} onChange={(aggregation) => upd(d.id, { aggregation })} options={[{ value: 'extensive', label: 'Suma' }, { value: 'intensive', label: 'Media' }]} />
            )}
            {!d.builtin && <IconButton size="xs" label="Eliminar dimensión" variant="danger" onClick={() => A.apply((x) => { const dims = { ...x.dimensions }; delete dims[d.id]; return { ...x, dimensions: dims }; })}><Trash2 className="size-3" /></IconButton>}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            <TextInput value={d.unit} onChange={(unit) => upd(d.id, { unit })} placeholder="unidad" aria-label="Unidad" />
            <NumberInput value={d.range.min} onChange={(min) => upd(d.id, { range: { ...d.range, min } })} aria-label="Mínimo" />
            <NumberInput value={d.range.max} onChange={(max) => upd(d.id, { range: { ...d.range, max } })} aria-label="Máximo" />
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => A.apply((d) => { const id = newId('dim'); return { ...d, dimensions: { ...d.dimensions, [id]: { id, key: id, name: 'Nueva dimensión', description: '', dataType: 'numeric', measurementMode: 'instant', unit: '', range: { min: 0, max: 1 }, aggregation: 'intensive', confidence: 'estimate', source: '', color: '#ec4899', scaleId: null, builtin: false, defaultValue: 0.5 } } }; })}>
        <Plus className="size-3.5" />Dimensión personalizada
      </Button>
      <p className="text-[11px] text-ink-3">Ej.: confianza, riesgo, coste, motivación… «Se suma» para magnitudes (cantidad, coste); «se promedia» para cualidades (calidad, confianza).</p>
    </div>
  );
}

function ProjectPanel() {
  const doc = useProject((s) => s.doc)!;
  const set = (patch: Partial<typeof doc.project.settings>) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, ...patch } } }));
  const circuits = Object.values(doc.circuits);
  return (
    <div data-testid="project-panel">
      <div className="space-y-2.5 border-b border-line px-4 py-3">
        <Field label="Proyecto"><TextInput value={doc.project.name} onChange={(name) => A.apply((d) => ({ ...d, project: { ...d.project, name } }), 'pname')} /></Field>
        <Field label="Descripción"><TextArea rows={2} value={doc.project.description} onChange={(description) => A.apply((d) => ({ ...d, project: { ...d.project, description } }), 'pdesc')} placeholder="De qué trata este mapa…" /></Field>
        <Field label="Nivel de profundidad de la interfaz">
          <Segmented label="Profundidad" value={doc.project.settings.depth} onChange={(depth) => set({ depth })}
            options={[{ value: 'basic', label: 'Básico' }, { value: 'advanced', label: 'Avanzado' }, { value: 'expert', label: 'Experto' }]} />
        </Field>
        <p className="text-[11px] text-ink-3">{doc.project.settings.depth === 'basic' ? 'Crear, editar, conectar y organizar.' : doc.project.settings.depth === 'advanced' ? 'Además: pesos, condiciones, comportamientos y dimensiones.' : 'Además: fórmulas, puertos, rangos de incertidumbre y reglas avanzadas.'}</p>
      </div>
      <Section title="Simulación" icon={<Sigma />}>
        <Field label="Iteraciones"><NumberInput value={doc.project.settings.simulation.iterations} min={1} max={500} onChange={(v) => set({ simulation: { iterations: Math.round(v) } })} data-testid="iterations-input" /></Field>
        <p className="text-[11px] text-ink-3">Selecciona una burbuja o conexión para ver y editar sus propiedades. Doble clic en el lienzo crea una burbuja.</p>
      </Section>
      <Section title="Circuitos configurados" icon={<RefreshCcw />} count={circuits.length} defaultOpen={circuits.length > 0}>
        {circuits.length === 0 ? <p className="text-[11.5px] text-ink-3">Selecciona burbujas en orden y usa «Crear circuito» para cerrar un ciclo.</p> : circuits.map((c) => (
          <button key={c.id} type="button" onClick={() => c.returnEdgeId && useUI.getState().setSelection([], [c.returnEdgeId])} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12px] hover:bg-surface-2">
            <RefreshCcw className="size-3.5 text-gain" /><span className="flex-1 truncate">{c.name}</span><Badge>{c.returnPercent}%</Badge>
          </button>
        ))}
      </Section>
      <Section title="Dimensiones del flujo" icon={<Ruler />} defaultOpen={false}><DimensionEditor /></Section>
      <Section title="Ajustes" icon={<Settings2 />} defaultOpen={false}>
        <Button size="sm" variant="outline" onClick={() => useUI.setState({ overlay: 'settings' })}>Escalas, paleta, leyenda y atajos…</Button>
      </Section>
    </div>
  );
}

export function Inspector() {
  const doc = useProject((s) => s.doc);
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
  else if (edgeIds.length > 1) body = <Empty title={`${edgeIds.length} conexiones seleccionadas`}>Selecciona una sola para editarla.</Empty>;
  else body = <ProjectPanel />;
  return (
    <InspectorContext.Provider value={{ doc, eff, scenarioIsBase: !scenario || scenario.isBase }}>
      <aside className="flex w-[340px] shrink-0 flex-col border-l border-line bg-surface mdf-slide-r" aria-label="Inspector" data-testid="inspector">
        {scenario && !scenario.isBase && (
          <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-4 py-1.5 text-[11.5px] text-accent-text" data-testid="scenario-banner">
            <span className="size-2 rounded-full" style={{ background: scenario.color }} />
            Editando parámetros en «{scenario.name}». El modelo base no cambia.
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </aside>
    </InspectorContext.Provider>
  );
}
