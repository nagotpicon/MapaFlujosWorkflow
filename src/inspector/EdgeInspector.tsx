/** Inspector de conexiones: cada conexión es un objeto con propiedades propias. */
import { ArrowLeftRight, Diamond, MessageSquare, Paintbrush, RefreshCcw, Trash2, Workflow, Zap } from 'lucide-react';
import type { MapEdge } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { useSim } from '../store/simStore';
import { qty } from '../engine/packet';
import { Badge, Button, Field, IconButton, NumberInput, Section, Segmented, Select, TextInput, Toggle, cx, fmt } from '../ui/primitives';
import { Annotations } from './Annotations';
import { ConditionsList } from './ConditionEditor';
import { DimSelect, KV, OverrideMark, ParamNumber, ParamSelect, useInspector, useParam } from './fields';
import { useUI } from '../store/uiStore';

const TYPES: { value: MapEdge['type']; label: string }[] = [
  { value: 'flow', label: 'Flujo' }, { value: 'causal', label: 'Causal' }, { value: 'informative', label: 'Informativa' }, { value: 'conceptual', label: 'Conceptual' },
];

function CircuitBlock({ e }: { e: MapEdge }) {
  const { doc } = useInspector();
  const c = Object.values(doc.circuits).find((x) => x.returnEdgeId === e.id);
  if (!c) {
    return (
      <div className="space-y-2">
        <p className="text-[11.5px] text-ink-3">Si esta conexión cierra un ciclo puedes configurarla como retorno de un circuito (porcentaje de retorno, retardo, frecuencia, saturación y límites).</p>
        <Button size="sm" variant="outline" onClick={() => { useUI.getState().setSelection([e.sourceNodeId, e.targetNodeId], [e.id]); A.createCircuitFromSelection(); }}><RefreshCcw className="size-3.5" />Configurar como circuito</Button>
      </div>
    );
  }
  const id = c.id;
  return (
    <div className="space-y-2.5" data-testid="circuit-block">
      <div className="flex items-center gap-2">
        <TextInput value={c.name} onChange={(name) => A.apply((d) => ({ ...d, circuits: { ...d.circuits, [id]: { ...d.circuits[id], name } } }), `cname-${id}`)} aria-label="Nombre del circuito" />
        <IconButton size="xs" label="Eliminar circuito" variant="danger" onClick={() => A.apply((d) => op.deleteCircuit(d, id))}><Trash2 className="size-3" /></IconButton>
      </div>
      <ParamSelect kind="circuit" id={id} path="loopType" label="Tipo de bucle" options={[{ value: 'auto', label: 'Automático (por polaridades)' }, { value: 'reinforcing', label: 'Reforzador' }, { value: 'balancing', label: 'Equilibrador' }, { value: 'mixed', label: 'Mixto' }]} />
      <div className="grid grid-cols-2 gap-2">
        <ParamNumber kind="circuit" id={id} path="returnPercent" label="% de retorno" min={0} suffix="%" />
        <ParamNumber kind="circuit" id={id} path="intensity" label="Intensidad" min={0} step={0.05} />
        <ParamNumber kind="circuit" id={id} path="delay" label="Retardo" min={0} suffix="it" />
        <ParamNumber kind="circuit" id={id} path="frequency" label="Frecuencia" hint="cada N it" min={1} />
        <ParamNumber kind="circuit" id={id} path="persistence" label="Persistencia" min={1} suffix="it" />
        <ParamNumber kind="circuit" id={id} path="saturation" label="Saturación" hint="suave" min={0} />
        <ParamNumber kind="circuit" id={id} path="maxLimit" label="Límite máximo" min={0} />
        <ParamNumber kind="circuit" id={id} path="minLimit" label="Límite mínimo" min={0} />
      </div>
      <Field label="Activo" inline><Toggle label="Circuito activo" checked={c.enabled} onChange={(enabled) => A.apply((d) => op.setParam(d, 'circuit', id, 'enabled', enabled))} /></Field>
      <ConditionsList ownerType="circuit" ownerId={id} ids={c.conditionId ? [c.conditionId] : []} ownerNode={e.sourceNodeId} emptyText="Retorna en cada iteración." addLabel="Condición del circuito" />
    </div>
  );
}

