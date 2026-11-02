/**
 * API del Explorador (sin framework, Node http). Se monta en el servidor de
 * Vite (dev/preview) y en el servidor independiente (server/standalone.ts).
 * Las claves de los proveedores solo existen aquí.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { resolveProvider, redact, withRetry, ProviderError, type Env, type Provider } from './providers.ts';
import { extractDocumentText } from './documents.ts';
import {
  ExplorerTurnSchema, PlanSummarySchema, ProposalRequestSchema, ProposalSchema, TurnRequestSchema, PLAN_JSON_SCHEMA, PROPOSAL_JSON_SCHEMA, TURN_JSON_SCHEMA, extractJson,
} from '../src/explorer/shared/schemas.ts';
import { SYSTEM_INSTRUCTION, buildPlanPrompt, buildPolishPrompt, buildProposalPrompt, buildTurnPrompt } from '../src/explorer/shared/prompts.ts';

const MAX_BODY = 45 * 1024 * 1024;
const TIMEOUT = { turn: 90_000, proposal: 180_000, transcribe: 300_000, short: 60_000 };

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw Object.assign(new Error('Petición demasiado grande'), { status: 413 });
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('JSON no válido'), { status: 400 }); }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

/** Limitador sencillo por IP (ventana de 60 s). */
const hits = new Map<string, number[]>();
function rateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > limit;
}

/** Genera y valida con Zod; si falla, pide al modelo que corrija la estructura (hasta 2 veces). */
export async function generateValidated<T>(provider: Provider, schema: z.ZodType<T>, opts: { system: string; prompt: string; jsonSchema: object; signal: AbortSignal; onDelta?: (t: string) => void; temperature?: number }): Promise<{ data: T; repaired: number }> {
  let prompt = opts.prompt;
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = await withRetry(() => provider.generate({ ...opts, prompt, onDelta: attempt === 0 ? opts.onDelta : undefined }), opts.signal);
    try {
      return { data: schema.parse(extractJson(text)), repaired: attempt };
    } catch (e) {
      const issues = e instanceof z.ZodError ? e.issues.slice(0, 6).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : (e as Error).message;
      prompt = `${opts.prompt}\n\nTu respuesta anterior NO era válida (${issues}). Devuelve SOLO el objeto JSON corregido y completo.`;
    }
  }
  throw new ProviderError('El proveedor devolvió una estructura no válida tras varios intentos. No se ha incorporado nada al mapa.', 502);
}

export interface ApiOptions { env: Env; log?: (msg: string) => void }

export function createApiHandler({ env, log = (m) => console.error(m) }: ApiOptions) {
  const cfg = resolveProvider(env);
  const limit = Number(env.EXPLORER_RATE_LIMIT ?? 40);

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ?? req.socket.remoteAddress ?? 'local';
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    const timed = (ms: number) => AbortSignal.any([controller.signal, AbortSignal.timeout(ms)]);
    try {
      if (req.method === 'GET' && url.pathname === '/api/explorer/status') {
        send(res, 200, {
          configured: cfg.configured, provider: cfg.name, label: cfg.provider?.label ?? null,
          model: cfg.provider ? await cfg.provider.model().catch(() => null) : null,
          supportsAudio: !!cfg.provider?.transcribe, grounding: false, reason: cfg.reason,
        });
        return true;
      }
      if (req.method !== 'POST') { send(res, 405, { error: 'Método no permitido' }); return true; }
      if (rateLimited(ip, limit)) { send(res, 429, { error: 'Demasiadas peticiones. Espera un minuto.' }); return true; }
      const body = await readJson(req);

      if (url.pathname === '/api/documents/extract') {
        const b = z.object({ name: z.string(), mime: z.string().catch(''), data: z.string() }).parse(body);
        const out = await extractDocumentText(new Uint8Array(Buffer.from(b.data, 'base64')), b.name, b.mime);
        send(res, 200, out);
        return true;
      }

      if (!cfg.provider) { send(res, 503, { error: 'Ningún proveedor de IA configurado', demo: true, reason: cfg.reason }); return true; }
      const provider = cfg.provider;

      if (url.pathname === '/api/explorer/turn') {
        const r = TurnRequestSchema.parse(body);
        res.statusCode = 200;
        res.setHeader('content-type', 'text/event-stream; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.setHeader('x-accel-buffering', 'no');
        const ev = (name: string, data: unknown) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
        try {
          const { data, repaired } = await generateValidated(provider, ExplorerTurnSchema, {
            system: SYSTEM_INSTRUCTION, prompt: buildTurnPrompt(r), jsonSchema: TURN_JSON_SCHEMA, signal: timed(TIMEOUT.turn), onDelta: (t) => ev('delta', t),
          });
          ev('result', { turn: data, repaired, model: await provider.model() });
        } catch (e) {
          ev('error', { error: redact((e as Error).message, env) });
        }
        res.end();
        return true;
      }

      if (url.pathname === '/api/explorer/proposal') {
        const r = ProposalRequestSchema.parse(body);
        const { data, repaired } = await generateValidated(provider, ProposalSchema, { system: SYSTEM_INSTRUCTION, prompt: buildProposalPrompt(r), jsonSchema: PROPOSAL_JSON_SCHEMA, signal: timed(TIMEOUT.proposal), temperature: 0.4 });
        send(res, 200, { proposal: data, repaired, model: await provider.model() });
        return true;
      }

      if (url.pathname === '/api/explorer/plan-summary') {
        const b = z.object({ name: z.string(), text: z.string().max(400_000) }).parse(body);
        const { data } = await generateValidated(provider, PlanSummarySchema, { system: 'Eres un analista que resume planes con exactitud, sin inventar nada.', prompt: buildPlanPrompt(b.text, b.name), jsonSchema: PLAN_JSON_SCHEMA, signal: timed(TIMEOUT.proposal), temperature: 0.2 });
        send(res, 200, { summary: data });
        return true;
      }

      if (url.pathname === '/api/explorer/polish') {
        const b = z.object({ markdown: z.string().max(20_000) }).parse(body);
        const text = await withRetry(() => provider.generate({ system: 'Escribes con cercanía y franqueza, sin inventar datos.', prompt: buildPolishPrompt(b.markdown), signal: timed(TIMEOUT.short), temperature: 0.7 }), controller.signal);
        send(res, 200, { text: text.trim() });
        return true;
      }

      if (url.pathname === '/api/explorer/transcribe') {
        if (!provider.transcribe) { send(res, 501, { error: `${provider.label} no transcribe audio. Usa el dictado del navegador o configura Gemini / una API compatible con OpenAI.` }); return true; }
        const b = z.object({ mime: z.string(), data: z.string() }).parse(body);
        const text = await withRetry(() => provider.transcribe!(new Uint8Array(Buffer.from(b.data, 'base64')), b.mime, timed(TIMEOUT.transcribe)), controller.signal, 1);
        send(res, 200, { text });
        return true;
      }

      send(res, 404, { error: 'Ruta no encontrada' });
      return true;
    } catch (e) {
      const status = (e as { status?: number }).status ?? (e instanceof z.ZodError ? 400 : 500);
      const msg = e instanceof z.ZodError ? 'Petición no válida' : controller.signal.aborted ? 'Petición cancelada o fuera de tiempo' : redact((e as Error).message, env);
      log(`[explorer] ${req.method} ${url.pathname} → ${status}: ${msg}`);
      if (!res.headersSent) send(res, status >= 400 && status < 600 ? status : 500, { error: msg });
      else res.end();
      return true;
    }
  };
}
