/**
 * Detalles del modo fácil: «¿Qué es esto?» con botones grandes y, según lo que
 * sea, una o dos preguntas sencillas. Cada cosa dice para qué sirve y qué cambia.
 */
import { ArrowLeft, ArrowLeftRight, ArrowRight, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import * as A from '../app/actions';
import { levelOf, setLevel } from '../app/levels';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { NODE_COLORS, COLOR_LABEL } from '../ui/icons';
import { Field, TextArea, TextInput, cx } from '../ui/primitives';
import { applyKid } from './kidActions';
import { useKid } from './kidStore';
import * as K from './model';
import { Ico, icoChildren } from '../ui/ico';

const num = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

function Chip({ on, onClick, children, testId, title }: { on?: boolean; onClick: () => void; children: ReactNode; testId?: string; title?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} data-testid={testId} title={title}
      className={cx('inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left text-[13.5px] font-medium transition-colors',
        on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink hover:border-accent/60')}>
      {icoChildren(children)}
    </button>
  );
}

function Effect({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface-2/80 px-3 py-2 text-[13.5px] leading-snug text-ink" data-testid="kid-effect">{children}</p>;
}

const TIP: Record<K.Papel, string> = {
  idea: 'Las ideas sueltas te ayudan a pensar. Luego puedes convertirlas en pasos, piedras o ayudas.',
  hoy: 'Es tu punto de partida. De aquí salen tus 10 empujones.',
  meta: 'Es a donde quieres llegar. Aquí se cuenta cuántos empujones llegan.',
  paso: 'Los pasos forman el camino. Ponlos en orden: del primero al último.',
  piedra: 'Una piedra se queda con parte de tus empujones. Ponerla te ayuda a ver qué te frena.',
  ayuda: 'Una ayuda hace más pequeña una piedra, así llegan más empujones.',
  razon: 'Tus razones no cambian la cuenta, pero te dan fuerza cuando cueste.',
  siento: 'Lo que sientes no cambia la cuenta, pero es una pista importante.',
  pregunta: 'Algo que te falta saber. Averiguarlo también es avanzar.',
};

/** compact: dentro de la tarjeta del lienzo (sin cabecera; el «¿Qué es esto?» se abre a petición). */
export function KidNodeInspector({ id, compact = false }: { id: string; compact?: boolean }) {
  const [showRoles, setShowRoles] = useState(false);
  const doc = useProject((s) => s.doc)!;
  const a = useKid((s) => s.analysis);
  const n = doc.nodes[id];
  if (!n) return null;
  const level = levelOf(doc.project.settings.depth);
  if (!['bubble', 'input', 'output'].includes(n.type)) {
    return (
      <div data-testid="node-inspector" data-papel="nota">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-[20px] leading-none" aria-hidden>📝</span><span className="font-display text-[17px] font-medium text-ink">Nota</span><span className="flex-1" />
          <button type="button" onClick={A.deleteSelection} data-testid="kid-delete" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-3 hover:text-loss"><Trash2 className="size-3.5" />Quitar</button>
        </div>
        <div className="space-y-3 px-4 py-4"><Field label="Lo que pone"><TextArea rows={4} value={n.title} onChange={(title) => A.apply((d) => op.updateNode(d, id, { title }), `title-${id}`)} data-testid="inspector-title" /></Field></div>
      </div>
    );
  }
  const c = K.leerCamino(doc);
  const papel = c.roles.get(id) ?? 'idea';
  const info = K.PAPEL[papel];
  const custom = n.metadata.custom ?? {};
  const upd = (patch: Partial<typeof n>, key?: string) => A.apply((d) => op.updateNode(d, id, patch), key);
  const setPapel = (p: K.Papel) => applyKid((d) => K.setPapel(d, id, p));
  const stone = a?.piedras.find((s) => s.id === id);
  const helper = a?.ayudas.find((h) => h.id === id);
  const step = a?.pasos.find((s) => s.id === id);
  const targets = [...c.pasos, ...(c.meta ? [c.meta] : [])];
  const target = papel === 'piedra' ? K.objetivoDe(doc, id, c.idx) : null;
  const myStone = papel === 'ayuda' ? K.piedraDe(doc, id, c.idx) : null;
  const tamano = K.tamanoOf(n);
  const fuerza = K.fuerzaOf(doc, n, c.idx);
  const iStep = c.pasos.findIndex((p) => p.id === id);
  return (
    <div data-testid="node-inspector" data-papel={papel}>
      {!compact && <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Ico e={info.emoji} size={22} />
        <span className="font-display text-[17px] font-medium text-ink">{info.name}</span>
        <span className="flex-1" />
        <button type="button" onClick={A.deleteSelection} data-testid="kid-delete" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-3 hover:bg-[color-mix(in_srgb,var(--loss)_10%,transparent)] hover:text-loss">
          <Trash2 className="size-3.5" />Quitar
        </button>
      </div>}
      <div className={compact ? 'space-y-3' : 'space-y-4 px-4 py-4'}>
        {!compact && <Field label="Lo que pone"><TextInput value={n.title} onChange={(title) => upd({ title }, `title-${id}`)} data-testid="inspector-title" /></Field>}

        {level === 1 ? (
          <div className="space-y-2">
            <div className="text-[12.5px] font-semibold text-ink-2">¿Esto es…?</div>
            <div className="grid gap-2">
              <Chip testId="kid-role-meta" onClick={() => { setPapel('meta'); setLevel(2); }}>🎯 Algo que quiero conseguir</Chip>
              <Chip testId="kid-role-hoy" onClick={() => { setPapel('hoy'); setLevel(2); }}>😟 Algo que me preocupa (cómo está hoy)</Chip>
            </div>
            <p className="text-[12.5px] leading-snug text-ink-3">Si eliges una, empezamos el camino: de cómo está hoy a lo que quieres.</p>
          </div>
        ) : compact && !showRoles ? (
          <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
            <span className="inline-flex items-center gap-1">Es: <Ico e={info.emoji} size={14} /><b>{info.name}</b></span>
            <button type="button" className="rounded-lg px-1.5 py-0.5 text-[12px] font-medium text-accent-text underline-offset-2 hover:underline" onClick={() => setShowRoles(true)} data-testid="kid-change-role">Cambiar lo que es</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[12.5px] font-semibold text-ink-2">¿Qué es esto?</div>
            <div className="grid grid-cols-2 gap-1.5">
              {K.PAPELES.map((p) => (
                <Chip key={p} on={p === papel} testId={`kid-role-${p}`} title={K.PAPEL[p].hint} onClick={() => p !== papel && setPapel(p)}>
                  <Ico e={K.PAPEL[p].emoji} size={15} /><span className="leading-tight">{K.PAPEL[p].name}</span>
                </Chip>
              ))}
            </div>
            <p className="text-[12.5px] leading-snug text-ink-3" data-testid="kid-role-tip">{TIP[papel]}</p>
          </div>
        )}

        {papel === 'piedra' && (
          <>
            <div className="space-y-1.5">
              <div className="text-[12.5px] font-semibold text-ink-2">¿Cómo de grande es?</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(K.TAMANO) as K.Tamano[]).map((t) => (
                  <Chip key={t} on={t === tamano} testId={`kid-size-${t}`} onClick={() => applyKid((d) => K.setTamano(d, id, t))}>
                    {t === 'pequena' ? '🪨' : t === 'mediana' ? '🪨🪨' : '🪨🪨🪨'} {K.TAMANO[t].label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[12.5px] font-semibold text-ink-2">¿Qué frena?</div>
              <div className="flex flex-wrap gap-1.5">
                {targets.map((t) => (
                  <Chip key={t.id} on={t.id === target} testId={`kid-target-${t.id}`} onClick={() => applyKid((d) => K.apuntar(d, id, t.id))}>
                    {t.id === c.meta?.id ? '🎯' : '👣'} <span className="line-clamp-1">{t.title}</span>
                  </Chip>
                ))}
                {!targets.length && <p className="text-[12.5px] text-ink-3">Primero pon algún paso o lo que quieres conseguir.</p>}
              </div>
            </div>
            {stone && <Effect>{stone.quita >= 0.05 ? <>Esta piedra te quita <b>{num(stone.quita)}</b> de cada 10 empujones.</> : 'Ahora mismo esta piedra casi no te quita nada.'}{stone.ayudas.length ? ' Ya tiene ayuda.' : ' ¿Quién te podría ayudar con ella? Añade una 🤝 Ayuda.'}</Effect>}
          </>
        )}

        {papel === 'ayuda' && (
          <>
            <div className="space-y-1.5">
              <div className="text-[12.5px] font-semibold text-ink-2">¿Con qué piedra te ayuda?</div>
              <div className="flex flex-wrap gap-1.5">
                {c.piedras.map((s) => (
                  <Chip key={s.id} on={s.id === myStone} testId={`kid-stone-${s.id}`} onClick={() => applyKid((d) => K.apuntar(d, id, s.id))}>🪨 <span className="line-clamp-1">{s.title}</span></Chip>
                ))}
                {!c.piedras.length && <p className="text-[12.5px] text-ink-3">Todavía no hay piedras. Si algo te frena, ponlo como 🪨 Piedra.</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[12.5px] font-semibold text-ink-2">¿Cuánto te ayuda?</div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(K.FUERZA) as K.Fuerza[]).map((f) => (
                  <Chip key={f} on={f === fuerza} testId={`kid-force-${f}`} onClick={() => applyKid((d) => K.setFuerza(d, id, f))}>{f === 'poco' ? '🤏' : f === 'bastante' ? '👍' : '💪'} {K.FUERZA[f].label}</Chip>
                ))}
              </div>
            </div>
            {helper && <Effect>{helper.devuelve >= 0.05 ? <>Gracias a esta ayuda llegan <b>{num(helper.devuelve)}</b> empujones más de cada 10.</> : myStone ? 'Esta ayuda casi no cambia nada todavía. ¿Puede ayudar más?' : 'Dile con qué piedra te ayuda.'}</Effect>}
          </>
        )}

        {papel === 'paso' && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Chip on={K.isPrimero(n)} testId="kid-first" onClick={() => applyKid((d) => K.marcar(d, id, 'primero', !K.isPrimero(n)))}>⭐ Es mi primer paso</Chip>
              <Chip on={K.isHecho(n)} testId="kid-done" onClick={() => { applyKid((d) => K.marcar(d, id, 'hecho', !K.isHecho(n))); if (!K.isHecho(n)) useUI.getState().notify('✅ ¡Muy bien! Un paso menos.', 'success'); }}>✅ ¡Ya lo he hecho!</Chip>
            </div>
            {c.simple && iStep >= 0 && c.pasos.length > 1 && (
              <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
                <span>Orden:</span>
                <Chip testId="kid-move-left" onClick={() => applyKid((d) => K.moverPaso(d, id, -1))}><ArrowLeft className="size-3.5" />Antes</Chip>
                <Chip testId="kid-move-right" onClick={() => applyKid((d) => K.moverPaso(d, id, 1))}>Después<ArrowRight className="size-3.5" /></Chip>
                <span className="tabular">paso {iStep + 1} de {c.pasos.length}</span>
              </div>
            )}
            {iStep < 0 && <Effect>Este paso no está en el camino. Pulsa otra vez «👣 Paso» arriba para meterlo.</Effect>}
            {step && <Effect>Aquí llegan <b>{num(step.llegan)}</b> de cada 10 empujones.</Effect>}
          </>
        )}

        {papel === 'meta' && (
          <>
            <Chip on={custom.conseguido === '1'} testId="kid-achieved" onClick={() => applyKid((d) => K.setMarca(d, id, 'conseguido', custom.conseguido === '1' ? null : '1'))}>🎉 ¡Lo he conseguido!</Chip>
            {a?.listo && <Effect>Llegan <b>{num(a.llegan)}</b> de cada 10 empujones.{a.llegan < 9.95 ? ' Mira «¿Por qué?» arriba para ver dónde se quedan los demás.' : ' ¡Todos!'}</Effect>}
          </>
        )}
        {papel === 'hoy' && <Effect>De aquí salen tus <b>10 empujones</b> en cada vuelta. Por el camino, las piedras se quedan con algunos.</Effect>}

        <Field label="✏️ Explicación" help="Sale dentro de la burbuja, debajo del nombre."><TextArea rows={compact ? 2 : 3} value={n.description} onChange={(description) => upd({ description }, `desc-${id}`)} placeholder="Cuéntalo en una frase…" /></Field>

        {papel === 'idea' && (
          <Field label="Color">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Color">
              {NODE_COLORS.map((col) => (
                <button key={col} type="button" role="radio" aria-checked={n.visualStyle.color === col} aria-label={COLOR_LABEL[col]} title={COLOR_LABEL[col]}
                  onClick={() => upd({ visualStyle: { ...n.visualStyle, color: col, background: null } })}
                  className={cx('size-7 rounded-full border transition-transform hover:scale-110', n.visualStyle.color === col && 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]')}
                  style={{ background: `var(--n-${col}-bg)`, borderColor: `var(--n-${col}-ac)` }} />
              ))}
            </div>
          </Field>
        )}
        {compact && (
          <button type="button" onClick={A.deleteSelection} data-testid="kid-delete" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-3 hover:bg-[color-mix(in_srgb,var(--loss)_10%,transparent)] hover:text-loss">
            <Trash2 className="size-3.5" />Quitar
          </button>
        )}
      </div>
    </div>
  );
}

export function KidEdgeInspector({ id }: { id: string }) {
  const doc = useProject((s) => s.doc)!;
  const e = doc.edges[id];
  if (!e) return null;
  const from = doc.nodes[e.sourceNodeId]?.title ?? '…';
  const to = doc.nodes[e.targetNodeId]?.title ?? '…';
  const meaning = e.type === 'flow' ? 'Es parte del camino: por aquí pasan tus empujones.'
    : e.type === 'causal' && e.behavior.influence.mode === 'compensate' ? `«${from}» ayuda con «${to}».`
    : e.type === 'causal' ? `«${from}» frena a «${to}».`
    : 'Solo dice que tienen que ver.';
  return (
    <div data-testid="edge-inspector">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Ico e="🔗" size={20} />
        <span className="font-display text-[17px] font-medium text-ink">Línea</span>
        <span className="flex-1" />
        {e.type === 'conceptual' && (
          <button type="button" aria-label="Cambiar el sentido" title="Cambiar el sentido" onClick={() => A.apply((d) => op.reverseEdge(d, id))} className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"><ArrowLeftRight className="size-4" /></button>
        )}
        <button type="button" onClick={A.deleteSelection} data-testid="kid-delete" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-ink-3 hover:text-loss"><Trash2 className="size-3.5" />Quitar la línea</button>
      </div>
      <div className="space-y-3 px-4 py-4">
        <p className="text-[14px] text-ink-2">Une <b className="text-ink">{from}</b> con <b className="text-ink">{to}</b>.</p>
        <Effect>{meaning}</Effect>
        <Field label="¿Quieres escribir algo en la línea?"><TextInput value={e.visualStyle.label} onChange={(label) => A.apply((d) => op.updateEdge(d, id, { visualStyle: { ...d.edges[id].visualStyle, label } }), `elabel-${id}`)} placeholder="Por ejemplo: «y entonces…»" data-edge-label-input /></Field>
      </div>
    </div>
  );
}
