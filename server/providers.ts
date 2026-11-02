/**
 * Capa de proveedores de IA del Explorador (solo servidor: las claves nunca
 * llegan al navegador). Cambiar de proveedor o de modelo no requiere tocar la
 * interfaz: se configura con variables de entorno.
 *
 *   EXPLORER_PROVIDER = gemini | openai | anthropic | demo   (auto si se omite)
 *   EXPLORER_API_KEY  = clave genérica (o GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY)
 *   EXPLORER_MODEL    = modelo (o GEMINI_MODEL / OPENAI_MODEL / ANTHROPIC_MODEL); si falta se descubre
 *   EXPLORER_BASE_URL = URL base compatible con OpenAI (OpenAI, Mistral, Groq, OpenRouter, Ollama, LM Studio…)
 *   EXPLORER_TRANSCRIBE_MODEL = modelo de transcripción para APIs compatibles con OpenAI (p.ej. whisper-1)
 */
import { GoogleGenAI, createPartFromUri } from '@google/genai';

export type Env = Record<string, string | undefined>;
export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export interface GenerateOptions {
  system: string;
  prompt: string;
  history?: ChatTurn[];
  jsonSchema?: object;
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
  temperature?: number;
}
export interface Provider {
  id: 'gemini' | 'openai' | 'anthropic';
  label: string;
  model: () => Promise<string>;
  supportsAudio: boolean;
  generate: (o: GenerateOptions) => Promise<string>;
  transcribe?: (data: Uint8Array, mime: string, signal?: AbortSignal) => Promise<string>;
}

export class ProviderError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status = 500, retryable = false) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

const TRANSCRIBE_PROMPT = 'Transcribe literalmente este audio en el idioma hablado (normalmente español). Devuelve solo la transcripción, sin comentarios. Si hay partes inaudibles escribe [inaudible].';

/** Oculta claves en mensajes de error / registros. */
export function redact(text: string, env: Env): string {
  let out = text;
  for (const k of ['EXPLORER_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
    const v = env[k];
    if (v && v.length > 6) out = out.split(v).join('***');
  }
  return out.replace(/(key=)[\w-]{10,}/gi, '$1***');
}

export async function withRetry<T>(fn: () => Promise<T>, signal?: AbortSignal, retries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (signal?.aborted) throw e;
      const status = (e as { status?: number }).status ?? 0;
      const retryable = (e as ProviderError).retryable || [429, 500, 502, 503, 504].includes(status) || /fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(String((e as Error).message));
      if (!retryable || i === retries) break;
      await new Promise((r) => setTimeout(r, 800 * Math.pow(3, i)));
    }
  }
  throw last;
}

/* ---------------- Gemini (SDK oficial @google/genai) ---------------- */

