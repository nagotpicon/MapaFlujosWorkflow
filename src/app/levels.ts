/**
 * Niveles de la interfaz: se empieza casi en blanco y se va ampliando.
 * Se guardan en el proyecto (settings.depth) para que cada mapa recuerde
 * hasta dónde has llegado.
 *   1 · Ideas       → solo escribir y unir ideas (mapa mental)
 *   2 · Movimiento  → dónde empieza, a dónde quieres llegar y qué se pierde por el camino
 *   3 · Todo        → todas las herramientas
 */
import { useProject } from '../store/projectStore';
import { useUI, type ViewMode } from '../store/uiStore';
import type { ProjectDoc } from '../core/model/schema';

export type Depth = ProjectDoc['project']['settings']['depth'];
export type Level = 1 | 2 | 3;

export const LEVELS: { depth: Depth; level: Level; label: string; hint: string }[] = [
  { depth: 'basic', level: 1, label: 'Ideas', hint: 'Escribe y une ideas. Nada más.' },
  { depth: 'advanced', level: 2, label: 'Movimiento', hint: 'Mira qué entra, qué se pierde y qué llega a tu meta.' },
  { depth: 'expert', level: 3, label: 'Todo', hint: 'Todas las herramientas: «¿y si…?», frenos, bucles, tiempo…' },
];

export const levelOf = (depth: Depth | undefined): Level => (depth === 'basic' ? 1 : depth === 'expert' ? 3 : 2);

export function useLevel(): Level {
  return useProject((s) => levelOf(s.doc?.project.settings.depth));
}

/** Vistas permitidas en cada nivel. */
export function allowedViews(level: Level): ViewMode[] {
  if (level === 1) return ['mental'];
  if (level === 2) return ['mental', 'simulation'];
  return ['mental', 'flow', 'energy', 'system', 'simulation'];
}

/** Ajusta la vista a lo que permite el nivel (sin tocar la elección en el nivel 3). */
export function syncViewToLevel(level: Level) {
  const views = allowedViews(level);
  const current = useUI.getState().view;
  if (!views.includes(current)) useUI.setState({ view: level === 2 ? 'simulation' : 'mental' });
}

export function setLevel(level: Level) {
  const depth = LEVELS.find((l) => l.level === level)!.depth;
  useProject.getState().apply((d) => (d.project.settings.depth === depth ? d : { ...d, project: { ...d.project, settings: { ...d.project.settings, depth } } }));
  if (level === 2) useUI.setState({ view: 'simulation', tool: 'select' });
  else if (level === 3 && useUI.getState().view === 'mental') useUI.setState({ view: 'flow' });
  else syncViewToLevel(level);
  if (level < 3) useUI.setState({ tool: 'select' });
}
