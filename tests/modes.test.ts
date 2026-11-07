/**
 * Modos de trabajo ACLARATOR y COPYWRITER: reglas, servidor (IA simulada) y mapas.
 */
import { describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiHandler } from '../server/handler';
import type { Provider } from '../server/providers';
import {
  ACLARATOR_BLOCKS, CopyPackageAiSchema, CopyPackageSchema, buildClarifyPrompt, clarityIssue, demoClarify, emptyClarify, isBlockClear, templateCopy, wordCount, youtubeVoice,
  type ClarifyRequest, type ClarifyState, type CopyPackage,
} from '../src/explorer/shared/modes';
import { buildAclaratorMap, buildCopyMap } from '../src/explorer/modesMap';
import { createEmptyDoc } from '../src/core/model/factory';
import { parseProjectDoc } from '../src/core/model/migrations';

const req = (p: Partial<ClarifyRequest>): ClarifyRequest => ({ topic: 'Canal de autoconocimiento', dump: 'Quiero un canal sin cámara', index: 0, validated: [], current: { interno: '', externo: '' }, messages: [], userText: '', command: 'answer', ...p });
const CLEAR_IN = 'Un vídeo de cinco minutos que explica por qué dormimos mal aunque nos acostemos pronto.';
const CLEAR_EX = 'Que cincuenta personas comenten esta semana que han probado dejar el móvil fuera del cuarto.';

