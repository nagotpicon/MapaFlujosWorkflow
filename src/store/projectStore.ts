/**
 * Estado del proyecto: documento actual, historial (deshacer/rehacer) y
 * guardado automático en IndexedDB.
 */
import { create } from 'zustand';
import type { ProjectDoc } from '../core/model/schema';
import * as repo from '../persistence/repository';

const HISTORY_LIMIT = 120;
const COALESCE_MS = 900;

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface ApplyOptions {
  /** registrar en el historial (por defecto sí) */
  history?: boolean;
  /** agrupa cambios consecutivos con la misma clave (p.ej. al escribir) */
  coalesceKey?: string;
}

interface ProjectState {
  doc: ProjectDoc | null;
  past: ProjectDoc[];
  future: ProjectDoc[];
  txn: ProjectDoc | null;
  lastCoalesce: { key: string; at: number } | null;
  saveState: SaveState;
  lastSavedAt: number | null;
  saveError: string | null;
  repairs: string[];
  load: (doc: ProjectDoc, repairs?: string[]) => void;
  apply: (fn: (doc: ProjectDoc) => ProjectDoc, opts?: ApplyOptions) => void;
  /** inicia una transacción (p.ej. un arrastre): los cambios intermedios no generan historial */
  begin: () => void;
  end: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useProject = create<ProjectState>((set, get) => ({
  doc: null,
  past: [],
  future: [],
  txn: null,
  lastCoalesce: null,
  saveState: 'idle',
  lastSavedAt: null,
  saveError: null,
  repairs: [],
  load: (doc, repairs = []) => set({ doc, past: [], future: [], txn: null, lastCoalesce: null, saveState: 'saved', repairs }),
  clear: () => set({ doc: null, past: [], future: [], txn: null }),
  apply: (fn, opts = {}) => {
    const { doc, past, txn, lastCoalesce } = get();
    if (!doc) return;
    const next = fn(doc);
    if (next === doc) return;
    if (txn || opts.history === false) {
      set({ doc: next });
      return;
    }
    const now = Date.now();
    if (opts.coalesceKey && lastCoalesce && lastCoalesce.key === opts.coalesceKey && now - lastCoalesce.at < COALESCE_MS) {
      set({ doc: next, future: [], lastCoalesce: { key: opts.coalesceKey, at: now } });
      return;
    }
    set({
      doc: next,
      past: [...past.slice(-HISTORY_LIMIT + 1), doc],
      future: [],
      lastCoalesce: opts.coalesceKey ? { key: opts.coalesceKey, at: now } : null,
    });
  },
  begin: () => {
    const { doc, txn } = get();
    if (doc && !txn) set({ txn: doc });
  },
  end: () => {
    const { doc, txn, past } = get();
    if (!txn) return;
    if (doc && doc !== txn) set({ txn: null, past: [...past.slice(-HISTORY_LIMIT + 1), txn], future: [], lastCoalesce: null });
    else set({ txn: null });
  },
  undo: () => {
    const { doc, past, future } = get();
    if (!doc || past.length === 0) return;
    const prev = past[past.length - 1];
    set({ doc: prev, past: past.slice(0, -1), future: [doc, ...future], lastCoalesce: null });
  },
  redo: () => {
    const { doc, past, future } = get();
    if (!doc || future.length === 0) return;
    const next = future[0];
    set({ doc: next, past: [...past, doc], future: future.slice(1), lastCoalesce: null });
  },
}));

/* ---------------- guardado automático ---------------- */

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaved: ProjectDoc | null = null;
let lastSnapshotAt = 0;
let snapshotBase: ProjectDoc | null = null;
const AUTO_SNAPSHOT_MS = 5 * 60_000;

export async function flushSave(): Promise<void> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const { doc } = useProject.getState();
  if (!doc) return;
  if (doc === lastSaved) {
    // p.ej. deshacer + rehacer antes de escribir: ya está guardado
    if (useProject.getState().saveState !== 'saved') useProject.setState({ saveState: 'saved' });
    return;
  }
  useProject.setState({ saveState: 'saving' });
  try {
    await repo.saveProject(doc);
    lastSaved = doc;
    await repo.setSetting('lastProjectId', doc.project.id);
    useProject.setState({ saveState: 'saved', lastSavedAt: Date.now(), saveError: null });
    // versión automática periódica
    if (Date.now() - lastSnapshotAt > AUTO_SNAPSHOT_MS && snapshotBase && snapshotBase !== doc) {
      await repo.createSnapshot(doc, 'Guardado automático', true);
      lastSnapshotAt = Date.now();
      snapshotBase = doc;
    }
  } catch (e) {
    useProject.setState({ saveState: 'error', saveError: (e as Error).message });
  }
}

export function startAutosave(): () => void {
  const unsub = useProject.subscribe((s, prev) => {
    if (!s.doc) return;
    if (s.doc.project.id !== prev.doc?.project.id) {
      lastSaved = s.doc;
      snapshotBase = s.doc;
      lastSnapshotAt = Date.now();
      void repo.setSetting('lastProjectId', s.doc.project.id);
      return;
    }
    if (s.doc === prev.doc) return;
    if (s.doc === lastSaved) {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (s.saveState !== 'saved') useProject.setState({ saveState: 'saved' });
      return;
    }
    if (s.saveState !== 'pending') useProject.setState({ saveState: 'pending' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flushSave(), 450);
  });
  const onHide = () => { void flushSave(); };
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', onHide);
  return () => {
    unsub();
    window.removeEventListener('beforeunload', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}

/** Marca el documento cargado como ya guardado (evita reescrituras innecesarias). */
export function markSaved(doc: ProjectDoc) {
  lastSaved = doc;
  snapshotBase = doc;
  lastSnapshotAt = Date.now();
}
