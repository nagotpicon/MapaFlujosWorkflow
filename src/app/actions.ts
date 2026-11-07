/**
 * Acciones de alto nivel invocadas desde la interfaz (barras, menús, atajos,
 * paleta de comandos). Combinan operaciones puras, historial y selección.
 */
import * as op from '../core/operations';
import type { EdgeType, NodeType, ProjectDoc } from '../core/model/schema';
import { useProject, flushSave, markSaved } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { useSim } from '../store/simStore';
import * as repo from '../persistence/repository';
import { createEmptyDoc } from '../core/model/factory';
import { buildInsuranceDemo } from '../demo/insuranceDemo';
import { findSimpleCycles } from '../engine/graph';

export const apply = (fn: (d: ProjectDoc) => ProjectDoc, coalesceKey?: string) => useProject.getState().apply(fn, { coalesceKey });
export const getDoc = () => useProject.getState().doc;
const ui = () => useUI.getState();
export const sizeOf = (id: string) => ui().sizes[id] ?? getDoc()?.nodes[id]?.dimensions ?? op.DEFAULT_NODE_SIZE;

let viewportCenter: () => { x: number; y: number } = () => ({ x: 0, y: 0 });
export function registerViewportCenter(fn: () => { x: number; y: number }) { viewportCenter = fn; }
let fitFn: (ids?: string[]) => void = () => {};
export function registerFit(fn: (ids?: string[]) => void) { fitFn = fn; }
export const fit = (ids?: string[]) => fitFn(ids);

/* ---------------- proyectos ---------------- */

export async function openProject(doc: ProjectDoc, repairs: string[] = []) {
  await flushSave();
  markSaved(doc);
  useProject.getState().load(doc, repairs);
  useSim.setState({ result: null, fingerprint: null, cursor: 0, step: -1, play: 'stopped', heat: null, diagnostics: [] });
  useUI.setState({ selection: { nodes: [], edges: [] }, overlay: null, trace: null, focusNodeId: null, sizes: {} });
  if (Object.keys(doc.nodes).length) setTimeout(() => fit(), 80);
  await repo.saveProject(doc);
  await repo.setSetting('lastProjectId', doc.project.id);
}

/**
 * Mapa nuevo. Empieza en el nivel 1 (solo ideas). Si traes una idea, aparece
 * en el centro como idea principal, más grande y en letra de libro.
 */
export async function newProject(name = 'Mapa sin título', idea?: string) {
  let doc = createEmptyDoc(name);
  doc = { ...doc, project: { ...doc.project, settings: { ...doc.project.settings, depth: 'basic' } } };
  const text = idea?.trim();
  if (text) {
    const r = op.addNode(doc, 'bubble', {
      title: text, position: { x: -150, y: -40 },
      visualStyle: { shape: 'pill', color: 'rose', background: null, fontFamily: 'serif', fontSize: 19, fontWeight: 600, icon: null, image: null, borderStyle: 'solid' },
    });
    doc = r.doc;
  }
  await openProject(doc);
}

export async function openDemo() {
  await openProject(buildInsuranceDemo());
  ui().notify('Proyecto de demostración cargado (valores ficticios)', 'info');
}

/* ---------------- creación ---------------- */

const DEFAULT_TITLES: Partial<Record<NodeType, string>> = { note: 'Escribe una nota…', label: 'Etiqueta', comment: 'Comentario' };

export function createNodeAt(type: NodeType, position?: { x: number; y: number }, opts: { edit?: boolean; title?: string; parentId?: string | null } = {}): string | null {
  const doc = getDoc();
  if (!doc) return null;
  const pos = position ?? viewportCenter();
  const s = type === 'group' ? { width: 360, height: 240 } : type === 'container' ? { width: 520, height: 340 } : op.DEFAULT_NODE_SIZE;
  let id = '';
  apply((d) => {
    const r = op.addNode(d, type, { position: { x: pos.x - s.width / 2, y: pos.y - s.height / 2 }, title: opts.title ?? DEFAULT_TITLES[type], parentId: opts.parentId ?? null });
    id = r.id;
    return r.doc;
  });
  ui().setSelection([id]);
  if (opts.edit !== false && !['group', 'container'].includes(type)) ui().set({ editingNodeId: id });
  ui().set({ tool: 'select' });
  return id;
}

