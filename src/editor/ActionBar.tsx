/**
 * La tarjeta de la idea elegida, en el propio lienzo: el núcleo creativo.
 * Te cuenta cómo va ahora, te trae lo siguiente con sentido y te deja hacerlo
 * todo ahí mismo, sin ir a buscar nada a otra parte.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useInternalNode, useStore } from '@xyflow/react';
import { X } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { useKid } from '../kid/kidStore';
import * as A from '../app/actions';
import * as KA from '../kid/kidActions';
import * as K from '../kid/model';
import { levelOf } from '../app/levels';
import { effectiveDoc } from '../engine/scenario';
import { canMute, isMuted } from '../engine/mute';
import { toggleMute } from '../app/mute';
import { InspectorContext } from '../inspector/fields';
import { DiscoveryBlock, FeatureMenu, NodeLive, nodeFeatures } from '../inspector/NodeInspector';
import { KidEdgeInspector, KidNodeInspector } from '../kid/KidInspector';
import { EdgeInspector } from '../inspector/EdgeInspector';
import { nextSteps } from './nextSteps';
import { Ico, IcoText } from '../ui/ico';
import { Button, cx } from '../ui/primitives';
import type { MapNode } from '../core/model/schema';

/** Lo más usado va a la vista; lo demás, a un clic. */
const PRIMARY = new Set(['text', 'output', 'behaviors', 'influence', 'remedies', 'conditions', 'routing']);
const TYPE: Record<MapNode['type'], { e: string; name: string }> = {
  bubble: { e: '💡', name: 'Idea' }, input: { e: '🌱', name: 'Inicio' }, output: { e: '🎯', name: 'Meta' }, note: { e: '📝', name: 'Nota' },
  label: { e: '🔤', name: 'Texto suelto' }, comment: { e: '💬', name: 'Comentario' }, group: { e: '📦', name: 'Grupo' }, container: { e: '🗺️', name: 'Zona' },
};
const num = (v: number | undefined) => { const x = v ?? 0; return Math.abs(x - Math.round(x)) < 0.05 ? String(Math.round(x)) : x.toFixed(1).replace('.', ','); };

interface Act { e: string; title: string; sub: string; run: () => void; testId: string }

interface Rect { x: number; y: number; w: number; h: number }
/** Elige dónde poner la tarjeta: a la derecha, a la izquierda, debajo o encima de la idea, donde menos tape. */
function placeCard({ sx, sy, nw, nh, W, cw, avail, others }: { sx: number; sy: number; nw: number; nh: number; W: number; cw: number; avail: number; others: Rect[] }) {
  const H = Math.min(440, avail - 20);
  const clampX = (x: number) => Math.max(10, Math.min(cw - W - 10, x));
  const clampY = (y: number) => Math.max(10, Math.min(avail - Math.min(H, 260), y));
  const cands: { left: number; top: number; pref: number }[] = [
    { left: sx + nw + 14, top: clampY(sy - 8), pref: 0 },
    { left: sx - 14 - W, top: clampY(sy - 8), pref: 1 },
    { left: clampX(sx + nw / 2 - W / 2), top: sy + nh + 14, pref: 2 },
    { left: clampX(sx + nw / 2 - W / 2), top: sy - 14 - H, pref: 3 },
  ];
  const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  let best = cands[0];
  let bestScore = Infinity;
  for (const c of cands) {
    const r = { x: c.left, y: c.top, w: W, h: Math.min(H, avail - c.top - 10) };
    const outside = (c.left < 10 || c.left + W > cw - 10 || c.top < 10 || r.h < 200) ? 1e9 : 0;
    const covered = others.reduce((sum, o) => sum + overlap(r, o), 0);
    const score = outside + covered + c.pref * 400;
    if (score < bestScore) { bestScore = score; best = c; }
  }
  const left = clampX(best.left);
  const top = Math.max(10, best.top);
  return { left, top, maxH: Math.max(200, avail - top - 10) };
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3"><Ico e={title.split(' ')[0]} size={13} />{title.split(' ').slice(1).join(' ')}</div>
      {children}
    </div>
  );
}

function ActButton({ a }: { a: Act }) {
  return (
    <button type="button" onClick={a.run} data-testid={a.testId} title={a.sub}
      className="flex items-start gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 text-left transition-colors hover:border-accent hover:bg-accent-soft/40">
      <Ico e={a.e} size={16} className="mt-[1px]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold leading-tight text-ink">{a.title}</span>
        <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-3">{a.sub}</span>
      </span>
    </button>
  );
}

