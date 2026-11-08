/** Estado de interfaz (no persistente salvo preferencias). */
import { create } from 'zustand';
import type { EdgeType } from '../core/model/schema';

export type Tool = 'select' | 'bubble' | 'connect' | 'group' | 'input' | 'output' | 'note' | 'comment' | 'label' | 'container' | 'circuit';
export type ViewMode = 'mental' | 'flow' | 'energy' | 'system' | 'simulation';
export type ThemePref = 'light' | 'dark' | 'system';
export type BottomTab = 'simulation' | 'results' | 'diagnostics' | 'scenarios' | 'history' | 'events';
export type Overlay = null | 'monitor' | 'explorer' | 'versions' | 'projects' | 'compare' | 'verdict' | 'help' | 'settings' | 'paste' | 'discover' | 'plan';

export interface TraceState { rootId: string; direction: 'forward' | 'backward'; isolate: boolean }

interface UIState {
  selection: { nodes: string[]; edges: string[] };
  tool: Tool;
  connectType: EdgeType;
  view: ViewMode;
  theme: ThemePref;
  inspectorOpen: boolean;
  bottomOpen: boolean;
  bottomTab: BottomTab;
  overlay: Overlay;
  commandOpen: boolean;
  searchQuery: string;
  tagFilter: string[];
  behaviorFilter: string[];
  trace: TraceState | null;
  focusNodeId: string | null;
  showHeat: boolean;
  animate: boolean;
  sizes: Record<string, { width: number; height: number }>;
  editingNodeId: string | null;
  toast: { id: number; text: string; tone: 'info' | 'success' | 'error' } | null;
  setSelection: (nodes: string[], edges?: string[]) => void;
  set: (patch: Partial<UIState>) => void;
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void;
  setSizes: (patch: Record<string, { width: number; height: number }>) => void;
}

const readLS = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
};
export const writeLS = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const useUI = create<UIState>((set) => ({
  selection: { nodes: [], edges: [] },
  tool: 'select',
  connectType: 'flow',
  view: readLS<ViewMode>('mdf.view', 'flow'),
  theme: readLS<ThemePref>('mdf.theme.v2', 'light'),
  inspectorOpen: true,
  bottomOpen: readLS('mdf.bottomOpen', true),
  bottomTab: 'simulation',
  overlay: null,
  commandOpen: false,
  searchQuery: '',
  tagFilter: [],
  behaviorFilter: [],
  trace: null,
  focusNodeId: null,
  showHeat: readLS('mdf.heat', false),
  animate: readLS('mdf.animate', !prefersReducedMotion),
  sizes: {},
  editingNodeId: null,
  toast: null,
  setSelection: (nodes, edges = []) => set({ selection: { nodes, edges } }),
  set: (patch) => set(patch),
  notify: (text, tone = 'info') => set({ toast: { id: Date.now(), text, tone } }),
  setSizes: (patch) => set((s) => ({ sizes: { ...s.sizes, ...patch } })),
}));
