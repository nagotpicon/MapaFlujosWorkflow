import { useEffect, useRef, type ReactNode } from 'react';
import {
  ArrowLeftRight, BoxSelect, ClipboardPaste, Copy, CopyPlus, EyeOff, Focus, Group, Link2, Lock, MessageSquarePlus, MoveRight, Plus, Route,
  Scissors, StickyNote, Trash2, Ungroup, Waypoints, ScanSearch, Undo2, LogIn, LogOut, Type, RefreshCw,
} from 'lucide-react';
import * as A from '../app/actions';
import * as op from '../core/operations';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { cx } from '../ui/primitives';
import { levelOf } from '../app/levels';

export interface MenuState { kind: 'node' | 'edge' | 'pane' | 'selection'; id: string | null; x: number; y: number; flow: { x: number; y: number } }

function Item({ icon, children, onClick, shortcut, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; shortcut?: string; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick}
      className={cx('flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] outline-none hover:bg-surface-2 focus:bg-surface-2', danger ? 'text-loss' : 'text-ink')}>
      <span className="text-ink-3 [&>svg]:size-4">{icon}</span>
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-ink-3">{shortcut}</span>}
    </button>
  );
}
const Sep = () => <div className="my-1 h-px bg-line" />;

export function ContextMenu({ state, onClose }: { state: MenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const doc = useProject((s) => s.doc);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', key);
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', key); };
  }, [onClose]);
  const run = (fn: () => void) => () => { fn(); onClose(); };
  const node = state.id && state.kind === 'node' ? doc?.nodes[state.id] : undefined;
  const edge = state.id && state.kind === 'edge' ? doc?.edges[state.id] : undefined;
  const left = Math.min(state.x, window.innerWidth - 240);
  const top = Math.min(state.y, window.innerHeight - 420);
  const isGroup = node && (node.type === 'group' || node.type === 'container');

  const level = levelOf(doc?.project.settings.depth);
  const pro = level === 3;

  return (
    <div ref={ref} role="menu" aria-label="Menú" data-testid="context-menu"
      className="fixed z-[90] w-60 rounded-xl border border-line bg-surface p-1 shadow-float mdf-fade-in" style={{ left, top }}>
      {state.kind === 'pane' && (<>
        <Item icon={<Plus />} onClick={run(() => A.createNodeAt('bubble', state.flow))} shortcut="Doble clic">Nueva idea</Item>
        {level >= 2 && <Item icon={<LogIn />} onClick={run(() => A.createNodeAt('input', state.flow))}>Nuevo inicio</Item>}
        {level >= 2 && <Item icon={<LogOut />} onClick={run(() => A.createNodeAt('output', state.flow))}>Nueva meta</Item>}
        <Item icon={<StickyNote />} onClick={run(() => A.createNodeAt('note', state.flow))}>Nota</Item>
        {pro && <Item icon={<Type />} onClick={run(() => A.createNodeAt('label', state.flow))}>Texto suelto</Item>}
        {pro && <Item icon={<BoxSelect />} onClick={run(() => A.createNodeAt('container', state.flow))}>Zona</Item>}
        <Sep />
        <Item icon={<ClipboardPaste />} onClick={run(() => void A.pasteClipboard())} shortcut="⌘V">Pegar</Item>
        <Item icon={<Undo2 />} onClick={run(A.undo)} shortcut="⌘Z">Deshacer</Item>
        <Item icon={<Focus />} onClick={run(() => A.fit())} shortcut="F">Verlo todo</Item>
        <Item icon={<RefreshCw />} onClick={run(A.autoLayout)}>Ordenar el mapa</Item>
        {pro && <Item icon={<EyeOff />} onClick={run(A.showAllHidden)}>Mostrar lo oculto</Item>}
      </>)}
      {(state.kind === 'node' || state.kind === 'selection') && (<>
        {node && <Item icon={<Type />} onClick={run(() => useUI.setState({ editingNodeId: node.id }))} shortcut="↵">Escribir</Item>}
        {node && !isGroup && <Item icon={<MoveRight />} onClick={run(() => A.createConnectedNode(node.id))} shortcut="Tab">Añadir idea unida</Item>}
        <Item icon={<CopyPlus />} onClick={run(A.duplicateSelection)} shortcut="⌘D">Duplicar</Item>
        {pro && node && !isGroup && <Item icon={<Link2 />} onClick={run(A.cloneSelection)}>Clonar (la misma idea en otro sitio)</Item>}
        <Item icon={<Copy />} onClick={run(() => void A.copySelection())} shortcut="⌘C">Copiar</Item>
        <Item icon={<Scissors />} onClick={run(() => void A.copySelection(true))} shortcut="⌘X">Cortar</Item>
        {pro && (<>
          <Sep />
          <Item icon={<Group />} onClick={run(() => A.groupSelection('group'))} shortcut="⌘G">Juntar en un grupo</Item>
          {isGroup && <Item icon={<Ungroup />} onClick={run(A.ungroupSelection)} shortcut="⇧⌘G">Deshacer el grupo</Item>}
          {node && !isGroup && <Item icon={<Waypoints />} onClick={run(() => A.apply((d) => op.updateNode(d, node.id, { branchCollapsed: !node.branchCollapsed })))}>{node.branchCollapsed ? 'Mostrar lo que cuelga' : 'Esconder lo que cuelga'}</Item>}
          {node && <Item icon={<Route />} onClick={run(() => useUI.setState({ trace: { rootId: node.id, direction: 'forward', isolate: false } }))}>¿A qué afecta?</Item>}
          {node && <Item icon={<ScanSearch />} onClick={run(() => useUI.setState({ trace: { rootId: node.id, direction: 'backward', isolate: false } }))}>¿De dónde le viene?</Item>}
          {node && <Item icon={<Focus />} onClick={run(() => { useUI.setState({ focusNodeId: node.id }); A.fit([node.id]); })}>Centrarme en esto</Item>}
        </>)}
        <Item icon={<MessageSquarePlus />} onClick={run(A.addCommentToSelection)}>Añadir comentario</Item>
        <Sep />
        {pro && <Item icon={<Lock />} onClick={run(A.toggleLockSelection)}>{node?.locked ? 'Desbloquear' : 'Bloquear'}</Item>}
        {pro && <Item icon={<EyeOff />} onClick={run(A.toggleHideSelection)}>Ocultar</Item>}
        <Item icon={<Trash2 />} onClick={run(A.deleteSelection)} shortcut="Supr" danger>Borrar</Item>
      </>)}
      {state.kind === 'edge' && edge && (<>
        <Item icon={<ArrowLeftRight />} onClick={run(() => A.apply((d) => op.reverseEdge(d, edge.id)))}>Darle la vuelta</Item>
        {pro && <Item icon={<ArrowLeftRight />} onClick={run(() => A.apply((d) => op.updateEdge(d, edge.id, { direction: edge.direction === 'both' ? 'forward' : 'both' })))}>{edge.direction === 'both' ? 'Que vaya en un solo sentido' : 'Que vaya en los dos sentidos'}</Item>}
        {pro && <Item icon={<CopyPlus />} onClick={run(() => A.apply((d) => op.duplicateEdge(d, edge.id).doc))}>Duplicar unión</Item>}
        <Item icon={<MessageSquarePlus />} onClick={run(A.addCommentToSelection)}>Añadir comentario</Item>
        <Sep />
        <Item icon={<Trash2 />} onClick={run(A.deleteSelection)} danger shortcut="Supr">Borrar unión</Item>
      </>)}
    </div>
  );
}
