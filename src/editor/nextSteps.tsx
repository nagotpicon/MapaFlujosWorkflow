/**
 * «👉 Lo siguiente»: el núcleo creativo. Mira la idea que tienes elegida y cómo va
 * tu mapa, y te trae ahí mismo las 1–3 cosas con más sentido para seguir, ya
 * listas para elegir. Sigue la lógica del manual: de un inicio sale lo que mueves,
 * va por líneas «Pasa» de idea en idea (donde puede perderse, guardarse o
 * multiplicarse) y llega a una meta; las ideas que frenan o ayudan van con líneas
 * «Influye», y los remedios hacen más pequeño un freno.
 */
import type { ReactNode } from 'react';
import type { BehaviorType, MapNode, ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { scaleValueToWeighted } from '../engine/scales';
import { BEHAVIOR_KID } from '../core/model/behaviorLibrary';
import { useUI } from '../store/uiStore';
import { NumberInput } from '../ui/primitives';

export interface NextStep {
  id: string;
  emoji: string;
  /** la pregunta, dicha como un colega */
  ask: string;
  /** por qué te lo pregunto */
  why: string;
  /** botones de respuesta */
  options?: { label: string; run: () => void; testId?: string; solid?: boolean }[];
  /** o una casilla para contestar ahí mismo */
  render?: () => ReactNode;
}

const openFeature = (id: string, feature: string) => useUI.setState({ actionFeature: { id, feature } });

/** Pone un comportamiento y abre su tarjeta para que lo ajustes en el momento. */
function addBehaviorHere(id: string, type: BehaviorType) {
  A.apply((d) => op.addBehavior(d, id, type).doc);
  openFeature(id, 'behaviors');
}

/** Crea una idea nueva unida con una línea especial (lo que no pasa, lo que no cabe, el desvío). */
function addSpecialLine(id: string, role: 'reject' | 'overflow' | 'divert', title: string) {
  const doc = A.getDoc();
  const n = doc?.nodes[id];
  if (!doc || !n) return;
  let nid = '';
  A.apply((d) => {
    const r = op.addNode(d, 'bubble', { title, position: { x: n.position.x + 60, y: n.position.y + 170 }, parentId: n.parentId, visualStyle: { color: 'rose' } as never });
    nid = r.id;
    return op.addEdge(r.doc, id, nid, 'flow', { behavior: { role } as never, visualStyle: { label: role === 'reject' ? 'no pasan' : role === 'overflow' ? 'no caben' : 'desvío', sourceAnchor: 'bottom', targetAnchor: 'top' } }).doc;
  });
  useUI.getState().setSelection([nid]);
  useUI.setState({ editingNodeId: nid });
}

function setQuantity(id: string, value: number) {
  A.apply((d) => {
    const n = d.nodes[id];
    const cur = n.dimensionValues.quantity ?? { value: 0, mode: 'numeric' as const, unit: d.dimensions.quantity?.unit ?? '', confidence: 'estimate' as const, source: '', range: null };
    return op.updateNode(d, id, { dimensionValues: { ...n.dimensionValues, quantity: { ...cur, value, mode: 'numeric' } } });
  }, `qty-${id}`);
}

export function nextSteps(doc: ProjectDoc, n: MapNode): NextStep[] {
  if (n.aliasOf || !['bubble', 'input', 'output'].includes(n.type)) return [];
  const id = n.id;
  const nodes = Object.values(doc.nodes).filter((x) => !x.aliasOf);
  const edges = Object.values(doc.edges);
  const flowIn = edges.filter((e) => e.type === 'flow' && e.targetNodeId === id);
  const flowOut = edges.filter((e) => e.type === 'flow' && e.sourceNodeId === id);
  const causalOut = edges.filter((e) => e.type === 'causal' && e.sourceNodeId === id);
  const remedies = edges.filter((e) => e.type === 'causal' && e.targetNodeId === id && e.behavior.influence.mode === 'compensate');
  const bhs = n.behaviorIds.map((b) => doc.behaviors[b]).filter(Boolean);
  const has = (t: BehaviorType) => bhs.some((b) => b!.behaviorType === t);
  const v = n.weight.influence ? scaleValueToWeighted(n.weight.influence, doc.project.settings).value : 0;
  const inputs = nodes.filter((x) => x.type === 'input');
  const outputs = nodes.filter((x) => x.type === 'output');
  const out: NextStep[] = [];

  // 1) una idea suelta, sin líneas: ¿qué es?
  if (n.type === 'bubble' && !edges.some((e) => e.sourceNodeId === id || e.targetNodeId === id) && v === 0 && !bhs.length) {
    out.push({
      id: 'role', emoji: '🧩', ask: '¿Qué es esto?',
      why: 'Según lo que sea, te traigo lo siguiente. Elige y seguimos desde aquí.',
      options: [
        ...(!inputs.length ? [{ label: '🌱 Lo que pongo en marcha', testId: 'next-role-input', solid: true, run: () => { A.apply((d) => op.convertNodeType(d, id, 'input')); setQuantity(id, 100); } }] : []),
        { label: '👣 Un paso del camino', testId: 'next-role-step', run: () => { const src = inputs[0]; if (src) A.connect(src.id, id, 'flow'); else A.createConnectedNode(id); } },
        ...(!outputs.length ? [{ label: '🎯 Lo que quiero conseguir', testId: 'next-role-output', run: () => A.apply((d) => op.convertNodeType(d, id, 'output')) }] : []),
        { label: '🪨 Algo que me frena', testId: 'next-role-brake', run: () => A.apply((d) => op.updateNode(d, id, { weight: { ...d.nodes[id].weight, influence: { mode: 'weighted', value: -3, scaleId: null } } })) },
      ],
    });
    return out;
  }

  // 2) un inicio: ¿cuántos salen?
  if (n.type === 'input' && n.dimensionValues.quantity == null) {
    out.push({
      id: 'qty', emoji: '🌱', ask: '¿Cuántos salen de aquí en cada vuelta?',
      why: 'Es lo que pones en marcha: llamadas, clientes, euros, horas… Una vuelta es una semana, un mes, lo que tú quieras.',
      render: () => <NumberInput value={null} placeholder="por ejemplo, 100" min={0} onChange={(x) => setQuantity(id, x)} data-testid="next-qty" />,
    });
  }

  // 3) una idea que frena o ayuda, sin decir a quién
  if (v !== 0 && !causalOut.length) {
    const word = v < 0 ? 'estorba' : 'ayuda';
    out.push({
      id: 'target', emoji: v < 0 ? '🪨' : '🤝', ask: `¿A quién ${word}?`,
      why: `Así, el mapa sabe a quién le quita (o le suma) y te lo cuenta. Elige la idea y la uno yo.`,
      options: nodes.filter((x) => x.id !== id && ['bubble', 'input', 'output'].includes(x.type) && !(x.weight.influence && x.weight.influence.value !== 0)).slice(0, 4)
        .map((x) => ({ label: `→ ${x.title || 'sin nombre'}`, run: () => A.connect(id, x.id, 'causal') })),
    });
  }

  // 4) un freno sin remedio
  if (v < 0 && causalOut.length && !remedies.length) {
    out.push({
      id: 'remedy', emoji: '🩹', ask: '¿Haces algo para que frene menos?',
      why: 'Apunta tu remedio y te digo al momento cuánto lo arregla.',
      options: [{ label: '🩹 Poner un remedio', solid: true, testId: 'next-remedy', run: () => { const rid = A.addRemedy(id); if (rid) { useUI.getState().setSelection([rid]); useUI.setState({ editingNodeId: rid }); } } }],
    });
  }

  // 5) en el camino y sin nada especial: ¿qué le pasa a lo que llega?
  const onPath = n.type === 'bubble' && flowIn.length > 0;
  if (onPath && !bhs.length) {
    const pick = (t: BehaviorType, label: string) => ({ label: `${BEHAVIOR_KID[t].emoji} ${label}`, testId: `next-bh-${t}`, run: () => addBehaviorHere(id, t) });
    out.push({
      id: 'behavior', emoji: '⚙️', ask: '¿Qué le pasa a lo que llega aquí?',
      why: 'Si todo sigue igual, no hagas nada. Si no, elige y lo ajustas ahí mismo.',
      options: [pick('filter', 'No todo sigue'), pick('restrictor', 'No caben todos'), pick('reducer', 'Se escapa algo'), pick('multiplier', 'Se multiplica'), pick('accumulator', 'Se guarda')],
    });
  }

  // 6) puertas que abre lo que ya tiene: adónde va lo que no pasa / no cabe / se desvía
  const roleLine = (role: 'reject' | 'overflow' | 'divert') => flowOut.some((e) => e.behavior.role === role);
  if (has('filter') && !roleLine('reject')) {
    out.push({
      id: 'reject', emoji: '🧺', ask: '¿Adónde van los que no pasan el colador?',
      why: 'Ahora se pierden. Si van a otro sitio (por ejemplo, «los llamo otro día»), llévalos allí.',
      options: [{ label: 'Se pierden, está bien así', run: () => undefined }, { label: '➕ Llevarlos a otra idea', solid: true, testId: 'next-reject', run: () => addSpecialLine(id, 'reject', 'Los que no pasan') }],
    });
  }
  const excessOverflow = bhs.some((b) => b!.behaviorType === 'restrictor' && b!.parameters.excess === 'overflow');
  if (excessOverflow && !roleLine('overflow')) {
    out.push({
      id: 'overflow', emoji: '🚧', ask: '¿Adónde van los que no caben?',
      why: 'Dijiste que van por otra línea, pero aún no existe. La creo y la ves.',
      options: [{ label: '➕ Crear esa línea', solid: true, testId: 'next-overflow', run: () => addSpecialLine(id, 'overflow', 'Los que no caben') }],
    });
  }
  if (has('diverter') && !roleLine('divert')) {
    out.push({
      id: 'divert', emoji: '↪️', ask: '¿Por dónde se desvían?',
      why: 'El desvío necesita su camino. Lo creo y le pones nombre.',
      options: [{ label: '➕ Crear el desvío', solid: true, testId: 'next-divert', run: () => addSpecialLine(id, 'divert', 'Por aquí se desvían') }],
    });
  }

  // 7) ¿y después? (seguir el camino hasta la meta)
  if (n.type !== 'output' && !flowOut.length && (n.type === 'input' || onPath)) {
    const reach = outputs.filter((o) => o.id !== id);
    out.push({
      id: 'after', emoji: '➕', ask: '¿Qué pasa después?',
      why: reach.length ? 'Sigue el camino con un paso nuevo o únela ya a tu meta.' : 'Sigue el camino. Cuando llegues, pon lo que quieres conseguir 🎯.',
      options: [
        { label: '👣 Un paso nuevo', solid: true, testId: 'next-after', run: () => A.createConnectedNode(id) },
        ...reach.slice(0, 2).map((o) => ({ label: `🎯 Unir con «${o.title}»`, run: () => A.connect(id, o.id, 'flow') })),
        ...(!reach.length ? [{ label: '🎯 Poner la meta', testId: 'next-goal', run: () => A.createConnectedNode(id, false, 'output') }] : []),
      ],
    });
  }

  // 8) una meta: ¿qué te impide llegar más?
  if (n.type === 'output' && flowIn.length && !edges.some((e) => e.type === 'causal' && e.targetNodeId === id)) {
    out.push({
      id: 'goal', emoji: '🎯', ask: '¿Qué te impide llegar a más?',
      why: 'Ponlo y verás cuánto te quita. Así sabes qué atacar primero.',
      options: [{ label: '🪨 Algo que me frena', solid: true, testId: 'next-goal-brake', run: () => A.addInfluencer(id, -1) }, { label: '🤝 Algo que me ayuda', run: () => A.addInfluencer(id, 1) }],
    });
  }
  return out.slice(0, 3);
}
