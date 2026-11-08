import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Bot, ClipboardPaste, FileUp, Sparkles, Layers3, Map as MapIcon } from 'lucide-react';
import { PasteImportDialog } from './PasteImport';
import { MANUAL_IA_PATH, MANUAL_USER_PATH, manualUrl } from './manuals';
import * as repo from '../persistence/repository';
import { ConfirmDeleteButton } from '../ui/primitives';
import * as A from './actions';
import { importFromFile } from './io';
import { Logo } from './TopBar';

export function ProjectList({ onOpen, onLoaded }: { onOpen?: () => void; onLoaded?: (count: number) => void }) {
  const [list, setList] = useState<repo.ProjectSummary[] | null>(null);
  const load = () => void repo.listProjects().then((l) => { setList(l); onLoaded?.(l.length); });
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list) return null;
  if (!list.length) return <p className="py-6 text-center text-[13px] text-ink-3">Aquí aparecerán tus mapas.</p>;
  return (
    <ul className="space-y-1.5" data-testid="project-list">
      {list.map((p) => (
        <li key={p.id} className="group flex items-center gap-2">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-line hover:bg-surface"
            onClick={async () => { const l = await repo.loadProject(p.id); if (l) { await A.openProject(l.doc, l.repairs); onOpen?.(); } }}>
            <div className="flex size-9 items-center justify-center rounded-xl bg-wood-soft text-wood-text"><MapIcon className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[15px] font-medium text-ink">{p.name}</div>
              <div className="text-[12px] text-ink-3">{p.nodeCount} {p.nodeCount === 1 ? 'idea' : 'ideas'} · {new Date(p.updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}{p.isDemo ? ' · ejemplo' : ''}</div>
            </div>
            <ArrowRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          <ConfirmDeleteButton label={`Borrar «${p.name}»`} confirmLabel="¿Seguro? No se puede deshacer" onConfirm={async () => { await repo.deleteProject(p.id); load(); }} />
        </li>
      ))}
    </ul>
  );
}

function Chip({ icon, children, onClick, testId }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; testId: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 shadow-sm transition-colors hover:border-accent hover:text-accent-text [&>svg]:size-4">
      {icon}{children}
    </button>
  );
}

/**
 * Pantalla de inicio: casi un lienzo en blanco. Una pregunta, un cuadro de texto
 * y poco más. El resto aparece cuando hace falta.
 */
const EXAMPLES = ['Quiero sacar mejor nota en mates', 'Quiero ganar dinero con mis dibujos', 'Me cuesta hacer amigos', 'Quiero cambiar de trabajo'];

export function StartScreen() {
  const [paste, setPaste] = useState(false);
  const [idea, setIdea] = useState('');
  const [count, setCount] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const start = () => {
    const text = idea.trim();
    void A.newProject(text ? (text.length > 60 ? `${text.slice(0, 57)}…` : text) : 'Mapa sin título', text || undefined);
  };
  return (
    <div className="h-full overflow-auto bg-bg" data-testid="start-screen">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 pb-10 pt-[12vh] mdf-rise">
        <div className="mb-10 flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-[17px] font-semibold text-ink">Mapa de Flujos</span>
        </div>
        <h1 className="font-display text-[clamp(32px,5vw,46px)] font-medium leading-[1.1] tracking-tight text-ink">¿Qué te ronda la cabeza?</h1>
        <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-ink-2">Escríbelo como te salga, aunque no lo tengas claro. Luego te hago preguntas, de una en una, y lo vamos dibujando juntos.</p>

        <form className="mt-8" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="relative">
            <div className="mdf-paper relative z-10 flex items-center gap-2 rounded-2xl p-2 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent),var(--shadow-md)]">
              <input ref={input} value={idea} onChange={(e) => setIdea(e.target.value)} aria-label="Tu idea" data-testid="start-idea"
                placeholder="Ej.: quiero ganar dinero con mis dibujos"
                className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none" />
              <button type="submit" data-testid="new-project"
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-semibold text-bg transition-opacity hover:opacity-85">
                Empezar<ArrowRight className="size-4" />
              </button>
            </div>
            {/* la balda de madera sobre la que descansa la hoja */}
            <div className="mdf-wood absolute inset-x-[-10px] -bottom-[9px] h-5 rounded-b-xl" aria-hidden />
          </div>
        </form>

        <div className="mt-7 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3" data-testid="start-examples">
          <span className="mr-1">Por ejemplo:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => { setIdea(ex); input.current?.focus(); }}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-ink">{ex}</button>
          ))}
        </div>

        <div className="mt-9 flex flex-wrap gap-2">
          <Chip testId="start-explorer" icon={<Sparkles />} onClick={() => void A.newProject('Mi mapa')}>Prefiero que me hagas preguntas</Chip>
          <Chip testId="open-demo" icon={<Layers3 />} onClick={() => void A.openDemo()}>Ver un ejemplo</Chip>
          <Chip testId="start-paste" icon={<ClipboardPaste />} onClick={() => setPaste(true)}>Pegar un mapa</Chip>
          <Chip testId="start-import" icon={<FileUp />} onClick={() => void importFromFile()}>Abrir un archivo</Chip>
        </div>

        <section className={count ? 'mt-14' : 'mt-14 hidden'}>
          <h2 className="mb-2 font-display text-[19px] font-medium text-ink">Tus mapas</h2>
          <ProjectList onLoaded={setCount} />
        </section>

        <div className="flex-1" />
        <PasteImportDialog open={paste} onOpenChange={setPaste} />
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12.5px] text-ink-3">
          <span>Todo se guarda en este navegador. No hace falta cuenta. <button type="button" onClick={() => void A.openExpertDemo()} className="underline-offset-2 hover:text-accent-text hover:underline" data-testid="open-demo-expert">Ejemplo para expertos</button></span>
          <span className="flex gap-3" data-testid="start-manuals">
            <a href={manualUrl(MANUAL_USER_PATH)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 no-underline hover:text-accent-text"><BookOpen className="size-4" />Manual de usuario</a>
            <a href={manualUrl(MANUAL_IA_PATH)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 no-underline hover:text-accent-text"><Bot className="size-4" />Manual para IA</a>
          </span>
        </div>
      </div>
    </div>
  );
}
