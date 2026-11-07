/** Sesiones del Explorador: memoria por proyecto, persistente, reanudable y borrable. */
import { create } from 'zustand';
import { getDB } from '../persistence/db';
import { newId } from '../core/model/factory';
import { emptyMemory, type ExplorerMemory, type KnowledgeSnippet, type PlanSummary, type Proposal } from './shared/schemas';
import { explorerClarify, explorerCopy, explorerProposal, explorerStatus, explorerTurn, type ExplorerStatus } from './client';
import { ACLARATOR_BLOCKS, clarifyMarkdown, emptyClarify, isBlockClear, type ClarifyKey, type ClarifyState, type CopyPackage } from './shared/modes';
import { listKnowledgeDocs, mergeSummaries, retrieve } from './knowledge';

export interface ExplorerMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  area?: string;
  why?: string;
  question?: string;
  command?: string | null;
  demo?: boolean;
  at: number;
}

export interface ExplorerSession {
  id: string;
  projectId: string;
  title: string;
  /** interview = Hazme preguntas · strategy = Te cuento mi plan · aclarator / copywriter = modos de trabajo */
  mode: 'interview' | 'strategy' | 'aclarator' | 'copywriter';
  inputs: { topic: string; objective: string; strategy: string; context: string };
  messages: ExplorerMessage[];
  memory: ExplorerMemory;
  stage: number;
  area: string;
  systemNature: string;
  readyForMap: boolean;
  knowledgeDocIds: string[];
  strategyText: string;
  proposal: Proposal | null;
  proposalSource: 'ai' | 'template' | null;
  insertedNodeIds: string[];
  /** ACLARATOR: bloque actual, valores y conversación por bloque */
  clarify?: ClarifyState;
  /** COPYWRITER: paquete de guiones */
  copy?: CopyPackage | null;
  copySource?: 'ai' | 'template' | null;
  createdAt: number;
  updatedAt: number;
}

export interface SentInfo { snippets: KnowledgeSnippet[]; plan: PlanSummary | null; messages: number; provider: string }

interface State {
  status: ExplorerStatus | null;
  sessions: ExplorerSession[];
  current: ExplorerSession | null;
  busy: null | 'turn' | 'proposal' | 'transcribe' | 'document' | 'clarify' | 'copy';
  partial: string;
  error: string | null;
  lastSent: SentInfo | null;
  controller: AbortController | null;
  set: (p: Partial<State>) => void;
}

export const useExplorer = create<State>((set) => ({
  status: null, sessions: [], current: null, busy: null, partial: '', error: null, lastSent: null, controller: null,
  set: (p) => set(p),
}));

const st = () => useExplorer.getState();

export async function refreshStatus() {
  useExplorer.setState({ status: await explorerStatus(true) });
}

export async function loadSessions(projectId: string) {
  const rows = await getDB().explorerSessions.where('projectId').equals(projectId).toArray();
  const sessions = rows.map((r) => r.state as ExplorerSession).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
  useExplorer.setState({ sessions, current: st().current?.projectId === projectId ? st().current : null });
}

async function persist(s: ExplorerSession) {
  const next = { ...s, updatedAt: Date.now() };
  await getDB().explorerSessions.put({ id: next.id, projectId: next.projectId, title: next.title, createdAt: next.createdAt, updatedAt: next.updatedAt, state: next });
  useExplorer.setState((x) => ({ current: x.current?.id === next.id ? next : x.current, sessions: [next, ...x.sessions.filter((y) => y.id !== next.id)] }));
  return next;
}

export function update(patch: Partial<ExplorerSession>) {
  const cur = st().current;
  if (!cur) return;
  void persist({ ...cur, ...patch });
}

export async function newSession(projectId: string, mode: ExplorerSession['mode'], inputs: ExplorerSession['inputs'], knowledgeDocIds: string[] = []): Promise<ExplorerSession> {
  const t = Date.now();
  const s: ExplorerSession = {
    id: newId('xs'), projectId, title: inputs.topic.slice(0, 60) || 'Exploración', mode, inputs, messages: [], memory: emptyMemory(), stage: 0, area: 'framing',
    systemNature: '', readyForMap: false, knowledgeDocIds, strategyText: '', proposal: null, proposalSource: null, insertedNodeIds: [], createdAt: t, updatedAt: t,
    ...(mode === 'aclarator' ? { clarify: emptyClarify(inputs.context) } : {}),
    ...(mode === 'copywriter' ? { copy: null, copySource: null } : {}),
  };
  useExplorer.setState({ current: s });
  return persist(s);
}

export async function deleteSession(id: string) {
  await getDB().explorerSessions.delete(id);
  useExplorer.setState((x) => ({ sessions: x.sessions.filter((s) => s.id !== id), current: x.current?.id === id ? null : x.current }));
}

