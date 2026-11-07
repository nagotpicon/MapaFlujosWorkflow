/**
 * Vistas de los modos de trabajo ACLARATOR y COPYWRITER del Explorador.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clapperboard, Copy, Download, Lightbulb, Loader2, Map as MapIcon, RotateCcw, Send, Sparkles, Target, Wand2 } from 'lucide-react';
import { createEmptyDoc } from '../core/model/factory';
import type { ProjectDoc } from '../core/model/schema';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { Badge, Button, Segmented, TextArea, cx } from '../ui/primitives';
import * as A from '../app/actions';
import { download, slug } from '../app/io';
import { ACLARATOR_BLOCKS, COPY_SECTIONS, clarityIssue, copyMarkdown, isBlockClear, wordCount, youtubeVoice } from './shared/modes';
import {
  cancel, clarifyBack, clarifyEdit, clarifyText, clarifyTurn, clarifyValidate, generateCopy, latestClarified, newSession, useExplorer, type ExplorerSession,
} from './session';
import { buildAclaratorMap, buildCopyMap } from './modesMap';

type Where = 'new' | 'current';

async function insertMap(title: string, build: (d: ProjectDoc) => { doc: ProjectDoc; nodeIds: string[] }, where: Where) {
  let ids: string[] = [];
  if (where === 'new') {
    const base = createEmptyDoc(title);
    const r = build({ ...base, project: { ...base.project, settings: { ...base.project.settings, depth: 'basic' } } });
    ids = r.nodeIds;
    await A.openProject(r.doc);
  } else {
    const r = build(useProject.getState().doc!);
    ids = r.nodeIds;
    A.apply(() => r.doc);
  }
  useUI.setState({ overlay: null, view: 'mental' });
  setTimeout(() => A.fit(ids), 150);
  useUI.getState().notify(`${ids.length} ideas en el mapa${where === 'new' ? ' nuevo' : ' (Ctrl+Z para deshacer)'}`, 'success');
}

function WhereChoice({ value, onChange }: { value: Where; onChange: (w: Where) => void }) {
  return <Segmented size="xs" label="Dónde" value={value} onChange={onChange} options={[{ value: 'new', label: 'En un mapa nuevo' }, { value: 'current', label: 'En este mapa' }]} />;
}

/* ------------------------------------------------------------------ */
/* ACLARATOR                                                           */
/* ------------------------------------------------------------------ */

