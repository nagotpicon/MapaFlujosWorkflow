import { useEffect, useState } from 'react';
import {
  Activity, Check, CircleAlert, Cloud, Download, FileJson, FileImage, FileText, FolderOpen, Grid3x3, History, Image, Loader2, Monitor, Moon,
  MoreHorizontal, PanelBottom, PanelRight, Plus, Redo2, Search, Settings, Sparkles, Sun, Thermometer, Undo2, Upload, Copy, HelpCircle, MessageCircleHeart, Archive, Layers3,
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

const VIEWS: { value: ViewMode; label: string; title: string }[] = [
  { value: 'mental', label: 'Mental', title: 'Ideas, jerarquías y relaciones (1)' },
  { value: 'flow', label: 'Flujo', title: 'Dirección, grosor y cantidad (2)' },
  { value: 'energy', label: 'Energía', title: 'Impulsos, pérdidas y fricciones (3)' },
  { value: 'system', label: 'Sistema', title: 'Dependencias, condiciones y circuitos (4)' },
  { value: 'simulation', label: 'Simulación', title: 'Movimiento, iteraciones y estados (5)' },
];

function SaveIndicator() {
  const state = useProject((s) => s.saveState);
  const at = useProject((s) => s.lastSavedAt);
  const err = useProject((s) => s.saveError);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  const label = state === 'saving' ? 'Guardando…' : state === 'pending' ? 'Cambios sin guardar' : state === 'error' ? 'Error al guardar' : at ? `Guardado ${new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado localmente';
  const Icon = state === 'saving' || state === 'pending' ? Loader2 : state === 'error' ? CircleAlert : Check;
  return (
    <Tip label={state === 'error' ? `${label}: ${err}` : 'Guardado automático en este navegador (IndexedDB)'}>
      <span className={cx('inline-flex items-center gap-1 text-[11px]', state === 'error' ? 'text-loss' : 'text-ink-3')} data-testid="save-state" data-state={state}>
        <Icon className={cx('size-3', (state === 'saving' || state === 'pending') && 'animate-spin')} />
        <span className="hidden 2xl:inline">{label}</span>
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
    <div className="flex min-w-[120px] max-w-[300px] shrink items-center gap-2">
      {editing ? (
        <input autoFocus aria-label="Nombre del proyecto" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(name); setEditing(false); } }}
          className="h-7 w-72 rounded-md border border-accent bg-surface px-2 text-[13px] font-semibold text-ink outline-none" />
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="min-w-0 truncate rounded-md px-1.5 py-1 text-left text-[13px] font-semibold tracking-tight text-ink hover:bg-surface-2" title={`${name} · clic para renombrar`} data-testid="project-name">
          {name}
        </button>
      )}
      {isDemo && <Tip label="Proyecto de demostración: todos los valores son ficticios"><span className="shrink-0"><Badge tone="cond" className="whitespace-nowrap">Demo</Badge></span></Tip>}
    </div>
  );
}

export function TopBar() {
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const view = useUI((s) => s.view);
  const theme = useUI((s) => s.theme);
  const showHeat = useUI((s) => s.showHeat);
  const inspectorOpen = useUI((s) => s.inspectorOpen);
  const bottomOpen = useUI((s) => s.bottomOpen);
  const frameMode = useProject((s) => s.doc?.project.settings.frame.mode);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const open = (overlay: NonNullable<ReturnType<typeof useUI.getState>['overlay']>) => useUI.setState({ overlay });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5" data-testid="topbar">
      <button type="button" onClick={() => open('projects')} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2" title="Proyectos">
        <Logo />
      </button>
      <ProjectName />
      <SaveIndicator />
      <div className="mx-1 h-5 w-px bg-line" />
      <ScenarioSwitcher />
      <div className="flex-1" />
      <Segmented label="Vista" value={view} onChange={setView} options={VIEWS.map((v) => ({ ...v, label: v.label }))} />
      <div className="flex-1" />

      <Button variant="ghost" size="sm" onClick={() => open('explorer')} data-testid="open-explorer" className="text-accent-text">
        <Sparkles className="size-4" /><span className="hidden 2xl:inline">Explorador</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => open('monitor')} data-testid="open-monitor">
        <Activity className="size-4" /><span className="hidden 2xl:inline">Monitor</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => open('verdict')} data-testid="open-verdict">
        <MessageCircleHeart className="size-4" /><span className="hidden 2xl:inline">Dímelo claro</span>
      </Button>
      <div className="mx-0.5 h-5 w-px bg-line" />
      <FramePopover trigger={<IconButton label={frameMode === 'grid' ? 'Marco espacial activo' : 'Marco espacial (cuadrícula)'} active={frameMode === 'grid'} data-testid="frame-toggle"><Grid3x3 className="size-4" /></IconButton>} />
      <IconButton label="Termómetro de calor" shortcut="H" active={showHeat} onClick={() => { useUI.setState({ showHeat: !showHeat }); writeLS('mdf.heat', !showHeat); }} data-testid="heat-toggle"><Thermometer className="size-4" /></IconButton>
      <div className="mx-0.5 h-5 w-px bg-line" />
      <IconButton label="Deshacer" shortcut="⌘Z" disabled={!canUndo} onClick={A.undo} data-testid="undo"><Undo2 className="size-4" /></IconButton>
      <IconButton label="Rehacer" shortcut="⇧⌘Z" disabled={!canRedo} onClick={A.redo} data-testid="redo"><Redo2 className="size-4" /></IconButton>
      <IconButton label="Buscar y comandos" shortcut="⌘K" onClick={() => useUI.setState({ commandOpen: true })} data-testid="open-palette"><Search className="size-4" /></IconButton>
      <IconButton label="Historial de versiones" onClick={() => open('versions')} data-testid="open-versions"><History className="size-4" /></IconButton>

      <Menu.Root>
        <Menu.Trigger asChild><span><IconButton label="Importar / exportar" data-testid="io-menu"><Download className="size-4" /></IconButton></span></Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Label>Exportar</Menu.Label>
          <Menu.Item icon={<FileJson />} onSelect={() => void exportJSON()}>Proyecto completo (.json)</Menu.Item>
          <Menu.Item icon={<FileImage />} onSelect={() => void exportImage('png')}>Imagen PNG</Menu.Item>
          <Menu.Item icon={<Image />} onSelect={() => void exportImage('svg')}>Imagen SVG</Menu.Item>
          <Menu.Item icon={<FileText />} onSelect={() => void exportImage('pdf')}>Documento PDF</Menu.Item>
          <Menu.Separator />
          <Menu.Label>Importar</Menu.Label>
          <Menu.Item icon={<Upload />} onSelect={() => void importFromFile()}>Importar proyecto (.json)</Menu.Item>
          <Menu.Separator />
          <Menu.Label>Copias de seguridad</Menu.Label>
          <Menu.Item icon={<Archive />} onSelect={() => void exportBackup()}>Copia de seguridad completa</Menu.Item>
          <Menu.Item icon={<Cloud />} onSelect={() => void restoreFromFile()}>Restaurar copia de seguridad</Menu.Item>
        </Menu.Content>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger asChild><span><IconButton label="Tema" data-testid="theme-menu"><ThemeIcon className="size-4" /></IconButton></span></Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Item icon={<Sun />} onSelect={() => A.setTheme('light')} shortcut={theme === 'light' ? '✓' : undefined}>Claro</Menu.Item>
          <Menu.Item icon={<Moon />} onSelect={() => A.setTheme('dark')} shortcut={theme === 'dark' ? '✓' : undefined}>Oscuro</Menu.Item>
          <Menu.Item icon={<Monitor />} onSelect={() => A.setTheme('system')} shortcut={theme === 'system' ? '✓' : undefined}>Sistema</Menu.Item>
        </Menu.Content>
      </Menu.Root>

      <IconButton label={bottomOpen ? 'Ocultar panel de simulación' : 'Mostrar panel de simulación'} active={bottomOpen} onClick={() => { useUI.setState({ bottomOpen: !bottomOpen }); writeLS('mdf.bottomOpen', !bottomOpen); }} data-testid="toggle-bottom"><PanelBottom className="size-4" /></IconButton>
      <IconButton label={inspectorOpen ? 'Ocultar inspector' : 'Mostrar inspector'} active={inspectorOpen} onClick={() => useUI.setState({ inspectorOpen: !inspectorOpen })} data-testid="toggle-inspector"><PanelRight className="size-4" /></IconButton>

      <Menu.Root>
        <Menu.Trigger asChild><span><IconButton label="Menú" data-testid="main-menu"><MoreHorizontal className="size-4" /></IconButton></span></Menu.Trigger>
        <Menu.Content align="end">
          <Menu.Item icon={<FolderOpen />} onSelect={() => open('projects')}>Proyectos…</Menu.Item>
          <Menu.Item icon={<Plus />} onSelect={() => void A.newProject()}>Nuevo proyecto</Menu.Item>
          <Menu.Item icon={<Copy />} onSelect={async () => { const d = useProject.getState().doc; if (d) { await A.openProject(reassignProjectId(d, `${d.project.name} (copia)`)); useUI.getState().notify('Proyecto duplicado', 'success'); } }}>Duplicar proyecto</Menu.Item>
          <Menu.Item icon={<Layers3 />} onSelect={() => void A.openDemo()}>Abrir proyecto de demostración</Menu.Item>
          <Menu.Separator />
          <Menu.Item icon={<Settings />} onSelect={() => open('settings')}>Ajustes del proyecto</Menu.Item>
          <Menu.Item icon={<HelpCircle />} onSelect={() => open('help')}>Ayuda y atajos</Menu.Item>
          <Menu.Separator />
          <Menu.Item icon={<History />} onSelect={async () => { const d = useProject.getState().doc; if (d) { await repo.createSnapshot(d, 'Versión manual'); useUI.getState().notify('Versión guardada', 'success'); } }} shortcut="⌘S">Guardar versión ahora</Menu.Item>
        </Menu.Content>
      </Menu.Root>
    </header>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Mapa de Flujos" role="img">
      <rect width="64" height="64" rx="16" fill="var(--text)" />
      <circle cx="18" cy="22" r="7" fill="var(--accent)" />
      <circle cx="46" cy="20" r="5" fill="var(--gain)" />
      <circle cx="40" cy="46" r="8" fill="var(--flow)" />
      <path d="M24 24 C34 26 36 34 34 40 M23 19 C30 14 36 15 41 18" stroke="var(--bg)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
