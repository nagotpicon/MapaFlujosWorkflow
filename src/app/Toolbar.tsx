import type { ReactNode } from 'react';
import {
  BoxSelect, Group, Layers, LogIn, LogOut, MessageSquarePlus, MousePointer2, Plus, RefreshCcw, Spline, StickyNote, Tag, Type,
} from 'lucide-react';
import { useUI, type Tool } from '../store/uiStore';
import { IconButton, Popover, Segmented, cx } from '../ui/primitives';
import * as A from './actions';
import { LayersPanel } from './LayersPanel';
import { TagPopover } from './TagPopover';
import type { EdgeType } from '../core/model/schema';

const EDGE_TYPES: { value: EdgeType; label: string }[] = [
  { value: 'flow', label: 'Flujo' }, { value: 'causal', label: 'Causal' }, { value: 'informative', label: 'Info' }, { value: 'conceptual', label: 'Idea' },
];

function ToolBtn({ tool, label, shortcut, icon }: { tool: Tool; label: string; shortcut?: string; icon: ReactNode }) {
  const active = useUI((s) => s.tool === tool);
  return (
    <IconButton label={label} shortcut={shortcut} side="right" size="md" active={active} aria-pressed={active}
      onClick={() => useUI.setState({ tool: active ? 'select' : tool })} data-testid={`tool-${tool}`}>
      {icon}
    </IconButton>
  );
}

export function Toolbar() {
  const connectType = useUI((s) => s.connectType);
  const tool = useUI((s) => s.tool);
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-line bg-surface py-2" aria-label="Herramientas" data-testid="toolbar">
      <ToolBtn tool="select" label="Seleccionar" shortcut="V" icon={<MousePointer2 className="size-[18px]" />} />
      <ToolBtn tool="bubble" label="Crear burbuja (o doble clic)" shortcut="B" icon={<Plus className="size-[18px]" />} />
      <Popover side="right" align="start" className="w-64" trigger={
        <span className="relative">
          <IconButton label="Crear conexión (arrastra desde un punto del borde)" shortcut="C" side="right" size="md" active={tool === 'connect'} data-testid="tool-connect"
            onClick={() => useUI.setState({ tool: tool === 'connect' ? 'select' : 'connect' })}>
            <Spline className="size-[18px]" />
          </IconButton>
          <span className={cx('pointer-events-none absolute bottom-0.5 right-0.5 size-1.5 rounded-full', connectType === 'flow' ? 'bg-flow' : connectType === 'causal' ? 'bg-transform' : 'bg-concept')} />
        </span>
      }>
        <div className="space-y-2">
          <div className="text-[12px] font-semibold text-ink">Tipo de nueva conexión</div>
          <Segmented label="Tipo de conexión" value={connectType} onChange={(v) => useUI.setState({ connectType: v })} options={EDGE_TYPES} size="xs" />
          <p className="text-[11px] leading-snug text-ink-3">
            <b className="text-ink-2">Flujo</b> transporta magnitudes. <b className="text-ink-2">Causal</b> influye o compensa. <b className="text-ink-2">Info</b> y <b className="text-ink-2">Idea</b> relacionan sin transportar.
            Arrastra desde un punto del borde de una burbuja hasta otra.
          </p>
        </div>
      </Popover>
      <IconButton label="Agrupar selección (o crear grupo)" shortcut="⌘G" side="right" size="md" onClick={() => A.groupSelection('group')} data-testid="tool-group"><Group className="size-[18px]" /></IconButton>
      <div className="my-1 h-px w-6 bg-line" />
      <ToolBtn tool="input" label="Crear entrada" shortcut="I" icon={<LogIn className="size-[18px]" />} />
      <ToolBtn tool="output" label="Crear salida" shortcut="O" icon={<LogOut className="size-[18px]" />} />
      <div className="my-1 h-px w-6 bg-line" />
      <ToolBtn tool="note" label="Añadir nota" shortcut="N" icon={<StickyNote className="size-[18px]" />} />
      <IconButton label="Añadir comentario (a la selección o en el lienzo)" side="right" size="md" onClick={A.addCommentToSelection} data-testid="tool-comment"><MessageSquarePlus className="size-[18px]" /></IconButton>
      <TagPopover trigger={<span><IconButton label="Añadir etiqueta a la selección" side="right" size="md" data-testid="tool-tag"><Tag className="size-[18px]" /></IconButton></span>} />
      <ToolBtn tool="label" label="Texto libre" icon={<Type className="size-[18px]" />} />
      <IconButton label="Crear contenedor (zona / subsistema)" side="right" size="md" onClick={() => A.groupSelection('container')} data-testid="tool-container"><BoxSelect className="size-[18px]" /></IconButton>
      <IconButton label="Crear circuito (cierra el ciclo de la selección)" side="right" size="md" onClick={A.createCircuitFromSelection} data-testid="tool-circuit"><RefreshCcw className="size-[18px]" /></IconButton>
      <div className="flex-1" />
      <LayersPanel trigger={<span><IconButton label="Administrar capas" side="right" size="md" data-testid="tool-layers"><Layers className="size-[18px]" /></IconButton></span>} />
    </nav>
  );
}
