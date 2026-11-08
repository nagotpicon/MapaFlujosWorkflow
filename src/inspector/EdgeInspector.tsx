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
import { levelOf } from '../app/levels';
import { KidEdgeInspector } from '../kid/KidInspector';
import { BehaviorCard } from './BehaviorEditor';
import { MitigatorRow, Weights } from './NodeInspector';
import { BEHAVIOR_KID } from '../core/model/behaviorLibrary';
import { Ico } from '../ui/ico';

const TYPES: { value: MapEdge['type']; label: string }[] = [
  { value: 'flow', label: 'Pasa' }, { value: 'causal', label: 'Influye' }, { value: 'informative', label: 'Info' }, { value: 'conceptual', label: 'Idea' },
];

function CircuitBlock({ e }: { e: MapEdge }) {
  const { doc } = useInspector();
  const c = Object.values(doc.circuits).find((x) => x.returnEdgeId === e.id);
  if (!c) {
    return (
      <div className="space-y-2">
        <p className="text-[12px] leading-snug text-ink-3">Un bucle es un círculo que vuelve a empezar, como el boca a boca: más clientes → más recomendaciones → más clientes. Si esta línea cierra un círculo, conviértela en bucle para decir cuánto vuelve y cuánto tarda.</p>
        <Button size="sm" variant="outline" onClick={() => { useUI.getState().setSelection([e.sourceNodeId, e.targetNodeId], [e.id]); A.createCircuitFromSelection(); }}><RefreshCcw className="size-3.5" />Convertir en bucle</Button>
      </div>
    );
  }
  const id = c.id;
  return (
    <div className="space-y-2.5" data-testid="circuit-block">
      <div className="flex items-center gap-2">
        <TextInput value={c.name} onChange={(name) => A.apply((d) => ({ ...d, circuits: { ...d.circuits, [id]: { ...d.circuits[id], name } } }), `cname-${id}`)} aria-label="Nombre del bucle" />
        <IconButton size="xs" label="Borrar el bucle" variant="danger" onClick={() => A.apply((d) => op.deleteCircuit(d, id))}><Trash2 className="size-3" /></IconButton>
      </div>
      <ParamSelect kind="circuit" id={id} path="loopType" label="¿Qué tipo de círculo es?" help="Uno que crece y crece, o uno que se frena solo." options={[{ value: 'auto', label: 'Que lo averigüe solo' }, { value: 'reinforcing', label: '📈 Crece y crece' }, { value: 'balancing', label: '⚖️ Se frena solo' }, { value: 'mixed', label: '🔀 Un poco de los dos' }]} />
      <div className="grid grid-cols-2 gap-2">
        <ParamNumber kind="circuit" id={id} path="returnPercent" label="Qué parte vuelve" help="100 % = vuelve todo." min={0} suffix="%" />
        <ParamNumber kind="circuit" id={id} path="intensity" label="Fuerza del regreso" help="1 = normal." min={0} step={0.05} />
        <ParamNumber kind="circuit" id={id} path="delay" label="Vueltas que tarda" min={0} />
        <ParamNumber kind="circuit" id={id} path="frequency" label="Cada cuántas vueltas" min={1} />
        <ParamNumber kind="circuit" id={id} path="persistence" label="Cuántas vueltas dura" min={1} />
        <ParamNumber kind="circuit" id={id} path="saturation" label="Hasta dónde crece" help="Un tope suave: cerca de él, crece menos." min={0} />
        <ParamNumber kind="circuit" id={id} path="maxLimit" label="Como mucho" min={0} />
        <ParamNumber kind="circuit" id={id} path="minLimit" label="Como poco" min={0} />
      </div>
      <Field label="Encendido" inline><Toggle label="Bucle activo" checked={c.enabled} onChange={(enabled) => A.apply((d) => op.setParam(d, 'circuit', id, 'enabled', enabled))} /></Field>
      <ConditionsList ownerType="circuit" ownerId={id} ids={c.conditionId ? [c.conditionId] : []} ownerNode={e.sourceNodeId} emptyText="Vuelve en cada vuelta." addLabel="Añadir «solo si…»" />
    </div>
  );
}

