/** Selector de nivel: 1 Ideas · 2 Movimiento · 3 Todo (sobre una bandeja de madera). */
import { LEVELS, setLevel, useLevel } from './levels';
import { Tip, cx } from '../ui/primitives';

const SUB: Record<number, string> = { 1: 'solo ideas', 2: 'de hoy a tu meta', 3: 'todas las herramientas' };

export function LevelSwitch() {
  const level = useLevel();
  return (
    <div role="radiogroup" aria-label="Nivel" className="mdf-wood inline-flex shrink-0 items-center gap-0.5 rounded-xl p-0.5" data-testid="level-switch">
      {LEVELS.map((l) => (
        <Tip key={l.level} label={l.hint}>
          <button type="button" role="radio" aria-label={`Nivel ${l.level}: ${l.label}`} aria-checked={level === l.level} onClick={() => setLevel(l.level)} data-testid={`level-${l.level}`}
            className={cx('flex items-center gap-1.5 rounded-[9px] px-2 py-1 text-left transition-all',
              level === l.level ? 'bg-surface text-ink shadow-sm' : 'text-wood-text hover:text-ink')}>
            <span className={cx('flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular', level === l.level ? 'bg-accent text-white' : 'bg-wood/50 text-wood-text')}>{l.level}</span>
            <span className="flex flex-col leading-tight">
              <span className="whitespace-nowrap text-[12px] font-medium">{l.label}</span>
              <span className="hidden whitespace-nowrap text-[9.5px] opacity-75 md:inline">{SUB[l.level]}</span>
            </span>
          </button>
        </Tip>
      ))}
    </div>
  );
}