function KidLive({ id, papel }: { id: string; papel: K.Papel | null }) {
  const a = useKid((s) => s.analysis);
  const n = useProject((s) => s.doc?.nodes[id]);
  let e = '🧭';
  let t: ReactNode;
  if (n && isMuted(n)) { e = '🔇'; t = 'Silenciada: ahora no cuenta. Pulsa «Volver a activar» para que cuente.'; }
  else if (papel === 'hoy') { e = '🌱'; t = <>De aquí salen tus <b>10 empujones</b> en cada vuelta.</>; }
  else if (!a?.listo) t = a?.falta === 'meta' ? 'Pon lo que quieres conseguir y te digo cuánto te llega.' : a?.falta === 'hoy' ? 'Pon cómo está la cosa hoy para empezar el camino.' : 'Une «Hoy» con lo que quieres, paso a paso.';
  else if (papel === 'paso') { e = '👣'; t = <>Aquí llegan <b>{num(a.pasos.find((p) => p.id === id)?.llegan)}</b> de cada 10 empujones.</>; }
  else if (papel === 'meta') { e = '🎯'; t = <>Llegan <b>{num(a.llegan)}</b> de cada 10 empujones.</>; }
  else if (papel === 'piedra') { const s = a.piedras.find((x) => x.id === id); e = '🪨'; t = s?.objetivo ? <>Te quita <b>{num(s.quita)}</b> de cada 10 empujones.</> : 'Dime qué paso frena (abajo) y te digo cuánto te quita.'; }
  else if (papel === 'ayuda') { const h = a.ayudas.find((x) => x.id === id); e = '🤝'; t = h?.piedra ? <>Te devuelve <b>{num(h.devuelve)}</b> de cada 10 empujones.</> : 'Dime con qué piedra te ayuda (abajo).'; }
  else { e = '💡'; t = 'Una idea suelta. Cuando sepas qué es, elígelo abajo.'; }
  return <p className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-2" data-testid="node-live"><Ico e={e} size={15} className="mt-[1px]" /><span className="min-w-0 flex-1">{t}</span></p>;
}

