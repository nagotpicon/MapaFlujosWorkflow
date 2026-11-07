/**
 * Servicio del Explorador en el cliente. Los componentes visuales nunca llaman
 * a la IA directamente: pasan por aquí, que habla con el servidor propio (que
 * guarda la clave). Sin proveedor, se usa el modo demostración local.
 */
import { demoTurn } from './shared/demo';
import { templateProposal } from './shared/templates';
import {
  ExplorerTurnSchema, PlanSummarySchema, ProposalSchema, type ExplorerTurn, type PlanSummary, type Proposal, type ProposalRequest, type TurnRequest,
} from './shared/schemas';
import { heuristicPlanSummary } from './shared/retrieval';
import {
  ClarifyTurnSchema, CopyPackageSchema, demoClarify, templateCopy, type ClarifyRequest, type ClarifyTurn, type CopyPackage, type CopyRequest,
} from './shared/modes';

export interface ExplorerStatus {
  reachable: boolean;
  configured: boolean;
  provider: string;
  label: string | null;
  model: string | null;
  supportsAudio: boolean;
  reason: string;
}

let cached: { at: number; st: ExplorerStatus } | null = null;

export async function explorerStatus(force = false): Promise<ExplorerStatus> {
  if (!force && cached && Date.now() - cached.at < 30_000) return cached.st;
  try {
    const r = await fetch('/api/explorer/status', { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const st: ExplorerStatus = { reachable: true, configured: !!j.configured, provider: j.provider, label: j.label, model: j.model, supportsAudio: !!j.supportsAudio, reason: j.reason ?? '' };
    cached = { at: Date.now(), st };
    return st;
  } catch {
    const st: ExplorerStatus = { reachable: false, configured: false, provider: 'none', label: null, model: null, supportsAudio: false, reason: 'No se encuentra el servidor del Explorador (¿app servida como archivos estáticos?)' };
    cached = { at: Date.now(), st };
    return st;
  }
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal, timeoutMs = 120_000): Promise<T> {
  const s = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: s });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Error ${r.status}`);
  return j as T;
}

/** Extrae el texto de "message" de un JSON parcial en streaming. */
export function partialMessage(raw: string): string {
  const i = raw.indexOf('"message"');
  if (i < 0) return '';
  const start = raw.indexOf('"', raw.indexOf(':', i) + 1);
  if (start < 0) return '';
  let out = '';
  for (let k = start + 1; k < raw.length; k++) {
    const c = raw[k];
    if (c === '\\') {
      const n = raw[k + 1];
      if (n === undefined) break;
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'u' ? String.fromCharCode(parseInt(raw.slice(k + 2, k + 6), 16) || 32) : n;
      k += n === 'u' ? 5 : 1;
      continue;
    }
    if (c === '"') break;
    out += c;
  }
  return out;
}

export interface TurnResult { turn: ExplorerTurn; demo: boolean; model: string | null }

/** Un turno de entrevista. onPartial recibe el texto del mensaje mientras llega. */
export async function explorerTurn(req: TurnRequest, opts: { signal?: AbortSignal; onPartial?: (text: string) => void; forceDemo?: boolean } = {}): Promise<TurnResult> {
  const st = await explorerStatus();
  if (opts.forceDemo || !st.configured) {
    await new Promise((r) => setTimeout(r, 350));
    return { turn: ExplorerTurnSchema.parse(demoTurn(req)), demo: true, model: null };
  }
  const s = opts.signal ? AbortSignal.any([opts.signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000);
  const r = await fetch('/api/explorer/turn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req), signal: s });
  if (!r.ok || !r.body) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? `Error ${r.status}`);
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let raw = '';
  let result: TurnResult | null = null;
  let error: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = block.match(/^event: (.+)$/m)?.[1];
      const data = block.match(/^data: (.*)$/m)?.[1];
      if (!ev || data == null) continue;
      const parsed = JSON.parse(data);
      if (ev === 'delta') { raw += parsed; opts.onPartial?.(partialMessage(raw)); }
      if (ev === 'result') {
        // validación también en el cliente antes de tocar el estado
        result = { turn: ExplorerTurnSchema.parse(parsed.turn), demo: false, model: parsed.model ?? st.model };
      }
      if (ev === 'error') error = parsed.error;
    }
  }
  if (error) throw new Error(error);
  if (!result) throw new Error('La respuesta se interrumpió');
  return result;
}

export interface ProposalResult { proposal: Proposal; source: 'ai' | 'template'; model: string | null }

export async function explorerProposal(req: ProposalRequest, opts: { signal?: AbortSignal; forceTemplate?: boolean } = {}): Promise<ProposalResult> {
  const st = await explorerStatus();
  if (opts.forceTemplate || !st.configured) {
    const answers = req.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    return { proposal: ProposalSchema.parse(templateProposal({ ...req.inputs, freeText: `${req.freeText}\n${answers}` })), source: 'template', model: null };
  }
  const j = await postJson<{ proposal: unknown; model: string }>('/api/explorer/proposal', req, opts.signal, 200_000);
  return { proposal: ProposalSchema.parse(j.proposal), source: 'ai', model: j.model };
}

/** Un turno del ACLARATOR (con IA del servidor o con el guion local). */
export async function explorerClarify(req: ClarifyRequest, signal?: AbortSignal): Promise<{ turn: ClarifyTurn; demo: boolean }> {
  const st = await explorerStatus();
  if (!st.configured) {
    await new Promise((r) => setTimeout(r, 200));
    return { turn: ClarifyTurnSchema.parse(demoClarify(req)), demo: true };
  }
  const j = await postJson<{ turn: unknown }>('/api/explorer/clarify', req, signal, 120_000);
  return { turn: ClarifyTurnSchema.parse(j.turn), demo: false };
}

/** Paquete del COPYWRITER. Sin IA (o si se pide) devuelve un esqueleto marcado como tal. */
export async function explorerCopy(req: CopyRequest, opts: { signal?: AbortSignal; forceTemplate?: boolean } = {}): Promise<{ pkg: CopyPackage; source: 'ai' | 'template' }> {
  const st = await explorerStatus();
  if (opts.forceTemplate || !st.configured) return { pkg: CopyPackageSchema.parse(templateCopy(req)), source: 'template' };
  const j = await postJson<{ pkg: unknown }>('/api/explorer/copy', req, opts.signal, 200_000);
  return { pkg: CopyPackageSchema.parse(j.pkg), source: 'ai' };
}

export async function summarizePlan(name: string, text: string, signal?: AbortSignal): Promise<{ summary: PlanSummary; source: 'ai' | 'heuristic' }> {
  const st = await explorerStatus();
  if (!st.configured) return { summary: heuristicPlanSummary(text), source: 'heuristic' };
  try {
    const j = await postJson<{ summary: unknown }>('/api/explorer/plan-summary', { name, text }, signal, 200_000);
    return { summary: PlanSummarySchema.parse(j.summary), source: 'ai' };
  } catch {
    return { summary: heuristicPlanSummary(text), source: 'heuristic' };
  }
}

export async function polishVerdict(markdown: string): Promise<string> {
  const j = await postJson<{ text: string }>('/api/explorer/polish', { markdown }, undefined, 70_000);
  return j.text;
}

export async function fileToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

const LOCAL_TEXT = /\.(txt|md|markdown|csv|tsv|json)$/i;

/** Extrae texto de un documento: localmente si es texto, en el servidor si es Word/Excel/PDF. */
export async function extractDocument(file: File): Promise<{ text: string; kind: string }> {
  if (LOCAL_TEXT.test(file.name) || file.type.startsWith('text/')) return { text: await file.text(), kind: 'Texto' };
  const data = await fileToBase64(file);
  try {
    return await postJson<{ text: string; kind: string }>('/api/documents/extract', { name: file.name, mime: file.type, data }, undefined, 120_000);
  } catch (e) {
    throw new Error(`No se pudo leer «${file.name}»: ${(e as Error).message}. Los .docx, .xlsx y .pdf necesitan el servidor de la aplicación (npm run dev / npm start).`);
  }
}

export async function transcribeAudio(blob: Blob, signal?: AbortSignal): Promise<string> {
  const data = await fileToBase64(blob);
  const j = await postJson<{ text: string }>('/api/explorer/transcribe', { mime: blob.type || 'audio/webm', data }, signal, 320_000);
  return j.text;
}
