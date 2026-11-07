/**
 * Guía de «siguiente paso» (niveles 1 y 2). Mira el mapa y propone UNA cosa
 * sencilla que hacer ahora, para que quien no sabe bien lo que quiere lo
 * vaya descubriendo al construir el mapa.
 */
import { ArrowRight, Lightbulb, Play, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { cx, fmt } from '../ui/primitives';
import * as A from './actions';
import { setLevel, type Level } from './levels';

const CONTENT = new Set(['bubble', 'input', 'output']);

interface Step { id: string; text: string; detail?: string; action?: { label: string; run: () => void; icon?: 'play' | 'next' | 'idea' }; tone?: 'win' }

/** ¿Hay un camino de flechas desde algún inicio hasta alguna meta? */
function hasPath(doc: ProjectDoc): boolean {
  const out = new Map<string, string[]>();
  for (const e of Object.values(doc.edges)) {
    if (e.type !== 'flow') continue;
    out.set(e.sourceNodeId, [...(out.get(e.sourceNodeId) ?? []), e.targetNodeId]);
    if (e.direction === 'both') out.set(e.targetNodeId, [...(out.get(e.targetNodeId) ?? []), e.sourceNodeId]);
  }
  const goals = new Set(Object.values(doc.nodes).filter((n) => n.type === 'output').map((n) => n.id));
  const seen = new Set<string>();
  const stack = Object.values(doc.nodes).filter((n) => n.type === 'input').map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (goals.has(id)) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(out.get(id) ?? []));
  }
  return false;
}

function convertSelected(type: 'input' | 'output') {
  const sel = useUI.getState().selection.nodes[0];
  const doc = useProject.getState().doc;
  const n = sel ? doc?.nodes[sel] : undefined;
  if (n && CONTENT.has(n.type)) {
    A.apply((d) => op.convertNodeType(d, n.id, type, { color: type === 'input' ? 'blue' : 'emerald', shape: 'pill' }));
  } else {
    A.createNodeAt(type);
  }
}

function compute(doc: ProjectDoc, level: Level, total: number | null, hasSelection: boolean): Step {
  const rounds = doc.project.settings.simulation.iterations;
  const nodes = Object.values(doc.nodes).filter((n) => CONTENT.has(n.type));
  const edges = Object.values(doc.edges);
  if (level === 1) {
    if (nodes.length === 0) {
      return { id: 'empty', text: 'Escribe qué te ronda la cabeza.', detail: 'Haz doble clic en cualquier sitio del lienzo, o pulsa el botón.', action: { label: 'Escribir mi idea', icon: 'idea', run: () => A.createNodeAt('bubble') } };
    }
    if (nodes.length === 1) {
      return { id: 'one', text: '¡Bien! Ahora suelta lo que se te ocurra alrededor.', detail: 'Selecciona la idea y pulsa Tab para añadir otra unida a ella. No hace falta que tenga sentido todavía.', action: { label: 'Añadir otra idea', icon: 'idea', run: () => A.createConnectedNode(nodes[0].id) } };
    }
    if (nodes.length < 5) {
      const from = useUI.getState().selection.nodes[0] ?? nodes[0].id;
      return { id: 'few', text: 'Sigue: ¿qué necesitas, qué te preocupa, qué te ilusiona?', detail: 'Cada cosa en su idea. Luego se ordena sola con «Ordenar».', action: { label: 'Otra idea', icon: 'idea', run: () => A.createConnectedNode(from) } };
    }
    if (edges.length < nodes.length - 2) {
      return { id: 'link', text: 'Une las ideas que tengan que ver entre sí.', detail: 'Pulsa «Unir» y arrastra desde el borde de una idea hasta otra.', action: { label: 'Unir ideas', run: () => useUI.setState({ tool: 'connect' }) } };
    }
    return { id: 'ready', text: '¿Ves un camino? Algo con lo que empiezas y algo que quieres conseguir.', detail: 'En «Movimiento» lo ponemos en marcha y ves qué llega y qué se pierde por el camino.', action: { label: 'Pasar a Movimiento', icon: 'next', run: () => setLevel(2) } };
  }
  // nivel 2
  const hasStart = nodes.some((n) => n.type === 'input');
  const hasGoal = nodes.some((n) => n.type === 'output');
  if (!hasStart) {
    return { id: 'start', text: '¿Dónde empieza todo?', detail: hasSelection ? 'La idea elegida será el «Inicio»: de ahí sale lo que se mueve (clientes, horas, dinero, ganas…).' : 'Elige la idea de arranque y pulsa el botón, o crea un Inicio nuevo.', action: { label: hasSelection ? 'Es el inicio' : 'Crear el inicio', run: () => convertSelected('input') } };
  }
  if (!hasGoal) {
    return { id: 'goal', text: '¿Qué quieres conseguir?', detail: hasSelection ? 'La idea elegida será tu «Meta».' : 'Elige la idea que sería tu meta y pulsa el botón, o crea una nueva.', action: { label: hasSelection ? 'Es mi meta' : 'Crear la meta', run: () => convertSelected('output') } };
  }
  if (!hasPath(doc)) {
    return { id: 'path', text: 'Une el inicio con la meta, pasando por los pasos que haga falta.', detail: 'Pulsa «Unir» y arrastra de una idea a la siguiente, en orden.', action: { label: 'Unir ideas', run: () => useUI.setState({ tool: 'connect' }) } };
  }
  if (total == null) {
    return { id: 'play', text: '¡Ya está listo! Pulsa Probar y mira qué llega a tu meta.', action: { label: 'Probar', icon: 'play', run: () => useSim.setState({ play: 'playing', cursor: 0, step: -1 }) } };
  }
  if (total <= 1e-9) {
    return { id: 'zero', text: 'No llega nada a tu meta.', detail: 'Mira si el inicio tiene cantidad (elígelo y cámbiala) o si algún paso lo frena del todo.', action: { label: 'Dímelo claro', run: () => useUI.setState({ overlay: 'verdict' }) } };
  }
  return { id: 'result', tone: 'win', text: `En ${rounds} rondas llegan ${fmt(total)} a tu meta.`, detail: '¿Dónde se pierde lo demás? Elige un paso y dile qué hace («solo pasa la mitad», «caben 10»…) o pídelo sin rodeos.', action: { label: 'Dímelo claro', run: () => useUI.setState({ overlay: 'verdict' }) } };
}

