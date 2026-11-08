/**
 * Niveles de la interfaz: se empieza casi en blanco y se va ampliando.
 * Se guardan en el proyecto (settings.depth) para que cada mapa recuerde
 * hasta dónde has llegado.
 *   1 · Pensar   → soltar ideas; la Brújula pregunta de una en una
 *   2 · Camino   → de hoy a lo que quiero, con pasos, piedras y ayudas
 *   3 · Experto  → todas las herramientas
 */
import { useProject } from '../store/projectStore';
import { useUI, type ViewMode } from '../store/uiStore';
import type { ProjectDoc } from '../core/model/schema';

export type Depth = ProjectDoc['project']['settings']['depth'];
export type Level = 1 | 2 | 3;

export const LEVELS: { depth: Depth; level: Level; label: string; hint: string }[] = [
  { depth: 'basic', level: 1, label: 'Pensar', hint: 'Suelta tus ideas, sin orden. La Brújula te pregunta.' },
  { depth: 'advanced', level: 2, label: 'Camino', hint: 'De cómo está hoy a lo que quieres: pasos, piedras y ayudas.' },
  { depth: 'expert', level: 3, label: 'Experto', hint: 'Todas las herramientas, para quien quiera afinar mucho.' },
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
