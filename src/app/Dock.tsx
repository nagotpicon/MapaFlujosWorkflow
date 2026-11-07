/**
 * Bandeja de herramientas de los niveles 1 y 2: pocas acciones, con palabras,
 * sobre una tira de madera clara. En el nivel 3 se usa la barra lateral completa.
 */
import type { ReactNode } from 'react';
import { CircleDot, Flag, LayoutGrid, Lightbulb, Spline, StickyNote } from 'lucide-react';
import { useUI, type Tool } from '../store/uiStore';
import { Tip, cx } from '../ui/primitives';
import * as A from './actions';
import type { Level } from './levels';

function DockButton({ icon, label, hint, shortcut, active, onClick, testId }: { icon: ReactNode; label: string; hint: string; shortcut?: string; active?: boolean; onClick: () => void; testId: string }) {
  return (
    <Tip label={hint} shortcut={shortcut} side="top">
      <button type="button" onClick={onClick} aria-pressed={active} data-testid={testId}
        className={cx('flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium transition-all duration-150 [&>svg]:size-[17px]',
          active ? 'bg-surface text-accent-text shadow-sm ring-1 ring-accent/40' : 'text-wood-text hover:bg-surface/70 hover:text-ink')}>
        {icon}<span>{label}</span>
      </button>
    </Tip>
  );
}

export function Dock({ level }: { level: Level }) {
  const tool = useUI((s) => s.tool);
  const pick = (t: Tool) => useUI.setState({ tool: tool === t ? 'select' : t });
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center" >
      <nav aria-label="Herramientas" data-testid="dock"
        className="mdf-wood pointer-events-auto flex items-center gap-0.5 rounded-2xl p-1 shadow-soft mdf-rise">
        <DockButton testId="dock-idea" icon={<Lightbulb />} label="Idea" hint="Nueva idea: haz clic donde quieras (o doble clic en el lienzo)" shortcut="B" active={tool === 'bubble'} onClick={() => pick('bubble')} />
        {level >= 2 && <DockButton testId="dock-start" icon={<CircleDot />} label="Inicio" hint="Inicio: de aquí sale todo (clientes, horas, dinero…)" shortcut="I" active={tool === 'input'} onClick={() => pick('input')} />}
        {level >= 2 && <DockButton testId="dock-goal" icon={<Flag />} label="Meta" hint="Meta: lo que quieres conseguir" shortcut="O" active={tool === 'output'} onClick={() => pick('output')} />}
        <DockButton testId="dock-connect" icon={<Spline />} label="Unir" hint="Unir ideas: arrastra desde el borde de una idea hasta otra" shortcut="C" active={tool === 'connect'} onClick={() => pick('connect')} />
        <DockButton testId="dock-note" icon={<StickyNote />} label="Nota" hint="Nota para acordarte de algo" shortcut="N" active={tool === 'note'} onClick={() => pick('note')} />
        <span className="mx-1 h-6 w-px bg-wood-line" aria-hidden />
        <DockButton testId="dock-layout" icon={<LayoutGrid />} label="Ordenar" hint="Colocar todo en orden automáticamente (se puede deshacer)" onClick={() => A.autoLayout()} />
      </nav>
    </div>
  );
}
