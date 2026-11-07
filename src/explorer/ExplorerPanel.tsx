/**
 * EXPLORADOR DE FLUJOS — «Descubre lo que necesitas pensar antes de empezar».
 * Entrevista adaptativa + creador de estrategias + plan maestro + vista previa
 * de la propuesta antes de insertarla como elementos nativos del mapa.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, CircleHelp, Eye, FileUp, Lightbulb, Loader2, Map as MapIcon, Mic, MicOff, Plus, RotateCcw, Send, Sparkles, Square, Trash2,
  TriangleAlert, Wand2, X, Check, Info, Waypoints,
} from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import * as A from '../app/actions';
import { levelOf, setLevel } from '../app/levels';
import { Badge, Button, ConfirmDeleteButton, Field, IconButton, Segmented, TextArea, TextInput, cx } from '../ui/primitives';
import { AREA_LABEL, STAGE_LABEL, type Proposal } from './shared/schemas';
import { DOMAIN_LABEL, detectDomain } from './shared/templates';
import { COMMAND_TEXT, cancel, deleteSession, generateProposal, loadSessions, newSession, refreshStatus, sendTurn, update, useExplorer, type ExplorerSession } from './session';
import { addKnowledgeDoc, deleteKnowledgeDoc, docText, listKnowledgeDocs, setDocSummary } from './knowledge';
import { extractDocument, summarizePlan, transcribeAudio } from './client';
import { browserDictationAvailable, splitAudioFile, startBrowserDictation, startSegmentedRecording, type SegmentRecorder } from './audio';
import { insertProposal } from './insert';
import { AclaratorView, CopywriterView } from './WorkModes';
import type { KnowledgeDocRow } from '../persistence/db';
import * as op from '../core/operations';
import { pickFile } from '../app/io';

const COMMANDS = ['dont_know', 'examples', 'deepen', 'challenge', 'alternatives', 'simplify', 'perspective', 'compare', 'prepare', 'back'] as const;
const EVIDENCE_LABEL: Record<string, string> = { confirmed: 'confirmado', observed: 'observado', estimate: 'estimación', hypothesis: 'hipótesis', preference: 'preferencia', unknown: 'desconocido' };

export function ExplorerPanel() {
  const doc = useProject((s) => s.doc)!;
  const current = useExplorer((s) => s.current);
  const status = useExplorer((s) => s.status);
  useEffect(() => { void refreshStatus(); void loadSessions(doc.project.id); }, [doc.project.id]);
  return (
    <div className="flex h-full bg-bg" data-testid="explorer">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {status && !status.configured && <DemoBanner />}
        {!current ? <StartView /> : current.mode === 'aclarator' && current.clarify ? <AclaratorView s={current} /> : current.mode === 'copywriter' ? <CopywriterView s={current} /> : current.proposal ? <ProposalView s={current} /> : current.mode === 'strategy' && current.messages.length === 0 ? <StrategyView s={current} /> : <ConversationView s={current} />}
      </div>
    </div>
  );
}

function DemoBanner() {
  const status = useExplorer((s) => s.status)!;
  return (
    <div className="flex items-start gap-2 border-b border-[color-mix(in_srgb,var(--condition)_35%,transparent)] bg-[color-mix(in_srgb,var(--condition)_9%,transparent)] px-5 py-2 text-[12px] text-ink-2" data-testid="demo-banner">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-cond" />
      <div>
        <b className="text-ink">Modo demostración: no hay IA conectada.</b> Las preguntas salen de un guion y las propuestas de plantillas; nada sale de tu navegador. {status.reason && <span className="text-ink-3">({status.reason})</span>}
        <div className="mt-0.5 text-ink-3">Para que piense una IA de verdad, quien gestione la app tiene que ponerle una clave (por ejemplo <code className="rounded bg-surface-2 px-1">GEMINI_API_KEY</code>). Está explicado en el manual.</div>
      </div>
    </div>
  );
}

/* ---------------- barra lateral ---------------- */

