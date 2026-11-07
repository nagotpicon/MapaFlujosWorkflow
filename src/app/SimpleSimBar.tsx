/**
 * Barra «Probar» del nivel 2: un botón, la ronda y lo que ha llegado a la meta.
 * El panel completo de simulación aparece en el nivel 3.
 */
import { MessageCircleHeart, Pause, Play, RotateCcw } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { requestSimulation, useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { Tip, cx, fmt } from '../ui/primitives';
import * as A from './actions';

export function SimpleSimBar() {
  const r = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  const play = useSim((s) => s.play);
  const rounds = useProject((s) => s.doc?.project.settings.simulation.iterations ?? 12);
  const hasGoal = useProject((s) => (s.doc ? Object.values(s.doc.nodes).some((n) => n.type === 'output') : false));
  if (!r || !hasGoal) return null;
  const upTo = r.iterations.slice(0, cursor + 1).reduce((s, it) => s + (it.result.ext.quantity ?? 0), 0);
  const playing = play === 'playing';
  const toggle = () => useSim.setState({ play: playing ? 'paused' : 'playing', step: -1, ...(play === 'stopped' || cursor >= r.iterationCount - 1 ? { cursor: 0 } : {}) });
  const restart = () => { useSim.setState({ play: 'stopped', cursor: 0, step: -1 }); requestSimulation(useProject.getState().doc!, { force: true, immediate: true }); };
  const setRounds = (n: number) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, simulation: { iterations: Math.max(1, Math.min(500, Math.round(n))) } } } }));
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
      <div className="mdf-paper mdf-rise pointer-events-auto flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-[13px]" data-testid="simple-sim">
        <button type="button" onClick={toggle} data-testid="simple-play"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 font-semibold text-bg transition-opacity hover:opacity-85">
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? 'Pausa' : 'Probar'}
        </button>
        <Tip label="Volver a empezar" side="bottom">
          <button type="button" onClick={restart} aria-label="Volver a empezar" className="rounded-full p-2 text-ink-3 hover:bg-surface-2 hover:text-ink"><RotateCcw className="size-4" /></button>
        </Tip>
        <span className="mx-1 text-ink-3">Ronda <b className="tabular text-ink">{cursor + 1}</b> de</span>
        <Tip label="¿Cuántas rondas (semanas, meses…) quieres probar?" side="bottom">
          <input type="number" min={1} max={500} value={rounds} onChange={(e) => setRounds(Number(e.target.value) || 1)} aria-label="Número de rondas"
            className="w-12 rounded-lg border border-line bg-surface-2 px-1.5 py-0.5 text-center tabular text-ink outline-none focus:border-accent" data-testid="simple-rounds" />
        </Tip>
        <span className="mx-2 h-5 w-px bg-line" aria-hidden />
        <span className="text-ink-3">Han llegado a la meta</span>
        <b className={cx('ml-1 font-display text-[17px] tabular', upTo > 0 ? 'text-gain' : 'text-ink-3')} data-testid="simple-result">{fmt(upTo)}</b>
        <span className="mx-2 h-5 w-px bg-line" aria-hidden />
        <button type="button" onClick={() => useUI.setState({ overlay: 'verdict' })} className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-accent-text hover:bg-accent-soft">
          <MessageCircleHeart className="size-4" />¿Por qué?
        </button>
      </div>
    </div>
  );
}
