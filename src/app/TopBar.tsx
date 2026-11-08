import { forwardRef, useEffect, useState, type ButtonHTMLAttributes } from 'react';
import {
  Archive, BookOpen, Bot, ClipboardPaste, Cloud, Copy, Download, FileImage, FileJson, FileText, FolderOpen, HelpCircle, History, Image,
  Layers3, Monitor, Moon, MoreHorizontal, PanelBottom, PanelRight, Plus, Redo2, Search, Settings, Sun, Undo2, Upload, Save,
} from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI, writeLS, type ViewMode } from '../store/uiStore';
import { Badge, IconButton, Menu, Tip, cx } from '../ui/primitives';
import { Ico } from '../ui/ico';
import * as A from './actions';
import { setView } from './useShortcuts';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { exportJSON, exportImage, importFromFile, exportBackup, restoreFromFile } from './io';
import { FramePopover } from './FramePopover';
import * as repo from '../persistence/repository';
import { reassignProjectId } from '../persistence/repository';
import { openManual } from './manuals';
import { LevelSwitch } from './LevelSwitch';
import { useLevel } from './levels';

/** Cómo ver el mapa: el mismo mapa, contado de cinco maneras. Cada una dice para qué te sirve. */
const VIEWS: { value: ViewMode; label: string; sub: string; title: string }[] = [
  { value: 'mental', label: 'Ideas', sub: 'pensar sin números', title: 'Solo las ideas y cómo se unen, como un mapa mental. Para pensar tranquilo. Tecla 1.' },
  { value: 'flow', label: 'Recorrido', sub: 'cuánto pasa', title: 'Ves con números cuánto pasa por cada idea y por cada línea. Para ver dónde se pierde. Tecla 2.' },
  { value: 'energy', label: 'Fuerzas', sub: 'qué se gana y pierde', title: 'En cada idea, lo que se crea (+) y lo que se pierde (−). Para ver qué te suma y qué te resta. Tecla 3.' },
  { value: 'system', label: 'Piezas', sub: 'qué ayuda y frena', title: 'Lo que ayuda, lo que frena y lo que solo funciona a veces. Para ver las piezas que mueven tu mapa. Tecla 4.' },
  { value: 'simulation', label: 'Película', sub: 'verlo moverse', title: 'Le das al ▶ y ves cómo se mueve, vuelta a vuelta (semana a semana, mes a mes…). Tecla 5.' },
];

