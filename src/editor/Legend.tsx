/** Leyenda configurable según la vista activa. */
import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useUI } from '../store/uiStore';
import { useProject } from '../store/projectStore';
import { cx } from '../ui/primitives';
import * as A from '../app/actions';

type Item = { key: string; label: string; swatch: React.ReactNode };

const line = (color: string, w = 2, dash?: string, op = 1) => (
  <svg width="26" height="10" aria-hidden><line x1="1" y1="5" x2="25" y2="5" stroke={color} strokeWidth={w} strokeDasharray={dash} strokeOpacity={op} strokeLinecap="round" /></svg>
);
const dot = (color: string) => <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />;

function itemsFor(view: string, heat: boolean): Item[] {
  const base: Item[] = [];
  if (view === 'mental') base.push(
    { key: 'concept', label: 'Relación', swatch: line('var(--concept)') },
    { key: 'causal', label: 'Causal', swatch: line('var(--concept)', 1.5, '7 5') },
    { key: 'info', label: 'Informativa', swatch: line('var(--concept)', 1.5, '1.5 4') },
  );
  if (view === 'flow' || view === 'simulation') base.push(
    { key: 'qty', label: 'Grosor = cantidad', swatch: <span className="flex items-center gap-0.5">{line('var(--flow)', 1.5)}{line('var(--flow)', 6)}</span> },
    { key: 'quality', label: 'Opacidad = calidad', swatch: <span className="flex">{line('var(--flow)', 3, undefined, 0.45)}{line('var(--flow)', 3)}</span> },
    { key: 'speed', label: 'Partículas = velocidad', swatch: <span className="flex gap-1">{dot('var(--flow)')}{dot('var(--flow)')}</span> },
    { key: 'potential', label: 'Halo = potencial', swatch: <span className="inline-block h-2 w-6 rounded-full" style={{ background: 'var(--flow)', boxShadow: '0 0 6px var(--flow)' }} /> },
    { key: 'blocked', label: 'Bloqueada', swatch: line('var(--loss)', 2, '6 5') },
    { key: 'inactive', label: 'Sin flujo', swatch: line('var(--flow)', 2, '2 5', 0.4) },
  );
  if (view === 'energy') base.push(
    { key: 'gain', label: 'Impulso / ganancia', swatch: line('var(--gain)', 3) },
    { key: 'loss', label: 'Pérdida / fricción', swatch: line('var(--loss)', 3) },
    { key: 'flow', label: 'Flujo conservado', swatch: line('var(--flow)', 3) },
  );
  if (view === 'system') base.push(
    { key: 'pos', label: '+ refuerza', swatch: line('var(--transform)', 2, '7 5') },
    { key: 'neg', label: '− frena', swatch: line('var(--loss)', 2, '7 5') },
    { key: 'comp', label: '⊕ compensa', swatch: line('var(--gain)', 2, '7 5') },
    { key: 'cond', label: '◆ condición', swatch: <span className="text-cond">◆</span> },
  );
  if (heat) base.push(
    { key: 'cold', label: 'Frío', swatch: dot('var(--heat-cold)') },
    { key: 'rhythm', label: 'Ritmo perfecto', swatch: dot('var(--heat-rhythm)') },
    { key: 'warm', label: 'Caliente', swatch: dot('var(--heat-warm)') },
    { key: 'hot', label: 'Recalentado', swatch: dot('var(--heat-hot)') },
  );
  return base;
}

export function Legend() {
  const view = useUI((s) => s.view);
  const heat = useUI((s) => s.showHeat);
  const legend = useProject((s) => s.doc?.project.settings.legend);
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('mdf.legendOpen') === '1'; } catch { return false; } });
  const items = itemsFor(view, heat).filter((i) => legend?.items[i.key] !== false);
  if (!legend?.visible || !items.length) return null;
  return (
    <div className="absolute bottom-3 right-[184px] z-10 max-w-[230px] rounded-xl border border-line bg-surface/95 text-[11px] text-ink-2 shadow-soft backdrop-blur" data-testid="legend">
      <button type="button" className="flex w-full items-center gap-1.5 px-2.5 py-1.5 font-semibold text-ink-2" onClick={() => { setOpen(!open); try { localStorage.setItem('mdf.legendOpen', open ? '0' : '1'); } catch { /* */ } }} aria-expanded={open}>
        <Info className="size-3.5 text-ink-3" /> Leyenda
        <ChevronDown className={cx('ml-auto size-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul className="space-y-1 px-2.5 pb-2">
          {items.map((i) => (
            <li key={i.key} className="group flex items-center gap-2">
              <span className="flex w-7 justify-center">{i.swatch}</span>
              <span className="flex-1">{i.label}</span>
              <button type="button" className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink" aria-label={`Ocultar «${i.label}» de la leyenda`}
                onClick={() => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, legend: { ...d.project.settings.legend, items: { ...d.project.settings.legend.items, [i.key]: false } } } } }))}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
