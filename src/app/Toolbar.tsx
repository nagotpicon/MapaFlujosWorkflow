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
  { value: 'flow', label: 'Pasa' }, { value: 'causal', label: 'Influye' }, { value: 'informative', label: 'Info' }, { value: 'conceptual', label: 'Idea' },
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
      <ToolBtn tool="select" label="Mover y elegir" shortcut="V" icon={<MousePointer2 className="size-[18px]" />} />
      <ToolBtn tool="bubble" label="Nueva idea (o doble clic)" shortcut="B" icon={<Plus className="size-[18px]" />} />
      <Popover side="right" align="start" className="w-64" trigger={
        <span className="relative">
          <IconButton label="Unir ideas (arrastra desde el borde de una idea)" shortcut="C" side="right" size="md" active={tool === 'connect'} data-testid="tool-connect"
            onClick={() => useUI.setState({ tool: tool === 'connect' ? 'select' : 'connect' })}>
            <Spline className="size-[18px]" />
          </IconButton>
          <span className={cx('pointer-events-none absolute bottom-0.5 right-0.5 size-1.5 rounded-full', connectType === 'flow' ? 'bg-flow' : connectType === 'causal' ? 'bg-transform' : 'bg-concept')} />
        </span>
      }>
        <div className="space-y-2">
          <div className="text-[12.5px] font-semibold text-ink">¿Qué tipo de unión?</div>
          <Segmented label="Tipo de conexión" value={connectType} onChange={(v) => useUI.setState({ connectType: v })} options={EDGE_TYPES} size="xs" />
          <p className="text-[11px] leading-snug text-ink-3">
            <b className="text-ink-2">Pasa</b>: algo va de una idea a otra (clientes, dinero, horas…). <b className="text-ink-2">Influye</b>: una idea empuja o frena a otra. <b className="text-ink-2">Info</b> e <b className="text-ink-2">Idea</b>: solo dicen que tienen que ver.
            Arrastra desde el borde de una idea hasta otra.
          </p>
        </div>
      </Popover>
      <IconButton label="Juntar en un grupo" shortcut="⌘G" side="right" size="md" onClick={() => A.groupSelection('group')} data-testid="tool-group"><Group className="size-[18px]" /></IconButton>
      <div className="my-1 h-px w-6 bg-line" />
      <ToolBtn tool="input" label="Inicio: de aquí sale todo" shortcut="I" icon={<LogIn className="size-[18px]" />} />
      <ToolBtn tool="output" label="Meta: lo que quieres conseguir" shortcut="O" icon={<LogOut className="size-[18px]" />} />
      <div className="my-1 h-px w-6 bg-line" />
      <ToolBtn tool="note" label="Nota" shortcut="N" icon={<StickyNote className="size-[18px]" />} />
      <IconButton label="Comentario" side="right" size="md" onClick={A.addCommentToSelection} data-testid="tool-comment"><MessageSquarePlus className="size-[18px]" /></IconButton>
      <TagPopover trigger={<span><IconButton label="Etiquetas" side="right" size="md" data-testid="tool-tag"><Tag className="size-[18px]" /></IconButton></span>} />
      <ToolBtn tool="label" label="Texto suelto" icon={<Type className="size-[18px]" />} />
      <IconButton label="Zona (agrupa una parte del mapa)" side="right" size="md" onClick={() => A.groupSelection('container')} data-testid="tool-container"><BoxSelect className="size-[18px]" /></IconButton>
      <IconButton label="Bucle: cierra un círculo con lo elegido" side="right" size="md" onClick={A.createCircuitFromSelection} data-testid="tool-circuit"><RefreshCcw className="size-[18px]" /></IconButton>
      <div className="flex-1" />
      <LayersPanel trigger={<span><IconButton label="Capas" side="right" size="md" data-testid="tool-layers"><Layers className="size-[18px]" /></IconButton></span>} />
    </nav>
  );
}