/** Crea una burbuja hija conectada (Tab) o hermana (Enter). */
export function createConnectedNode(fromId: string, sibling = false) {
  const doc = getDoc();
  if (!doc) return;
  const from = doc.nodes[fromId];
  if (!from) return;
  const s = sizeOf(fromId);
  const parentEdge = sibling ? Object.values(doc.edges).find((e) => e.targetNodeId === fromId) : null;
  const sourceId = sibling ? parentEdge?.sourceNodeId : fromId;
  const siblings = sourceId ? Object.values(doc.edges).filter((e) => e.sourceNodeId === sourceId).length : 0;
  const pos = sibling
    ? { x: from.position.x, y: from.position.y + s.height + 40 }
    : { x: from.position.x + s.width + 120, y: from.position.y + (siblings - 0.5) * (s.height + 28) };
  let id = '';
  apply((d) => {
    const r = op.addNode(d, 'bubble', { position: pos, parentId: from.parentId });
    id = r.id;
    let out = r.doc;
    if (sourceId) out = op.addEdge(out, sourceId, id, parentEdge?.type ?? ui().connectType).doc;
    return out;
  });
  ui().setSelection([id]);
  ui().set({ editingNodeId: id });
}

export function connect(source: string, target: string, type?: EdgeType, anchors?: { sourceAnchor?: string | null; targetAnchor?: string | null }) {
  let id = '';
  apply((d) => {
    const r = op.addEdge(d, source, target, type ?? ui().connectType, {
      visualStyle: {
        ...(anchors?.sourceAnchor ? { sourceAnchor: anchors.sourceAnchor as never } : {}),
        ...(anchors?.targetAnchor ? { targetAnchor: anchors.targetAnchor as never } : {}),
      },
    });
    id = r.id;
    return r.doc;
  });
  return id;
}

/* ---------------- selección ---------------- */

export function deleteSelection() {
  const { nodes, edges } = ui().selection;
  if (!nodes.length && !edges.length) return;
  const doc = getDoc();
  const locked = nodes.filter((n) => doc?.nodes[n]?.locked).length;
  apply((d) => op.deleteElements(d, nodes, edges));
  ui().setSelection([]);
  if (locked) ui().notify(`${locked} elemento(s) bloqueado(s) no se han eliminado`, 'info');
}

let internalClipboard: op.ClipboardPayload | null = null;

export async function copySelection(cut = false) {
  const doc = getDoc();
  const ids = ui().selection.nodes;
  if (!doc || !ids.length) return;
  internalClipboard = op.copyElements(doc, ids);
  try { await navigator.clipboard?.writeText(JSON.stringify(internalClipboard)); } catch { /* portapapeles del sistema no disponible */ }
  if (cut) deleteSelection();
  ui().notify(cut ? 'Cortado' : `${ids.length} elemento(s) copiado(s)`, 'success');
}

export async function pasteClipboard() {
  let clip = internalClipboard;
  try {
    const text = await navigator.clipboard?.readText();
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed?.kind === 'mapa-de-flujos/clipboard') clip = parsed;
    }
  } catch { /* usar portapapeles interno */ }
  if (!clip) return;
  let ids: string[] = [];
  apply((d) => { const r = op.pasteElements(d, clip!); ids = r.nodeIds; return r.doc; });
  internalClipboard = clip && { ...clip, nodes: clip.nodes.map((n) => ({ ...n, position: { x: n.position.x + 40, y: n.position.y + 40 } })) };
  ui().setSelection(ids);
}

export function duplicateSelection() {
  const ids = ui().selection.nodes;
  if (!ids.length) {
    const e = ui().selection.edges[0];
    if (e) apply((d) => op.duplicateEdge(d, e).doc);
    return;
  }
  let out: string[] = [];
  apply((d) => { const r = op.duplicateNodes(d, ids); out = r.nodeIds; return r.doc; });
  ui().setSelection(out);
}

export function cloneSelection() {
  const id = ui().selection.nodes[0];
  if (!id) return;
  let nid = '';
  apply((d) => { const r = op.cloneNode(d, id); nid = r.id; return r.doc; });
  ui().setSelection([nid]);
  ui().notify('Clon creado: comparte identidad con el original', 'info');
}

export function groupSelection(type: 'group' | 'container' = 'group') {
  const ids = ui().selection.nodes;
  if (!ids.length) { createNodeAt(type); return; }
  let gid = '';
  apply((d) => { const r = op.groupNodes(d, ids, sizeOf, type); if (!r) return d; gid = r.id; return r.doc; });
  if (gid) ui().setSelection([gid]);
}

export function ungroupSelection() {
  const doc = getDoc();
  const g = ui().selection.nodes.find((id) => ['group', 'container'].includes(doc?.nodes[id]?.type ?? ''));
  if (g) apply((d) => op.ungroup(d, g));
}