function geminiProvider(env: Env, apiKey: string): Provider {
  const ai = new GoogleGenAI({ apiKey });
  let resolved: string | null = env.EXPLORER_MODEL || env.GEMINI_MODEL || null;
  const model = async () => {
    if (resolved) return resolved;
    // Descubrir el modelo vigente en lugar de fijar identificadores que quedan obsoletos
    try {
      const names: string[] = [];
      const pager = await ai.models.list();
      for await (const m of pager) {
        const n = (m.name ?? '').replace(/^models\//, '');
        if ((m.supportedActions ?? ['generateContent']).includes('generateContent') && /^gemini-/.test(n)) names.push(n);
      }
      const score = (n: string) => {
        const v = Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
        const penalty = /lite|image|tts|live|audio|embedding|exp|preview|thinking|vision|8b/.test(n) ? 100 : 0;
        return v * 10 + (/flash/.test(n) ? 2 : /pro/.test(n) ? 1 : 0) - penalty + (/latest/.test(n) ? 0.5 : 0);
      };
      names.sort((a, b) => score(b) - score(a));
      resolved = names[0] ?? 'gemini-2.5-flash';
    } catch {
      resolved = 'gemini-2.5-flash';
    }
    return resolved;
  };
  return {
    id: 'gemini',
    label: 'Google Gemini',
    model,
    supportsAudio: true,
    async generate(o) {
      const m = await model();
      const contents = [
        ...(o.history ?? []).map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: o.prompt }] },
      ];
      try {
        const stream = await ai.models.generateContentStream({
          model: m,
          contents,
          config: {
            systemInstruction: o.system,
            temperature: o.temperature ?? 0.6,
            ...(o.jsonSchema ? { responseMimeType: 'application/json', responseJsonSchema: o.jsonSchema } : {}),
            abortSignal: o.signal,
          },
        });
        let out = '';
        for await (const chunk of stream) {
          const t = chunk.text;
          if (t) { out += t; o.onDelta?.(t); }
        }
        if (!out.trim()) throw new ProviderError('Gemini devolvió una respuesta vacía', 502, true);
        return out;
      } catch (e) {
        if (e instanceof ProviderError) throw e;
        const status = Number((e as { status?: number }).status ?? (String((e as Error).message).match(/"code":\s*(\d{3})/)?.[1] ?? 500));
        throw new ProviderError(`Gemini: ${(e as Error).message}`, status, [429, 500, 502, 503, 504].includes(status));
      }
    },
    async transcribe(data, mime, signal) {
      const m = await model();
      let part: { inlineData: { mimeType: string; data: string } } | ReturnType<typeof createPartFromUri>;
      if (data.byteLength < 18 * 1024 * 1024) {
        part = { inlineData: { mimeType: mime, data: Buffer.from(data).toString('base64') } };
      } else {
        const file = await ai.files.upload({ file: new Blob([data as BlobPart], { type: mime }), config: { mimeType: mime } });
        part = createPartFromUri(file.uri!, file.mimeType ?? mime);
      }
      const res = await ai.models.generateContent({ model: m, contents: [{ role: 'user', parts: [part, { text: TRANSCRIBE_PROMPT }] }], config: { abortSignal: signal, temperature: 0 } });
      return (res.text ?? '').trim();
    },
  };
}

/* ---------------- APIs compatibles con OpenAI ---------------- */

async function* sseLines(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
}