function Progress({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Paso ${Math.min(index + 1, 10)} de 10`} data-testid="clarify-progress">
      {ACLARATOR_BLOCKS.map((b, i) => (
        <span key={b.key} title={i < index ? `${b.title}: aclarado` : i === index ? b.title : 'Más adelante'}
          className={cx('h-2 rounded-full transition-all', i < index ? 'w-6 bg-accent' : i === index ? 'w-10 bg-ink' : 'w-2 bg-line-strong')} />
      ))}
    </div>
  );
}

export function AclaratorView({ s }: { s: ExplorerSession }) {
  const c = s.clarify!;
  const busy = useExplorer((x) => x.busy);
  const error = useExplorer((x) => x.error);
  const [text, setText] = useState('');
  const opened = useRef<string | null>(null);
  const done = c.index > 9;
  const def = ACLARATOR_BLOCKS[Math.min(c.index, 9)];
  const v = c.values[def.key] ?? { interno: '', externo: '', validated: false };
  const msgs = c.messages.filter((m) => m.block === def.key);
  // al entrar en un bloque sin conversación, el Aclarator lo abre (una sola vez)
  useEffect(() => {
    const k = `${s.id}:${c.index}`;
    if (!done && msgs.length === 0 && !busy && opened.current !== k) { opened.current = k; void clarifyTurn('open'); }
  }, [s.id, c.index, done, msgs.length, busy]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);

  if (done) return <AclaratorDone s={s} />;
  const issueIn = clarityIssue(v.interno);
  const issueEx = clarityIssue(v.externo);
  const clear = isBlockClear(v);
  const send = () => { const t = text; setText(''); void clarifyTurn('answer', t); };

  return (
    <div className="flex-1 overflow-auto p-6" data-testid="aclarator">
      <div className="mx-auto max-w-3xl space-y-4 mdf-slide-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">Aclarator · paso {c.index + 1} de 10</div>
            <h2 className="font-display text-[24px] font-medium text-ink">{s.inputs.topic}</h2>
          </div>
          <Progress index={c.index} />
        </div>

        <section className="mdf-paper space-y-4 rounded-2xl p-5" data-testid="clarify-block" data-block={def.key}>
          <div>
            <h3 className="font-display text-[22px] font-semibold tracking-tight text-ink">{def.title}</h3>
            <p className="text-[13.5px] text-ink-2">{def.plain}</p>
          </div>

          <div className="max-h-[260px] space-y-2 overflow-auto pr-1" data-testid="clarify-conversation">
            {msgs.map((m, i) => (
              <div key={i} className={cx('max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed', m.role === 'assistant' ? 'bg-surface-2 text-ink' : 'ml-auto bg-accent-soft text-ink')} data-testid="clarify-message">
                {m.role === 'assistant' && m.demo && <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Aclarator · sin IA</span>}
                {m.content}
              </div>
            ))}
            {busy === 'clarify' && <div className="flex items-center gap-2 text-[12.5px] text-ink-3"><Loader2 className="size-3.5 animate-spin text-accent" />Pensando…</div>}
            <div ref={endRef} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {([['interno', def.interno, issueIn], ['externo', def.externo, issueEx]] as const).map(([k, layer, issue]) => (
              <div key={k} className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">{layer.label}</div>
                <div className="text-[12.5px] text-ink-3">{layer.q}</div>
                <TextArea rows={3} value={v[k]} onChange={(val) => clarifyEdit(k, val)} placeholder="Escríbelo con tus palabras…" data-testid={`clarify-${k}`} aria-label={`${def.title} · ${layer.label}`} />
                <div className={cx('flex items-start gap-1 text-[12px]', issue ? 'text-cond' : 'text-gain')} data-testid={`clarify-${k}-state`}>
                  {issue ? <>⚠ {issue}</> : <><Check className="mt-0.5 size-3.5" />Claro</>}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={!!busy} onClick={() => void clarifyTurn('example')} className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-2 hover:border-accent hover:text-accent-text disabled:opacity-40" data-testid="clarify-example"><Lightbulb className="mr-1 inline size-3.5" />Dame un ejemplo</button>
              <button type="button" disabled={!!busy} onClick={() => void clarifyTurn('concretize')} className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-2 hover:border-accent hover:text-accent-text disabled:opacity-40" data-testid="clarify-concretize"><Target className="mr-1 inline size-3.5" />Ayúdame a concretar</button>
            </div>
            <div className="flex items-end gap-2">
              <TextArea rows={2} value={text} onChange={setText} placeholder="Responde, desarrolla o pregunta…" className="flex-1" data-testid="clarify-answer"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) send(); } }} />
              <Button variant="solid" size="md" disabled={!text.trim() || !!busy} onClick={send} aria-label="Enviar" data-testid="clarify-send"><Send className="size-4" /></Button>
            </div>
          </div>

          {error && <p className="rounded-lg bg-[color-mix(in_srgb,var(--loss)_10%,transparent)] px-3 py-2 text-[12.5px] text-loss">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <Button variant="ghost" size="sm" disabled={c.index === 0 || !!busy} onClick={clarifyBack} data-testid="clarify-back"><ArrowLeft className="size-4" />Paso anterior</Button>
            <div className="flex items-center gap-3">
              {!clear && <span className="text-[12px] text-ink-3">Regla de oro: no pasamos al siguiente hasta que esto esté claro.</span>}
              <Button variant="solid" size="md" disabled={!clear || !!busy} onClick={() => void clarifyValidate()} data-testid="clarify-validate">
                {c.index === 9 ? 'Está claro: terminar' : 'Está claro: validar y seguir'}<ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function AclaratorDone({ s }: { s: ExplorerSession }) {
  const c = s.clarify!;
  const [where, setWhere] = useState<Where>('new');
  const startCopy = async () => {
    const doc = useProject.getState().doc!;
    await newSession(doc.project.id, 'copywriter', { topic: s.inputs.topic, objective: c.values.objetivo?.externo ?? '', strategy: c.values.receptor?.interno ?? '', context: '' }, []);
  };
  return (
    <div className="flex-1 overflow-auto p-6" data-testid="aclarator-done">
      <div className="mx-auto max-w-3xl space-y-4 mdf-slide-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gain">Aclarator · todo aclarado</div>
            <h2 className="font-display text-[26px] font-medium text-ink">{s.inputs.topic}</h2>
          </div>
          <Progress index={10} />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ACLARATOR_BLOCKS.map((b) => {
            const v = c.values[b.key];
            if (!v) return null;
            return (
              <div key={b.key} className="mdf-paper rounded-xl p-3.5 text-[13px]">
                <div className="mb-1 font-display text-[15px] font-semibold text-ink">{b.title}</div>
                <p className="text-ink-2"><b className="text-[11px] uppercase tracking-wider text-ink-3">{b.interno.label}</b><br />{v.interno}</p>
                <p className="mt-1.5 text-ink-2"><b className="text-[11px] uppercase tracking-wider text-ink-3">{b.externo.label}</b><br />{v.externo}</p>
              </div>
            );
          })}
        </div>
        <div className="mdf-wood flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <WhereChoice value={where} onChange={setWhere} />
          <Button variant="solid" size="md" onClick={() => void insertMap(s.inputs.topic, (d) => buildAclaratorMap(d, s.inputs.topic, c), where)} data-testid="clarify-map"><MapIcon className="size-4" />Crear el mapa</Button>
          <Button variant="outline" size="md" onClick={async () => { await navigator.clipboard?.writeText(clarifyText(s)); useUI.getState().notify('Copiado', 'success'); }}><Copy className="size-4" />Copiar</Button>
          <Button variant="outline" size="md" onClick={() => download(clarifyText(s), `aclarado-${slug(s.inputs.topic)}.md`, 'text/markdown')}><Download className="size-4" />.md</Button>
          <Button variant="ghost" size="md" onClick={() => void startCopy()} data-testid="clarify-to-copy"><Clapperboard className="size-4" />Escribir guiones con el Copywriter</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* COPYWRITER                                                          */
/* ------------------------------------------------------------------ */

export function CopywriterView({ s }: { s: ExplorerSession }) {
  const busy = useExplorer((x) => x.busy);
  const error = useExplorer((x) => x.error);
  const status = useExplorer((x) => x.status);
  const briefSession = latestClarified();
  const [useBrief, setUseBrief] = useState(!!briefSession);
  const [where, setWhere] = useState<Where>('new');
  const briefing = useBrief && briefSession ? clarifyText(briefSession) : '';
  const p = s.copy;

  if (!p) {
    return (
      <div className="flex-1 overflow-auto p-6" data-testid="copywriter">
        <div className="mx-auto max-w-2xl space-y-4 mdf-slide-b">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">Copywriter · YouTube, Instagram y TikTok</div>
            <h2 className="font-display text-[26px] font-medium text-ink">{s.inputs.topic}</h2>
            <p className="text-[13.5px] text-ink-2">Un guion de voz de unos 5 minutos (700–900 palabras), tres reels y entre 3 y 5 stories. Sin instrucciones de cámara: solo lo que se dice. Y siempre, al menos, un reto o ejemplo que se pueda practicar.</p>
          </div>
          <div className="mdf-paper space-y-2 rounded-2xl p-4 text-[13px] text-ink-2">
            {s.inputs.strategy && <p><b className="text-ink">Para quién:</b> {s.inputs.strategy}</p>}
            {s.inputs.objective && <p><b className="text-ink">Lo que deben llevarse:</b> {s.inputs.objective}</p>}
            {s.inputs.context && <p><b className="text-ink">Notas:</b> {s.inputs.context}</p>}
            {briefSession && (
              <label className="flex items-center gap-2 pt-1 text-ink">
                <input type="checkbox" checked={useBrief} onChange={(e) => setUseBrief(e.target.checked)} data-testid="copy-use-brief" />
                Usar lo aclarado con el Aclarator («{briefSession.inputs.topic}»)
              </label>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="solid" size="md" disabled={!!busy || !status?.configured} title={!status?.configured ? 'Necesita un proveedor de IA configurado' : undefined} onClick={() => void generateCopy({ briefing })} data-testid="copy-ai">
              {busy === 'copy' ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}Escribir el guion con IA
            </Button>
            <Button variant="subtle" size="md" disabled={!!busy} onClick={() => void generateCopy({ forceTemplate: true, briefing })} data-testid="copy-template"><Wand2 className="size-4" />Esqueleto sin IA</Button>
            {busy === 'copy' && <Button variant="ghost" size="md" onClick={cancel}>Cancelar</Button>}
          </div>
          {error && <p className="rounded-lg bg-[color-mix(in_srgb,var(--loss)_10%,transparent)] px-3 py-2 text-[12.5px] text-loss">{error}</p>}
        </div>
      </div>
    );
  }

  const voice = youtubeVoice(p);
  const words = wordCount(voice);
  const copyText = async (t: string) => { await navigator.clipboard?.writeText(t); useUI.getState().notify('Copiado', 'success'); };
  return (
    <div className="flex-1 overflow-auto p-6" data-testid="copywriter-result">
      <div className="mx-auto max-w-3xl space-y-4 mdf-slide-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">Copywriter</div>
            <h2 className="font-display text-[26px] font-medium text-ink">{p.title || s.inputs.topic}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={s.copySource === 'ai' ? 'gain' : 'cond'}>{s.copySource === 'ai' ? 'Escrito con IA' : 'Esqueleto sin IA: rellénalo con tus palabras'}</Badge>
            <Badge tone={words >= 700 && words <= 900 ? 'gain' : 'neutral'} >{words} palabras</Badge>
          </div>
        </div>

        <section className="mdf-paper rounded-2xl p-5" data-testid="copy-youtube">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[19px] font-semibold text-ink">Guion de YouTube <span className="text-[13px] font-normal text-ink-3">· solo voz</span></h3>
            <Button variant="outline" size="sm" onClick={() => void copyText(voice)} data-testid="copy-voice"><Copy className="size-3.5" />Copiar guion</Button>
          </div>
          <div className="space-y-3">
            {COPY_SECTIONS.map((sec) => (
              <div key={sec.key} className="grid gap-1 sm:grid-cols-[120px_1fr]">
                <div className="pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3" title={sec.hint}>{sec.label}</div>
                <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{p.youtube[sec.key]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mdf-wood rounded-2xl p-4" data-testid="copy-reto">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-wood-text"><Target className="size-4" />Reto tangible</div>
          <p className="text-[14.5px] text-ink">{p.reto}</p>
        </section>

        <div className="grid gap-3 md:grid-cols-3" data-testid="copy-reels">
          {([['principal', 'Reel principal', 'La idea más potente'], ['contraste', 'Reel de contraste', 'Rompe una creencia'], ['reflexion', 'Reel de reflexión', 'Genera conversación']] as const).map(([k, label, sub]) => (
            <section key={k} className="mdf-paper flex flex-col rounded-2xl p-4">
              <div className="font-display text-[15.5px] font-semibold text-ink">{label}</div>
              <div className="mb-2 text-[11.5px] text-ink-3">{sub} · 30–60 s</div>
              <p className="flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{p.reels[k]}</p>
              <Button variant="ghost" size="xs" className="mt-2 self-start" onClick={() => void copyText(p.reels[k])}><Copy className="size-3" />Copiar</Button>
            </section>
          ))}
        </div>

        <section className="mdf-paper rounded-2xl p-4" data-testid="copy-stories">
          <div className="mb-2 font-display text-[15.5px] font-semibold text-ink">Stories ({p.stories.length})</div>
          <ol className="space-y-2">
            {p.stories.map((t, i) => <li key={i} className="flex gap-2 text-[13.5px] text-ink-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-ink-3">{i + 1}</span>{t}</li>)}
          </ol>
        </section>

        <div className="mdf-wood flex flex-wrap items-center gap-2 rounded-2xl p-3">
          <WhereChoice value={where} onChange={setWhere} />
          <Button variant="solid" size="md" onClick={() => void insertMap(p.title || s.inputs.topic, (d) => buildCopyMap(d, p), where)} data-testid="copy-map"><MapIcon className="size-4" />Crear el mapa del guion</Button>
          <Button variant="outline" size="md" onClick={() => void copyText(copyMarkdown(p))}><Copy className="size-4" />Copiar todo</Button>
          <Button variant="outline" size="md" onClick={() => download(copyMarkdown(p), `guion-${slug(p.title || s.inputs.topic)}.md`, 'text/markdown')}><Download className="size-4" />.md</Button>
          <Button variant="ghost" size="md" disabled={!!busy} onClick={() => void generateCopy({ forceTemplate: s.copySource !== 'ai', briefing })} data-testid="copy-redo"><RotateCcw className="size-4" />Volver a escribir</Button>
        </div>
      </div>
    </div>
  );
}
