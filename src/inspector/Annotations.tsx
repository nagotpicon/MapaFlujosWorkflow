import { CheckCheck, Plus, Trash2 } from 'lucide-react';
import type { Annotation } from '../core/model/schema';
import * as op from '../core/operations';
import * as A from '../app/actions';
import { Button, IconButton, Select, TextArea, cx } from '../ui/primitives';
import { useInspector } from './fields';

const KINDS: { value: Annotation['kind']; label: string }[] = [
  { value: 'comment', label: '💬 Comentario' }, { value: 'note', label: '📝 Nota' }, { value: 'hypothesis', label: '🤔 Lo que supongo' },
  { value: 'evidence', label: '✅ Lo que he comprobado' }, { value: 'question', label: '❓ Duda por resolver' },
];

export function Annotations({ ownerType, ownerId }: { ownerType: Annotation['ownerType']; ownerId: string }) {
  const { doc } = useInspector();
  const list = Object.values(doc.annotations).filter((a) => a.ownerType === ownerType && a.ownerId === ownerId).sort((a, b) => a.createdAt - b.createdAt);
  return (
    <div className="space-y-2" data-testid="annotations">
      {list.map((a, i) => (
        <div key={a.id} className={cx('rounded-xl border border-line p-2', a.resolved && 'opacity-60')}>
          <div className="mb-1 flex items-center gap-1">
            <Select label="¿Qué es?" className="w-44" value={a.kind} onChange={(kind) => A.apply((d) => op.updateAnnotation(d, a.id, { kind }))} options={KINDS} />
            <span className="flex-1 text-right text-[10.5px] text-ink-3">{a.author} · {new Date(a.createdAt).toLocaleDateString('es-ES')}</span>
            <IconButton size="xs" label={a.resolved ? 'Volver a abrirlo' : 'Ya está resuelto'} onClick={() => A.apply((d) => op.updateAnnotation(d, a.id, { resolved: !a.resolved }))}><CheckCheck className={cx('size-3', a.resolved && 'text-gain')} /></IconButton>
            <IconButton size="xs" label="Quitar" variant="danger" onClick={() => A.apply((d) => op.deleteAnnotation(d, a.id))}><Trash2 className="size-3" /></IconButton>
          </div>
          <TextArea rows={2} value={a.text} onChange={(text) => A.apply((d) => op.updateAnnotation(d, a.id, { text }), `ann-${a.id}`)} aria-label="Texto de la anotación"
            {...(i === list.length - 1 && a.text === 'Nuevo comentario' ? { 'data-annotation-new': true } : {})} />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => A.apply((d) => op.addAnnotation(d, ownerType, ownerId, '').doc)} data-testid="add-annotation"><Plus className="size-3.5" />Añadir comentario</Button>
    </div>
  );
}