export function ActionBar() {
  const doc = useProject((s) => s.doc);
  const sel = useUI((s) => s.selection);
  const editing = useUI((s) => s.editingNodeId);
  const af = useUI((s) => s.actionFeature);
  const tool = useUI((s) => s.tool);
  const [showAll, setShowAll] = useState(false);
  const id = sel.nodes.length === 1 && sel.edges.length === 0 ? sel.nodes[0] : null;
  const internal = useInternalNode(id ?? '');
  const tx = useStore((s) => s.transform[0]);
  const ty = useStore((s) => s.transform[1]);
  const zoom = useStore((s) => s.transform[2]);
  const cw = useStore((s) => s.width);
  const ch = useStore((s) => s.height);
  const lookup = useStore((s) => s.nodeLookup);
  const eff = useMemo(() => (doc ? effectiveDoc(doc, doc.project.activeScenarioId) : null), [doc]);
  useEffect(() => setShowAll(false), [id]);
  // dónde están las demás ideas en la pantalla, para no taparlas (React Flow cambia este mapa por dentro: se lee cada vez)
  const rects = [...lookup.values()].filter((nd) => nd.type !== 'groupNode').map((nd) => ({
    id: nd.id, x: nd.internals.positionAbsolute.x * zoom + tx, y: nd.internals.positionAbsolute.y * zoom + ty,
    w: (nd.measured.width ?? 160) * zoom, h: (nd.measured.height ?? 50) * zoom,
  }));
  // si estás poniendo algo nuevo (inicio, meta, nota…), la tarjeta se aparta
  if (!doc || !eff || !id || !doc.nodes[id] || editing === id || tool !== 'select') return null;
  const level = levelOf(doc.project.settings.depth);
  const n = doc.nodes[id];
  const open = af && af.id === id ? af.feature : null;
  const setOpen = (f: string | null) => useUI.setState({ actionFeature: f ? { id, feature: f } : null });
  // la tarjeta va al lado de la idea (a la derecha si cabe; si no, a la izquierda) y siempre dentro de lo que ves
  const abs = internal?.internals.positionAbsolute ?? { x: 0, y: 0 };
  const nw = (internal?.measured.width ?? 160) * zoom;
  const sx = abs.x * zoom + tx;
  const sy = abs.y * zoom + ty;
  const W = Math.min(430, Math.max(260, cw - 24));
  // en el modo fácil, abajo están la Brújula y la bandeja: se les deja su sitio
  const reserved = level < 3 ? 250 : 10;
  const avail = ch - reserved;
  const nh = (internal?.measured.height ?? 50) * zoom;
  const { left, top, maxH } = placeCard({ sx, sy, nw, nh, W, cw, avail, others: rects.filter((r) => r.id !== id) });
  const scenario = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  const c = level < 3 ? K.leerCamino(doc) : null;
  const papel = c ? (c.roles.get(id) ?? null) : null;
  const head = level < 3 && papel ? { e: K.PAPEL[papel].emoji, name: K.PAPEL[papel].name } : TYPE[n.type];
  const muted = isMuted(n);
  const isThing = ['bubble', 'input', 'output'].includes(n.type) && !n.aliasOf;

  const creates: Act[] = [];
  if (level < 3) {
    if (papel === 'hoy') creates.push({ e: '👣', title: 'Mi primer paso', sub: 'Lo primero que harías.', run: () => KA.nuevo('paso'), testId: 'act-paso' });
    if (papel === 'paso') {
      creates.push({ e: '👣', title: 'El paso siguiente', sub: 'Lo que harías después.', run: () => KA.nuevo('paso'), testId: 'act-paso' });
      creates.push({ e: '🪨', title: 'Algo que me frena aquí', sub: 'Y ves cuánto te quita.', run: () => KA.nuevo('piedra'), testId: 'act-piedra' });
    }
    if (papel === 'meta') creates.push({ e: '🪨', title: 'Algo que me frena', sub: 'Y ves cuánto te quita.', run: () => KA.nuevo('piedra'), testId: 'act-piedra' });
    if (papel === 'piedra') creates.push({ e: '🤝', title: 'Algo que me ayuda con esto', sub: 'Y ves cuánto te devuelve.', run: () => KA.nuevo('ayuda'), testId: 'act-ayuda' });
    if ((papel === 'idea' || !papel) && isThing) creates.push({ e: '💡', title: 'Otra idea unida', sub: 'Para seguir tirando del hilo.', run: () => A.createConnectedNode(id), testId: 'act-idea' });
  } else if (isThing) {
    if (n.type !== 'output') creates.push({ e: '➕', title: 'Lo que viene después', sub: 'Una idea nueva, ya unida.', run: () => A.createConnectedNode(id), testId: 'act-next' });
    creates.push({ e: '🪨', title: 'Algo que la frena', sub: 'Y ves al momento cuánto le quita.', run: () => A.addInfluencer(id, -1), testId: 'act-brake' });
    creates.push({ e: '🤝', title: 'Algo que la ayuda', sub: 'Y ves cuánto le suma.', run: () => A.addInfluencer(id, 1), testId: 'act-help' });
  }
  const steps = level === 3 ? nextSteps(doc, n) : [];
  const features = level === 3 ? nodeFeatures(eff, n) : [];
  const visible = showAll ? features : features.filter((f) => PRIMARY.has(f.id));

  return (
    <InspectorContext.Provider value={{ doc, eff, scenarioIsBase: !scenario || scenario.isBase }}>
        <div className="nodrag nopan nowheel mdf-pop absolute z-[6] overflow-y-auto rounded-2xl border border-line bg-surface p-3 text-left shadow-float"
          style={{ left, top, width: W, maxHeight: maxH }}
          data-testid="action-bar" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-2">
            <Ico e={head.e} size={20} className="mt-[1px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">{head.name}{n.title ? <span className="font-normal text-ink-2"> · «{n.title}»</span> : null}</div>
              <div className="text-[11.5px] leading-snug text-ink-3">Desde aquí lo haces todo: mira cómo va y elige lo siguiente.</div>
            </div>
            <button type="button" aria-label="Cerrar la tarjeta" title="Cerrar (Esc)" onClick={() => useUI.getState().setSelection([])} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
          </div>
          {isThing && <div className="mt-2 rounded-xl bg-surface-2/70 px-2.5 py-2">{level < 3 ? <KidLive id={id} papel={papel} /> : <NodeLive n={n} />}</div>}
          {level === 3 && n.metadata.discovery && <div className="mt-2"><DiscoveryBlock n={n} /></div>}

          {open && level === 3 ? (
            <div className="mt-3"><FeatureMenu features={features} open={open} onOpen={setOpen} /></div>
          ) : (
            <>
              {steps.length > 0 && (
                <Block title="👉 Lo siguiente">
                  {steps.map((st) => (
                    <div key={st.id} className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-accent-soft/40 p-2.5" data-testid={`next-step-${st.id}`}>
                      <div className="flex items-start gap-2">
                        <Ico e={st.emoji} size={16} className="mt-[1px]" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold leading-tight text-ink"><IcoText text={st.ask} size={13} /></div>
                          <div className="mt-0.5 text-[11.5px] leading-snug text-ink-3"><IcoText text={st.why} size={12} /></div>
                        </div>
                      </div>
                      {st.render && <div className="mt-2">{st.render()}</div>}
                      {st.options && st.options.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {st.options.map((o, i) => <Button key={i} size="sm" variant={o.solid ? 'solid' : 'outline'} onClick={o.run} data-testid={o.testId}>{o.label}</Button>)}
                        </div>
                      )}
                    </div>
                  ))}
                </Block>
              )}
              {creates.length > 0 && (
                <Block title="➕ Añadir al lado">
                  <div className={cx('grid gap-1.5', creates.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>{creates.map((a) => <ActButton key={a.testId} a={a} />)}</div>
                </Block>
              )}
              {level === 3 ? (
                <Block title="✏️ Cambiar esta idea">
                  <FeatureMenu features={visible} open={null} onOpen={setOpen} />
                  {!showAll && features.length > visible.length && (
                    <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-accent-text hover:bg-accent-soft/50" data-testid="act-more">
                      Ver todo lo demás: con quién está unida, qué es, color, notas, archivos…
                    </button>
                  )}
                </Block>
              ) : isThing ? (
                <Block title="✏️ Cómo es"><KidNodeInspector id={id} compact /></Block>
              ) : null}
              {(muted || (isThing && canMute(doc, n)) || level === 3) && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                  {(muted || (isThing && canMute(doc, n))) && (
                    <Button size="sm" variant={muted ? 'solid' : 'outline'} onClick={() => toggleMute(id)} data-testid="act-mute" title="Se calcula como si no estuviera, sin borrar nada">
                      {muted ? '🔊 Volver a activar' : '🔇 Silenciar: mira qué pasa sin ella'}
                    </Button>
                  )}
                  {level === 3 && <Button size="sm" variant="danger" onClick={A.deleteSelection} data-testid="act-delete">🗑️ Borrar</Button>}
                </div>
              )}
            </>
          )}
        </div>
    </InspectorContext.Provider>
  );
}