function Sidebar() {
  const doc = useProject((s) => s.doc)!;
  const sessions = useExplorer((s) => s.sessions);
  const current = useExplorer((s) => s.current);
  const status = useExplorer((s) => s.status);
  const frictions = Object.values(doc.nodes).filter((n) => n.metadata.discovery && (n.metadata.discovery.role === 'friction' || n.metadata.discovery.frictionCategory));
  const pending = frictions.filter((n) => n.metadata.discovery?.resolution === 'pending');
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-auto border-r border-line bg-surface p-3">
      <div className="rounded-xl border border-line p-2.5 text-[11.5px]" data-testid="provider-status">
        <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><span className={cx('size-2 rounded-full', status?.configured ? 'bg-gain' : 'bg-cond')} />{status ? (status.configured ? status.label : 'Modo demostración') : 'Comprobando…'}</div>
        {status?.configured && <div className="text-ink-3">Modelo: <span className="font-mono text-[10.5px]">{status.model}</span></div>}
        <div className="mt-1 text-ink-3">{status?.configured ? 'Lo que envías al proveedor: tus respuestas, un resumen de la exploración y solo los fragmentos relevantes de tus documentos.' : 'Sin conexión a IA. Todo queda en tu navegador.'}</div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-3">Tus conversaciones
          <IconButton size="xs" label="Nueva exploración" onClick={() => useExplorer.setState({ current: null })}><Plus className="size-3.5" /></IconButton>
        </div>
        {sessions.length === 0 ? <p className="text-[11.5px] text-ink-3">Aún no hemos hablado de este mapa.</p> : (
          <ul className="space-y-0.5">
            {sessions.map((s) => (
              <li key={s.id} className={cx('group flex items-center gap-1 rounded-lg px-1.5 py-1', current?.id === s.id ? 'bg-accent-soft' : 'hover:bg-surface-2')}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => useExplorer.setState({ current: s })}>
                  <span className="block truncate text-[12.5px] text-ink">{s.title}</span>
                  <span className="block text-[10.5px] text-ink-3">{s.mode === 'aclarator' ? `Aclarator · ${(s.clarify?.index ?? 0) > 9 ? 'aclarado' : `paso ${(s.clarify?.index ?? 0) + 1}/10`}` : s.mode === 'copywriter' ? `Copywriter · ${s.copy ? 'guion listo' : 'sin guion'}` : `${s.mode === 'strategy' ? 'Tu plan' : 'Preguntas'} · ${s.messages.filter((m) => m.role === 'user').length} respuestas`}</span>
                </button>
                <ConfirmDeleteButton size="xs" label="Eliminar exploración y sus datos" confirmLabel="¿Borrar?" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onConfirm={() => void deleteSession(s.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <PlanDocs />
      {frictions.length > 0 && (
        <div data-testid="friction-resolution">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Fricciones por resolver · {pending.length}/{frictions.length}</div>
          <ul className="space-y-1">
            {frictions.slice(0, 12).map((n) => (
              <li key={n.id} className="rounded-lg border border-line p-1.5">
                <button type="button" className="block w-full truncate text-left text-[12px] text-ink hover:underline" onClick={() => { useUI.setState({ overlay: null }); useUI.getState().setSelection([n.id]); setTimeout(() => A.fit([n.id]), 80); }}>{n.title}</button>
                <div className="mt-1 flex items-center gap-1">
                  <Badge tone={n.metadata.discovery?.frictionCategory === 'personal' ? 'accent' : n.metadata.discovery?.frictionCategory === 'system' ? 'transform' : 'cond'}>{n.metadata.discovery?.frictionCategory === 'personal' ? 'propia' : n.metadata.discovery?.frictionCategory === 'system' ? 'sistema' : 'externa'}</Badge>
                  <select aria-label="Resolución" className="ml-auto h-5 rounded border border-line bg-surface text-[10.5px] text-ink-2" value={n.metadata.discovery?.resolution ?? 'pending'}
                    onChange={(e) => A.apply((d) => op.updateNode(d, n.id, { metadata: { ...d.nodes[n.id].metadata, discovery: { ...d.nodes[n.id].metadata.discovery!, resolution: e.target.value as never } } }))}>
                    <option value="pending">Pendiente</option><option value="eliminate">Eliminar</option><option value="accept">Convivir</option><option value="compensate">Compensar</option><option value="reroute">Otra ruta</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function PlanDocs() {
  const doc = useProject((s) => s.doc)!;
  const current = useExplorer((s) => s.current);
  const busy = useExplorer((s) => s.busy);
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [view, setView] = useState<KnowledgeDocRow | null>(null);
  const load = () => void listKnowledgeDocs(doc.project.id).then(setDocs);
  useEffect(load, [doc.project.id, busy]);
  const upload = async () => {
    const files = await pickFile('.docx,.xlsx,.pdf,.txt,.md,.csv,.json', true);
    for (const f of files) {
      useExplorer.setState({ busy: 'document', error: null });
      try {
        const { text } = await extractDocument(f);
        if (!text.trim()) throw new Error(`«${f.name}» no contiene texto legible`);
        const kd = await addKnowledgeDoc(doc.project.id, null, f.name, f.type, text, 'plan');
        const { summary, source } = await summarizePlan(f.name, text);
        await setDocSummary(kd.id, summary);
        if (current) update({ knowledgeDocIds: [...new Set([...current.knowledgeDocIds, kd.id])] });
        useUI.getState().notify(`Plan «${f.name}» cargado (${Math.round(text.length / 1000)}k caracteres; resumen ${source === 'ai' ? 'con IA' : 'heurístico'})`, 'success');
      } catch (e) {
        useExplorer.setState({ error: (e as Error).message });
      } finally {
        useExplorer.setState({ busy: null });
        load();
      }
    }
  };
  return (
    <div data-testid="plan-docs">
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-3">Tu plan (documentos)
        <IconButton size="xs" label="Añadir plan (Word, Excel, PDF, texto)" onClick={() => void upload()} data-testid="upload-plan">{busy === 'document' ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}</IconButton>
      </div>
      {docs.length === 0 ? <p className="text-[11.5px] text-ink-3">Sube tu plan (Word, Excel, PDF o texto) y lo usaré como guía.</p> : (
        <ul className="space-y-0.5">
          {docs.map((d) => {
            const on = !!current?.knowledgeDocIds.includes(d.id);
            return (
              <li key={d.id} className="group flex items-center gap-1 text-[12px]">
                <input type="checkbox" aria-label={`Usar ${d.name} en esta exploración`} disabled={!current} checked={on} onChange={() => current && update({ knowledgeDocIds: on ? current.knowledgeDocIds.filter((x) => x !== d.id) : [...current.knowledgeDocIds, d.id] })} />
                <BookOpen className="size-3.5 shrink-0 text-ink-3" />
                <button type="button" className="min-w-0 flex-1 truncate text-left text-ink hover:underline" onClick={() => setView(d)}>{d.name}</button>
                <IconButton size="xs" label="Eliminar documento" className="opacity-0 group-hover:opacity-100" onClick={async () => { await deleteKnowledgeDoc(d.id); load(); }}><Trash2 className="size-3" /></IconButton>
              </li>
            );
          })}
        </ul>
      )}
      {view && <DocViewer d={view} onClose={() => setView(null)} />}
    </div>
  );
}

function DocViewer({ d, onClose }: { d: KnowledgeDocRow; onClose: () => void }) {
  const [text, setText] = useState('');
  useEffect(() => { void docText(d.id).then(setText); }, [d.id]);
  const s = d.summary as Record<string, string[] | string> | null;
  return (
    <div className="fixed inset-y-6 left-[300px] z-[70] flex w-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float mdf-slide-r">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5"><BookOpen className="size-4 text-accent" /><span className="flex-1 truncate text-[13px] font-semibold">{d.name}</span><IconButton label="Cerrar" onClick={onClose}><X className="size-4" /></IconButton></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 text-[12.5px]">
        {s && (
          <div className="space-y-1.5 rounded-xl bg-surface-2 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Resumen como guía</div>
            {(['objectives', 'goals', 'deadlines', 'resources', 'constraints', 'kpis'] as const).map((k) => Array.isArray(s[k]) && (s[k] as string[]).length > 0 && (
              <div key={k}><b className="text-ink">{{ objectives: 'Objetivos', goals: 'Metas', deadlines: 'Plazos', resources: 'Recursos', constraints: 'Restricciones', kpis: 'Indicadores' }[k]}:</b> <span className="text-ink-2">{(s[k] as string[]).join(' · ')}</span></div>
            ))}
          </div>
        )}
        <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-ink-2">{text.slice(0, 60_000)}</pre>
      </div>
    </div>
  );
}

/* ---------------- inicio ---------------- */

type StartMode = 'interview' | 'strategy' | 'aclarator' | 'copywriter';
const MODE_CARDS: { value: StartMode; title: string; text: string; icon: React.ReactNode }[] = [
  { value: 'interview', title: 'Hazme preguntas', text: 'Una pregunta cada vez para descubrir qué quieres y qué te frena.', icon: <CircleHelp /> },
  { value: 'strategy', title: 'Te cuento mi plan', text: 'Suéltalo con texto, voz o documentos y lo convierto en un mapa.', icon: <Wand2 /> },
  { value: 'aclarator', title: 'Aclarator', text: 'Aclara lo esencial en doble capa (interno y externo), bloque a bloque, sin saltarse ninguno.', icon: <Lightbulb /> },
  { value: 'copywriter', title: 'Copywriter', text: 'Guion de voz para YouTube, reels y stories, con un reto que se pueda practicar.', icon: <Sparkles /> },
];

function StartView() {
  const doc = useProject((s) => s.doc)!;
  const [mode, setMode] = useState<StartMode>('interview');
  // si el mapa ya tiene una idea principal, se usa como punto de partida
  const [topic, setTopic] = useState(() => (['Mapa sin título', 'Exploración', 'Proyecto sin título'].includes(doc.project.name) ? '' : doc.project.name));
  const [objective, setObjective] = useState('');
  const [strategy, setStrategy] = useState('');
  const [context, setContext] = useState('');
  const start = async () => {
    if (!topic.trim()) return;
    const docs = await listKnowledgeDocs(doc.project.id);
    await newSession(doc.project.id, mode, { topic: topic.trim(), objective, strategy, context }, docs.map((d) => d.id));
    if (mode === 'interview') await sendTurn('');
  };
  const domain = topic.trim() && (mode === 'interview' || mode === 'strategy') ? detectDomain(`${topic} ${strategy}`) : null;
  const topicLabel = mode === 'aclarator' ? '¿Qué quieres aclarar?' : mode === 'copywriter' ? '¿De qué tema es el vídeo?' : '¿Sobre qué quieres pensar?';
  const topicPh = mode === 'aclarator' ? 'Ej.: mi canal de YouTube sobre autoconocimiento' : mode === 'copywriter' ? 'Ej.: por qué dormimos mal aunque nos acostemos pronto' : 'Ej.: dar clases de guitarra en mi barrio';
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto p-8">
      <div className="w-full max-w-3xl space-y-5 mdf-slide-b">
        <div>
          <h2 className="font-display text-[30px] font-medium tracking-tight text-ink">Vamos a pensarlo juntos</h2>
          <p className="text-[15px] text-ink-2">Elige cómo quieres trabajar. Todos los modos terminan en tu mapa.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Modo de trabajo" data-testid="work-modes">
          {MODE_CARDS.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)} data-testid={`mode-${m.value}`}
              className={cx('flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors [&_svg]:size-5', mode === m.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong')}>
              <span className={cx('mt-0.5', mode === m.value ? 'text-accent-text' : 'text-ink-3')}>{m.icon}</span>
              <span><span className="block font-display text-[16px] font-semibold text-ink">{m.title}</span><span className="block text-[12.5px] leading-snug text-ink-3">{m.text}</span></span>
            </button>
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <Field label={topicLabel}><TextInput value={topic} onChange={setTopic} placeholder={topicPh} data-testid="explorer-topic" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && mode !== 'aclarator') void start(); }} /></Field>
          {(mode === 'interview' || mode === 'strategy') && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="¿Qué quieres conseguir?" hint="opcional"><TextInput value={objective} onChange={setObjective} placeholder="Ej.: tener 5 alumnos fijos" /></Field>
                <Field label="¿Cómo lo harías?" hint="si lo sabes"><TextInput value={strategy} onChange={setStrategy} placeholder="Ej.: repartir carteles por mi zona" data-testid="explorer-strategy" /></Field>
              </div>
              <Field label="Algo más que deba saber" hint="opcional"><TextArea rows={2} value={context} onChange={setContext} placeholder="Tu tiempo, tu dinero, lo que te preocupa…" /></Field>
            </>
          )}
          {mode === 'aclarator' && (
            <Field label="Cuéntamelo todo, tal cual te salga" hint="lo ordenamos después, bloque a bloque">
              <TextArea rows={5} value={context} onChange={setContext} placeholder="Qué quieres hacer, para quién, por qué, qué te preocupa… Sin orden. Luego iremos aclarando una cosa cada vez." data-testid="aclarator-dump" />
            </Field>
          )}
          {mode === 'copywriter' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="¿Para quién es?" hint="opcional"><TextInput value={strategy} onChange={setStrategy} placeholder="Ej.: estudiantes que duermen mal" data-testid="copy-audience" /></Field>
                <Field label="¿Qué quieres que se lleven?" hint="opcional"><TextInput value={objective} onChange={setObjective} placeholder="Ej.: que el móvil fuera del cuarto lo cambia todo" data-testid="copy-message" /></Field>
              </div>
              <Field label="Notas" hint="opcional"><TextArea rows={2} value={context} onChange={setContext} placeholder="Lo que quieras que tenga en cuenta…" /></Field>
            </>
          )}
          {domain && <p className="text-[11.5px] text-ink-3">Parece un caso de <b className="text-ink-2">{DOMAIN_LABEL[domain].toLowerCase()}</b>; adaptaré mis preguntas.</p>}
          <div className="flex items-center gap-2 pt-1">
            <Button variant="solid" size="md" disabled={!topic.trim()} onClick={() => void start()} data-testid="explorer-start">{mode === 'strategy' ? 'Continuar' : 'Empezar'} <ArrowRight className="size-4" /></Button>
            <span className="text-[12px] text-ink-3">{mode === 'aclarator' ? 'Un bloque cada vez: no pasamos al siguiente hasta que esté claro.' : 'Vale con muy poquito. Lo demás lo vamos sacando.'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ---------------- grabación de voz ---------------- */

function useVoice(onText: (t: string) => void) {
  const status = useExplorer((s) => s.status);
  const [rec, setRec] = useState<SegmentRecorder | null>(null);
  const [dictStop, setDictStop] = useState<(() => void) | null>(null);
  const [interim, setInterim] = useState('');
  const [pending, setPending] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    if (!rec && !dictStop) return;
    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [rec, dictStop]);
  const canProvider = !!status?.configured && status.supportsAudio;
  const start = async () => {
    setSeconds(0);
    if (canProvider) {
      try {
        const r = await startSegmentedRecording((blob) => {
          setPending((n) => n + 1);
          queue.current = queue.current.then(async () => {
            try { const t = await transcribeAudio(blob); if (t) onText(t); } catch (e) { useExplorer.setState({ error: (e as Error).message }); } finally { setPending((n) => n - 1); }
          });
        });
        setRec(r);
      } catch (e) { useExplorer.setState({ error: `Micrófono no disponible: ${(e as Error).message}` }); }
    } else if (browserDictationAvailable()) {
      setDictStop(() => startBrowserDictation((t) => onText(t), setInterim, (m) => useExplorer.setState({ error: `Dictado: ${m}` })));
    } else {
      useExplorer.setState({ error: 'No hay transcripción disponible: configura un proveedor con audio (Gemini o compatible con OpenAI) o usa un navegador con dictado por voz.' });
    }
  };
  const stop = async () => {
    if (rec) { await rec.stop(); setRec(null); }
    if (dictStop) { dictStop(); setDictStop(null); setInterim(''); }
  };
  const uploadAudio = async () => {
    const [f] = await pickFile('audio/*');
    if (!f) return;
    if (!canProvider) { useExplorer.setState({ error: 'Para transcribir archivos de audio hace falta un proveedor con audio configurado (Gemini o compatible con OpenAI).' }); return; }
    try {
      const parts = await splitAudioFile(f);
      setPending(parts.length);
      for (const p of parts) {
        try { const t = await transcribeAudio(p); if (t) onText(t); } finally { setPending((n) => n - 1); }
      }
    } catch (e) { useExplorer.setState({ error: (e as Error).message }); setPending(0); }
  };
  return { recording: !!rec || !!dictStop, start, stop, interim, pending, seconds, uploadAudio, mode: canProvider ? 'provider' : browserDictationAvailable() ? 'browser' : 'none' };
}

function VoiceControls({ onText, compact }: { onText: (t: string) => void; compact?: boolean }) {
  const v = useVoice(onText);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {v.recording ? (
        <Button variant="danger" size="sm" onClick={() => void v.stop()} data-testid="voice-stop"><Square className="size-3.5" />Parar · {Math.floor(v.seconds / 60)}:{String(v.seconds % 60).padStart(2, '0')}</Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => void v.start()} data-testid="voice-start" disabled={v.mode === 'none'} title={v.mode === 'none' ? 'Sin transcripción disponible' : undefined}><Mic className="size-3.5" />{compact ? '' : 'Grabar nota de voz'}</Button>
      )}
      {!compact && <Button variant="ghost" size="sm" onClick={() => void v.uploadAudio()}><FileUp className="size-3.5" />Subir audio</Button>}
      {v.pending > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-ink-3"><Loader2 className="size-3 animate-spin" />transcribiendo {v.pending}…</span>}
      {v.interim && <span className="text-[11px] italic text-ink-3">{v.interim}</span>}
      {!compact && <span className="text-[10.5px] text-ink-3">{v.mode === 'provider' ? 'Sin límite de tiempo: se transcribe por tramos de 1 min.' : v.mode === 'browser' ? 'Dictado del navegador (el navegador puede enviar el audio a su servicio de voz).' : 'Transcripción no disponible.'}</span>}
      {v.recording && <MicOff className="hidden" />}
    </div>
  );
}

/* ---------------- creador de estrategias ---------------- */

function StrategyView({ s }: { s: ExplorerSession }) {
  const busy = useExplorer((x) => x.busy);
  const error = useExplorer((x) => x.error);
  const status = useExplorer((x) => x.status);
  const [text, setText] = useState(s.strategyText);
  useEffect(() => setText(s.strategyText), [s.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (t: string) => { setText(t); update({ strategyText: t }); };
  const append = (t: string) => setText((prev) => { const n = `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}${t}`; update({ strategyText: n }); return n; });
  const addDocs = async () => {
    const files = await pickFile('.docx,.xlsx,.pdf,.txt,.md,.csv', true);
    for (const f of files) {
      useExplorer.setState({ busy: 'document' });
      try { const { text: t } = await extractDocument(f); append(`\n[Documento: ${f.name}]\n${t.slice(0, 40_000)}`); } catch (e) { useExplorer.setState({ error: (e as Error).message }); } finally { useExplorer.setState({ busy: null }); }
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-6">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink">Creador de estrategias · {s.inputs.topic}</h2>
        <p className="text-[12.5px] text-ink-3">Suelta tu plan tal cual te salga: escribe, habla sin límite de tiempo o sube documentos. Construiré el contexto posible con las fricciones estándar de este tipo de idea, para que después lo edites y lo resuelvas.</p>
      </div>
      <VoiceControls onText={append} />
      <TextArea rows={14} value={text} onChange={save} placeholder="Ej.: Quiero dar clases de guitarra. Tengo los martes y jueves por la tarde, podría repartir flyers por el barrio y también preguntar en la tienda de música…" className="min-h-[260px] text-[13.5px]" data-testid="strategy-text" />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void addDocs()}>{busy === 'document' ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}Añadir documento al texto</Button>
        <span className="text-[11px] text-ink-3">{text.length.toLocaleString('es-ES')} caracteres</span>
        <div className="flex-1" />
        <Button variant="subtle" size="md" disabled={!!busy} onClick={() => void generateProposal(true)} data-testid="strategy-template"><Wand2 className="size-4" />Plantilla estándar (sin IA)</Button>
        <Button variant="solid" size="md" disabled={!!busy || !status?.configured || !text.trim()} title={!status?.configured ? 'Necesita un proveedor de IA configurado' : undefined} onClick={() => void generateProposal(false)} data-testid="strategy-ai">
          {busy === 'proposal' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Construir contexto con IA
        </Button>
        {busy === 'proposal' && <Button variant="ghost" size="md" onClick={cancel}>Cancelar</Button>}
      </div>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => { update({ mode: 'interview' }); void sendTurn(text ? `Mi plan: ${text.slice(0, 2000)}` : ''); }}><CircleHelp className="size-3.5" />Prefiero que me hagas preguntas primero</Button>
      {error && <ErrorBox msg={error} />}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--loss)_35%,transparent)] bg-[color-mix(in_srgb,var(--loss)_7%,transparent)] px-3 py-2 text-[12.5px] text-ink" role="alert">
      <TriangleAlert className="mt-0.5 size-4 text-loss" /><span className="flex-1">{msg}</span>
      <IconButton size="xs" label="Cerrar aviso" onClick={() => useExplorer.setState({ error: null })}><X className="size-3" /></IconButton>
    </div>
  );
}

/* ---------------- conversación ---------------- */

function ConversationView({ s }: { s: ExplorerSession }) {
  const busy = useExplorer((x) => x.busy);
  const partial = useExplorer((x) => x.partial);
  const error = useExplorer((x) => x.error);
  const [answer, setAnswer] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [s.messages.length, partial]);
  const send = (command: string | null = null) => { const t = answer; setAnswer(''); void sendTurn(t, command); };
  const last = [...s.messages].reverse().find((m) => m.role === 'assistant');
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold text-ink">{s.inputs.topic}</div>
            <div className="flex items-center gap-1 pt-1" aria-label={`Etapa ${s.stage + 1}: ${STAGE_LABEL[s.stage]}`}>
              {STAGE_LABEL.map((l, i) => <span key={l} title={l} className={cx('h-1 w-6 rounded-full', i < s.stage ? 'bg-accent/60' : i === s.stage ? 'bg-accent' : 'bg-surface-3')} />)}
              <span className="ml-2 text-[11px] text-ink-3">{STAGE_LABEL[s.stage]}</span>
            </div>
          </div>
          {s.readyForMap && <Badge tone="gain"><Check className="size-3" />Listo para un primer flujo</Badge>}
          <Button variant={s.readyForMap ? 'solid' : 'outline'} size="sm" disabled={!!busy} onClick={() => void generateProposal(false)} data-testid="create-flow">
            {busy === 'proposal' ? <Loader2 className="size-3.5 animate-spin" /> : <MapIcon className="size-3.5" />}Crear el flujo inicial
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-6 py-5" aria-live="polite" data-testid="conversation">
          {s.messages.map((m) => m.role === 'user' ? (
            <div key={m.id} className="flex justify-end"><div className="max-w-[78%] rounded-2xl rounded-br-md bg-accent-soft px-3.5 py-2 text-[13.5px] text-ink">{m.content}</div></div>
          ) : (
            <div key={m.id} className="max-w-[86%] space-y-1.5" data-testid="explorer-message">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3"><Sparkles className="size-3.5 text-accent" />EXPLORADOR{m.demo && <Badge tone="cond">demo · guion local</Badge>}</div>
              <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{m.content}</div>
              {m.area && <div className="text-[11.5px] text-ink-3">Área detectada: <b className="font-medium text-ink-2">{AREA_LABEL[m.area as keyof typeof AREA_LABEL] ?? m.area}</b>{m.why && !m.content.toLowerCase().includes(m.why.toLowerCase().slice(1, 40)) ? ` — ${m.why}` : ''}</div>}
            </div>
          ))}
          {busy === 'turn' && (
            <div className="max-w-[86%] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3"><Loader2 className="size-3.5 animate-spin text-accent" />PENSANDO…</div>
              <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">{partial || 'Pensando la siguiente pregunta…'}</div>
            </div>
          )}
          {busy === 'proposal' && <div className="flex items-center gap-2 text-[13px] text-ink-2"><Loader2 className="size-4 animate-spin text-accent" />Preparando la propuesta de flujo… <Button size="xs" variant="ghost" onClick={cancel}>Cancelar</Button></div>}
          {error && <ErrorBox msg={error} />}
          <div ref={endRef} />
        </div>
        <div className="space-y-2 border-t border-line bg-surface px-5 py-3">
          <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Comandos rápidos">
            {COMMANDS.map((c) => (
              <button key={c} type="button" disabled={!!busy} onClick={() => send(c)} data-testid={`cmd-${c}`}
                className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px] text-ink-2 transition-colors hover:border-accent hover:text-accent-text disabled:opacity-40">{COMMAND_TEXT[c]}</button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <TextArea rows={2} value={answer} onChange={setAnswer} placeholder={last?.question ? 'Tu respuesta…' : 'Escribe…'} className="flex-1 text-[13.5px]" data-testid="explorer-answer"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (answer.trim()) send(); } }} />
            <VoiceControls compact onText={(t) => setAnswer((a) => `${a}${a ? ' ' : ''}${t}`)} />
            {busy === 'turn' ? <Button variant="outline" size="md" onClick={cancel}>Cancelar</Button> : (
              <Button variant="solid" size="md" disabled={!answer.trim()} onClick={() => send()} aria-label="Enviar respuesta" data-testid="explorer-send"><Send className="size-4" /></Button>
            )}
          </div>
        </div>
      </div>
      <Discoveries s={s} />
    </div>
  );
}

function Discoveries({ s }: { s: ExplorerSession }) {
  const lastSent = useExplorer((x) => x.lastSent);
  const m = s.memory;
  const [open, setOpen] = useState(true);
  if (!open) return <button type="button" className="w-8 border-l border-line bg-surface text-ink-3 hover:text-ink" onClick={() => setOpen(true)} aria-label="Mostrar descubrimientos"><Lightbulb className="mx-auto size-4" /></button>;
  const Group = ({ title, items, tone }: { title: string; items: React.ReactNode[]; tone?: string }) => items.length ? (
    <div><div className={cx('mb-1 text-[11px] font-semibold uppercase tracking-wider', tone ?? 'text-ink-3')}>{title}</div><ul className="space-y-1 text-[12px] text-ink-2">{items.map((x, i) => <li key={i} className="leading-snug">{x}</li>)}</ul></div>
  ) : null;
  return (
    <aside className="w-80 shrink-0 space-y-4 overflow-auto border-l border-line bg-surface p-4" data-testid="discoveries">
      <div className="flex items-center gap-2"><Lightbulb className="size-4 text-accent" /><span className="flex-1 text-[13px] font-semibold text-ink">Lo que vamos descubriendo</span><IconButton size="xs" label="Ocultar" onClick={() => setOpen(false)}><X className="size-3.5" /></IconButton></div>
      {s.systemNature && <p className="text-[11.5px] text-ink-3">Naturaleza del sistema: <b className="text-ink-2">{s.systemNature}</b></p>}
      <Group title="Lo que ya sabemos" items={m.known.map((k) => <span>{k.text} <Badge className="ml-0.5">{EVIDENCE_LABEL[k.evidence] ?? k.evidence}</Badge></span>)} />
      <Group title="Hemos descubierto" items={m.discovered} tone="text-gain" />
      <Group title="Todavía no sabemos" items={m.unknowns} tone="text-cond" />
      {m.frictions.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-loss">Fricciones</div>
          {(['personal', 'external', 'system'] as const).map((c) => {
            const fs = m.frictions.filter((f) => f.category === c);
            return fs.length ? <div key={c} className="mb-1.5"><div className="text-[10.5px] text-ink-3">{c === 'personal' ? 'Propias' : c === 'external' ? 'Del entorno' : 'Del sistema'}</div><ul className="text-[12px] text-ink-2">{fs.map((f, i) => <li key={i}>• {f.name}{f.note ? <span className="text-ink-3"> — {f.note}</span> : null}</li>)}</ul></div> : null;
          })}
        </div>
      )}
      <Group title="Supuestos por comprobar" items={m.assumptions} />
      <Group title="Contradicciones" items={m.contradictions} tone="text-loss" />
      <Group title="Decisiones pendientes" items={m.decisions} />
      <Group title="Alternativas" items={m.alternatives} />
      {m.known.length + m.discovered.length + m.unknowns.length + m.frictions.length === 0 && <p className="text-[12px] text-ink-3">A medida que respondas, aquí aparecerá lo que vamos sabiendo, lo que falta y las fricciones.</p>}
      {lastSent && (
        <details className="rounded-xl border border-line p-2.5 text-[11.5px] text-ink-2">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink"><Eye className="size-3.5" />Qué se envió en el último turno</summary>
          <div className="mt-1.5 space-y-1">
            <div>Destino: <b>{lastSent.provider}</b></div>
            <div>{lastSent.messages} mensajes recientes + resumen de la exploración{lastSent.plan ? ' + resumen del plan maestro' : ''}.</div>
            {lastSent.snippets.length > 0 ? <div>Fragmentos de documentos: {lastSent.snippets.map((x) => `${x.documentName} › ${x.section}`).join(' · ')}</div> : <div>Ningún fragmento de documentos.</div>}
            <div className="text-ink-3">No se envía el proyecto completo ni datos de otros proyectos.</div>
          </div>
        </details>
      )}
    </aside>
  );
}

/* ---------------- propuesta: vista previa e inserción ---------------- */

const SECTION_ROLES: { title: string; roles: Proposal['nodes'][number]['role'][] }[] = [
  { title: 'C · Variables principales', roles: ['input', 'resource', 'condition', 'action', 'transformation', 'result', 'limitation'] },
  { title: 'F · Fricciones', roles: ['friction'] },
  { title: 'G · Mitigadores', roles: ['mitigator'] },
  { title: 'E · Rutas alternativas', roles: ['alternative'] },
  { title: 'I · Métricas y experimentos', roles: ['metric', 'experiment', 'unknown'] },
];

function MiniPreview({ p, accepted }: { p: Proposal; accepted: Set<string> }) {
  const { doc } = useMemo(() => insertProposal(createDocStub(), p, { mode: 'new', accepted, origin: 'template' }), [p, accepted]);
  const nodes = Object.values(doc.nodes);
  if (!nodes.length) return null;
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs) - 20, maxX = Math.max(...xs) + 220, minY = Math.min(...ys) - 20, maxY = Math.max(...ys) + 90;
  const color = (n: (typeof nodes)[number]) => `var(--n-${n.visualStyle.color}-ac)`;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="h-56 w-full rounded-xl border border-line bg-canvas" role="img" aria-label="Vista previa del mapa propuesto" data-testid="proposal-preview">
      {Object.values(doc.edges).map((e) => {
        const a = doc.nodes[e.sourceNodeId]; const b = doc.nodes[e.targetNodeId];
        if (!a || !b) return null;
        return <line key={e.id} x1={a.position.x + 95} y1={a.position.y + 32} x2={b.position.x + 95} y2={b.position.y + 32} stroke={e.type === 'causal' ? 'var(--transform)' : 'var(--flow)'} strokeWidth={4} strokeDasharray={e.type === 'causal' ? '12 8' : undefined} opacity={0.5} />;
      })}
      {nodes.map((n) => <g key={n.id}><rect x={n.position.x} y={n.position.y} width={190} height={64} rx={16} fill="var(--surface)" stroke={color(n)} strokeWidth={3} strokeDasharray={n.metadata.discovery?.status === 'confirmed' ? undefined : '10 6'} /><text x={n.position.x + 14} y={n.position.y + 38} fontSize={22} fill="var(--text)">{n.title.slice(0, 15)}</text></g>)}
    </svg>
  );
}
function createDocStub() { return useProject.getState().doc!; }

function ProposalView({ s }: { s: ExplorerSession }) {
  const p = s.proposal!;
  const sel = useUI((x) => x.selection.nodes);
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set(p.nodes.map((n) => n.tempId)));
  const [mode, setMode] = useState<'new' | 'current' | 'connect'>(sel.length === 1 ? 'connect' : 'current');
  const toggle = (id: string) => setAccepted((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const insert = async () => {
    const doc = useProject.getState().doc!;
    const res = insertProposal(doc, p, { mode, accepted, origin: s.proposalSource === 'ai' ? 'ai' : 'template', sessionId: s.id, anchorNodeId: sel[0] ?? null });
    if (mode === 'new') {
      await A.openProject(res.doc);
    } else {
      A.apply(() => res.doc);
    }
    update({ insertedNodeIds: res.nodeIds });
    // lo que llega del Explorador ya tiene inicio, pasos y meta: como mínimo, nivel 2
    const lvl = levelOf(useProject.getState().doc?.project.settings.depth);
    if (lvl < 2) setLevel(2);
    useUI.setState({ overlay: null, view: lvl === 3 ? 'system' : 'simulation' });
    useUI.getState().setSelection(res.nodeIds.slice(0, 1));
    setTimeout(() => A.fit(res.nodeIds), 120);
    useUI.getState().notify(`${res.nodeIds.length} ideas metidas en el mapa${mode === 'new' ? ' nuevo' : ' (Ctrl+Z para deshacer)'}`, 'success');
  };
  const counts = { personal: p.frictions.personal.length, external: p.frictions.external.length, system: p.frictions.system.length };
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="proposal">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-2.5">
        <Waypoints className="size-4 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">Propuesta de flujo · {p.discovery.topic}</div>
          <div className="text-[11.5px] text-ink-3">{s.proposalSource === 'ai' ? 'Generada por IA a partir de la exploración' : 'Generada con plantilla estándar (sin IA)'} · revísala antes de insertarla. Lo discontinuo está sin confirmar.</div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => update({ proposal: null })}><RotateCcw className="size-3.5" />Seguir preguntando</Button>
      </div>
      <div className="grid min-h-0 flex-1 gap-5 overflow-auto p-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">A · Descripción del sistema</div>
            <p className="mt-1 text-[13.5px] text-ink">{p.discovery.summary}</p>
            <div className="mt-2 grid gap-1 text-[12px] text-ink-2 sm:grid-cols-2">
              <div><b className="text-ink">Objetivo:</b> {p.discovery.objective || '—'}</div>
              <div><b className="text-ink">Estrategia:</b> {p.discovery.strategy || '—'}</div>
              <div className="sm:col-span-2"><b className="text-ink">B · Punto de entrada:</b> {p.startingPoint.description} {p.startingPoint.initialValue != null ? <Badge tone="flow">{p.startingPoint.initialValue} {p.startingPoint.unit ?? ''}</Badge> : <Badge tone="cond">sin dato: se usará un índice base 100</Badge>}</div>
            </div>
          </section>
          <MiniPreview p={p} accepted={accepted} />
          {SECTION_ROLES.map((sec) => {
            const ns = p.nodes.filter((n) => sec.roles.includes(n.role));
            if (!ns.length) return null;
            return (
              <section key={sec.title} className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-3">{sec.title}
                  {sec.roles.includes('friction') && <span className="normal-case tracking-normal">propias {counts.personal} · entorno {counts.external} · sistema {counts.system}</span>}
                </div>
                <ul className="space-y-1">
                  {ns.map((n) => (
                    <li key={n.tempId} className={cx('flex items-start gap-2 rounded-lg px-1.5 py-1', !accepted.has(n.tempId) && 'opacity-45')} data-testid="proposal-node">
                      <input type="checkbox" className="mt-1" checked={accepted.has(n.tempId)} onChange={() => toggle(n.tempId)} aria-label={`Incluir ${n.title}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-ink">{n.title}
                          {n.frictionCategory && <Badge tone={n.frictionCategory === 'personal' ? 'accent' : n.frictionCategory === 'system' ? 'transform' : 'cond'}>{n.frictionCategory === 'personal' ? 'propia' : n.frictionCategory === 'external' ? 'externa' : 'del sistema'}</Badge>}
                          {n.controllability && <Badge>{({ direct: 'control directo', partial: 'influencia parcial', external: 'dependencia externa', uncontrollable: 'incontrolable' } as Record<string, string>)[n.controllability]}</Badge>}
                          <Badge tone={n.confirmed ? 'gain' : 'neutral'}>{n.confirmed ? 'confirmado' : EVIDENCE_LABEL[n.evidence]}</Badge>
                          {n.weight != null && <Badge tone="cond">peso {n.weight > 0 ? '+' : ''}{n.weight}{n.weightIsSuggestion ? ' (sugerido)' : ''}</Badge>}
                        </div>
                        {n.description && <div className="text-[11.5px] text-ink-3">{n.description}</div>}
                        {n.mitigation && <div className="text-[11.5px] text-gain">↳ {n.mitigation}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-4">
            <div className="text-[13px] font-semibold text-ink">Meterlo en mi mapa</div>
            <Segmented label="Destino" value={mode} onChange={setMode} options={[{ value: 'new', label: 'En un mapa nuevo' }, { value: 'current', label: 'En este mapa' }, { value: 'connect', label: 'Unido a la idea elegida' }]} size="xs" />
            {mode === 'connect' && sel.length !== 1 && <p className="text-[11.5px] text-cond">Selecciona una burbuja en el lienzo (cierra este panel) o elige otra opción.</p>}
            <p className="text-[11.5px] text-ink-3">{accepted.size} de {p.nodes.length} elementos. Se crean como elementos nativos en una capa propia; no se sobrescribe nada y puedes deshacerlo.</p>
            <Button variant="solid" size="md" className="w-full" disabled={!accepted.size || (mode === 'connect' && sel.length !== 1)} onClick={() => void insert()} data-testid="insert-proposal"><MapIcon className="size-4" />Meter {accepted.size} ideas en el mapa</Button>
          </section>
          {p.experiments[0] && (
            <section className="rounded-2xl border border-line bg-surface p-4 text-[12.5px]">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">K · Primer experimento</div>
              <div className="font-medium text-ink">{p.experiments[0].name}</div>
              <p className="text-ink-2">{p.experiments[0].test}</p>
              <div className="mt-1 space-y-0.5 text-ink-2">
                {p.experiments[0].confirmIf && <div><b className="text-gain">Confirma si:</b> {p.experiments[0].confirmIf}</div>}
                {p.experiments[0].questionIf && <div><b className="text-cond">Cuestiona si:</b> {p.experiments[0].questionIf}</div>}
                {p.experiments[0].stopWhen && <div><b className="text-loss">Parar cuando:</b> {p.experiments[0].stopWhen}</div>}
                {p.experiments[0].record.length > 0 && <div><b className="text-ink">Registrar:</b> {p.experiments[0].record.join(' · ')}</div>}
              </div>
            </section>
          )}
          {p.unknowns.length > 0 && <ListCard title="J · Incertidumbres" items={p.unknowns} />}
          {p.assumptions.length > 0 && <ListCard title="Supuestos" items={p.assumptions} />}
          {p.alternatives.length > 0 && <ListCard title="Estrategias alternativas" items={p.alternatives.map((a) => `${a.name}: ${a.description}${a.advantages ? ` · + ${a.advantages}` : ''}${a.limitations ? ` · − ${a.limitations}` : ''}`)} />}
          {p.feedbackLoops.length > 0 && <ListCard title="H · Retroalimentaciones" items={p.feedbackLoops.map((f) => f.description)} />}
          {p.metrics.length > 0 && <ListCard title="I · Métricas" items={p.metrics.map((m) => `${m.name}${m.why ? ` — ${m.why}` : ''}`)} />}
          {p.recommendedNextAction && <div className="flex gap-2 rounded-xl bg-accent-soft p-3 text-[12.5px] text-ink"><Info className="mt-0.5 size-4 text-accent" />{p.recommendedNextAction}</div>}
        </div>
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-2xl border border-line bg-surface p-4"><div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{title}</div><ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-ink-2">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></section>;
}
