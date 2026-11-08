/**
 * LA BRÚJULA: una pregunta cada vez, en palabras de niño, siguiendo cómo
 * pensamos las personas cuando queremos arreglar algo:
 *
 *   ¿qué te ronda la cabeza? → ¿lo quieres o te preocupa? → ¿cómo te gustaría
 *   que fuera? → ¿por qué te importa? → ¿qué pasos darías? → ¿qué te puede
 *   frenar? → ¿quién te puede ayudar? → ¿cuál es tu primer pasito? → ¿cómo te
 *   sientes? → ¿qué no sabes todavía? → mira lo que he descubierto → ¿ya lo has
 *   hecho? → ¿lo has conseguido?
 *
 * Cada pregunta dice POR QUÉ la hace. Todo es puro (doc → doc) para poder
 * probarlo; la interfaz solo aplica el resultado.
 */
import type { ProjectDoc } from '../core/model/schema';
import * as op from '../core/operations';
import type { KidAnalysis } from '../engine/kid';
import {
  FUERZA, PAPEL, TAMANO, crear, ideaCentral, ideaUnida, isHecho, isPrimero, leerCamino, marcar, objetivoDe, pasoDespues,
  pendiente, pendientes, piedraDe, resuelto, setFuerza, setMarca, setPapel, setTamano, apuntar, type Fuerza, type Tamano,
} from './model';

export interface Choice { value: string; label: string; emoji?: string; hint?: string }
export interface Question {
  /** clave estable: sirve para recordar lo que se ha saltado */
  id: string;
  text: string;
  why: string;
  input?: { placeholder: string };
  choices?: Choice[];
  /** texto del botón para pasar a otra cosa */
  skip?: string;
  tone?: 'win' | 'calm';
}
export type Answer = { text: string } | { choice: string } | { skip: true };
export interface Effects { level?: 1 | 2; open?: 'discover' | 'plan'; toast?: string; skip?: string[]; unskip?: string[]; select?: string }
export interface Ctx { level: 1 | 2; skipped: ReadonlySet<string>; analysis: KidAnalysis | null; selected: string | null }

const q = (s: string, n = 34) => { const t = s.trim(); return `«${t.length > n ? `${t.slice(0, n - 1)}…` : t}»`; };