/** Un botón con su nombre y, debajo, para qué te sirve. */
const ToolButton = forwardRef<HTMLButtonElement, { e: string; label: string; sub: string; active?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>>(
  function ToolButton({ e, label, sub, active, className, ...rest }, ref) {
    return (
      <button ref={ref} type="button" aria-label={label} {...rest}
        className={cx('flex shrink-0 items-center gap-1.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-surface-2', active && 'bg-accent-soft', className)}>
        <Ico e={e} size={16} />
        <span className="flex flex-col leading-tight">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-ink">{label}</span>
          <span className="whitespace-nowrap text-[10.5px] text-ink-3">{sub}</span>
        </span>
      </button>
    );
  },
);

function ViewSwitch() {
  const view = useUI((s) => s.view);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-ink-3"><Ico e="👀" size={14} />Cómo verlo:</span>
      <div role="radiogroup" aria-label="Vista" className="inline-flex rounded-xl bg-surface-2 p-0.5">
        {VIEWS.map((v) => (
          <button key={v.value} type="button" role="radio" aria-checked={view === v.value} aria-label={v.label} title={v.title} onClick={() => setView(v.value)}
            className={cx('flex flex-col items-start rounded-[10px] px-2 py-1 text-left leading-tight transition-all', view === v.value ? 'bg-surface shadow-sm' : 'hover:bg-surface/60')}>
            <span className={cx('whitespace-nowrap text-[12.5px] font-medium', view === v.value ? 'text-ink' : 'text-ink-2')}>{v.label}</span>
            <span className="whitespace-nowrap text-[10px] text-ink-3">{v.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SaveIndicator() {
  const state = useProject((s) => s.saveState);
  const at = useProject((s) => s.lastSavedAt);
  const err = useProject((s) => s.saveError);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  const label = state === 'saving' ? 'Guardando…' : state === 'pending' ? 'Guardando…' : state === 'error' ? 'No se ha podido guardar' : at ? `Guardado a las ${new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado';
  return (
    <Tip label={state === 'error' ? `${label}: ${err}` : `${label}. Se guarda solo en este navegador.`}>
      <span className={cx('inline-flex items-center gap-1.5 text-[11.5px]', state === 'error' ? 'text-loss' : 'text-ink-3')} data-testid="save-state" data-state={state}>
        <span className={cx('size-1.5 rounded-full', state === 'error' ? 'bg-loss' : state === 'saved' || state === 'idle' ? 'bg-gain' : 'animate-pulse bg-wood-deep')} aria-hidden />
        <span className="hidden xl:inline">{state === 'saved' || state === 'idle' ? 'Guardado' : label}</span>
      </span>
    </Tip>
  );
}

function ProjectName() {
  const name = useProject((s) => s.doc?.project.name ?? '');
  const isDemo = useProject((s) => s.doc?.project.isDemo);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => { setEditing(false); if (draft.trim() && draft !== name) A.apply((d) => ({ ...d, project: { ...d.project, name: draft.trim() } })); };
  return (
    <div className="flex min-w-[130px] max-w-[260px] shrink items-center gap-2">
      {editing ? (
        <input autoFocus aria-label="Nombre del mapa" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
          className="h-8 w-64 rounded-lg border border-accent bg-surface px-2 font-display text-[14px] font-semibold text-ink outline-none" />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="min-w-0 truncate rounded-lg px-1.5 py-1 text-left font-display text-[14.5px] font-semibold text-ink hover:bg-surface-2" title={`${name} · clic para cambiar el nombre`} data-testid="project-name">
          {name}
        </button>
      )}
      {isDemo && <Tip label="Mapa de ejemplo: los números son inventados"><span className="shrink-0"><Badge tone="cond" className="whitespace-nowrap">Ejemplo</Badge></span></Tip>}
    </div>
  );
}

function ThemeMenu() {
  const theme = useUI((s) => s.theme);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return (
    <Menu.Root>
      <Menu.Trigger asChild><span><IconButton label="Claro u oscuro" data-testid="theme-menu"><ThemeIcon className="size-4" /></IconButton></span></Menu.Trigger>
      <Menu.Content align="end">
        <Menu.Item icon={<Sun />} onSelect={() => A.setTheme('light')} shortcut={theme === 'light' ? '✓' : undefined}>Claro</Menu.Item>
        <Menu.Item icon={<Moon />} onSelect={() => A.setTheme('dark')} shortcut={theme === 'dark' ? '✓' : undefined}>Oscuro</Menu.Item>
        <Menu.Item icon={<Monitor />} onSelect={() => A.setTheme('system')} shortcut={theme === 'system' ? '✓' : undefined}>Como mi ordenador</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}

function FileItems() {
  return (
    <>
      <Menu.Label>Guardar una copia</Menu.Label>
      <Menu.Item icon={<FileJson />} onSelect={() => void exportJSON()}>Proyecto completo (.json)</Menu.Item>
      <Menu.Item icon={<FileImage />} onSelect={() => void exportImage('png')}>Imagen PNG</Menu.Item>
      <Menu.Item icon={<Image />} onSelect={() => void exportImage('svg')}>Imagen SVG</Menu.Item>
      <Menu.Item icon={<FileText />} onSelect={() => void exportImage('pdf')}>Documento PDF</Menu.Item>
      <Menu.Separator />
      <Menu.Label>Abrir</Menu.Label>
      <Menu.Item icon={<Upload />} onSelect={() => void importFromFile()}>Importar proyecto (.json)</Menu.Item>
      <Menu.Item icon={<ClipboardPaste />} onSelect={() => useUI.setState({ overlay: 'paste' })}>Pegar proyecto (JSON)</Menu.Item>
      <Menu.Separator />
      <Menu.Label>Copias de seguridad</Menu.Label>
      <Menu.Item icon={<Archive />} onSelect={() => void exportBackup()}>Copia de seguridad completa</Menu.Item>
      <Menu.Item icon={<Cloud />} onSelect={() => void restoreFromFile()}>Restaurar copia de seguridad</Menu.Item>
    </>
  );
}

export function TopBar() {
  const level = useLevel();
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const showHeat = useUI((s) => s.showHeat);
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);
  const frameMode = useProject((s) => s.doc?.project.settings.frame.mode);
  const open = (overlay: NonNullable<ReturnType<typeof useUI.getState>['overlay']>) => useUI.setState({ overlay });

  const tools = (
    <>
      <ToolButton e="✨" label="Ayúdame a pensar" sub="te hago preguntas" onClick={() => open('explorer')} data-testid="open-explorer" title="Te hago preguntas, una a una, y con lo que me cuentes te monto el mapa." />
      {level < 3 && <ToolButton e="🔍" label="Lo que he descubierto" sub="lo que veo en tu mapa" onClick={() => open('discover')} data-testid="open-discover" title="Lo que he visto en tu mapa, contado fácil." />}
      {level === 3 && <ToolButton e="💬" label="Dímelo claro" sub="el resumen" onClick={() => open('verdict')} data-testid="open-verdict" title="Te cuento en cuatro frases lo que sale de tu mapa." />}
      {level === 3 && <ToolButton e="📈" label="Marcador" sub="qué te frena" onClick={() => open('monitor')} data-testid="open-monitor" title="Lo que te ayuda, lo que te frena y qué arreglar primero, con números." />}
      {level === 3 && (
        <FramePopover trigger={<ToolButton e="🗓️" label="Tiempo" sub={frameMode === 'grid' ? 'encendido' : 'semanas y plazos'} active={frameMode === 'grid'} data-testid="frame-toggle" title="Pon una cuadrícula de tiempo: cada columna, una semana. Para planificar y ver si llegas a tiempo." />} />
      )}
      {level === 3 && <ToolButton e="🌡️" label="Termómetro" sub={showHeat ? 'encendido' : 'dónde se atasca'} active={showHeat} onClick={() => { useUI.setState({ showHeat: !showHeat }); writeLS('mdf.heat', !showHeat); }} data-testid="heat-toggle" title="Pinta cada idea según cómo va: tranquila, justa o agobiada. Tecla H." />}
      <ToolButton e="📖" label="Manual" sub="cómo se usa" onClick={() => openManual('user')} data-testid="open-manual" title="Manual: cómo se usa (se abre en otra pestaña)" />
    </>
  );

  return (
    <header className="shrink-0 border-b border-line bg-bg" data-testid="topbar">
      <div className="flex h-14 items-center gap-2 px-3">
        <Tip label="Mis mapas">
          <button type="button" onClick={() => open('projects')} className="flex items-center rounded-xl p-1 hover:bg-surface-2" aria-label="Mis mapas">
            <Logo />
          </button>
        </Tip>
        <ProjectName />
        <SaveIndicator />
        <div className="mx-1 h-6 w-px bg-line" />
        <LevelSwitch />
        {level === 3 && <ScenarioSwitcher />}
        <div className="flex-1" />
        {level < 3 && tools}
        {level < 3 && <div className="mx-0.5 h-5 w-px bg-line" />}
        <IconButton label="Deshacer" shortcut="⌘Z" disabled={!canUndo} onClick={A.undo} data-testid="undo"><Undo2 className="size-4" /></IconButton>
        <IconButton label="Rehacer" shortcut="⇧⌘Z" disabled={!canRedo} onClick={A.redo} data-testid="redo"><Redo2 className="size-4" /></IconButton>
        {level === 3 && (
          <>
            <IconButton label="Buscar" shortcut="⌘K" onClick={() => useUI.setState({ commandOpen: true })} data-testid="open-palette"><Search className="size-4" /></IconButton>
            <IconButton label="Versiones guardadas" onClick={() => open('versions')} data-testid="open-versions"><History className="size-4" /></IconButton>
            <Menu.Root>
              <Menu.Trigger asChild><span><IconButton label="Guardar o abrir archivos" data-testid="io-menu"><Download className="size-4" /></IconButton></span></Menu.Trigger>
              <Menu.Content align="end"><FileItems /></Menu.Content>
            </Menu.Root>
          </>
        )}
        <ThemeMenu />
        {level === 3 && (
          <>
            <IconButton label={bottomOpen ? 'Ocultar el panel de abajo' : 'Mostrar el panel de abajo'} active={bottomOpen} onClick={() => { useUI.setState({ bottomOpen: !bottomOpen }); writeLS('mdf.bottomOpen', !bottomOpen); }} data-testid="toggle-bottom"><PanelBottom className="size-4" /></IconButton>
            <IconButton label={inspectorOpen ? 'Cerrar la columna de detalles' : 'Abrir la columna de detalles'} active={inspectorOpen} onClick={() => useUI.setState({ inspectorOpen: !inspectorOpen })} data-testid="toggle-inspector"><PanelRight className="size-4" /></IconButton>
          </>
        )}
        <Menu.Root>
          <Menu.Trigger asChild><span><IconButton label="Más opciones" data-testid="main-menu"><MoreHorizontal className="size-4" /></IconButton></span></Menu.Trigger>
          <Menu.Content align="end">
            <Menu.Item icon={<FolderOpen />} onSelect={() => open('projects')}>Mis mapas…</Menu.Item>
            <Menu.Item icon={<Plus />} onSelect={() => void A.newProject()}>Mapa nuevo</Menu.Item>
            <Menu.Item icon={<Copy />} onSelect={async () => { const d = useProject.getState().doc; if (d) { await A.openProject(reassignProjectId(d, `${d.project.name} (copia)`)); useUI.getState().notify('Mapa duplicado', 'success'); } }}>Duplicar este mapa</Menu.Item>
            <Menu.Item icon={<Layers3 />} onSelect={() => void A.openDemo()}>Ver un ejemplo</Menu.Item>
            <Menu.Item icon={<Layers3 />} onSelect={() => void A.openExpertDemo()}>Ejemplo para expertos</Menu.Item>
            {level < 3 && (
              <Menu.Sub>
                <Menu.SubTrigger icon={<Download />}>Guardar o abrir archivos</Menu.SubTrigger>
                <Menu.SubContent><FileItems /></Menu.SubContent>
              </Menu.Sub>
            )}
            <Menu.Separator />
            <Menu.Item icon={<History />} onSelect={async () => { const d = useProject.getState().doc; if (d) { await repo.createSnapshot(d, 'Versión manual'); useUI.getState().notify('Versión guardada', 'success'); } }} shortcut="⌘S">Guardar versión ahora</Menu.Item>
            <Menu.Item icon={<Save />} onSelect={() => open('versions')}>Versiones guardadas…</Menu.Item>
            <Menu.Separator />
            <Menu.Item icon={<Settings />} onSelect={() => open('settings')}>Ajustes del mapa</Menu.Item>
            <Menu.Item icon={<HelpCircle />} onSelect={() => open('help')}>Ayuda y atajos</Menu.Item>
            <Menu.Item icon={<BookOpen />} onSelect={() => openManual('user')}>Manual de usuario</Menu.Item>
            <Menu.Item icon={<Bot />} onSelect={() => openManual('ia')}>Manual para IA (prompts)</Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
      {level === 3 && (
        <div className="flex items-center gap-3 overflow-x-auto border-t border-line/70 px-3 py-1" data-testid="topbar-tools">
          <ViewSwitch />
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">{tools}</div>
        </div>
      )}
    </header>
  );
}

/** Logotipo: tres ideas unidas sobre una pieza de arcilla. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Mapa de Flujos" role="img">
      <rect width="64" height="64" rx="18" fill="#d97757" />
      <path d="M20 23 C30 24 34 32 33 41 M21 20 C29 14 38 14 44 19" stroke="#faf9f5" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.9" />
      <circle cx="19" cy="22" r="6.5" fill="#faf9f5" />
      <circle cx="45" cy="20" r="4.5" fill="#faf9f5" />
      <circle cx="34" cy="44" r="7.5" fill="#faf9f5" />
    </svg>
  );
}
