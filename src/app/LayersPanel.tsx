import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, LockOpen, Plus, Trash2, Check } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { IconButton, Popover, TextInput, cx } from '../ui/primitives';
import * as op from '../core/operations';
import * as A from './actions';

const COLORS = ['#64748b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function LayersPanel({ trigger }: { trigger: ReactNode }) {
  const layers = useProject((s) => s.doc?.layers);
  const nodes = useProject((s) => s.doc?.nodes);
  const sel = useUI((s) => s.selection.nodes);
  const [name, setName] = useState('');
  if (!layers || !nodes) return <>{trigger}</>;
  const list = Object.values(layers).sort((a, b) => a.order - b.order);
  const count = (id: string) => Object.values(nodes).filter((n) => n.layerIds.includes(id)).length;
  return (
    <Popover trigger={trigger} side="right" align="end" className="w-80">
      <div className="space-y-2" data-testid="layers-panel">
        <div className="text-[13px] font-semibold text-ink">Capas</div>
        <p className="text-[11px] text-ink-3">Un elemento puede pertenecer a varias capas sin duplicarse. Es visible si alguna de sus capas lo es.</p>
        <ul className="space-y-0.5">
          {list.map((l) => {
            const member = sel.length > 0 && sel.every((id) => nodes[id]?.layerIds.includes(l.id));
            return (
              <li key={l.id} className="group flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-surface-2" data-testid="layer-row">
                <button type="button" className="size-3 rounded-full" style={{ background: l.color }} aria-label="Cambiar color"
                  onClick={() => A.apply((d) => op.updateLayer(d, l.id, { color: COLORS[(COLORS.indexOf(l.color) + 1) % COLORS.length] }))} />
                <input aria-label="Nombre de la capa" className="h-6 min-w-0 flex-1 rounded bg-transparent px-1 text-[12.5px] text-ink outline-none focus:bg-surface" value={l.name}
                  onChange={(e) => A.apply((d) => op.updateLayer(d, l.id, { name: e.target.value }), `layer-${l.id}`)} />
                <span className="text-[10.5px] tabular text-ink-3">{count(l.id)}</span>
                {sel.length > 0 && (
                  <IconButton size="xs" label={member ? 'Quitar selección de la capa' : 'Añadir selección a la capa'} active={member} data-testid="layer-assign"
                    onClick={() => A.apply((d) => op.setNodeLayers(d, sel, l.id, !member))}><Check className="size-3.5" /></IconButton>
                )}
                <IconButton size="xs" label={l.visible ? 'Ocultar capa' : 'Mostrar capa'} onClick={() => A.apply((d) => op.updateLayer(d, l.id, { visible: !l.visible }))} data-testid="layer-visibility">
                  {l.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-ink-3" />}
                </IconButton>
                <IconButton size="xs" label={l.locked ? 'Desbloquear capa' : 'Bloquear capa'} onClick={() => A.apply((d) => op.updateLayer(d, l.id, { locked: !l.locked }))}>
                  {l.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5 text-ink-3" />}
                </IconButton>
                <span className={cx('flex opacity-0 group-hover:opacity-100')}>
                  <IconButton size="xs" label="Subir" onClick={() => A.apply((d) => op.reorderLayer(d, l.id, -1))}><ArrowUp className="size-3" /></IconButton>
                  <IconButton size="xs" label="Bajar" onClick={() => A.apply((d) => op.reorderLayer(d, l.id, 1))}><ArrowDown className="size-3" /></IconButton>
                  <IconButton size="xs" label="Eliminar capa" variant="danger" onClick={() => A.apply((d) => op.deleteLayer(d, l.id))}><Trash2 className="size-3" /></IconButton>
                </span>
              </li>
            );
          })}
        </ul>
        {sel.length > 0 && (
          <button type="button" className="w-full rounded-lg px-2 py-1 text-left text-[11.5px] text-ink-2 hover:bg-surface-2"
            onClick={() => { const d = useProject.getState().doc; if (!d) return; const ls = new Set(Object.values(d.nodes).filter((n) => sel.includes(n.id)).flatMap((n) => n.layerIds)); useUI.getState().setSelection(Object.values(d.nodes).filter((n) => n.layerIds.some((l) => ls.has(l))).map((n) => n.id)); }}>
            Seleccionar todo lo de las capas de la selección
          </button>
        )}
        <form className="flex gap-1.5 border-t border-line pt-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; A.apply((d) => op.addLayer(d, name.trim(), COLORS[Object.keys(d.layers).length % COLORS.length]).doc); setName(''); }}>
          <TextInput value={name} onChange={setName} placeholder="Nueva capa…" aria-label="Nombre de la nueva capa" />
          <IconButton label="Añadir capa" type="submit" variant="subtle"><Plus className="size-4" /></IconButton>
        </form>
      </div>
    </Popover>
  );
}