function openaiProvider(env: Env, apiKey: string): Provider {
  const base = (env.EXPLORER_BASE_URL || env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  let resolved: string | null = env.EXPLORER_MODEL || env.OPENAI_MODEL || null;
  const headers = { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) };
  const model = async () => {
    if (resolved) return resolved;
    try {
      const r = await fetch(`${base}/models`, { headers });
      const j = (await r.json()) as { data?: { id: string }[] };
      const ids = (j.data ?? []).map((m) => m.id).filter((id) => !/embed|whisper|tts|audio|image|dall|moderation|realtime|transcribe/.test(id));
      resolved = ids.find((id) => /gpt|mistral|llama|qwen|deepseek|gemma|claude|sonnet/i.test(id)) ?? ids[0] ?? 'gpt-4o-mini';
    } catch {
      resolved = 'gpt-4o-mini';
    }
    return resolved;
  };
  return {
    id: 'openai',
    label: base.includes('api.openai.com') ? 'OpenAI' : `API compatible con OpenAI (${new URL(base).host})`,
    model,
    supportsAudio: true,
    async generate(o) {
      const m = await model();
      const messages = [{ role: 'system', content: o.system }, ...(o.history ?? []), { role: 'user', content: o.prompt }];
      const formats: (object | undefined)[] = o.jsonSchema
        ? [{ type: 'json_schema', json_schema: { name: 'respuesta', schema: o.jsonSchema, strict: false } }, { type: 'json_object' }, undefined]
        : [undefined];
      let lastErr: ProviderError | null = null;
      for (const response_format of formats) {
        const res = await fetch(`${base}/chat/completions`, {
          method: 'POST', headers, signal: o.signal,
          body: JSON.stringify({ model: m, messages, temperature: o.temperature ?? 0.6, stream: true, ...(response_format ? { response_format } : {}) }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          lastErr = new ProviderError(`${res.status} ${body.slice(0, 300)}`, res.status, [429, 500, 502, 503, 504].includes(res.status));
          if (res.status === 400 && response_format) continue; // formato no admitido: probar el siguiente
          throw lastErr;
        }
        let out = '';
        for await (const data of sseLines(res)) {
          if (data === '[DONE]') break;
          try {
            const t = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
            if (t) { out += t; o.onDelta?.(t); }
          } catch { /* línea parcial */ }
        }
        if (!out.trim()) throw new ProviderError('Respuesta vacía del proveedor', 502, true);
        return out;
      }
      throw lastErr ?? new ProviderError('El proveedor rechazó la petición', 400);
    },
    async transcribe(data, mime, signal) {
      const form = new FormData();
      const ext = mime.includes('wav') ? 'wav' : mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : mime.includes('ogg') ? 'ogg' : 'webm';
      form.append('file', new Blob([data as BlobPart], { type: mime }), `audio.${ext}`);
      form.append('model', env.EXPLORER_TRANSCRIBE_MODEL || 'whisper-1');
      form.append('language', 'es');
      const res = await fetch(`${base}/audio/transcriptions`, { method: 'POST', headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {}, body: form, signal });
      if (!res.ok) throw new ProviderError(`Transcripción: ${res.status} ${(await res.text()).slice(0, 200)}`, res.status, res.status >= 500 || res.status === 429);
      const j = (await res.json()) as { text?: string };
      return (j.text ?? '').trim();
    },
  };
}

/* ---------------- Anthropic ---------------- */

function anthropicProvider(env: Env, apiKey: string): Provider {
  const base = (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const headers = { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
  let resolved: string | null = env.EXPLORER_MODEL || env.ANTHROPIC_MODEL || null;
  const model = async () => {
    if (resolved) return resolved;
    try {
      const r = await fetch(`${base}/v1/models`, { headers });
      const j = (await r.json()) as { data?: { id: string }[] };
      const ids = (j.data ?? []).map((m) => m.id);
      resolved = ids.find((id) => /sonnet/.test(id)) ?? ids[0] ?? 'claude-sonnet-5-5';
    } catch {
      resolved = 'claude-sonnet-5-5';
    }
    return resolved;
  };
  return {
    id: 'anthropic',
    label: 'Anthropic Claude',
    model,
    supportsAudio: false,
    async generate(o) {
      const m = await model();
      const system = o.jsonSchema ? `${o.system}\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla este esquema (sin texto adicional):\n${JSON.stringify(o.jsonSchema)}` : o.system;
      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST', headers, signal: o.signal,
        body: JSON.stringify({ model: m, max_tokens: 8000, system, temperature: o.temperature ?? 0.6, stream: true, messages: [...(o.history ?? []), { role: 'user', content: o.prompt }] }),
      });
      if (!res.ok) throw new ProviderError(`Anthropic: ${res.status} ${(await res.text()).slice(0, 300)}`, res.status, [429, 500, 502, 503, 504, 529].includes(res.status));
      let out = '';
      for await (const data of sseLines(res)) {
        try {
          const ev = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
          if (ev.type === 'content_block_delta' && ev.delta?.text) { out += ev.delta.text; o.onDelta?.(ev.delta.text); }
        } catch { /* */ }
      }
      if (!out.trim()) throw new ProviderError('Respuesta vacía de Anthropic', 502, true);
      return out;
    },
  };
}

/* ---------------- selección ---------------- */

export interface ProviderConfig { provider: Provider | null; name: string; configured: boolean; reason: string }

export function resolveProvider(env: Env): ProviderConfig {
  const choice = (env.EXPLORER_PROVIDER || '').toLowerCase();
  const generic = env.EXPLORER_API_KEY;
  const gemKey = generic && (choice === 'gemini' || !choice) ? generic : env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  const oaKey = generic && choice === 'openai' ? generic : env.OPENAI_API_KEY;
  const anKey = generic && choice === 'anthropic' ? generic : env.ANTHROPIC_API_KEY;
  if (choice === 'demo') return { provider: null, name: 'demo', configured: false, reason: 'EXPLORER_PROVIDER=demo' };
  if ((choice === 'gemini' || !choice) && gemKey) return { provider: geminiProvider(env, gemKey), name: 'gemini', configured: true, reason: '' };
  if ((choice === 'openai' || !choice) && (oaKey || (choice === 'openai' && env.EXPLORER_BASE_URL))) return { provider: openaiProvider(env, oaKey ?? ''), name: 'openai', configured: true, reason: '' };
  if ((choice === 'anthropic' || !choice) && anKey) return { provider: anthropicProvider(env, anKey), name: 'anthropic', configured: true, reason: '' };
  return { provider: null, name: choice || 'none', configured: false, reason: choice ? `Falta la clave para el proveedor «${choice}»` : 'No hay ninguna clave configurada' };
}
