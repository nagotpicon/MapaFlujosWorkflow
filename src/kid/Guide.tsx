/**
 * La Brújula en pantalla: una sola pregunta, por qué te la hago y dónde
 * contestar. Lo que respondes se convierte en tu mapa (colocado y unido solo).
 */
import { ArrowUp, Compass, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { cx } from '../ui/primitives';
import { nextQuestion } from './guide';
import { responder } from './kidActions';
import { useKid } from './kidStore';
import { Ico, IcoText } from '../ui/ico';

export function Guide({ level }: { level: 1 | 2 }) {
  const doc = useProject((s) => s.doc);
  const analysis = useKid((s) => s.analysis);
  const skipped = useKid((s) => s.skipped);
  const selected = useUI((s) => (s.selection.nodes.length === 1 ? s.selection.nodes[0] : null));
  const editing = useUI((s) => s.editingNodeId != null);
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const q = useMemo(() => (doc ? nextQuestion(doc, { level, skipped, analysis, selected }) : null), [doc, level, skipped, analysis, selected]);

  // al cambiar de pregunta, el cuadro queda listo para escribir (si no estás escribiendo en otro sitio)
  useEffect(() => {
    setText('');
    if (!q?.input || editing) return;
    const active = document.activeElement;
    if (!active || active === document.body || active.closest?.('[data-testid="guide"]')) setTimeout(() => input.current?.focus(), 30);
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!q) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} data-testid="guide-open" aria-label="Abrir la Brújula"
        className="mdf-paper mdf-rise absolute bottom-[84px] left-4 z-20 flex items-center gap-2 rounded-full py-2 pl-2.5 pr-3.5 text-[13px] font-medium text-ink hover:text-accent-text">
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-accent-text"><Compass className="size-4" /></span>Brújula
      </button>
    );
  }
  const send = () => { const t = text.trim(); if (!t) { input.current?.focus(); return; } responder(q, { text: t }); setText(''); };
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[76px] z-20 flex justify-center px-4">
      <section key={q.id} aria-label="Brújula" data-testid="guide" data-question={q.id}
        className="mdf-paper mdf-rise pointer-events-auto w-full max-w-[620px] rounded-2xl p-4 pr-3">
        <div className="flex items-start gap-3">
          <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full text-[20px]', q.tone === 'win' ? 'bg-[color-mix(in_srgb,var(--gain)_16%,transparent)]' : 'bg-accent-soft')} aria-hidden>🧭</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[18px] leading-snug text-ink" data-testid="guide-text"><IcoText text={q.text} size={17} /></p>
            <p className="mt-1 text-[13px] leading-snug text-ink-3" data-testid="guide-why"><Ico e="💬" size={13} className="mr-1 align-[-0.15em]" />{q.why}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Esconder la Brújula" data-testid="guide-hide" className="rounded-full p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
        </div>
        {q.input && (
          <form className="mt-3 flex items-center gap-2 pl-[52px]" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={q.input.placeholder} aria-label={q.text} data-testid="guide-input"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent" />
            <button type="submit" data-testid="guide-send" aria-label="Añadir"
              className={cx('inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-opacity', text.trim() ? 'bg-ink text-bg hover:opacity-85' : 'bg-surface-2 text-ink-3')}>
              <ArrowUp className="size-4" />Añadir
            </button>
          </form>
        )}
        {(q.choices?.length || q.skip) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
            {q.choices?.map((c) => (
              <button key={c.value} type="button" onClick={() => responder(q, { choice: c.value })} data-testid={`guide-choice-${c.value}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-1.5 text-left text-[14px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft/40">
                {c.emoji && <Ico e={c.emoji} size={16} />}
                <span className="flex flex-col leading-tight"><span className="line-clamp-2"><IcoText text={c.label} size={14} /></span>{c.hint && <span className="text-[11.5px] font-normal text-ink-3">{c.hint}</span>}</span>
              </button>
            ))}
            {q.skip && (
              <button type="button" onClick={() => responder(q, { skip: true })} data-testid="guide-skip"
                className="ml-auto rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">{q.skip}</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