export function cancel() {
  st().controller?.abort();
  useExplorer.setState({ busy: null, partial: '', controller: null });
}

async function context(s: ExplorerSession, query: string) {
  const docs = (await listKnowledgeDocs(s.projectId)).filter((d) => s.knowledgeDocIds.includes(d.id));
  const snippets = await retrieve(s.projectId, s.knowledgeDocIds, query, 4);
  return { snippets, plan: mergeSummaries(docs) };
}

/** Envía la respuesta del usuario (o un comando) y obtiene la siguiente pregunta. */
export async function sendTurn(text: string, command: string | null = null) {
  let s = st().current;
  if (!s || st().busy) return;
  const userMsg: ExplorerMessage | null = text.trim() || command ? { id: newId('m'), role: 'user', content: text.trim() || COMMAND_TEXT[command ?? ''] || '', command, at: Date.now() } : null;
  if (userMsg) s = await persist({ ...s, messages: [...s.messages, userMsg] });
  const controller = new AbortController();
  useExplorer.setState({ busy: 'turn', partial: '', error: null, controller });
  try {
    const lastQ = [...s.messages].reverse().find((m) => m.role === 'assistant')?.question ?? '';
    const { snippets, plan } = await context(s, `${s.inputs.topic} ${s.inputs.objective} ${lastQ} ${text}`);
    const messages = s.messages.slice(-24).map((m) => ({ role: m.role, content: m.content }));
    const status = st().status ?? (await explorerStatus());
    useExplorer.setState({ lastSent: { snippets, plan, messages: messages.length, provider: status.configured ? `${status.label} · ${status.model ?? ''}` : 'Modo demostración (nada sale del navegador)' } });
    const res = await explorerTurn({ inputs: s.inputs, messages, memory: s.memory, command, knowledge: snippets, plan }, { signal: controller.signal, onPartial: (p) => useExplorer.setState({ partial: p }) });
    const a: ExplorerMessage = { id: newId('m'), role: 'assistant', content: res.turn.message, area: res.turn.area, why: res.turn.why, question: res.turn.question, demo: res.demo, at: Date.now() };
    await persist({ ...st().current!, messages: [...st().current!.messages, a], memory: res.turn.memory, stage: res.turn.stage, area: res.turn.area, systemNature: res.turn.systemNature, readyForMap: res.turn.readyForMap });
  } catch (e) {
    if (!controller.signal.aborted) useExplorer.setState({ error: (e as Error).message });
  } finally {
    useExplorer.setState({ busy: null, partial: '', controller: null });
  }
}

export async function generateProposal(forceTemplate = false) {
  const s = st().current;
  if (!s || st().busy) return;
  const controller = new AbortController();
  useExplorer.setState({ busy: 'proposal', error: null, controller });
  try {
    const { snippets, plan } = await context(s, `${s.inputs.topic} ${s.inputs.objective} ${s.inputs.strategy} ${s.strategyText.slice(0, 500)}`);
    const res = await explorerProposal({
      inputs: s.inputs, messages: s.messages.map((m) => ({ role: m.role, content: m.content })).slice(-60), memory: s.memory,
      knowledge: snippets, plan, freeText: s.strategyText, mode: s.mode === 'strategy' ? 'strategy' : 'interview',
    }, { signal: controller.signal, forceTemplate });
    await persist({ ...st().current!, proposal: res.proposal, proposalSource: res.source });
  } catch (e) {
    if (!controller.signal.aborted) useExplorer.setState({ error: (e as Error).message });
  } finally {
    useExplorer.setState({ busy: null, controller: null });
  }
}

export const COMMAND_TEXT: Record<string, string> = {
  dont_know: 'No lo sé', examples: 'Dame ejemplos', deepen: 'Profundiza', challenge: 'Cuestiona mi planteamiento', alternatives: 'Busca alternativas',
  simplify: 'Simplifica', perspective: 'Cambia de perspectiva', compare: 'Compara opciones', prepare: 'Prepara el flujo', back: 'Volver a una pregunta anterior',
};

/* ------------------------------------------------------------------ */
/* ACLARATOR: un bloque cada vez                                       */
/* ------------------------------------------------------------------ */

const blockKey = (c: ClarifyState): ClarifyKey => ACLARATOR_BLOCKS[Math.min(c.index, 9)].key;