describe('ACLARATOR · reglas', () => {
  it('detecta lo vacío, lo corto y lo difuso; acepta lo concreto', () => {
    expect(clarityIssue('')).toMatch(/vacío/);
    expect(clarityIssue('un vídeo')).toMatch(/corto/);
    expect(clarityIssue('quiero hacer algo mejor')).toMatch(/«algo»|«mejor»/);
    expect(clarityIssue(CLEAR_IN)).toBeNull();
    expect(isBlockClear({ interno: CLEAR_IN, externo: 'cosas buenas', validated: false })).toBe(false);
    expect(isBlockClear({ interno: CLEAR_IN, externo: CLEAR_EX, validated: false })).toBe(true);
  });

  it('abre un bloque sin enseñar los siguientes (nunca «el total»)', () => {
    const t = demoClarify(req({ command: 'open' }));
    expect(t.message).toContain('Paso 1 de 10');
    expect(t.message).toContain('OBJETIVO');
    for (const later of ACLARATOR_BLOCKS.slice(1)) expect(t.message).not.toContain(later.title);
    expect(t.clear).toBe(false);
  });

  it('no da por claro un bloque difuso y fomenta la concreción', () => {
    const vague = demoClarify(req({ current: { interno: 'algo chulo', externo: CLEAR_EX } }));
    expect(vague.clear).toBe(false);
    expect(vague.message).toMatch(/no está claro/);
    const ok = demoClarify(req({ current: { interno: CLEAR_IN, externo: CLEAR_EX } }));
    expect(ok.clear).toBe(true);
    expect(ok.message).toMatch(/valídalo/);
  });

  it('el prompt solo trae el bloque actual y lo ya validado', () => {
    const p = buildClarifyPrompt(req({ index: 1, validated: [{ key: 'objetivo', interno: CLEAR_IN, externo: CLEAR_EX }] }));
    expect(p).toContain('BLOQUE ACTUAL (2 de 10): PRIORIDAD');
    expect(p).toContain(CLEAR_IN);
    for (const later of ACLARATOR_BLOCKS.slice(2)) expect(p).not.toContain(`${later.title} —`);
  });
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');
function pkgWith(totalWords: number): CopyPackage {
  const per = Math.floor(totalWords / 9);
  const y = Object.fromEntries(['gancho', 'situacion', 'friccion', 'descubrimiento', 'profundizacion', 'integracion', 'cierre', 'reflexion', 'accion'].map((k) => [k, words(per)])) as CopyPackage['youtube'];
  return { title: 'Dormir mejor', youtube: y, reto: 'Siete noches sin móvil en el cuarto.', reels: { principal: 'a', contraste: 'b', reflexion: 'c' }, stories: ['1', '2', '3'] };
}

describe('COPYWRITER · reglas', () => {
  it('el esqueleto sin IA cumple la estructura, trae reto y es solo voz', () => {
    const p = CopyPackageSchema.parse(templateCopy({ topic: 'dormir mejor', audience: 'estudiantes', message: 'dejar el móvil fuera del cuarto', notes: '', briefing: '' }));
    expect(p.stories.length).toBeGreaterThanOrEqual(3);
    expect(p.reto).toMatch(/7 días/);
    const voice = youtubeVoice(p);
    expect(voice).not.toMatch(/Gancho|Situación|Fricción/); // sin etiquetas de sección
    expect(voice.startsWith('¿')).toBe(true); // no empieza saludando
  });

  it('con IA exige entre 700 y 900 palabras (con margen)', () => {
    expect(CopyPackageAiSchema.safeParse(pkgWith(300)).success).toBe(false);
    expect(CopyPackageAiSchema.safeParse(pkgWith(810)).success).toBe(true);
    expect(wordCount(youtubeVoice(pkgWith(810)))).toBeGreaterThan(700);
  });
});

function fakeProvider(responses: string[], calls: { prompt: string; system: string }[] = []): Provider {
  let i = 0;
  return {
    id: 'gemini', label: 'Simulado', model: async () => 'modelo-simulado', supportsAudio: false,
    generate: async (o) => { calls.push({ prompt: o.prompt, system: o.system }); return responses[Math.min(i++, responses.length - 1)]; },
  };
}
async function withServer(provider: Provider | undefined, fn: (base: string) => Promise<void>) {
  const handler = createApiHandler({ env: {}, provider, log: () => {} });
  const server: Server = createServer((rq, rs) => { void handler(rq, rs).then((h) => { if (!h) { rs.statusCode = 404; rs.end(); } }); });
  await new Promise<void>((r) => server.listen(0, r));
  try { await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); } finally { server.close(); }
}

describe('Modos de trabajo · servidor', () => {
  it('ACLARATOR: valida la respuesta y lleva las reglas en las instrucciones', async () => {
    const calls: { prompt: string; system: string }[] = [];
    const turn = { message: '¿Qué estás construyendo exactamente?', interno: CLEAR_IN, externo: '', clear: false, missing: 'la capa externa' };
    await withServer(fakeProvider(['no es json', JSON.stringify(turn)], calls), async (base) => {
      const r = await fetch(`${base}/api/explorer/clarify`, { method: 'POST', body: JSON.stringify(req({ command: 'open' })) });
      expect(r.status).toBe(200);
      expect((await r.json()).turn.interno).toBe(CLEAR_IN);
    });
    expect(calls[0].system).toContain('REGLA DE ORO');
    expect(calls[0].system).toContain('NUNCA respondes con «el total»');
    expect(calls[0].system).toContain('No las deletrees');
  });

  it('COPYWRITER: repara un guion demasiado corto hasta cumplir 700–900 palabras', async () => {
    const calls: { prompt: string; system: string }[] = [];
    await withServer(fakeProvider([JSON.stringify(pkgWith(200)), JSON.stringify(pkgWith(800))], calls), async (base) => {
      const r = await fetch(`${base}/api/explorer/copy`, { method: 'POST', body: JSON.stringify({ topic: 'dormir mejor' }) });
      const j = await r.json();
      expect(r.status).toBe(200);
      expect(j.repaired).toBe(1);
      expect(wordCount(youtubeVoice(j.pkg))).toBeGreaterThan(700);
    });
    expect(calls[0].system).toContain('cristaliza al menos una vez');
    expect(calls[1].prompt).toMatch(/700 y 900/);
  });

  it('sin clave: ambos modos responden 503 (modo demostración)', async () => {
    await withServer(undefined, async (base) => {
      expect((await fetch(`${base}/api/explorer/clarify`, { method: 'POST', body: JSON.stringify(req({})) })).status).toBe(503);
      expect((await fetch(`${base}/api/explorer/copy`, { method: 'POST', body: JSON.stringify({ topic: 'x' }) })).status).toBe(503);
    });
  });
});

describe('Modos de trabajo · mapas', () => {
  it('ACLARATOR → mapa radial válido: centro + 10 bloques + 20 capas', () => {
    const st: ClarifyState = { ...emptyClarify('x'), index: 10 };
    for (const b of ACLARATOR_BLOCKS) st.values[b.key] = { interno: `${b.title} dentro`, externo: `${b.title} fuera`, validated: true };
    const { doc, nodeIds } = buildAclaratorMap(createEmptyDoc('A'), 'Mi canal', st);
    expect(nodeIds).toHaveLength(31);
    expect(Object.keys(doc.edges)).toHaveLength(30);
    expect(parseProjectDoc(JSON.parse(JSON.stringify(doc))).repairs).toEqual([]);
    expect(Object.values(doc.nodes).some((n) => n.title.startsWith('Quién es:'))).toBe(true);
  });

  it('COPYWRITER → mapa del guion: secciones en orden, reto, reels y stories', () => {
    const p = templateCopy({ topic: 'dormir mejor', audience: '', message: '', notes: '', briefing: '' });
    const { doc, nodeIds } = buildCopyMap(createEmptyDoc('C'), p);
    expect(nodeIds).toHaveLength(1 + 9 + 1 + 1 + 3 + 1 + p.stories.length);
    expect(Object.values(doc.nodes).some((n) => n.title.startsWith('Reto:'))).toBe(true);
    expect(parseProjectDoc(JSON.parse(JSON.stringify(doc))).repairs).toEqual([]);
  });

  it('se coloca a la derecha de lo que ya hay en el mapa', () => {
    const base = createEmptyDoc('B');
    const p = templateCopy({ topic: 't', audience: '', message: '', notes: '', briefing: '' });
    const first = buildCopyMap(base, p).doc;
    const maxX = Math.max(...Object.values(first.nodes).map((n) => n.position.x));
    const second = buildCopyMap(first, p);
    const newMin = Math.min(...second.nodeIds.map((id) => second.doc.nodes[id].position.x));
    expect(newMin).toBeGreaterThan(maxX);
  });
});