export function EdgeInspector({ id }: { id: string }) {
  const { doc, eff } = useInspector();
  const e = doc.edges[id];
  const ee = eff.edges[id] ?? e;
  const st = useSim((s) => s.result?.iterations[s.cursor]?.edges[id]);
  const depth = doc.project.settings.depth;
  const [role, , oRole] = useParam<string>('edge', id, 'behavior.role');
  const [transport] = useParam<string>('edge', id, 'behavior.transport');
  const [mode] = useParam<string>('edge', id, 'behavior.influence.mode');
  const [targetDim, setTargetDim, oTD] = useParam<string>('edge', id, 'behavior.influence.targetDimension');
  const [polarity, setPolarity, oPol] = useParam<string>('edge', id, 'behavior.polarity');
  const [feedback, setFeedback] = useParam<boolean>('edge', id, 'behavior.isFeedback');
  if (!e) return null;
  const upd = (patch: Partial<MapEdge>, key?: string) => A.apply((d) => op.updateEdge(d, id, patch), key);
  const vs = (patch: Partial<MapEdge['visualStyle']>, key?: string) => upd({ visualStyle: { ...e.visualStyle, ...patch } }, key);
  const src = doc.nodes[e.sourceNodeId]?.title;
  const tgt = doc.nodes[e.targetNodeId]?.title;
  const annCount = Object.values(doc.annotations).filter((a) => a.ownerId === id).length;
  void role; void oRole;
  return (
    <div data-testid="edge-inspector">
      <div className="space-y-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{src} <span className="text-ink-3">{e.direction === 'both' ? '⇄' : e.direction === 'none' ? '—' : '→'}</span> {tgt}</span>
          <IconButton size="xs" label="Invertir dirección" onClick={() => A.apply((d) => op.reverseEdge(d, id))}><ArrowLeftRight className="size-3.5" /></IconButton>
          <IconButton size="xs" label="Eliminar conexión" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
        </div>
        <Field label="Modalidad">
          <Segmented size="xs" label="Tipo de conexión" value={e.type} onChange={(type) => upd({ type, direction: type === 'conceptual' ? e.direction : e.direction === 'none' ? 'forward' : e.direction, visualStyle: { ...e.visualStyle, dash: type === 'causal' ? 'dashed' : type === 'informative' ? 'dotted' : 'solid' } })} options={TYPES} />
        </Field>
        <p className="text-[11px] text-ink-3">
          {e.type === 'flow' && 'Transporta flujo. Grosor, pérdidas y capacidad afectan a la simulación.'}
          {e.type === 'causal' && 'Transmite una influencia (refuerza, frena o compensa) sin mover flujo.'}
          {e.type === 'informative' && 'Relación informativa: no participa en la simulación.'}
          {e.type === 'conceptual' && 'Relación conceptual: organiza ideas, no transporta nada.'}
        </p>
        <Field label="Etiqueta"><TextInput value={e.visualStyle.label} onChange={(label) => vs({ label }, `elabel-${id}`)} placeholder="Texto sobre la línea" data-edge-label-input /></Field>
        <Field label="Dirección">
          <Segmented size="xs" label="Dirección" value={e.direction} onChange={(direction) => upd({ direction })} options={[{ value: 'forward', label: 'Un sentido' }, { value: 'both', label: 'Ambos' }, { value: 'none', label: 'Sin sentido' }]} />
        </Field>
        {st && e.type === 'flow' && (
          <div className="space-y-1 rounded-xl bg-surface-2/70 p-2.5">
            <KV k="Asignado" v={fmt(st.assigned)} />
            <KV k="Entregado" v={fmt(qty(st.delivered))} tone="text-flow" />
            {st.lost > 0 && <KV k="Perdido" v={`−${fmt(st.lost)}`} tone="text-loss" />}
            {st.generated > 0 && <KV k="Generado" v={`+${fmt(st.generated)}`} tone="text-gain" />}
            {st.arrivesAt > 0 && <KV k="Llega en iteración" v={st.arrivesAt} />}
            <div className="flex flex-wrap gap-1">{st.blocked && <Badge tone="loss">bloqueada</Badge>}{st.saturated && <Badge tone="loss">saturada</Badge>}{st.feedback && <Badge tone="gain">retorno</Badge>}{st.inhibition && <Badge tone="loss">inhibe</Badge>}</div>
          </div>
        )}
        {st && e.type === 'causal' && st.influenceFactor != null && <KV k={mode === 'compensate' ? 'Compensación aplicada' : 'Efecto en el destino'} v={mode === 'compensate' ? `${Math.round((st.compensationApplied ?? 0) * 100)} %` : targetDim === '__influence' ? `${st.influenceFactor > 0 ? '+' : ''}${fmt(st.influenceFactor)} pt` : `×${st.influenceFactor.toFixed(3)}`} />}
      </div>

      {e.type === 'flow' && depth !== 'basic' && (
        <Section title="Comportamiento del flujo" icon={<Workflow />} testId="section-edge-flow">
          <ParamSelect kind="edge" id={id} path="behavior.transport" label="Transporte" options={[{ value: 'transfer', label: 'Transfiere el flujo' }, { value: 'replicate', label: 'Réplica / retroalimentación (genera en destino)' }]} />
          {transport === 'transfer' && (
            <ParamSelect kind="edge" id={id} path="behavior.role" label="Rol en el reparto del origen" options={[{ value: 'main', label: 'Ruta principal' }, { value: 'reject', label: 'Ruta de rechazo (lo filtrado)' }, { value: 'overflow', label: 'Desborde (exceso de capacidad)' }, { value: 'divert', label: 'Desvío' }]} />
          )}
          <div className="grid grid-cols-2 gap-2">
            <ParamNumber kind="edge" id={id} path="behavior.multiplier" label="Multiplicador" step={0.05} min={0} />
            <ParamNumber kind="edge" id={id} path="behavior.loss" label="Pérdida" percent min={0} max={1} />
            <ParamNumber kind="edge" id={id} path="capacity" label="Capacidad" hint="por it." min={0} />
            <ParamNumber kind="edge" id={id} path="delay" label="Retardo" min={0} suffix="it" />
            <ParamNumber kind="edge" id={id} path="resistance" label="Resistencia" hint="frena" percent min={0} max={1} />
            <ParamNumber kind="edge" id={id} path="behavior.speed" label="Velocidad" step={0.05} min={0} suffix="×" />
            <ParamNumber kind="edge" id={id} path="behavior.intensity" label="Intensidad" hint="potencial" step={0.05} min={0} />
            <ParamNumber kind="edge" id={id} path="behavior.priority" label="Prioridad" min={1} />
            <ParamNumber kind="edge" id={id} path="behavior.weight" label="Peso del reparto" min={0} step={0.1} />
            <ParamNumber kind="edge" id={id} path="behavior.share" label="Reparto fijo" min={0} suffix="%" />
            {depth === 'expert' && <ParamNumber kind="edge" id={id} path="behavior.convergenceWeight" label="Peso en convergencia" min={0} max={1} step={0.05} />}
          </div>
          {transport === 'replicate' && (
            <Field label={<span className="inline-flex items-center gap-1">Efecto del retorno <OverrideMark {...oPol} /></span>}>
              <Segmented size="xs" label="Polaridad del retorno" value={polarity} onChange={setPolarity} options={[{ value: 'positive', label: '+ Alimenta (refuerza)' }, { value: 'negative', label: '− Inhibe (equilibra)' }]} />
            </Field>
          )}
          <Field label="Marcar como retorno (se procesa en la iteración siguiente)" inline><Toggle label="Retorno" checked={feedback} onChange={setFeedback} /></Field>
          {depth === 'expert' && (
            <Field label="Dimensiones transportadas">
              <div className="flex flex-wrap gap-1">
                {Object.values(doc.dimensions).map((d) => {
                  const list = ee.behavior.transportedDimensions;
                  const on = !list || list.includes(d.id) || d.id === 'quantity';
                  return (
                    <button key={d.id} type="button" disabled={d.id === 'quantity'} onClick={() => {
                      const all = Object.keys(doc.dimensions);
                      const cur = list ?? all;
                      const next = on ? cur.filter((x) => x !== d.id) : [...cur, d.id];
                      A.apply((x) => op.setParam(x, 'edge', id, 'behavior.transportedDimensions', next.length === all.length ? null : next));
                    }}><Badge tone={on ? 'flow' : 'neutral'}>{d.name}</Badge></button>
                  );
                })}
              </div>
            </Field>
          )}
        </Section>
      )}

      {e.type === 'causal' && (
        <Section title="Influencia" icon={<Zap />} testId="section-edge-influence">
          <ParamSelect kind="edge" id={id} path="behavior.influence.mode" label="Qué hace" options={[{ value: 'modulate', label: 'Modula al destino (refuerza o frena)' }, { value: 'compensate', label: 'Compensa / mitiga una dificultad' }]} />
          {mode === 'modulate' ? (
            <>
              <Field label={<span className="inline-flex items-center gap-1">Polaridad <OverrideMark {...oPol} /></span>}>
                <Segmented size="xs" label="Polaridad" value={polarity} onChange={setPolarity} options={[{ value: 'positive', label: '+ Directa' }, { value: 'negative', label: '− Inversa' }]} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={<span className="inline-flex items-center gap-1">Dimensión afectada <OverrideMark {...oTD} /></span>}><DimSelect label="Dimensión" value={targetDim} onChange={setTargetDim} includeInfluence /></Field>
                <ParamNumber kind="edge" id={id} path="behavior.influence.sensitivity" label="Sensibilidad" hint="a fondo de escala" percent min={0} max={5} />
              </div>
              <p className="text-[11px] text-ink-3">Con influencia máxima ({doc.project.settings.weightedScale.max}), el destino cambia como máximo un {Math.round(ee.behavior.influence.sensitivity * 100)}%. Una influencia negativa con polaridad directa reduce.</p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ParamSelect kind="edge" id={id} path="behavior.influence.compensationType" label="Tipo" options={[{ value: 'partial', label: 'Parcial' }, { value: 'total', label: 'Total' }, { value: 'conditional', label: 'Condicionada' }, { value: 'temporal', label: 'Temporal' }]} />
                <ParamSelect kind="edge" id={id} path="behavior.influence.compensationUnit" label="Unidad" options={[{ value: 'points', label: 'Puntos de escala' }, { value: 'percent', label: 'Porcentaje' }]} />
                <ParamNumber kind="edge" id={id} path="behavior.influence.amount" label="Cantidad" min={0} />
              </div>
              {ee.behavior.influence.compensationType === 'temporal' && (
                <div className="grid grid-cols-2 gap-2">
                  <ParamNumber kind="edge" id={id} path="behavior.influence.fromIteration" label="Desde it." min={1} />
                  <ParamNumber kind="edge" id={id} path="behavior.influence.toIteration" label="Hasta it." min={1} />
                </div>
              )}
            </>
          )}
          <ParamNumber kind="edge" id={id} path="behavior.intensity" label="Intensidad de la relación" step={0.05} min={0} />
        </Section>
      )}

      {(e.type === 'flow' || e.type === 'causal') && depth !== 'basic' && (
        <Section title="Condiciones de paso" icon={<Diamond />} count={e.conditions.length} defaultOpen={e.conditions.length > 0} testId="section-edge-conditions">
          <ConditionsList ownerType="edge" ownerId={id} ids={e.conditions} ownerNode={e.sourceNodeId} emptyText="Siempre deja pasar." />
        </Section>
      )}
      {(e.type === 'flow' || e.type === 'causal') && depth !== 'basic' && (
        <Section title="Circuito" icon={<RefreshCcw />} defaultOpen={!!Object.values(doc.circuits).find((x) => x.returnEdgeId === id)}><CircuitBlock e={e} /></Section>
      )}

      <Section title="Apariencia" icon={<Paintbrush />} defaultOpen={false}>
        <Field label="Trazado">
          <Segmented size="xs" label="Trazado" value={e.visualStyle.pathType} onChange={(pathType) => vs({ pathType })} options={[{ value: 'curve', label: 'Curva' }, { value: 'straight', label: 'Recta' }, { value: 'orthogonal', label: 'Ortogonal' }]} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Línea"><Select label="Línea" value={e.visualStyle.dash} onChange={(dash) => vs({ dash })} options={[{ value: 'solid', label: 'Continua' }, { value: 'dashed', label: 'Discontinua' }, { value: 'dotted', label: 'Punteada' }]} /></Field>
          <Field label="Grosor">
            <div className="flex gap-1">
              <Select label="Modo de grosor" className="flex-1" value={e.visualStyle.widthMode} onChange={(widthMode) => vs({ widthMode })} options={[{ value: 'auto', label: 'Por magnitud' }, { value: 'manual', label: 'Manual' }]} />
              {e.visualStyle.widthMode === 'manual' && <NumberInput className="w-14" value={e.visualStyle.width} min={0.5} max={20} onChange={(width) => vs({ width })} />}
            </div>
          </Field>
          <Field label="Anclaje origen"><Select label="Anclaje origen" value={e.visualStyle.sourceAnchor} onChange={(sourceAnchor) => vs({ sourceAnchor })} options={ANCHORS} /></Field>
          <Field label="Anclaje destino"><Select label="Anclaje destino" value={e.visualStyle.targetAnchor} onChange={(targetAnchor) => vs({ targetAnchor })} options={ANCHORS} /></Field>
        </div>
        <Field label="Color">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color de la conexión" value={e.visualStyle.color ?? '#3b82f6'} onChange={(ev) => vs({ color: ev.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" />
            {e.visualStyle.color && <button type="button" className={cx('text-[11px] text-ink-3 underline')} onClick={() => vs({ color: null })}>color semántico</button>}
          </div>
        </Field>
      </Section>
      <Section title="Comentarios" icon={<MessageSquare />} count={annCount} defaultOpen={annCount > 0}><Annotations ownerType="edge" ownerId={id} /></Section>
    </div>
  );
}

const ANCHORS: { value: 'top' | 'right' | 'bottom' | 'left'; label: string }[] = [{ value: 'top', label: 'Arriba' }, { value: 'right', label: 'Derecha' }, { value: 'bottom', label: 'Abajo' }, { value: 'left', label: 'Izquierda' }];