/** La siguiente pregunta que tiene sentido ahora mismo. */
export function nextQuestion(doc: ProjectDoc, ctx: Ctx): Question | null {
  const c = leerCamino(doc);
  const root = ideaCentral(doc);
  const sk = (id: string) => ctx.skipped.has(id);
  const a = ctx.analysis;

  // ---------- 1. Pensar: soltar la idea ----------
  if (!root) {
    return { id: 'idea', text: '¿Qué te ronda la cabeza?', why: 'Todo empieza por una idea. No tiene que estar clara ni ser perfecta.', input: { placeholder: 'Un problema, un sueño, algo que quieres…' } };
  }
  if (!c.hoy && !c.meta) {
    if (!sk('tipo')) {
      return {
        id: 'tipo', text: `${q(root.title)}… ¿qué es para ti?`, why: 'Así sé por dónde empezar a ayudarte.',
        choices: [
          { value: 'quiero', emoji: '🎯', label: 'Algo que quiero conseguir' },
          { value: 'preocupa', emoji: '😟', label: 'Algo que me preocupa' },
          { value: 'pensar', emoji: '💭', label: 'Solo quiero pensar en ello' },
        ],
      };
    }
    const sel = ctx.selected && doc.nodes[ctx.selected] ? doc.nodes[ctx.selected] : root;
    const ideas = Object.values(doc.nodes).filter((n) => n.id !== root.id && n.type === 'bubble' && !n.hidden);
    if (!sk('mas') && ideas.length < 3) {
      return { id: 'mas', text: `¿Qué más se te ocurre sobre ${q(sel.title)}?`, why: 'Soltar ideas sin pensarlo mucho ayuda a ver cosas que no veías.', input: { placeholder: 'Escribe una cosa (luego otra)…' }, skip: 'Ya está' };
    }
    if (!sk('elegir') && ideas.length) {
      return {
        id: 'elegir', text: '¿Alguna de estas ideas es algo que te gustaría conseguir?', why: 'Cuando sabes lo que quieres, el mapa te ayuda a llegar.',
        choices: [root, ...ideas].slice(0, 7).map((n) => ({ value: n.id, emoji: '🎯', label: n.title })), skip: 'Todavía no',
      };
    }
    return {
      id: 'libre1', text: 'Sigue soltando ideas o elige qué quieres conseguir.', why: 'No hay prisa: pensar también es avanzar.', tone: 'calm',
      choices: [{ value: 'otra', emoji: '💡', label: 'Otra idea' }, { value: 'se', emoji: '🎯', label: 'Ya sé lo que quiero' }],
    };
  }

  // ---------- 2. El camino ----------
  if (c.hoy && !c.meta) {
    return { id: 'meta', text: 'Si esto se arreglara, ¿cómo sería?', why: 'Si sabes a dónde vas, es más fácil encontrar el camino.', input: { placeholder: 'Escribe cómo te gustaría que fuera…' } };
  }
  const meta = c.meta!;
  if (!c.hoy) {
    return { id: 'hoy', text: '¿Y cómo está la cosa hoy?', why: 'Para saber desde dónde sales.', input: { placeholder: 'Escribe cómo está ahora…' }, skip: 'No sé, sigue' };
  }
  // preguntas pendientes sobre lo que se acaba de añadir
  for (const s of c.piedras) {
    const p = pendientes(s);
    if (p.includes('tamano')) {
      return {
        id: `tamano:${s.id}`, text: `¿Cómo de grande es la piedra ${q(s.title)}?`, why: 'Las piedras grandes frenan más. Así sé cuánto te quita.',
        choices: [
          { value: 'pequena', emoji: '🪨', label: 'Pequeña', hint: 'molesta un poco' },
          { value: 'mediana', emoji: '🪨🪨', label: 'Mediana', hint: 'frena bastante' },
          { value: 'grande', emoji: '🪨🪨🪨', label: 'Grande', hint: 'me para casi del todo' },
        ],
      };
    }
    if (p.includes('donde') && c.pasos.length >= 2) {
      return {
        id: `donde:${s.id}`, text: `¿Qué paso frena ${q(s.title)}?`, why: 'Así sabes en qué parte del camino tienes que tener cuidado.',
        choices: [...c.pasos.map((x) => ({ value: x.id, emoji: '👣', label: x.title })), { value: meta.id, emoji: '🎯', label: 'Llegar al final' }],
      };
    }
  }
  for (const h of c.ayudas) {
    if (pendientes(h).includes('fuerza')) {
      return {
        id: `fuerza:${h.id}`, text: `¿Cuánto te ayudaría ${q(h.title)}?`, why: 'Una ayuda grande hace la piedra mucho más pequeña.',
        choices: (Object.keys(FUERZA) as Fuerza[]).map((k) => ({ value: k, emoji: k === 'poco' ? '🤏' : k === 'bastante' ? '👍' : '💪', label: FUERZA[k].label })),
      };
    }
  }
  if (!c.razones.length && !sk('razon')) {
    return { id: 'razon', text: `¿Por qué es importante para ti ${q(meta.title)}?`, why: 'Tus razones te darán fuerza cuando cueste.', input: { placeholder: 'Porque…' }, skip: 'Saltar' };
  }
  const allSteps = [...c.pasos, ...c.sueltos];
  if (!allSteps.length) {
    return { id: 'paso1', text: `¿Qué podrías hacer para llegar a ${q(meta.title)}?`, why: 'Las cosas grandes se hacen con pasos pequeños.', input: { placeholder: 'Un paso, aunque sea pequeñito…' } };
  }
  if (allSteps.length < 4 && !sk('pasoN')) {
    const last = c.pasos.at(-1) ?? allSteps.at(-1)!;
    return { id: 'pasoN', text: `¿Y después de ${q(last.title)}, qué harías?`, why: 'Así ves el camino entero, de principio a fin.', input: { placeholder: 'Otro paso…' }, skip: 'Ya está' };
  }
  if (!c.piedras.length && !sk('piedra1')) {
    return { id: 'piedra1', text: '¿Qué te puede frenar o salir mal?', why: 'Si sabes qué te puede frenar, puedes prepararte antes.', input: { placeholder: 'Algo que te frena: miedo, tiempo, dinero…' }, skip: 'Nada' };
  }
  // la piedra que más quita y aún no tiene ayuda
  const unhelped = (a?.piedras ?? []).filter((s) => !s.ayudas.length && !sk(`ayuda:${s.id}`));
  const stoneIds = new Set(c.piedras.map((s) => s.id));
  const firstUnhelped = unhelped.find((s) => stoneIds.has(s.id)) ?? (a ? null : c.piedras.find((s) => !c.ayudas.some((h) => piedraDe(doc, h.id, c.idx) === s.id) && !sk(`ayuda:${s.id}`)));
  if (firstUnhelped) {
    const s = doc.nodes[firstUnhelped.id];
    if (s) return { id: `ayuda:${s.id}`, text: `¿Qué o quién te podría ayudar con ${q(s.title)}?`, why: 'Casi todo es más fácil con ayuda. Una ayuda hace la piedra más pequeña.', input: { placeholder: 'Una persona, una cosa, un truco…' }, skip: 'No se me ocurre' };
  }
  if (c.piedras.length < 3 && !sk('piedraN') && c.piedras.length > 0) {
    return { id: 'piedraN', text: '¿Hay algo más que te pueda frenar?', why: 'Mejor verlo ahora que encontrártelo de golpe.', input: { placeholder: 'Otra piedra…' }, skip: 'No, nada más' };
  }
  if (c.pasos.length && !c.pasos.some(isPrimero) && !sk('primero')) {
    return {
      id: 'primero', text: '¿Cuál es el paso más pequeñito que podrías hacer ya, mañana mismo?', why: 'Empezar por algo pequeño hace que empieces de verdad.',
      choices: c.pasos.map((x) => ({ value: x.id, emoji: '⭐', label: x.title })), skip: 'Saltar',
    };
  }
  if (!c.sientos.length && !sk('siento')) {
    return {
      id: 'siento', text: '¿Cómo te sientes con todo esto?', why: 'Lo que sientes también cuenta, y a veces es una pista.',
      choices: [
        { value: 'ganas', emoji: '😀', label: 'Con ganas' }, { value: 'normal', emoji: '😐', label: 'Normal' },
        { value: 'miedo', emoji: '😟', label: 'Con miedo' }, { value: 'lio', emoji: '😵', label: 'Hecho un lío' },
      ],
      skip: 'Saltar',
    };
  }
  if (c.sientos.some((n) => n.metadata.custom?.animo === 'miedo') && !sk('miedo') && !c.piedras.some((s) => /miedo/i.test(s.title))) {
    return {
      id: 'miedo', text: 'El miedo es como una piedra. ¿La ponemos para buscarle una ayuda?', why: 'Lo que da miedo pesa menos cuando lo ves y sabes quién te ayuda.',
      choices: [{ value: 'si', emoji: '🪨', label: 'Sí, ponla' }, { value: 'no', emoji: '🙂', label: 'No hace falta' }],
    };
  }
  if (!c.preguntas.length && !sk('pregunta')) {
    return { id: 'pregunta', text: '¿Hay algo que no sepas y te gustaría averiguar?', why: 'Saber qué te falta saber también es avanzar.', input: { placeholder: 'Una pregunta…' }, skip: 'No' };
  }
  if (!sk('descubre')) {
    return { id: 'descubre', text: '¡He descubierto cosas en tu mapa!', why: 'Te enseño lo que he visto: dónde se pierde tu fuerza y qué te ayuda más.', tone: 'win', choices: [{ value: 'ver', emoji: '🔍', label: 'Ver lo que he descubierto' }] };
  }
  // ---------- 3. Hacerlo ----------
  const first = c.pasos.find(isPrimero);
  const pending = first && !isHecho(first) ? first : c.pasos.find((p) => !isHecho(p));
  if (pending && !sk(`hecho:${pending.id}`)) {
    return {
      id: `hecho:${pending.id}`, text: `¿Ya has hecho ${q(pending.title)}?`, why: 'Marcar lo que haces te enseña cuánto has avanzado.',
      choices: [{ value: 'si', emoji: '✅', label: '¡Hecho!' }], skip: 'Todavía no',
    };
  }
  if (c.pasos.length && c.pasos.every(isHecho) && meta.metadata.custom?.conseguido !== '1' && !sk('llegue')) {
    return {
      id: 'llegue', text: `🎉 ¡Has hecho todos tus pasos! ¿Has conseguido ${q(meta.title)}?`, why: 'Si todavía no, a lo mejor falta algún paso.', tone: 'win',
      choices: [{ value: 'si', emoji: '🎉', label: '¡Sí!' }, { value: 'no', emoji: '🤔', label: 'Todavía no' }],
    };
  }
  if (sk('llegue') && meta.metadata.custom?.conseguido !== '1' && !sk('falta')) {
    return { id: 'falta', text: '¿Qué te falta para llegar?', why: 'A veces hace falta un paso más que no veíamos al principio.', input: { placeholder: 'Otro paso…' }, skip: 'Saltar' };
  }
  if (!sk('plan')) {
    return { id: 'plan', text: 'Tu mapa ya cuenta mucho. ¿Quieres ver tu plan?', why: 'Es tu mapa contado en pocas líneas, para tenerlo a mano.', tone: 'win', choices: [{ value: 'ver', emoji: '📋', label: 'Ver mi plan' }], skip: 'Luego' };
  }
  return {
    id: 'libre2', text: 'Puedes seguir: añade pasos, piedras o ayudas con los botones de abajo.', why: 'Cada cosa que añadas, la miro y te digo qué cambia.', tone: 'calm',
    choices: [{ value: 'ver', emoji: '🔍', label: 'Lo que he descubierto' }, { value: 'reset', emoji: '🧭', label: 'Hazme más preguntas' }],
  };
}

