/**
 * El medidor del camino: de cada 10 empujones que salen de Hoy, cuántos llegan
 * a lo que quieres. Diez bolitas, sin vueltas ni números raros. Cuando cambias
 * algo, enseña cuánto ha subido o bajado.
 */
import { useEffect, useState } from 'react';
import { useUI } from '../store/uiStore';
import { cx } from '../ui/primitives';
import { useKid } from './kidStore';
import { Ico, IcoText } from '../ui/ico';

const num = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

export function Meter() {
  const a = useKid((s) => s.analysis);
  const delta = useKid((s) => s.delta);
  const [showDelta, setShowDelta] = useState(false);
  useEffect(() => {
    if (!delta) return;
    setShowDelta(true);
    const t = setTimeout(() => setShowDelta(false), 2600);
    return () => clearTimeout(t);
  }, [delta?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return null;
  const open = () => useUI.setState({ overlay: 'discover' });
  if (!a.listo) {
    const hint = a.falta === 'meta' ? 'Pon lo que quieres conseguir 🎯' : a.falta === 'hoy' ? 'Pon cómo está la cosa hoy 🌱' : 'Une Hoy con lo que quieres, paso a paso 👣';
    return (
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
        <div className="mdf-paper pointer-events-auto rounded-full px-4 py-2 text-[13px] text-ink-2" data-testid="kid-meter" data-ready="false"><IcoText text={`🧭 ${hint}`} size={14} /></div>
      </div>
    );
  }
  const tone = a.llegan >= 8 ? 'var(--gain)' : a.llegan >= 5 ? 'var(--condition)' : 'var(--loss)';
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
      <button type="button" onClick={open} data-testid="kid-meter" data-ready="true" title="¿Por qué? Mira lo que he descubierto"
        className="mdf-paper mdf-rise pointer-events-auto relative flex items-center gap-3 rounded-full py-1.5 pl-4 pr-2 text-[13.5px] text-ink-2 transition-shadow hover:shadow-md">
        <Ico e="🎯" size={16} />
        <span>Llegan <b className="font-display text-[19px] tabular text-ink" data-testid="kid-meter-value">{num(a.llegan)}</b> de cada 10</span>
        <span className="flex gap-[3px]" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="size-[11px] rounded-full border transition-colors duration-500"
              style={{ background: i < a.de10 ? tone : 'transparent', borderColor: i < a.de10 ? tone : 'var(--border-strong)' }} />
          ))}
        </span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[12.5px] font-semibold text-accent-text">¿Por qué?</span>
        {showDelta && delta && (
          <span data-testid="kid-meter-delta" className={cx('mdf-rise absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[12.5px] font-bold text-white shadow-sm', delta.value > 0 ? 'bg-[var(--gain)]' : 'bg-[var(--loss)]')}>
            {delta.value > 0 ? `+${num(delta.value)} 🎉` : `${num(delta.value)}`}
          </span>
        )}
      </button>
    </div>
  );
}
