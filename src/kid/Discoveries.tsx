/**
 * «Lo que he descubierto» y «Mi plan»: el análisis del mapa contado como lo
 * contaría alguien que te quiere ayudar, sin palabras técnicas.
 */
import { ClipboardCopy, Download, ListChecks, Search } from 'lucide-react';
import { useMemo } from 'react';
import * as A from '../app/actions';
import { download } from '../app/io';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { Button, cx } from '../ui/primitives';
import { descubrimientos, miPlan } from './guide';
import { preguntarOtraVez } from './kidActions';
import { useKid } from './kidStore';
import { Ico, IcoText } from '../ui/ico';

const num = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

function Dots({ value }: { value: number }) {
  const n = Math.round(value);
  const tone = value >= 8 ? 'var(--gain)' : value >= 5 ? 'var(--condition)' : 'var(--loss)';
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => <span key={i} className="size-4 rounded-full border-2" style={{ background: i < n ? tone : 'transparent', borderColor: i < n ? tone : 'var(--border-strong)' }} />)}
    </span>
  );
}

export function DiscoverPanel() {
  const doc = useProject((s) => s.doc)!;
  const a = useKid((s) => s.analysis);
  const all = useMemo(() => descubrimientos(doc, a), [doc, a]);
  const head = all.find((x) => x.id === 'llegan');
  const items = all.filter((x) => x.id !== 'llegan');
  const go = (id: string) => { useUI.setState({ overlay: null }); useUI.getState().setSelection([id]); setTimeout(() => A.fit([id]), 80); };
  return (
    <div className="space-y-4 px-6 pb-6 pt-1" data-testid="discover">
      {a?.listo && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-2/70 px-5 py-4">
          <div className="font-display text-[34px] leading-none text-ink tabular">{num(a.llegan)}<span className="text-[18px] text-ink-3"> de 10</span></div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Dots value={a.llegan} />
            <p className="text-[14px] font-medium text-ink" data-testid="discover-head">{head?.text ?? 'De cada 10 empujones que salen de «Hoy», estos llegan a lo que quieres.'}</p>
            {head?.detail && <p className="text-[13px] text-ink-3">{head.detail}</p>}
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} data-testid="discover-item" data-kind={it.id.split(':')[0]}
            className={cx('flex items-start gap-3 rounded-xl border px-4 py-3', it.tone === 'warn' ? 'border-[color-mix(in_srgb,var(--loss)_30%,transparent)] bg-[color-mix(in_srgb,var(--loss)_5%,transparent)]' : it.tone === 'good' ? 'border-[color-mix(in_srgb,var(--gain)_30%,transparent)] bg-[color-mix(in_srgb,var(--gain)_5%,transparent)]' : 'border-line')}>
            <Ico e={it.emoji} size={20} className="mt-[1px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium leading-snug text-ink"><IcoText text={it.text} /></p>
              {it.detail && <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{it.detail}</p>}
              {(it.focus || it.ask) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {it.ask && <Button size="sm" variant="solid" onClick={() => preguntarOtraVez(it.ask!)}>🧭 Pregúntame</Button>}
                  {it.focus && <Button size="sm" variant="outline" onClick={() => go(it.focus!)}>Verlo en el mapa</Button>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="solid" size="md" onClick={() => useUI.setState({ overlay: 'plan' })} data-testid="open-plan"><ListChecks className="size-4" />Ver mi plan</Button>
        <span className="flex-1" />
        <p className="self-center text-[12px] text-ink-3">Lo calculo con tu mapa tal como está. Si cambias algo, vuelvo a mirar.</p>
      </div>
    </div>
  );
}

export function PlanPanel() {
  const doc = useProject((s) => s.doc)!;
  const a = useKid((s) => s.analysis);
  const plan = useMemo(() => miPlan(doc, a), [doc, a]);
  const text = `${plan.lines.join('\n')}${plan.story ? `\n\nContado como a un amigo:\n${plan.story}` : ''}\n`;
  return (
    <div className="space-y-4 px-6 pb-6 pt-1" data-testid="plan">
      {plan.story && (
        <div className="rounded-2xl bg-accent-soft px-5 py-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent-text">Contado como a un amigo</div>
          <p className="font-display text-[17px] leading-relaxed text-ink" data-testid="plan-story">{plan.story}</p>
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded-2xl border border-line bg-surface px-5 py-4 font-sans text-[14.5px] leading-relaxed text-ink" data-testid="plan-lines">{plan.lines.join('\n')}</pre>
      <div className="flex flex-wrap gap-2">
        <Button variant="solid" size="md" onClick={async () => { try { await navigator.clipboard.writeText(text); useUI.getState().notify('Copiado', 'success'); } catch { useUI.getState().notify('No he podido copiar: selecciona el texto y cópialo', 'error'); } }} data-testid="plan-copy"><ClipboardCopy className="size-4" />Copiar</Button>
        <Button variant="outline" size="md" onClick={() => download(text, `mi-plan-${doc.project.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.txt`, 'text/plain')} data-testid="plan-download"><Download className="size-4" />Descargar</Button>
        <Button variant="ghost" size="md" onClick={() => useUI.setState({ overlay: 'discover' })}><Search className="size-4" />Lo que he descubierto</Button>
      </div>
    </div>
  );
}
