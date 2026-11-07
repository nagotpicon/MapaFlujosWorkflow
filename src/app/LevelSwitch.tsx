/** Selector de nivel: 1 Ideas · 2 Movimiento · 3 Todo (sobre una bandeja de madera). */
import { LEVELS, setLevel, useLevel } from './levels';
import { Tip, cx } from '../ui/primitives';

export function LevelSwitch() {
  const level = useLevel();
  return (
    <div role="radiogroup" aria-label="Nivel" className="mdf-wood inline-flex shrink-0 items-center gap-0.5 rounded-xl p-0.5" data-testid="level-switch">
      {LEVELS.map((l) => (
        <Tip key={l.level} label={l.hint}>
          <button type="button" role="radio" aria-label={`Nivel ${l.level}: ${l.label}`} aria-checked={level === l.level} onClick={() => setLevel(l.level)} data-testid={`level-${l.level}`}
            className={cx('flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium transition-all',
              level === l.level ? 'bg-surface text-ink shadow-sm' : 'text-wood-text hover:text-ink')}>
            <span className={cx('flex size-4 items-center justify-center rounded-full text-[10px] font-bold tabular', level === l.level ? 'bg-accent text-white' : 'bg-wood/50 text-wood-text')}>{l.level}</span>
            <span className={level === 3 ? 'hidden 2xl:inline' : 'hidden sm:inline'}>{l.label}</span>
          </button>
        </Tip>
      ))}
    </div>
  );
}
