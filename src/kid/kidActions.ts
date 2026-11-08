/**
 * Acciones del modo fácil: lo que hacen la Brújula, la bandeja, los detalles y
 * las teclas en los niveles 1 y 2. Todo se ordena solo y se puede deshacer.
 */
import type { ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { levelOf, setLevel } from '../app/levels';
import { useUI } from '../store/uiStore';
import { answer, type Answer, type Question } from './guide';
import * as K from './model';
import { setSkipped, useKid } from './kidStore';

/** Si ya hay camino, cada cosa vuelve a su sitio. */
export function relayout(d: ProjectDoc): ProjectDoc {
  const c = K.leerCamino(d);
  return c.hoy || c.meta ? K.ordenarCamino(d) : d;
}

const tidy = (ids?: string[]) => setTimeout(() => A.fit(ids), 70);

/** Aplica un cambio del modo fácil y recoloca el mapa. */
export function applyKid(fn: (d: ProjectDoc) => ProjectDoc, key?: string) {
  A.apply((d) => relayout(fn(d)), key);
}

export function responder(q: Question, a: Answer) {
  const doc = A.getDoc();
  if (!doc) return;
  const st = useKid.getState();
  const level = levelOf(doc.project.settings.depth) === 1 ? 1 : 2;
  const ctx = { level: level as 1 | 2, skipped: st.skipped, analysis: st.analysis, selected: useUI.getState().selection.nodes[0] ?? null };
  const r = answer(doc, q, a, ctx);
  if (r.doc !== doc) A.apply(() => relayout(r.doc));
  if (r.fx.skip?.length || r.fx.unskip?.length) {
    const s = new Set(st.skipped);
    r.fx.skip?.forEach((x) => s.add(x));
    r.fx.unskip?.forEach((x) => s.delete(x));
    setSkipped(s);
  }
  if (r.fx.level) setLevel(r.fx.level);
  if (r.fx.open) useUI.setState({ overlay: r.fx.open === 'plan' ? 'plan' : 'discover' });
  if (r.fx.toast) useUI.getState().notify(r.fx.toast, 'success');
  if (r.fx.select) useUI.getState().setSelection([r.fx.select]);
  if (r.doc !== doc) tidy();
}

/** Volver a preguntar algo que se había saltado (desde «Lo que he descubierto»). */
export function preguntarOtraVez(id: string) {
  const s = new Set(useKid.getState().skipped);
  s.delete(id);
  setSkipped(s);
  useUI.setState({ overlay: null });
}

const titleFor: Record<K.Papel, string> = {
  idea: 'Nueva idea', hoy: 'Así estoy hoy', meta: 'Lo que quiero', paso: 'Nuevo paso', piedra: 'Algo que me frena',
  ayuda: 'Algo que me ayuda', razon: 'Porque…', siento: 'Me siento…', pregunta: '¿…?',
};

/** Botones de la bandeja: crean la cosa ya colocada y lista para escribir. */
export function nuevo(papel: K.Papel) {
  const doc = A.getDoc();
  if (!doc) return;
  const sel = useUI.getState().selection.nodes[0] ?? null;
  const c = K.leerCamino(doc);
  const role = sel ? c.roles.get(sel) : undefined;
  let id = '';
  A.apply((d) => {
    let r: { doc: ProjectDoc; id: string };
    if (papel === 'paso') r = K.pasoDespues(d, titleFor.paso, role === 'hoy' || role === 'paso' ? sel : null);
    else if (papel === 'piedra') r = K.crear(d, 'piedra', titleFor.piedra, { objetivo: role === 'paso' || role === 'meta' ? sel : undefined, tamano: 'mediana' });
    else if (papel === 'ayuda') r = K.crear(d, 'ayuda', titleFor.ayuda, { piedra: role === 'piedra' ? sel : undefined });
    else if (papel === 'idea') {
      const root = K.ideaCentral(d);
      if (!root) r = A.rootIdea(d, '');
      else if (c.hoy || c.meta) r = K.crear(d, 'idea', titleFor.idea);
      else r = K.ideaUnida(d, titleFor.idea, sel && d.nodes[sel] ? sel : root.id);
    } else r = K.crear(d, papel, titleFor[papel]);
    id = r.id;
    return relayout(r.doc);
  });
  if (!id) return;
  useUI.getState().setSelection([id]);
  useUI.setState({ editingNodeId: id, tool: 'select' });
  tidy();
}

/** Tab en el modo fácil: lo siguiente con sentido según lo que tengas elegido. */
export function siguienteDe(fromId: string) {
  const doc = A.getDoc();
  if (!doc?.nodes[fromId]) return;
  const c = K.leerCamino(doc);
  const role = c.roles.get(fromId);
  let id = '';
  A.apply((d) => {
    let r: { doc: ProjectDoc; id: string };
    if (role === 'hoy' || role === 'paso') r = K.pasoDespues(d, titleFor.paso, fromId);
    else if (role === 'meta') r = K.pasoDespues(d, titleFor.paso, null);
    else if (role === 'piedra') r = K.crear(d, 'ayuda', titleFor.ayuda, { piedra: fromId });
    else r = K.ideaUnida(d, titleFor.idea, fromId);
    id = r.id;
    return relayout(r.doc);
  });
  useUI.getState().setSelection([id]);
  useUI.setState({ editingNodeId: id });
  tidy();
}

/** «Unir» en el modo fácil: el tipo de unión sale solo de lo que unes. */
export function tipoDeUnion(doc: ProjectDoc, source: string, target: string): 'flow' | 'causal' | 'conceptual' {
  const c = K.leerCamino(doc);
  const a = c.roles.get(source);
  const b = c.roles.get(target);
  const onRoad = (p?: K.Papel) => p === 'hoy' || p === 'paso' || p === 'meta';
  if (onRoad(a) && onRoad(b) && a !== 'meta' && b !== 'hoy') return 'flow';
  if ((a === 'piedra' && (b === 'paso' || b === 'meta')) || (a === 'ayuda' && b === 'piedra')) return 'causal';
  return 'conceptual';
}

/** Une dos cosas con el significado correcto (una piedra frena, una ayuda ayuda, un paso sigue al otro). */
export function unir(source: string, target: string) {
  const doc = A.getDoc();
  if (!doc) return;
  const c = K.leerCamino(doc);
  const a = c.roles.get(source);
  if ((a === 'piedra' || a === 'ayuda') && tipoDeUnion(doc, source, target) === 'causal') { applyKid((d) => K.apuntar(d, source, target)); return; }
  A.connect(source, target, tipoDeUnion(doc, source, target));
}

/** Borrar sin romper el camino. */
export function borrar(nodeIds: string[], edgeIds: string[]) {
  A.apply((d) => {
    let x = edgeIds.length ? op.deleteElements(d, [], edgeIds) : d;
    x = K.borrar(x, nodeIds);
    return relayout(x);
  });
  useUI.getState().setSelection([]);
}

export const isEasy = () => levelOf(A.getDoc()?.project.settings.depth) < 3;