/** Aplica una respuesta: devuelve el mapa nuevo y lo que la interfaz tiene que hacer. */
export function answer(doc: ProjectDoc, question: Question, ans: Answer, ctx: Ctx): { doc: ProjectDoc; fx: Effects } {
  const [kind, target] = question.id.split(':');
  const text = 'text' in ans ? ans.text.trim() : '';
  const choice = 'choice' in ans ? ans.choice : null;
  const skip = 'skip' in ans;
  const fx: Effects = {};
  let d = doc;
  const c = leerCamino(doc);
  const root = ideaCentral(doc);
  const done = (id = question.id) => { fx.skip = [...(fx.skip ?? []), id]; };

  if (skip) {
    if (kind === 'hoy') { const r = crear(d, 'hoy', 'Así estoy hoy'); d = r.doc; return { doc: d, fx }; }
    if (kind === 'tamano' || kind === 'donde') { d = resuelto(d, target, kind); return { doc: d, fx }; }
    if (kind === 'fuerza') { d = resuelto(d, target, 'fuerza'); return { doc: d, fx }; }
    if (kind === 'llegue') { done(); return { doc: d, fx }; }
    done();
    return { doc: d, fx };
  }

  switch (kind) {
    case 'idea': {
      if (!text) return { doc: d, fx };
      const r = op.addNode(d, 'bubble', {
        title: text, position: { x: -150, y: -40 },
        visualStyle: { shape: 'pill', color: 'rose', background: null, fontFamily: 'serif', fontSize: 19, fontWeight: 600, icon: null, image: null, borderStyle: 'solid' },
      });
      return { doc: r.doc, fx: { select: r.id } };
    }
    case 'tipo': {
      if (!root) break;
      if (choice === 'quiero') { d = setPapel(d, root.id, 'meta'); fx.level = 2; fx.toast = '🎯 ¡Ya sabes a dónde quieres llegar! Ahora vamos a ver el camino.'; }
      else if (choice === 'preocupa') { d = setPapel(d, root.id, 'hoy'); fx.level = 2; fx.toast = '🌱 Vale: así está la cosa hoy. Ahora pensemos cómo te gustaría que fuera.'; }
      else done('tipo');
      break;
    }
    case 'mas': {
      if (!text) break;
      const near = ctx.selected && d.nodes[ctx.selected] ? ctx.selected : root?.id ?? null;
      const r = ideaUnida(d, text, near);
      d = r.doc;
      break;
    }
    case 'elegir': {
      if (!choice || !d.nodes[choice]) break;
      d = setPapel(d, choice, 'meta');
      fx.level = 2;
      fx.toast = '🎯 ¡Esa es tu meta! Ahora vamos a ver el camino.';
      break;
    }
    case 'libre1': {
      fx.unskip = choice === 'otra' ? ['mas'] : ['elegir'];
      break;
    }
    case 'meta': {
      if (!text) break;
      d = crear(d, 'meta', text).doc;
      fx.toast = '🎯 ¡Ya tienes a dónde ir!';
      break;
    }
    case 'hoy': {
      d = crear(d, 'hoy', text || 'Así estoy hoy').doc;
      break;
    }
    case 'razon': {
      if (!text) break;
      d = crear(d, 'razon', text).doc;
      break;
    }
    case 'paso1':
    case 'pasoN':
    case 'falta': {
      if (!text) break;
      d = pasoDespues(d, text, null).doc;
      if (kind === 'falta') { fx.unskip = ['llegue']; done('falta'); }
      break;
    }
    case 'piedra1':
    case 'piedraN': {
      if (!text) break;
      const r = crear(d, 'piedra', text, { tamano: 'mediana' });
      d = pendiente(r.doc, r.id, c.pasos.length >= 2 ? ['tamano', 'donde'] : ['tamano']);
      break;
    }
    case 'tamano': {
      if (choice && choice in TAMANO) d = setTamano(d, target, choice as Tamano);
      d = resuelto(d, target, 'tamano');
      break;
    }
    case 'donde': {
      if (choice) d = apuntar(d, target, choice);
      d = resuelto(d, target, 'donde');
      break;
    }
    case 'ayuda': {
      if (!text) break;
      const r = crear(d, 'ayuda', text, { piedra: target, fuerza: 'bastante' });
      d = pendiente(r.doc, r.id, ['fuerza']);
      break;
    }
    case 'fuerza': {
      if (choice && choice in FUERZA) d = setFuerza(d, target, choice as Fuerza);
      d = resuelto(d, target, 'fuerza');
      fx.toast = '🤝 ¡Bien! Con ayuda, la piedra pesa menos.';
      break;
    }
    case 'primero': {
      if (choice && d.nodes[choice]) { d = marcar(d, choice, 'primero', true); fx.toast = '⭐ ¡Ese es tu primer paso!'; }
      break;
    }
    case 'siento': {
      const label: Record<string, string> = { ganas: 'Me siento con ganas', normal: 'Me siento normal', miedo: 'Me da un poco de miedo', lio: 'Estoy hecho un lío' };
      if (!choice) break;
      const r = crear(d, 'siento', label[choice] ?? 'Me siento así');
      d = setMarca(r.doc, r.id, 'animo', choice);
      if (choice === 'lio') fx.toast = '😌 Normal. Vamos poco a poco, de una en una.';
      break;
    }
    case 'miedo': {
      if (choice === 'si') {
        const r = crear(d, 'piedra', 'El miedo', { tamano: 'mediana' });
        d = pendiente(r.doc, r.id, c.pasos.length >= 2 ? ['tamano', 'donde'] : ['tamano']);
      }
      done('miedo');
      break;
    }
    case 'pregunta': {
      if (!text) break;
      d = crear(d, 'pregunta', text).doc;
      break;
    }
    case 'descubre': { done('descubre'); fx.open = 'discover'; break; }
    case 'hecho': {
      if (d.nodes[target]) { d = marcar(d, target, 'hecho', true); fx.toast = '✅ ¡Muy bien! Un paso menos.'; }
      break;
    }
    case 'llegue': {
      if (choice === 'si' && c.meta) { d = setMarca(d, c.meta.id, 'conseguido', '1'); fx.toast = '🎉 ¡Lo has conseguido! ¡Enhorabuena!'; }
      else done('llegue');
      break;
    }
    case 'plan': { done('plan'); fx.open = 'plan'; break; }
    case 'libre2': {
      if (choice === 'reset') fx.unskip = ['razon', 'pasoN', 'piedraN', 'primero', 'siento', 'pregunta', 'descubre', 'plan', ...[...ctx.skipped].filter((k) => k.startsWith('ayuda:') || k.startsWith('hecho:'))];
      else fx.open = 'discover';
      break;
    }
  }
  return { doc: d, fx };
}