export function toggleLockSelection() {
  const ids = ui().selection.nodes;
  const doc = getDoc();
  if (!doc || !ids.length) return;
  const lock = !ids.every((id) => doc.nodes[id]?.locked);
  apply((d) => op.updateNodes(d, ids, () => ({ locked: lock })));
}

export function toggleHideSelection() {
  const ids = ui().selection.nodes;
  if (!ids.length) return;
  apply((d) => op.updateNodes(d, ids, () => ({ hidden: true })));
  ui().setSelection([]);
  ui().notify(`${ids.length} elemento(s) ocultado(s). Puedes mostrarlos desde la búsqueda (⌘K).`, 'info');
}

export function showAllHidden() {
  const doc = getDoc();
  if (!doc) return;
  const ids = Object.values(doc.nodes).filter((n) => n.hidden).map((n) => n.id);
  if (ids.length) apply((d) => op.updateNodes(d, ids, () => ({ hidden: false })));
}

export function selectAll() {
  const doc = getDoc();
  if (doc) ui().setSelection(Object.keys(doc.nodes).filter((id) => !doc.nodes[id].hidden), []);
}

export function align(mode: Parameters<typeof op.alignNodes>[2]) {
  apply((d) => op.alignNodes(d, ui().selection.nodes, mode, sizeOf));
}

export function autoLayout() {
  const sel = ui().selection.nodes;
  apply((d) => op.autoLayout(d, sizeOf, sel.length > 1 ? sel : undefined));
  setTimeout(() => fit(), 50);
}

/** Crear circuito: cierra el ciclo entre los nodos seleccionados o registra el ciclo existente. */
export function createCircuitFromSelection() {
  const doc = getDoc();
  if (!doc) return;
  const sel = ui().selection.nodes;
  const edgesRef = Object.values(doc.edges).filter((e) => e.type === 'flow' || e.type === 'causal').map((e) => ({ id: e.id, from: e.sourceNodeId, to: e.targetNodeId }));
  let cycles = findSimpleCycles(Object.keys(doc.nodes), edgesRef);
  if (sel.length) cycles = cycles.filter((c) => c.some((e) => sel.includes(e.from)));
  if (cycles.length) {
    const cyc = cycles[0];
    const already = Object.values(doc.circuits).some((c) => c.edgeIds.length === cyc.length && c.edgeIds.every((e) => cyc.some((x) => x.id === e)));
    if (already) { ui().notify('Ese circuito ya está configurado', 'info'); return; }
    const ret = cyc[cyc.length - 1];
    apply((d) => op.addCircuit(d, `Circuito ${Object.keys(d.circuits).length + 1}`, cyc.map((e) => e.from), cyc.map((e) => e.id), ret.id).doc);
    ui().setSelection([], [ret.id]);
    ui().notify('Circuito creado: configura su retorno en el inspector', 'success');
    return;
  }
  if (sel.length >= 2) {
    const first = sel[0];
    const last = sel[sel.length - 1];
    let eid = '';
    apply((d) => {
      const r = op.addEdge(d, last, first, 'flow', { behavior: { transport: 'replicate', multiplier: 0.2, isFeedback: true }, visualStyle: { label: 'retorno', sourceAnchor: 'top', targetAnchor: 'top' } });
      eid = r.id;
      const nd = r.doc;
      const ids = sel;
      return op.addCircuit(nd, `Circuito ${Object.keys(nd.circuits).length + 1}`, ids, [eid], eid).doc;
    });
    ui().setSelection([], [eid]);
    ui().notify('Circuito cerrado con una conexión de retorno (20%)', 'success');
    return;
  }
  ui().notify('Selecciona dos o más burbujas en orden (o un ciclo existente) para crear un circuito', 'info');
}

export function addCommentToSelection() {
  const { nodes, edges } = ui().selection;
  const owner = nodes[0] ? { type: 'node' as const, id: nodes[0] } : edges[0] ? { type: 'edge' as const, id: edges[0] } : null;
  if (!owner) { createNodeAt('comment'); return; }
  apply((d) => op.addAnnotation(d, owner.type, owner.id, 'Nuevo comentario').doc);
  ui().set({ inspectorOpen: true });
  setTimeout(() => document.querySelector<HTMLTextAreaElement>('[data-annotation-new]')?.focus(), 60);
}

export function setTheme(theme: 'light' | 'dark' | 'system') {
  useUI.setState({ theme });
  try { localStorage.setItem('mdf.theme.v2', JSON.stringify(theme)); } catch { /* */ }
  const doc = getDoc();
  if (doc) apply((d) => ({ ...d, project: { ...d.project, themePreference: theme } }));
  void repo.setSetting('theme', theme);
}

export function undo() { useProject.getState().undo(); }
export function redo() { useProject.getState().redo(); }
