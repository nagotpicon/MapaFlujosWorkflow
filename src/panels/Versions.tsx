import { useEffect, useState } from 'react';
import { History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import * as repo from '../persistence/repository';
import type { Snapshot } from '../core/model/schema';
import { Button, Empty, IconButton, TextInput } from '../ui/primitives';

export function VersionsPanel() {
  const doc = useProject((s) => s.doc)!;
  const [list, setList] = useState<Snapshot[]>([]);
  const [label, setLabel] = useState('');
  const load = () => void repo.listSnapshots(doc.project.id).then(setList);
  useEffect(load, [doc.project.id]);
  return (
    <div className="space-y-3 px-5 py-4" data-testid="versions">
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); await repo.createSnapshot(doc, label || `Versión ${new Date().toLocaleString('es-ES')}`); setLabel(''); load(); useUI.getState().notify('Versión guardada', 'success'); }}>
        <TextInput value={label} onChange={setLabel} placeholder="Nombre de la versión (opcional)" aria-label="Nombre de la versión" />
        <Button type="submit" variant="solid" size="sm" data-testid="save-version"><Save className="size-3.5" />Guardar versión</Button>
      </form>
      {list.length === 0 ? <Empty icon={<History />} title="Sin versiones">Se guardan versiones automáticas cada pocos minutos de trabajo y puedes crear las tuyas.</Empty> : (
        <ul className="divide-y divide-line">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2" data-testid="version-row">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">v{s.version} · {s.label || 'Sin nombre'}</div>
                <div className="text-[11px] text-ink-3">{new Date(s.createdAt).toLocaleString('es-ES')} · {Object.keys(s.data.nodes).length} elementos · {Object.keys(s.data.scenarios).length} escenarios{s.auto ? ' · automática' : ''}</div>
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                await repo.createSnapshot(useProject.getState().doc!, 'Antes de restaurar', true);
                useProject.getState().apply(() => ({ ...s.data, project: { ...s.data.project, id: doc.project.id, updatedAt: Date.now() } }));
                useUI.getState().notify(`Restaurada la versión ${s.version} (puedes deshacer)`, 'success');
                useUI.setState({ overlay: null });
              }} data-testid="restore-version"><RotateCcw className="size-3.5" />Restaurar</Button>
              <IconButton label="Eliminar versión" variant="danger" onClick={async () => { await repo.deleteSnapshot(s.id); load(); }}><Trash2 className="size-4" /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