/* ------------------------------------------------------------------ */
/* Lo que he descubierto                                               */
/* ------------------------------------------------------------------ */

export interface Discovery { id: string; emoji: string; text: string; detail?: string; tone?: 'good' | 'warn' | 'info'; focus?: string; ask?: string }

const n10 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

export function descubrimientos(doc: ProjectDoc, a: KidAnalysis | null): Discovery[] {
  const c = leerCamino(doc);
  const out: Discovery[] = [];
  const meta = c.meta;
  if (a?.listo && meta) {
    const lost = Math.max(0, 10 - a.llegan);
    out.push({
      id: 'llegan', emoji: '🎯', tone: a.llegan >= 8 ? 'good' : a.llegan >= 5 ? 'info' : 'warn',
      text: `De cada 10 empujones, llegan ${n10(a.llegan)} a ${q(meta.title)}.`,
      detail: lost < 0.05 ? '¡No se pierde nada por el camino!' : `Se quedan por el camino ${n10(lost)}. Abajo te digo dónde.`,
    });
    const big = a.piedras.find((s) => s.quita >= 0.1);
    if (big) {
      out.push({
        id: `piedra:${big.id}`, emoji: '🪨', tone: 'warn', focus: big.id,
        text: `${q(big.title)} es tu piedra más grande: te quita ${n10(big.quita)} de cada 10.`,
        detail: big.ayudas.length ? 'Ya tiene ayuda. ¿Podrías conseguir una ayuda más fuerte?' : 'Todavía nadie te ayuda con ella.',
        ask: big.ayudas.length ? undefined : `ayuda:${big.id}`,
      });
    }
    if (a.sinPiedras - a.llegan >= 0.5) out.push({ id: 'sinpiedras', emoji: '✨', tone: 'info', text: `Si quitaras todas las piedras, llegarían ${n10(a.sinPiedras)} de cada 10.`, detail: 'Las piedras no siempre se pueden quitar, pero sí hacer más pequeñas con ayudas.' });
    const best = a.ayudas.find((h) => h.devuelve >= 0.1);
    if (best) out.push({ id: `ayuda:${best.id}`, emoji: '🤝', tone: 'good', focus: best.id, text: `${q(best.title)} es tu mejor ayuda: sin ella perderías ${n10(best.devuelve)} de cada 10.`, detail: 'Cuídala: te hace mucha falta.' });
    for (const p of a.perdidas.slice(0, 2)) out.push({ id: `perdida:${p.id}`, emoji: '🕳️', tone: 'warn', focus: p.id, text: `En ${q(p.title)} se pierden ${n10(p.pierde)} de cada 10.`, detail: 'Ahí se escapa algo. ¿Qué podría ayudar en ese paso?' });
    // el paso con más piedras encima
    const load = new Map<string, number>();
    for (const s of a.piedras) if (s.objetivo) load.set(s.objetivo, (load.get(s.objetivo) ?? 0) + 1);
    const hard = [...load.entries()].sort((x, y) => y[1] - x[1])[0];
    if (hard && hard[1] >= 2 && doc.nodes[hard[0]]) out.push({ id: `duro:${hard[0]}`, emoji: '⛰️', tone: 'info', focus: hard[0], text: `${q(doc.nodes[hard[0]].title)} tiene ${hard[1]} piedras encima: es la parte más difícil del camino.`, detail: 'Prepárala bien antes de llegar.' });
  } else if (a && !a.listo) {
    const why = a.falta === 'meta' ? 'Pon lo que quieres conseguir 🎯 y te diré cuánto te falta.' : a.falta === 'hoy' ? 'Pon cómo está la cosa hoy 🌱 para empezar el camino.' : 'Une Hoy con lo que quieres, paso a paso.';
    out.push({ id: 'falta', emoji: '🧭', tone: 'info', text: 'Todavía no puedo medir tu camino.', detail: why });
  }
  if (meta && !c.piedras.length) out.push({ id: 'nopiedras', emoji: '🪨', tone: 'info', text: 'Aún no has pensado qué te puede frenar.', detail: 'Pensarlo ahora te ahorra sustos luego.', ask: 'piedra1' });
  for (const h of c.ayudas) if (!piedraDe(doc, h.id, c.idx)) out.push({ id: `ayudasola:${h.id}`, emoji: '🤝', tone: 'info', focus: h.id, text: `${q(h.title)} todavía no ayuda con ninguna piedra.`, detail: 'Elígela y dile con qué piedra te ayuda.' });
  for (const s of c.piedras) if (!objetivoDe(doc, s.id, c.idx)) out.push({ id: `piedrasola:${s.id}`, emoji: '🪨', tone: 'info', focus: s.id, text: `${q(s.title)} no frena ningún paso.`, detail: 'Elígela y dile qué paso frena.' });
  for (const s of c.sueltos) out.push({ id: `suelto:${s.id}`, emoji: '👣', tone: 'info', focus: s.id, text: `${q(s.title)} no está en el camino.`, detail: 'Elígelo y pulsa «Paso» para meterlo.' });
  const first = c.pasos.find(isPrimero);
  if (first) out.push({ id: 'primero', emoji: '⭐', tone: 'good', focus: first.id, text: `Tu primer paso: ${q(first.title, 60)}.`, detail: isHecho(first) ? '¡Y ya lo has hecho!' : 'Es pequeño: puedes hacerlo mañana.' });
  else if (c.pasos.length) out.push({ id: 'noprimero', emoji: '⭐', tone: 'info', text: 'Aún no has elegido tu primer paso.', detail: 'Elegir uno pequeñito hace que empieces de verdad.', ask: 'primero' });
  const hechos = c.pasos.filter(isHecho).length;
  if (hechos) out.push({ id: 'hechos', emoji: '✅', tone: 'good', text: `Llevas ${hechos} de ${c.pasos.length} pasos hechos.`, detail: hechos === c.pasos.length ? '¡Todos! ¿Lo has conseguido?' : '¡Sigue así!' });
  if (meta?.metadata.custom?.conseguido === '1') out.push({ id: 'conseguido', emoji: '🎉', tone: 'good', text: `¡Has conseguido ${q(meta.title)}!`, detail: '¿Quieres empezar otro mapa con lo siguiente?' });
  if (c.pasos.length > 6) out.push({ id: 'largo', emoji: '🐍', tone: 'info', text: `Tu camino tiene ${c.pasos.length} pasos.`, detail: '¿Alguno se puede juntar con otro o quitar?' });
  const linked = new Set<string>();
  for (const e of Object.values(doc.edges)) { linked.add(e.sourceNodeId); linked.add(e.targetNodeId); }
  const loose = c.ideas.filter((n) => !linked.has(n.id));
  if (loose.length) out.push({ id: 'sueltas', emoji: '💡', tone: 'info', text: loose.length === 1 ? `${q(loose[0].title)} está suelta.` : `Tienes ${loose.length} ideas sueltas.`, detail: '¿Van con algo? Pueden ser pasos, piedras o ayudas.' });
  for (const n of c.preguntas.slice(0, 3)) out.push({ id: `pregunta:${n.id}`, emoji: '❓', tone: 'info', focus: n.id, text: `Te falta averiguar: ${q(n.title, 60)}.` });
  for (const n of c.razones.slice(0, 2)) out.push({ id: `razon:${n.id}`, emoji: '💛', tone: 'good', focus: n.id, text: `Lo haces porque: ${q(n.title, 60)}.`, detail: 'Acuérdate de esto cuando cueste.' });
  for (const n of c.sientos.slice(0, 2)) out.push({ id: `siento:${n.id}`, emoji: '❤️', tone: 'info', focus: n.id, text: `Te sientes: ${q(n.title, 60)}.` });
  return out;
}

