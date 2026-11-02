import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { Badge, Popover, TextInput } from '../ui/primitives';
import * as op from '../core/operations';
import * as A from './actions';

export function allTags(nodes: Record<string, { tags: string[] }>): string[] {
  return [...new Set(Object.values(nodes).flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function TagPopover({ trigger }: { trigger: ReactNode }) {
  const nodes = useProject((s) => s.doc?.nodes);
  const sel = useUI((s) => s.selection.nodes);
  const filter = useUI((s) => s.tagFilter);
  const [draft, setDraft] = useState('');
  if (!nodes) return <>{trigger}</>;
  const tags = allTags(nodes);
  const add = (t: string) => { if (!t.trim() || !sel.length) return; A.apply((d) => op.updateNodes(d, sel, (n) => ({ tags: [...new Set([...n.tags, t.trim()])] }))); setDraft(''); };
  return (
    <Popover trigger={trigger} side="right" className="w-72">
      <div className="space-y-2.5" data-testid="tag-popover">
        <div className="text-[13px] font-semibold text-ink">Etiquetas</div>
        {sel.length ? (
          <form onSubmit={(e) => { e.preventDefault(); add(draft); }} className="space-y-1.5">
            <TextInput value={draft} onChange={setDraft} placeholder={`Etiquetar ${sel.length} elemento(s)…`} aria-label="Nueva etiqueta" list="mdf-tags" />
            <datalist id="mdf-tags">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          </form>
        ) : <p className="text-[11px] text-ink-3">Selecciona burbujas para etiquetarlas. Usa las etiquetas para filtrar el mapa.</p>}
        {tags.length > 0 && (
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">Filtrar por etiqueta</div>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => {
                const on = filter.includes(t);
                return (
                  <button key={t} type="button" onClick={() => useUI.setState({ tagFilter: on ? filter.filter((x) => x !== t) : [...filter, t] })}>
                    <Badge tone={on ? 'accent' : 'neutral'}>#{t}</Badge>
                  </button>
                );
              })}
            </div>
            {filter.length > 0 && <button type="button" className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink" onClick={() => useUI.setState({ tagFilter: [] })}><X className="size-3" />Quitar filtro</button>}
          </div>
        )}
      </div>
    </Popover>
  );
}