/** Lo que hay detrás de una línea especial: el colador, el límite o el desvío de la idea de donde sale. */
function SourceDoor({ nodeId, role }: { nodeId: string; role: 'reject' | 'overflow' | 'divert' }) {
  const { doc } = useInspector();
  const n = doc.nodes[nodeId];
  if (!n) return null;
  const type = role === 'reject' ? 'filter' : role === 'overflow' ? 'restrictor' : 'diverter';
  const b = n.behaviorIds.map((x) => doc.behaviors[x]).find((x) => x?.behaviorType === type);
  const kid = BEHAVIOR_KID[type];
  const what = role === 'reject' ? 'cuántos no pasan' : role === 'overflow' ? 'cuántos no caben' : 'cuántos se desvían';
  return (
    <div className="space-y-1.5 rounded-lg border border-line p-2" data-testid="door-source">
      {b ? (
        <>
          <p className="text-[12px] leading-snug text-ink-2">Lo que va por aquí lo decide el <b className="inline-flex items-center gap-1"><Ico e={kid.emoji} size={13} />{kid.name}</b> de «{n.title}»: ahí pones {what}. Cámbialo aquí mismo.</p>
          <BehaviorCard b={b} ownerNode={nodeId} defaultOpen />
          {type === 'restrictor' && b.parameters.excess !== 'overflow' && <p className="text-[11.5px] leading-snug text-cond">⚠️ Ojo: ahora los que no caben {b.parameters.excess === 'queue' ? 'esperan a la vuelta siguiente' : 'se pierden'}. Para que vayan por esta línea, en «¿Qué pasa con los que no caben?» elige «Van por la línea de «lo que no cabe»».</p>}
        </>
      ) : (
        <>
          <p className="text-[12px] leading-snug text-ink-2">⚠️ Para que vaya algo por aquí, «{n.title}» necesita un <b className="inline-flex items-center gap-1"><Ico e={kid.emoji} size={13} />{kid.name}</b>: es el que decide {what}.</p>
          <Button size="sm" variant="solid" onClick={() => A.apply((d) => {
            let out = op.addBehavior(d, nodeId, type).doc;
            if (type === 'restrictor') { const nb = out.nodes[nodeId].behaviorIds.at(-1)!; out = op.updateBehavior(out, nb, { parameters: { ...out.behaviors[nb].parameters, excess: 'overflow' } }); }
            return out;
          })} data-testid="door-add-behavior">Poner un {kid.emoji} {kid.name} en «{n.title}»</Button>
        </>
      )}
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
  const level = levelOf(depth);
  if (level < 3) return <KidEdgeInspector id={id} />;
  return (
    <div data-testid="edge-inspector">
      <div className="space-y-3 border-b border-line px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Ico e="🔗" size={22} />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[16px] font-medium text-ink">Línea</span>
            <span className="block truncate text-[12.5px] text-ink-2">{src} <span className="text-ink-3">{e.direction === 'both' ? '⇄' : e.direction === 'none' ? '—' : '→'}</span> {tgt}</span>
          </span>
          <IconButton size="xs" label="Cambiar el sentido" onClick={() => A.apply((d) => op.reverseEdge(d, id))}><ArrowLeftRight className="size-3.5" /></IconButton>
          <IconButton size="xs" label="Borrar esta unión" variant="danger" onClick={A.deleteSelection}><Trash2 className="size-3.5" /></IconButton>
        </div>
        <Field label="🧩 ¿Qué tipo de línea es?">
          <Segmented size="xs" label="Tipo de unión" value={e.type} onChange={(type) => upd({ type, direction: type === 'conceptual' ? e.direction : e.direction === 'none' ? 'forward' : e.direction, visualStyle: { ...e.visualStyle, dash: type === 'causal' ? 'dashed' : type === 'informative' ? 'dotted' : 'solid' } })} options={TYPES} />
        </Field>
        <p className="rounded-lg bg-surface-2/70 px-2.5 py-2 text-[12px] leading-snug text-ink-2">
          {e.type === 'flow' && '🚚 Pasa: por aquí va algo de una idea a otra (personas, dinero, horas…). Lo que se pierde aquí cambia el resultado.'}
          {e.type === 'causal' && '💪 Influye: una idea empuja o frena a la otra (o es su remedio). No lleva nada de un lado a otro.'}
          {e.type === 'informative' && 'ℹ️ Info: solo avisa de algo. No cambia la cuenta.'}
          {e.type === 'conceptual' && '💭 Idea: solo dice que tienen que ver. No cambia la cuenta.'}
        </p>
        <Field label="✏️ Texto sobre la línea"><TextInput value={e.visualStyle.label} onChange={(label) => vs({ label }, `elabel-${id}`)} placeholder="Por ejemplo: «y entonces…»" data-edge-label-input /></Field>
        <Field label="➡️ ¿Hacia dónde va?">
          <Segmented size="xs" label="Dirección" value={e.direction} onChange={(direction) => upd({ direction })} options={[{ value: 'forward', label: '→ Una flecha', title: 'Va de una idea a la otra' }, { value: 'both', label: '⇄ Dos flechas', title: 'Va hacia los dos lados' }, { value: 'none', label: '— Sin flechas', title: 'Solo las une, sin dirección' }]} />
        </Field>
        {st && e.type === 'flow' && (
          <div className="space-y-1 rounded-xl bg-surface-2/70 p-2.5">
            <div className="text-[12.5px] font-semibold text-ink">🔎 En esta vuelta</div>
            <KV k="📦 Le toca llevar" v={fmt(st.assigned)} />
            <KV k="📬 Llegan al otro lado" v={fmt(qty(st.delivered))} tone="text-flow" />
            {st.lost > 0 && <KV k="🕳️ Se pierden por el camino" v={`−${fmt(st.lost)}`} tone="text-loss" />}
            {st.generated > 0 && <KV k="✨ Se crean" v={`+${fmt(st.generated)}`} tone="text-gain" />}
            {st.arrivesAt > 0 && <KV k="⏳ Llega en la vuelta" v={st.arrivesAt} />}
            <div className="flex flex-wrap gap-1">{st.blocked && <Badge tone="loss">⛔ cortada</Badge>}{st.saturated && <Badge tone="loss">🚧 llena</Badge>}{st.feedback && <Badge tone="gain">🔁 cierra el círculo</Badge>}{st.inhibition && <Badge tone="loss">🔻 resta</Badge>}</div>
          </div>
        )}
        {st && e.type === 'causal' && st.influenceFactor != null && <KV k={mode === 'compensate' ? '🩹 Cuánta fuerza le quita al freno' : '💪 Cuánto cambia a la otra'} v={mode === 'compensate' ? `${Math.round((st.compensationApplied ?? 0) * 100)} %` : targetDim === '__influence' ? `${st.influenceFactor > 0 ? '+' : ''}${fmt(st.influenceFactor)} puntos` : st.influenceFactor >= 1 ? `+${Math.round((st.influenceFactor - 1) * 100)} %` : `−${Math.round((1 - st.influenceFactor) * 100)} %`} />}
      </div>

      {e.type === 'flow' && depth !== 'basic' && (
        <Section emoji="🚚" title="Qué pasa por esta línea" hint="Cuánto pasa, cuánto se pierde, cuánto tarda en llegar…" icon={<Workflow />} testId="section-edge-flow">
          <ParamSelect kind="edge" id={id} path="behavior.transport" label="¿Qué hace la línea?" options={[{ value: 'transfer', label: 'Lleva lo que pasa de un lado a otro' }, { value: 'replicate', label: 'Crea más al otro lado (como un eco)' }]} />
          {transport === 'transfer' && (
            <ParamSelect kind="edge" id={id} path="behavior.role" label="¿Para qué es esta línea?" help="Las líneas especiales recogen lo que un colador, un límite o un desvío no dejan seguir." options={[{ value: 'main', label: 'Es el camino normal' }, { value: 'reject', label: 'Lleva lo que el colador no deja pasar' }, { value: 'overflow', label: 'Lleva lo que no cabe (por el límite)' }, { value: 'divert', label: 'Lleva lo del desvío' }]} />
          )}
          {transport === 'transfer' && (role === 'reject' || role === 'overflow' || role === 'divert') && <SourceDoor nodeId={e.sourceNodeId} role={role} />}
          <div className="grid grid-cols-2 gap-2">
            <ParamNumber kind="edge" id={id} path="behavior.loss" label="Se pierde por el camino" help="10 % = de cada 100, llegan 90." percent min={0} max={1} />
            <ParamNumber kind="edge" id={id} path="capacity" label="Cuántos caben por vuelta" help="Vacío = sin límite." min={0} />
            <ParamNumber kind="edge" id={id} path="delay" label="Vueltas que tarda en llegar" min={0} />
            <ParamNumber kind="edge" id={id} path="behavior.multiplier" label="Multiplica lo que pasa" help="1 = igual; 2 = el doble." step={0.05} min={0} />
            <ParamNumber kind="edge" id={id} path="resistance" label="Cuánto lo frena" help="Lo hace ir más despacio." percent min={0} max={1} />
            <ParamNumber kind="edge" id={id} path="behavior.speed" label="Más rápido o más lento" help="1 = normal." step={0.05} min={0} suffix="×" />
            <ParamNumber kind="edge" id={id} path="behavior.intensity" label="Fuerza de la línea" help="Cuánta «energía» lleva." step={0.05} min={0} />
            <ParamNumber kind="edge" id={id} path="behavior.priority" label="Orden al repartir" help="1 = la primera." min={1} />
            <ParamNumber kind="edge" id={id} path="behavior.weight" label="Peso al repartir" help="Más peso = le toca más." min={0} step={0.1} />
            <ParamNumber kind="edge" id={id} path="behavior.share" label="Parte fija al repartir" min={0} suffix="%" />
            {depth === 'expert' && <ParamNumber kind="edge" id={id} path="behavior.convergenceWeight" label="Peso al juntarse" help="Cuánto cuenta al mezclarse con otras." min={0} max={1} step={0.05} />}
          </div>
          {transport === 'replicate' && (
            <Field label={<span className="inline-flex items-center gap-1">¿Qué hace el eco? <OverrideMark {...oPol} /></span>}>
              <Segmented size="xs" label="Polaridad del retorno" value={polarity} onChange={setPolarity} options={[{ value: 'positive', label: '+ Suma (hace crecer)' }, { value: 'negative', label: '− Resta (frena)' }]} />
            </Field>
          )}
          <Field label="🔁 Cierra un círculo (lo que pasa llega en la vuelta siguiente)" inline><Toggle label="Cierra un círculo" checked={feedback} onChange={setFeedback} /></Field>
          {depth === 'expert' && (
            <Field label="¿Qué viaja por aquí?" help="Pulsa para quitar o poner (la cantidad viaja siempre).">
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
        <Section emoji="💪" title="Cómo influye" hint="Si una idea empuja, frena o es el remedio de la otra." icon={<Zap />} testId="section-edge-influence">
          <ParamSelect kind="edge" id={id} path="behavior.influence.mode" label="¿Qué hace?" options={[{ value: 'modulate', label: 'Empuja o frena a la otra' }, { value: 'compensate', label: 'Es un remedio: le quita fuerza a un freno' }]} />
          {mode === 'modulate' ? (
            <>
              {doc.nodes[e.sourceNodeId] && (
                <div className="space-y-1.5 rounded-lg border border-line p-2" data-testid="door-influence">
                  <p className="text-[12px] leading-snug text-ink-2">Esta línea lleva la fuerza de <b>«{doc.nodes[e.sourceNodeId].title}»</b>. Sin fuerza no hace nada: muévela aquí mismo.</p>
                  <Weights n={doc.nodes[e.sourceNodeId]} />
                </div>
              )}
              <Field label={<span className="inline-flex items-center gap-1">¿En qué sentido? <OverrideMark {...oPol} /></span>}>
                <Segmented size="xs" label="Polaridad" value={polarity} onChange={setPolarity} options={[{ value: 'positive', label: '+ Igual (si una sube, la otra sube)' }, { value: 'negative', label: '− Al revés' }]} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={<span className="inline-flex items-center gap-1">¿Qué le cambia? <OverrideMark {...oTD} /></span>}><DimSelect label="Dimensión" value={targetDim} onChange={setTargetDim} includeInfluence /></Field>
                <ParamNumber kind="edge" id={id} path="behavior.influence.sensitivity" label="¿Cuánto, como mucho?" help="Con toda su fuerza (5)." percent min={0} max={5} />
              </div>
              <p className="text-[12px] leading-snug text-ink-3">Con toda su fuerza ({doc.project.settings.weightedScale.max}), la otra idea cambia como mucho un {Math.round(ee.behavior.influence.sensitivity * 100)} %. Si esta idea frena (número negativo), la otra baja.</p>
            </>
          ) : (
            <>
              <div data-testid="door-remedy"><MitigatorRow edgeId={id} /></div>
              <details className="text-[12px]"><summary className="cursor-pointer text-ink-3">Para expertos: lo mismo, con todos los números</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ParamSelect kind="edge" id={id} path="behavior.influence.compensationType" label="¿Cuánto lo arregla?" options={[{ value: 'partial', label: 'Una parte' }, { value: 'total', label: 'Del todo' }, { value: 'conditional', label: 'Solo si pasa algo' }, { value: 'temporal', label: 'Solo un tiempo' }]} />
                <ParamSelect kind="edge" id={id} path="behavior.influence.compensationUnit" label="¿En qué lo cuento?" options={[{ value: 'points', label: 'Puntos (de 0 a 5)' }, { value: 'percent', label: 'Porcentaje' }]} />
                <ParamNumber kind="edge" id={id} path="behavior.influence.amount" label="¿Cuánto le quita?" help="Por ejemplo, 2 puntos a un freno de −5 lo deja en −3." min={0} />
              </div>
              </details>
              {ee.behavior.influence.compensationType === 'temporal' && (
                <div className="grid grid-cols-2 gap-2">
                  <ParamNumber kind="edge" id={id} path="behavior.influence.fromIteration" label="Desde la vuelta" min={1} />
                  <ParamNumber kind="edge" id={id} path="behavior.influence.toIteration" label="Hasta la vuelta" min={1} />
                </div>
              )}
            </>
          )}
          <ParamNumber kind="edge" id={id} path="behavior.intensity" label="Fuerza de la línea" help="1 = normal; 2 = el doble de fuerte." step={0.05} min={0} />
        </Section>
      )}

      {(e.type === 'flow' || e.type === 'causal') && depth !== 'basic' && (
 <Section emoji="⏰" title="Cuándo deja pasar" hint="Si la línea solo funciona a veces." icon={<Diamond />} count={e.conditions.length} defaultOpen={e.conditions.length > 0} testId="section-edge-conditions">
          <ConditionsList ownerType="edge" ownerId={id} ids={e.conditions} ownerNode={e.sourceNodeId} emptyText="Siempre deja pasar." />
        </Section>
      )}
      {(e.type === 'flow' || e.type === 'causal') && depth !== 'basic' && (
        <Section emoji="🔁" title="Bucle" hint="Si esta línea cierra un círculo, como el boca a boca." icon={<RefreshCcw />} defaultOpen={!!Object.values(doc.circuits).find((x) => x.returnEdgeId === id)}><CircuitBlock e={e} /></Section>
      )}

      <Section emoji="🎨" title="Cómo se ve" hint="Forma de la línea, raya, grosor y color." icon={<Paintbrush />} defaultOpen={false}>
        <Field label="Forma de la línea">
          <Segmented size="xs" label="Trazado" value={e.visualStyle.pathType} onChange={(pathType) => vs({ pathType })} options={[{ value: 'curve', label: 'Curva' }, { value: 'straight', label: 'Recta' }, { value: 'orthogonal', label: 'Con esquinas' }]} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tipo de raya"><Select label="Línea" value={e.visualStyle.dash} onChange={(dash) => vs({ dash })} options={[{ value: 'solid', label: 'Seguida' }, { value: 'dashed', label: 'A trozos' }, { value: 'dotted', label: 'De puntos' }]} /></Field>
          <Field label="Grosor">
            <div className="flex gap-1">
              <Select label="Modo de grosor" className="flex-1" value={e.visualStyle.widthMode} onChange={(widthMode) => vs({ widthMode })} options={[{ value: 'auto', label: 'Según lo que pasa' }, { value: 'manual', label: 'Fijo' }]} />
              {e.visualStyle.widthMode === 'manual' && <NumberInput className="w-14" value={e.visualStyle.width} min={0.5} max={20} onChange={(width) => vs({ width })} />}
            </div>
          </Field>
          <Field label="Sale por"><Select label="Anclaje origen" value={e.visualStyle.sourceAnchor} onChange={(sourceAnchor) => vs({ sourceAnchor })} options={ANCHORS} /></Field>
          <Field label="Llega por"><Select label="Anclaje destino" value={e.visualStyle.targetAnchor} onChange={(targetAnchor) => vs({ targetAnchor })} options={ANCHORS} /></Field>
        </div>
        <Field label="Color">
          <div className="flex items-center gap-1.5">
            <input type="color" aria-label="Color de la conexión" value={e.visualStyle.color ?? '#3b82f6'} onChange={(ev) => vs({ color: ev.target.value })} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" />
            {e.visualStyle.color && <button type="button" className={cx('text-[11px] text-ink-3 underline')} onClick={() => vs({ color: null })}>volver al color de su tipo</button>}
          </div>
        </Field>
      </Section>
      <Section emoji="💬" title="Comentarios" hint="Notas para ti sobre esta línea." icon={<MessageSquare />} count={annCount} defaultOpen={annCount > 0}><Annotations ownerType="edge" ownerId={id} /></Section>
    </div>
  );
}

const ANCHORS: { value: 'top' | 'right' | 'bottom' | 'left'; label: string }[] = [{ value: 'top', label: 'Arriba' }, { value: 'right', label: 'Derecha' }, { value: 'bottom', label: 'Abajo' }, { value: 'left', label: 'Izquierda' }];
