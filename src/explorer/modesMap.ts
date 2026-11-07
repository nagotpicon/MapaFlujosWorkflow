/**
 * Los modos de trabajo terminan en un mapa con elementos normales (editables y
 * deshacibles):
 *  · ACLARATOR → mapa radial: el proyecto en el centro, los 10 bloques alrededor
 *    y, de cada bloque, su capa INTERNA y su capa EXTERNA.
 *  · COPYWRITER → mapa del guion: gancho → … → llamada a la acción, con el reto
 *    tangible, los tres reels y las stories encadenadas.
 */
import type { MapNode, NodeType, ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import { ACLARATOR_BLOCKS, COPY_SECTIONS, type ClarifyState, type CopyPackage } from './shared/modes';

type Style = MapNode['visualStyle'];
type Anchor = 'top' | 'right' | 'bottom' | 'left';
/** Lados de salida y llegada según la dirección (para que las líneas salgan hacia donde van). */
function anchorsFor(ang: number): [Anchor, Anchor] {
  const c = Math.cos(ang); const sn = Math.sin(ang);
  if (Math.abs(c) >= Math.abs(sn) * 0.9) return c > 0 ? ['right', 'left'] : ['left', 'right'];
  return sn > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}
const vs = (p: Partial<Style>): Style => ({ shape: 'rounded', color: 'slate', background: null, fontFamily: 'sans', fontSize: 14, fontWeight: 500, icon: null, image: null, borderStyle: 'solid', ...p });
const short = (t: string, n = 72) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };
const cap = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/** Punto de partida: a la derecha de lo que ya haya en el mapa. */
function origin(doc: ProjectDoc) {
  const ns = Object.values(doc.nodes);
  if (!ns.length) return { x: 0, y: 0 };
  const maxX = Math.max(...ns.map((n) => n.position.x + (n.dimensions?.width ?? 200)));
  const ys = ns.map((n) => n.position.y);
  return { x: maxX + 1000, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

function builder(doc: ProjectDoc) {
  let d = doc;
  const ids: string[] = [];
  return {
    add(type: NodeType, title: string, x: number, y: number, style: Partial<Style>, description = '') {
      const r = op.addNode(d, type, { title, description, position: { x, y }, visualStyle: vs(style) });
      d = r.doc;
      ids.push(r.id);
      return r.id;
    },
    link(a: string, b: string, label = '', anchors?: [Anchor, Anchor]) {
      const r = op.addEdge(d, a, b, 'conceptual');
      const v = r.doc.edges[r.id].visualStyle;
      d = label || anchors ? op.updateEdge(r.doc, r.id, { visualStyle: { ...v, label, ...(anchors ? { sourceAnchor: anchors[0], targetAnchor: anchors[1] } : {}) } }) : r.doc;
    },
    get doc() { return d; },
    ids,
  };
}

export function buildAclaratorMap(doc: ProjectDoc, topic: string, st: ClarifyState): { doc: ProjectDoc; nodeIds: string[] } {
  const b = builder(doc);
  const o = origin(doc);
  const root = b.add('bubble', topic || 'Proyecto', o.x - 150, o.y - 32, { shape: 'pill', color: 'rose', fontFamily: 'serif', fontSize: 19, fontWeight: 600 }, 'Aclarado paso a paso con el ACLARATOR (doble capa: interno y externo).');
  const blocks = ACLARATOR_BLOCKS.filter((x) => st.values[x.key]);
  blocks.forEach((def, i) => {
    const v = st.values[def.key]!;
    const ang = -Math.PI / 2 + (i / blocks.length) * Math.PI * 2;
    const bx = o.x + Math.cos(ang) * 470;
    const by = o.y + Math.sin(ang) * 330;
    const bid = b.add('bubble', cap(def.title), bx - 85, by - 24, { color: 'amber', fontWeight: 650 }, def.plain);
    b.link(root, bid, '', anchorsFor(ang));
    // las dos capas, una a cada lado de la dirección del bloque (sin pisarse)
    const tx = -Math.sin(ang);
    const ty = Math.cos(ang);
    ([['interno', -1, 'slate'], ['externo', 1, 'blue']] as const).forEach(([k, side, color]) => {
      const x = o.x + Math.cos(ang) * 900 + tx * side * 150;
      const y = o.y + Math.sin(ang) * 660 + ty * side * 60;
      const layer = k === 'interno' ? def.interno : def.externo;
      const tag = def.key === 'receptor' ? (k === 'interno' ? 'Quién es' : 'Le frena / le atrae') : cap(layer.label);
      const cid = b.add('bubble', `${tag}: ${short(v[k])}`, x - 110, y - 30, { color }, `${layer.label} — ${layer.q}\n\n${v[k]}`);
      b.link(bid, cid, '', anchorsFor(ang));
    });
  });
  return { doc: b.doc, nodeIds: b.ids };
}

export function buildCopyMap(doc: ProjectDoc, pkg: CopyPackage): { doc: ProjectDoc; nodeIds: string[] } {
  const b = builder(doc);
  const o = origin(doc);
  const x0 = o.x - 140;
  const root = b.add('bubble', pkg.title || 'Guion', x0, o.y - 260, { shape: 'pill', color: 'rose', fontFamily: 'serif', fontSize: 19, fontWeight: 600 }, 'Paquete del COPYWRITER: guion de voz para YouTube, reels y stories.');
  // guion de YouTube: una fila, en orden
  let prev = root;
  const sectionIds: Record<string, string> = {};
  COPY_SECTIONS.forEach((s, i) => {
    const id = b.add('bubble', s.label, x0 + i * 290, o.y, { color: i === 0 ? 'rose' : i >= 7 ? 'emerald' : 'slate', fontWeight: i === 0 ? 650 : 500 }, `${s.hint}\n\n${pkg.youtube[s.key]}`);
    b.link(prev, id, '', i === 0 ? ['bottom', 'top'] : undefined);
    sectionIds[s.key] = id;
    prev = id;
  });
  // reto tangible (regla de oro)
  const reto = b.add('bubble', `Reto: ${short(pkg.reto, 60)}`, x0 + 5 * 290, o.y + 200, { color: 'amber', icon: 'Trophy', fontWeight: 600 }, pkg.reto);
  b.link(sectionIds.integracion, reto, 'reto', ['bottom', 'top']);
  // reels
  const reelsHub = b.add('bubble', 'Reels (30–60 s)', x0, o.y + 380, { color: 'violet', fontWeight: 600 }, 'Adaptación para Instagram y TikTok.');
  b.link(root, reelsHub, '', ['left', 'left']);
  ([['principal', 'Reel principal'], ['contraste', 'Reel de contraste'], ['reflexion', 'Reel de reflexión']] as const).forEach(([k, label], i) => {
    const id = b.add('bubble', label, x0 + 290 * (i + 1), o.y + 380, { color: 'violet' }, pkg.reels[k]);
    b.link(reelsHub, id);
  });
  // stories encadenadas
  const storiesHub = b.add('bubble', `Stories (${pkg.stories.length})`, x0, o.y + 560, { color: 'cyan', fontWeight: 600 }, 'Cada story: una idea, una progresión y un cierre que invita a la siguiente.');
  b.link(root, storiesHub, '', ['left', 'left']);
  let sp = storiesHub;
  pkg.stories.forEach((t, i) => {
    const id = b.add('bubble', `Story ${i + 1}: ${short(t, 50)}`, x0 + 290 * (i + 1), o.y + 560, { color: 'cyan' }, t);
    b.link(sp, id);
    sp = id;
  });
  return { doc: b.doc, nodeIds: b.ids };
}
