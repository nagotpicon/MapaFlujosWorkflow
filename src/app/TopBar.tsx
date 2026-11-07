import { useEffect, useState } from 'react';
import {
  Activity, Archive, BookOpen, Bot, ClipboardPaste, Cloud, Copy, Download, FileImage, FileJson, FileText, FolderOpen, Grid3x3, HelpCircle, History, Image,
  Layers3, MessageCircleHeart, Monitor, Moon, MoreHorizontal, PanelBottom, PanelRight, Plus, Redo2, Search, Settings, Sparkles, Sun, Thermometer, Undo2, Upload, Save,
} from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI, writeLS, type ViewMode } from '../store/uiStore';
import { Badge, Button, IconButton, Menu, Segmented, Tip, cx } from '../ui/primitives';
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

const VIEWS: { value: ViewMode; label: string; title: string }[] = [
  { value: 'mental', label: 'Ideas', title: 'Solo las ideas y cómo se relacionan (1)' },
  { value: 'flow', label: 'Recorrido', title: 'Por dónde pasa todo y cuánto (2)' },
  { value: 'energy', label: 'Fuerzas', title: 'Qué empuja y qué frena (3)' },
  { value: 'system', label: 'Piezas', title: 'Qué depende de qué, condiciones y bucles (4)' },
  { value: 'simulation', label: 'Película', title: 'Míralo moverse ronda a ronda (5)' },
];

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
  const view = useUI((s) => s.view);
  const showHeat = useUI((s) => s.showHeat);
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);
  const frameMode = useProject((s) => s.doc?.project.settings.frame.mode);
  const open = (overlay: NonNullable<ReturnType<typeof useUI.getState>['overlay']>) => useUI.setState({ overlay });
  const labels = level < 3 ? 'hidden lg:inline' : 'hidden 2xl:inline';

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg px-3" data-testid="topbar">
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
      {level === 3 && <Segmented label="Vista" value={view} onChange={setView} options={VIEWS.map((v) => ({ ...v, label: v.label }))} />}
      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={() => open('explorer')} data-testid="open-explorer" className="text-accent-text" title="Te hago preguntas para que descubras lo que quieres">
        <Sparkles className="size-4" /><span className={labels}>Ayúdame a pensar</span>
      </Button>
      {level >= 2 && (
        <Button variant="ghost" size="sm" onClick={() => open('verdict')} data-testid="open-verdict" title="Lo que sale de tu mapa, sin rodeos">
          <MessageCircleHeart className="size-4" /><span className={labels}>Dímelo claro</span>
        </Button>
      )}
      {level >= 2 && (
        <Button variant="ghost" size="sm" onClick={() => open('monitor')} data-testid="open-monitor" title="Qué te ayuda, qué te frena y qué arreglar primero">
          <Activity className="size-4" /><span className={labels}>Marcador</span>
        </Button>
      )}
      <IconButton label="Manual: cómo se usa (se abre en otra pestaña)" onClick={() => openManual('user')} data-testid="open-manual"><BookOpen className="size-4" /></IconButton>
      <div className="mx-0.5 h-5 w-px bg-line" />
      {level === 3 && (
        <>
          <FramePopover trigger={<IconButton label={frameMode === 'grid' ? 'Cuadrícula del tiempo: activada' : 'Cuadrícula del tiempo'} active={frameMode === 'grid'} data-testid="frame-toggle"><Grid3x3 className="size-4" /></IconButton>} />
          <IconButton label="Termómetro: qué se agobia y qué va tranquilo" shortcut="H" active={showHeat} onClick={() => { useUI.setState({ showHeat: !showHeat }); writeLS('mdf.heat', !showHeat); }} data-testid="heat-toggle"><Thermometer className="size-4" /></IconButton>
          <div className="mx-0.5 h-5 w-px bg-line" />
        </>
      )}
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
          <IconButton label={inspectorOpen ? 'Ocultar detalles' : 'Mostrar detalles'} active={inspectorOpen} onClick={() => useUI.setState({ inspectorOpen: !inspectorOpen })} data-testid="toggle-inspector"><PanelRight className="size-4" /></IconButton>
        </>
      )}

      <Menu.Root>
        <Menu.Trigger asChild><span><IconButton label="Más opciones" data-testid="main-menu"><MoreHorizontal className="size-4" /></IconButton></span></Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Item icon={<FolderOpen />} onSelect={() => open('projects')}>Mis mapas…</Menu.Item>
          <Menu.Item icon={<Plus />} onSelect={() => void A.newProject()}>Mapa nuevo</Menu.Item>
          <Menu.Item icon={<Copy />} onSelect={async () => { const d = useProject.getState().doc; if (d) { await A.openProject(reassignProjectId(d, `${d.project.name} (copia)`)); useUI.getState().notify('Mapa duplicado', 'success'); } }}>Duplicar este mapa</Menu.Item>
          <Menu.Item icon={<Layers3 />} onSelect={() => void A.openDemo()}>Ver un ejemplo</Menu.Item>
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
