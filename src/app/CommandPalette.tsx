/** Buscador global de elementos y comandos (⌘K). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { Search, CornerDownLeft, Eye } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import * as A from './actions';
import { runShortcut, setView } from './useShortcuts';
import { SHORTCUTS, displayCombo } from './shortcuts';
import { cx } from '../ui/primitives';
import { exportImage, exportJSON, importFromFile } from './io';
import * as op from '../core/operations';

interface Cmd { id: string; label: string; hint?: string; group: string; run: () => void; keywords?: string }
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CommandPalette() {
  const open = useUI((s) => s.commandOpen);
  const doc = useProject((s) => s.doc);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setQ(''); setIdx(0); } }, [open]);
  const close = () => useUI.setState({ commandOpen: false });

  const commands = useMemo<Cmd[]>(() => {
    if (!doc) return [];
    const cmds: Cmd[] = [];
    for (const n of Object.values(doc.nodes)) {
      cmds.push({
        id: `node:${n.id}`, label: n.title || 'Sin título', group: n.hidden ? 'Elementos ocultos' : 'Elementos', hint: n.type, keywords: `${n.description} ${n.tags.join(' ')}`,
        run: () => {
          if (n.hidden) A.apply((d) => op.updateNode(d, n.id, { hidden: false }));
          useUI.getState().setSelection([n.id]);
          setTimeout(() => A.fit([n.id]), 30);
        },
      });
    }
    const add = (id: string, label: string, run: () => void, group = 'Comandos', keywords = '') => cmds.push({ id, label, run, group, keywords, hint: SHORTCUTS.find((s) => s.id === id) ? displayCombo(SHORTCUTS.find((s) => s.id === id)!.default) : undefined });
    add('bubble', 'Nueva burbuja', () => A.createNodeAt('bubble'), 'Crear');
    add('input', 'Nueva entrada', () => A.createNodeAt('input'), 'Crear');
    add('output', 'Nueva salida', () => A.createNodeAt('output'), 'Crear');
    add('note', 'Nueva nota', () => A.createNodeAt('note'), 'Crear');
    add('container', 'Nuevo contenedor', () => A.groupSelection('container'), 'Crear');
    add('circuit', 'Crear circuito con la selección', A.createCircuitFromSelection, 'Crear');
    for (const s of SHORTCUTS) if (!['delete', 'edit', 'child', 'sibling', 'palette'].includes(s.id)) add(s.id, s.label, () => runShortcut(s.id), s.group);
    add('layout', 'Distribución automática', A.autoLayout, 'Organizar');
    for (const m of ['left', 'center', 'right', 'top', 'middle', 'bottom', 'hdist', 'vdist'] as const) {
      const lbl = { left: 'Alinear a la izquierda', center: 'Centrar horizontalmente', right: 'Alinear a la derecha', top: 'Alinear arriba', middle: 'Centrar verticalmente', bottom: 'Alinear abajo', hdist: 'Distribuir horizontalmente', vdist: 'Distribuir verticalmente' }[m];
      add(`align-${m}`, lbl, () => A.align(m), 'Organizar');
    }
    add('showhidden', 'Mostrar todos los elementos ocultos', A.showAllHidden, 'Organizar');
    add('lock', 'Bloquear / desbloquear selección', A.toggleLockSelection, 'Organizar');
    add('clone', 'Clonar selección (misma identidad)', A.cloneSelection, 'Organizar');
    for (const v of [['mental', 'Mental'], ['flow', 'Flujo'], ['energy', 'Energía'], ['system', 'Sistema'], ['simulation', 'Simulación']] as const) add(`v-${v[0]}`, `Vista ${v[1]}`, () => setView(v[0]), 'Vistas');
    add('monitor', 'Abrir monitor', () => useUI.setState({ overlay: 'monitor' }), 'Paneles');
    add('explorer', 'Explorador de flujos', () => useUI.setState({ overlay: 'explorer' }), 'Paneles', 'ia gemini estrategias');
    add('verdict', 'Dímelo claro', () => useUI.setState({ overlay: 'verdict' }), 'Paneles', 'conclusion veredicto');
    add('compare', 'Comparar escenarios', () => useUI.setState({ overlay: 'compare' }), 'Paneles');
    add('versions', 'Historial de versiones', () => useUI.setState({ overlay: 'versions' }), 'Paneles');
    add('settings', 'Ajustes del proyecto', () => useUI.setState({ overlay: 'settings' }), 'Paneles', 'escalas dimensiones atajos');
    add('help', 'Ayuda', () => useUI.setState({ overlay: 'help' }), 'Paneles');
    add('exjson', 'Exportar JSON', () => void exportJSON(), 'Archivo');
    add('expng', 'Exportar PNG', () => void exportImage('png'), 'Archivo');
    add('exsvg', 'Exportar SVG', () => void exportImage('svg'), 'Archivo');
    add('expdf', 'Exportar PDF', () => void exportImage('pdf'), 'Archivo');
    add('import', 'Importar JSON', () => void importFromFile(), 'Archivo');
    add('paste', 'Pegar proyecto (JSON)', () => useUI.setState({ overlay: 'paste' }), 'Archivo', 'pegar importar ia texto');
    add('theme-light', 'Tema claro', () => A.setTheme('light'), 'Tema');
    add('theme-dark', 'Tema oscuro', () => A.setTheme('dark'), 'Tema');
    add('theme-system', 'Tema del sistema', () => A.setTheme('system'), 'Tema');
    return cmds;
  }, [doc]);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    const list = nq ? commands.filter((c) => norm(`${c.label} ${c.keywords ?? ''}`).includes(nq)) : commands.filter((c) => c.group !== 'Elementos' && c.group !== 'Elementos ocultos').slice(0, 14);
    return list.slice(0, 60);
  }, [q, commands]);

  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' }); }, [idx]);
  const exec = (c?: Cmd) => { if (!c) return; close(); setTimeout(c.run, 10); };

  let lastGroup = '';
  return (
    <Dialog.Root open={open} onOpenChange={(o) => useUI.setState({ commandOpen: o })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] mdf-fade-in" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-[14vh] z-[61] w-[560px] max-w-[calc(100%-32px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-float mdf-slide-b" data-testid="command-palette">
          <Dialog.Title className="sr-only">Buscar elementos y comandos</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="size-4 text-ink-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar burbujas, comandos, vistas…" aria-label="Buscar"
              className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
                if (e.key === 'Enter') { e.preventDefault(); exec(results[idx]); }
              }} />
          </div>
          <div ref={listRef} className="max-h-[52vh] overflow-auto p-1.5" role="listbox">
            {results.length === 0 && <div className="py-8 text-center text-[12px] text-ink-3">Sin resultados</div>}
            {results.map((c, i) => {
              const header = c.group !== lastGroup ? (lastGroup = c.group) : null;
              return (
                <div key={c.id}>
                  {header && <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">{header}</div>}
                  <button type="button" role="option" aria-selected={i === idx} data-idx={i} onMouseEnter={() => setIdx(i)} onClick={() => exec(c)}
                    className={cx('flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px]', i === idx ? 'bg-surface-2 text-ink' : 'text-ink-2')}>
                    {c.group === 'Elementos ocultos' && <Eye className="size-3.5 text-ink-3" />}
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="text-[11px] text-ink-3">{c.hint}</span>}
                    {i === idx && <CornerDownLeft className="size-3.5 text-ink-3" />}
                  </button>
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
