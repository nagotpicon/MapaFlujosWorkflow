/**
 * 🔇 Silenciar una idea para ver, de un golpe, cuánto cambia el resultado sin ella.
 * No se borra nada: la idea se queda en el mapa, apagada, y se vuelve a activar igual.
 */
import * as op from '../core/operations';
import { isMuted } from '../engine/mute';
import { useKid } from '../kid/kidStore';
import { useSim } from '../store/simStore';
import { useUI } from '../store/uiStore';
import { fmt } from '../ui/primitives';
import { levelOf } from './levels';
import * as A from './actions';

const n10 = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

export function toggleMute(id: string) {
  const doc = A.getDoc();
  const n = doc?.nodes[id];
  if (!doc || !n) return;
  const on = !isMuted(n);
  const name = `«${n.title || 'esta idea'}»`;
  const easy = levelOf(doc.project.settings.depth) < 3;
  const notify = useUI.getState().notify;
  // lo de antes, para contar la diferencia en cuanto el mapa vuelva a hacer las cuentas
  const kidBefore = useKid.getState().analysis;
  const simBefore = useSim.getState().result;
  A.apply((d) => {
    const custom = { ...(d.nodes[id].metadata.custom ?? {}) };
    if (on) custom.mute = '1'; else delete custom.mute;
    return op.updateNode(d, id, { metadata: { ...d.nodes[id].metadata, custom } });
  });
  const lead = on ? `🔇 Sin ${name}` : `🔊 Con ${name} otra vez`;
  let done = false;
  const finish = (text: string) => { if (done) return; done = true; unsubKid(); unsubSim(); clearTimeout(timer); notify(text, 'info'); };
  const unsubKid = useKid.subscribe((s) => {
    if (!easy || !s.analysis || s.analysis === kidBefore) return;
    if (!s.analysis.listo || !kidBefore?.listo) return finish(`${lead}. ${on ? 'Ahora no cuenta.' : 'Vuelve a contar.'}`);
    const diff = Math.round((s.analysis.llegan - kidBefore.llegan) * 10) / 10;
    finish(Math.abs(diff) < 0.05
      ? `${lead}, todo sigue igual: ahora mismo no cambia nada.`
      : `${lead}: llegan ${n10(s.analysis.llegan)} de cada 10 (antes ${n10(kidBefore.llegan)}).`);
  });
  const unsubSim = useSim.subscribe((s) => {
    if (easy || !s.result || s.result === simBefore || s.status !== 'ready') return;
    const now = s.result.metrics.totalResult.quantity ?? 0;
    const before = simBefore?.metrics.totalResult.quantity ?? null;
    if (before == null) return finish(`${lead}. ${on ? 'Ahora no cuenta.' : 'Vuelve a contar.'}`);
    finish(Math.abs(now - before) < 1e-6
      ? `${lead}, todo sigue igual: ahora mismo no cambia nada.`
      : `${lead}: a la meta llegan ${fmt(now)} (antes ${fmt(before)}).`);
  });
  // si no hay nada que medir (por ejemplo, aún no hay meta), se avisa igual
  const timer = setTimeout(() => finish(`${lead}. ${on ? 'Ahora no cuenta: se calcula como si no estuviera.' : 'Vuelve a contar.'}`), 4000);
}