export function Coach({ level }: { level: Level }) {
  const doc = useProject((s) => s.doc);
  const total = useSim((s) => (s.result ? s.result.metrics.totalResult.quantity ?? 0 : null));
  const hasSelection = useUI((s) => s.selection.nodes.length === 1);
  const [hidden, setHidden] = useState<string | null>(null);
  const step = useMemo(() => (doc ? compute(doc, level, total, hasSelection) : null), [doc, level, total, hasSelection]);
  if (!step || hidden === step.id) return null;
  const Icon = step.action?.icon === 'play' ? Play : step.action?.icon === 'next' ? ArrowRight : step.action?.icon === 'idea' ? Lightbulb : ArrowRight;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-20 flex justify-center px-4">
      <div key={step.id} role="status" data-testid="coach" data-step={step.id}
        className="mdf-paper mdf-rise pointer-events-auto flex max-w-[560px] items-start gap-3 rounded-2xl py-3 pl-4 pr-2">
        <span className={cx('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', step.tone === 'win' ? 'bg-[color-mix(in_srgb,var(--gain)_16%,transparent)] text-gain' : 'bg-accent-soft text-accent-text')} aria-hidden>
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15.5px] leading-snug text-ink">{step.text}</p>
          {step.detail && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{step.detail}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {step.action && (
              <button type="button" onClick={step.action.run} data-testid="coach-action"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-semibold text-bg transition-opacity hover:opacity-85">
                {step.action.icon === 'play' || step.action.icon === 'idea' ? <Icon className="size-3.5" /> : null}{step.action.label}{step.action.icon === 'next' ? <Icon className="size-3.5" /> : null}
              </button>
            )}
            <button type="button" onClick={() => useUI.setState({ overlay: 'explorer' })} className="text-[12px] font-medium text-ink-3 underline-offset-2 hover:text-accent-text hover:underline" data-testid="coach-help">
              ¿Atascado? Ayúdame a pensar
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setHidden(step.id)} aria-label="Ocultar la guía" className="rounded-full p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-3.5" /></button>
      </div>
    </div>
  );
}
