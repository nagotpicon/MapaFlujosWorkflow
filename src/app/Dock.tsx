/**
 * Bandeja de madera del modo fácil (niveles 1 y 2): pocos botones, con dibujo
 * y palabra. Cada botón crea la cosa ya colocada, unida y lista para escribir.
 * En el nivel 3 se usa la barra lateral completa.
 */
import type { ReactNode } from 'react';
import { useUI } from '../store/uiStore';
import { Tip, cx } from '../ui/primitives';
import { nuevo } from '../kid/kidActions';
import * as A from './actions';
import type { Level } from './levels';

function DockButton({ emoji, label, hint, shortcut, active, onClick, testId }: { emoji: ReactNode; label: string; hint: string; shortcut?: string; active?: boolean; onClick: () => void; testId: string }) {
  return (
    <Tip label={hint} shortcut={shortcut} side="top">
      <button type="button" onClick={onClick} aria-pressed={active} data-testid={testId}
        className={cx('flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium transition-all duration-150',
          active ? 'bg-surface text-accent-text shadow-sm ring-1 ring-accent/40' : 'text-wood-text hover:bg-surface/70 hover:text-ink')}>
        <span className="text-[17px] leading-none" aria-hidden>{emoji}</span><span>{label}</span>
      </button>
    </Tip>
  );
}

export function Dock({ level }: { level: Level }) {
  const tool = useUI((s) => s.tool);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <nav aria-label="Herramientas" data-testid="dock"
        className="mdf-wood pointer-events-auto flex items-center gap-0.5 rounded-2xl p-1 shadow-soft mdf-rise">
        <DockButton testId="dock-idea" emoji="💡" label="Idea" hint="Una idea nueva, unida a la que tengas elegida" shortcut="B" onClick={() => nuevo('idea')} />
        {level >= 2 && <DockButton testId="dock-paso" emoji="👣" label="Paso" hint="Algo que harás para llegar. Va en el camino, en orden" onClick={() => nuevo('paso')} />}
        {level >= 2 && <DockButton testId="dock-piedra" emoji="🪨" label="Piedra" hint="Algo que te frena. Se queda con parte de tus empujones" onClick={() => nuevo('piedra')} />}
        {level >= 2 && <DockButton testId="dock-ayuda" emoji="🤝" label="Ayuda" hint="Algo o alguien que hace más pequeña una piedra" onClick={() => nuevo('ayuda')} />}
        <DockButton testId="dock-connect" emoji="🔗" label="Unir" hint="Arrastra desde el borde de una cosa hasta otra" shortcut="C" active={tool === 'connect'} onClick={() => useUI.setState({ tool: tool === 'connect' ? 'select' : 'connect' })} />
        <span className="mx-1 h-6 w-px bg-wood-line" aria-hidden />
        <DockButton testId="dock-layout" emoji="🧹" label="Ordenar" hint="Colocar todo en su sitio (se puede deshacer)" onClick={() => (level >= 2 ? A.tidyEasy() : A.autoLayout())} />
      </nav>
    </div>
  );
}