/* ------------------------------------------------------------------ */
/* Mi plan                                                             */
/* ------------------------------------------------------------------ */

export function miPlan(doc: ProjectDoc, a: KidAnalysis | null): { lines: string[]; story: string } {
  const c = leerCamino(doc);
  const L: string[] = [`MI PLAN · ${doc.project.name}`, ''];
  if (c.meta) L.push(`🎯 Quiero: ${c.meta.title}`);
  if (c.hoy) L.push(`🌱 Hoy: ${c.hoy.title}`);
  for (const r of c.razones) L.push(`💛 Porque: ${r.title}`);
  if (c.pasos.length) {
    L.push('', '👣 Mis pasos:');
    c.pasos.forEach((p, i) => L.push(`  ${i + 1}. ${p.title}${isPrimero(p) ? '  ⭐ primer paso' : ''}${isHecho(p) ? '  ✅ hecho' : ''}`));
  }
  if (c.piedras.length) {
    L.push('', '🪨 Lo que me puede frenar:');
    for (const s of c.piedras) {
      const helpers = c.ayudas.filter((h) => piedraDe(doc, h.id, c.idx) === s.id).map((h) => h.title);
      const t = TAMANO[(s.metadata.custom?.tamano as Tamano) ?? 'mediana']?.label.toLowerCase() ?? 'mediana';
      L.push(`  · ${s.title} (${t})${helpers.length ? ` → me ayuda: ${helpers.join(', ')}` : ''}`);
    }
  }
  const lonely = c.ayudas.filter((h) => !piedraDe(doc, h.id, c.idx));
  if (lonely.length) { L.push('', '🤝 Otras ayudas:'); for (const h of lonely) L.push(`  · ${h.title}`); }
  if (c.preguntas.length) { L.push('', '❓ Me falta averiguar:'); for (const p of c.preguntas) L.push(`  · ${p.title}`); }
  if (c.sientos.length) { L.push(''); for (const s of c.sientos) L.push(`❤️ ${s.title}`); }
  if (a?.listo) L.push('', `📊 De cada 10 empujones, llegan ${n10(a.llegan)} a lo que quiero.`);
  // contado como a un amigo
  const first = c.pasos.find(isPrimero) ?? c.pasos[0];
  const big = a?.piedras[0] ? doc.nodes[a.piedras[0].id] : c.piedras[0];
  const help = big ? c.ayudas.find((h) => piedraDe(doc, h.id, c.idx) === big.id) : undefined;
  const parts: string[] = [];
  const say = (t: string) => `«${t.trim().replace(/[.]+$/u, '')}»`;
  if (c.meta) parts.push(`Quieres ${say(c.meta.title)}.`);
  if (c.hoy) parts.push(`Ahora mismo: ${say(c.hoy.title)}.`);
  if (c.razones[0]) parts.push(`Te importa porque: ${say(c.razones[0].title.replace(/^porque\s+/i, ''))}.`);
  if (c.pasos.length === 1) parts.push(`Para llegar: ${say(c.pasos[0].title)}.`);
  if (c.pasos.length > 1) parts.push(`Para llegar: ${c.pasos.slice(0, -1).map((p) => say(p.title)).join(', luego ')} y luego ${say(c.pasos.at(-1)!.title)}.`);
  if (big) parts.push(`Lo que más te puede frenar: ${say(big.title)}.${help ? ` Te puede ayudar: ${say(help.title)}.` : ''}`);
  if (first) parts.push(`Empieza por ${say(first.title)}: es pequeño y puedes hacerlo pronto.`);
  if (parts.length) parts.push('¡Tú puedes!');
  return { lines: L, story: parts.join(' ') };
}


export { PAPEL };
