/**
 * Ejemplo del modo fácil: «Vender mis dibujos». Un camino con tres pasos, dos
 * piedras, dos ayudas, una razón, cómo me siento y una pregunta.
 */
import { createEmptyDoc } from '../core/model/factory';
import type { ProjectDoc } from '../core/model/schema';
import * as K from '../kid/model';

export function buildKidDemo(): ProjectDoc {
  let d = createEmptyDoc('Vender mis dibujos');
  d = { ...d, project: { ...d.project, isDemo: true, description: 'Ejemplo del modo fácil: de hoy a lo que quiero, con pasos, piedras y ayudas.', settings: { ...d.project.settings, depth: 'advanced' } } };
  const put = (r: { doc: ProjectDoc; id: string }) => { d = r.doc; return r.id; };
  put(K.crear(d, 'hoy', 'Dibujo mucho, pero nadie ve mis dibujos'));
  put(K.crear(d, 'meta', 'Vender mis dibujos'));
  const p1 = put(K.crear(d, 'paso', 'Hacer 10 dibujos bonitos'));
  const p2 = put(K.crear(d, 'paso', 'Enseñarlos en internet'));
  const p3 = put(K.crear(d, 'paso', 'Ponerles un precio'));
  const s1 = put(K.crear(d, 'piedra', 'Me da vergüenza enseñarlos', { objetivo: p2, tamano: 'grande' }));
  const s2 = put(K.crear(d, 'piedra', 'No sé cuánto cobrar', { objetivo: p3, tamano: 'mediana' }));
  put(K.crear(d, 'ayuda', 'Mi prima sabe de redes', { piedra: s1, fuerza: 'bastante' }));
  put(K.crear(d, 'ayuda', 'Mirar lo que cobran otros', { piedra: s2, fuerza: 'mucho' }));
  put(K.crear(d, 'razon', 'Quiero comprarme una tableta para dibujar'));
  put(K.crear(d, 'siento', 'Me hace ilusión y me da un poco de miedo'));
  put(K.crear(d, 'pregunta', '¿Dónde se venden dibujos?'));
  d = K.marcar(d, p1, 'primero', true);
  d = K.ordenarCamino(d);
  for (const n of Object.values(d.nodes)) d = { ...d, nodes: { ...d.nodes, [n.id]: { ...n, metadata: { ...n.metadata, demo: true } } } };
  return d;
}