/** La tarjeta de la línea elegida, junto a ella: qué tipo de línea es, qué pasa por el camino y lo que hay detrás. */
export function EdgeBar() {
  const doc = useProject((s) => s.doc);
  const sel = useUI((s) => s.selection);
  const id = sel.edges.length === 1 && sel.nodes.length === 0 ? sel.edges[0] : null;
  const e = id ? doc?.edges[id] : undefined;
  const a = useInternalNode(e?.sourceNodeId ?? '');
  const b = useInternalNode(e?.targetNodeId ?? '');
  const tx = useStore((s) => s.transform[0]);
  const ty = useStore((s) => s.transform[1]);
  const zoom = useStore((s) => s.transform[2]);
  const cw = useStore((s) => s.width);
  const ch = useStore((s) => s.height);
  const eff = useMemo(() => (doc ? effectiveDoc(doc, doc.project.activeScenarioId) : null), [doc]);
  if (!doc || !eff || !id || !e || !a || !b) return null;
  const level = levelOf(doc.project.settings.depth);
  const center = (n: typeof a) => ({ x: (n.internals.positionAbsolute.x + (n.measured.width ?? 160) / 2) * zoom + tx, y: (n.internals.positionAbsolute.y + (n.measured.height ?? 50) / 2) * zoom + ty });
  const pa = center(a);
  const pb = center(b);
  const mx = (pa.x + pb.x) / 2;
  const my = (pa.y + pb.y) / 2;
  const W = Math.min(400, Math.max(260, cw - 24));
  let left = mx + 24;
  if (left + W > cw - 10) left = mx - 24 - W;
  left = Math.max(10, Math.min(cw - W - 10, left));
  const top = Math.max(10, Math.min(my - 40, ch - 260));
  const scenario = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  return (
    <InspectorContext.Provider value={{ doc, eff, scenarioIsBase: !scenario || scenario.isBase }}>
      <div className="nodrag nopan nowheel mdf-pop absolute z-[6] overflow-y-auto rounded-2xl border border-line bg-surface text-left shadow-float"
        style={{ left, top, width: W, maxHeight: Math.max(220, ch - top - 10) }} data-testid="edge-bar"
        onPointerDown={(ev) => ev.stopPropagation()} onDoubleClick={(ev) => ev.stopPropagation()} onKeyDown={(ev) => ev.stopPropagation()} onWheel={(ev) => ev.stopPropagation()}>
        <div className="flex justify-end px-2 pt-2">
          <button type="button" aria-label="Cerrar la tarjeta" title="Cerrar (Esc)" onClick={() => useUI.getState().setSelection([])} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
        </div>
        <div className="-mt-6">{level < 3 ? <KidEdgeInspector id={id} /> : <EdgeInspector id={id} />}</div>
      </div>
    </InspectorContext.Provider>
  );
}
