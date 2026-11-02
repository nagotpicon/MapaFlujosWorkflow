import { useReactFlow, useStore } from '@xyflow/react';
import { Maximize, Minus, Plus, ScanLine } from 'lucide-react';
import { IconButton } from '../ui/primitives';
import { useUI } from '../store/uiStore';
import * as A from '../app/actions';

export function CanvasControls() {
  const rf = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const sel = useUI((s) => s.selection.nodes);
  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-soft backdrop-blur" role="toolbar" aria-label="Zoom">
      <IconButton label="Alejar" side="top" onClick={() => void rf.zoomOut({ duration: 200 })}><Minus className="size-4" /></IconButton>
      <button type="button" className="w-11 text-center text-[11px] tabular text-ink-2 hover:text-ink" onClick={() => void rf.zoomTo(1, { duration: 200 })} title="Zoom al 100 %">{Math.round(zoom * 100)}%</button>
      <IconButton label="Acercar" side="top" onClick={() => void rf.zoomIn({ duration: 200 })}><Plus className="size-4" /></IconButton>
      <IconButton label="Ajustar al contenido" shortcut="F" side="top" onClick={() => A.fit()}><Maximize className="size-4" /></IconButton>
      <IconButton label="Zoom a la selección" shortcut="⇧F" side="top" disabled={!sel.length} onClick={() => A.fit(sel)}><ScanLine className="size-4" /></IconButton>
    </div>
  );
}