/** Pide al Aclarator el siguiente mensaje del bloque actual (abrir, responder, ejemplo o concretar). */
export async function clarifyTurn(command: 'open' | 'answer' | 'example' | 'concretize', userText = '') {
  let s = st().current;
  if (!s?.clarify || st().busy || s.clarify.index > 9) return;
  const c = s.clarify;
  const key = blockKey(c);
  const cur = c.values[key] ?? { interno: '', externo: '', validated: false };
  const text = userText.trim();
  if (text) s = await persist({ ...s, clarify: { ...c, messages: [...c.messages, { role: 'user', content: text, block: key, at: Date.now() }] } });
  const controller = new AbortController();
  useExplorer.setState({ busy: 'clarify', error: null, controller });
  try {
    const cl = s.clarify!;
    const validated = ACLARATOR_BLOCKS.slice(0, cl.index).map((b) => ({ key: b.key, interno: cl.values[b.key]?.interno ?? '', externo: cl.values[b.key]?.externo ?? '' }));
    const messages = cl.messages.filter((m) => m.block === key).slice(-20).map((m) => ({ role: m.role, content: m.content }));
    const { turn, demo } = await explorerClarify({ topic: s.inputs.topic, dump: cl.dump, index: cl.index, validated, current: { interno: cur.interno, externo: cur.externo }, messages, userText: text, command }, controller.signal);
    const now = st().current!;
    const nc = now.clarify!;
    const prev = nc.values[key] ?? cur;
    // el Aclarator propone el borrador; si viene vacío se respeta lo que ya había
    const next = { interno: turn.interno.trim() || prev.interno, externo: turn.externo.trim() || prev.externo, validated: false };
    await persist({ ...now, clarify: { ...nc, values: { ...nc.values, [key]: next }, messages: [...nc.messages, { role: 'assistant', content: turn.message, block: key, demo, at: Date.now() }] } });
  } catch (e) {
    if (!controller.signal.aborted) useExplorer.setState({ error: (e as Error).message });
  } finally {
    useExplorer.setState({ busy: null, controller: null });
  }
}

/** Edición directa de una capa del bloque actual. */
export function clarifyEdit(field: 'interno' | 'externo', value: string) {
  const s = st().current;
  if (!s?.clarify || s.clarify.index > 9) return;
  const key = blockKey(s.clarify);
  const cur = s.clarify.values[key] ?? { interno: '', externo: '', validated: false };
  update({ clarify: { ...s.clarify, values: { ...s.clarify.values, [key]: { ...cur, [field]: value, validated: false } } } });
}

/** Valida el bloque actual y abre el siguiente. Solo si está claro (regla de oro). */
export async function clarifyValidate(): Promise<boolean> {
  const s = st().current;
  if (!s?.clarify || s.clarify.index > 9) return false;
  const key = blockKey(s.clarify);
  const v = s.clarify.values[key];
  if (!isBlockClear(v)) return false;
  const index = s.clarify.index + 1;
  await persist({ ...s, clarify: { ...s.clarify, index, values: { ...s.clarify.values, [key]: { ...v!, validated: true } } } });
  if (index <= 9) await clarifyTurn('open');
  return true;
}

/** Vuelve al bloque anterior (deja de estar validado). */
export function clarifyBack() {
  const s = st().current;
  if (!s?.clarify || s.clarify.index === 0) return;
  const index = Math.min(s.clarify.index, 10) - 1;
  const key = ACLARATOR_BLOCKS[index].key;
  const v = s.clarify.values[key];
  update({ clarify: { ...s.clarify, index, values: v ? { ...s.clarify.values, [key]: { ...v, validated: false } } : s.clarify.values } });
}

export const clarifyText = (s: ExplorerSession) => (s.clarify ? clarifyMarkdown(s.inputs.topic, s.clarify) : '');

/* ------------------------------------------------------------------ */
/* COPYWRITER                                                          */
/* ------------------------------------------------------------------ */

/** Último ACLARATOR terminado de este mapa (para usarlo como briefing). */
export function latestClarified(): ExplorerSession | null {
  return st().sessions.find((x) => x.mode === 'aclarator' && (x.clarify?.index ?? 0) > 9) ?? null;
}

export async function generateCopy(opts: { forceTemplate?: boolean; briefing?: string } = {}) {
  const s = st().current;
  if (!s || st().busy) return;
  const controller = new AbortController();
  useExplorer.setState({ busy: 'copy', error: null, controller });
  try {
    const { pkg, source } = await explorerCopy({ topic: s.inputs.topic, audience: s.inputs.strategy, message: s.inputs.objective, notes: s.inputs.context, briefing: opts.briefing ?? '' }, { signal: controller.signal, forceTemplate: opts.forceTemplate });
    await persist({ ...st().current!, copy: pkg, copySource: source });
  } catch (e) {
    if (!controller.signal.aborted) useExplorer.setState({ error: (e as Error).message });
  } finally {
    useExplorer.setState({ busy: null, controller: null });
  }
}
