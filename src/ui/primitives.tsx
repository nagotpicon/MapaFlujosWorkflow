/** Primitivas de interfaz accesibles (Radix) con el lenguaje visual de MAPA DE FLUJOS. */
import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip as RTooltip, Popover as RPopover, DropdownMenu as RMenu, Dialog as RDialog, Switch as RSwitch } from 'radix-ui';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

/* ---------------- Botones ---------------- */

type Variant = 'ghost' | 'subtle' | 'solid' | 'outline' | 'danger';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'xs' | 'sm' | 'md';
  active?: boolean;
  /** botón solo con icono: cuadrado y sin relleno horizontal */
  square?: boolean;
}

const VARIANT: Record<Variant, string> = {
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  subtle: 'bg-surface-2 text-ink hover:bg-surface-3',
  solid: 'bg-accent text-on-accent hover:opacity-90 shadow-sm',
  outline: 'border border-line text-ink hover:bg-surface-2',
  danger: 'text-loss hover:bg-[color-mix(in_srgb,var(--loss)_10%,transparent)]',
};
const SIZE = { xs: 'h-6 px-1.5 text-[11px] gap-1 rounded-md', sm: 'h-7 px-2 text-xs gap-1.5 rounded-lg', md: 'h-8 px-3 text-[13px] gap-2 rounded-lg' };
const SQUARE = { xs: 'size-6 rounded-md', sm: 'size-7 rounded-lg', md: 'size-8 rounded-lg' };

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'ghost', size = 'sm', active, square, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center font-medium select-none transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap',
        square ? `${SQUARE[size]} shrink-0 [&>svg]:shrink-0` : SIZE[size], VARIANT[variant], active && 'bg-accent-soft text-accent-text hover:bg-accent-soft', className,
      )}
    />
  );
});

interface IconBtnProps extends BtnProps { label: string; shortcut?: string; side?: 'top' | 'bottom' | 'left' | 'right' }
export const IconButton = forwardRef<HTMLButtonElement, IconBtnProps>(function IconButton({ label, shortcut, side = 'bottom', className, children, size = 'sm', ...rest }, ref) {
  return (
    <Tip label={label} shortcut={shortcut} side={side}>
      <Button ref={ref} aria-label={label} size={size} square className={className} {...rest}>
        {children}
      </Button>
    </Tip>
  );
});

/* ---------------- Tooltip ---------------- */

export function TipProvider({ children }: { children: ReactNode }) {
  return <RTooltip.Provider delayDuration={350} skipDelayDuration={150}>{children}</RTooltip.Provider>;
}

export function Tip({ label, shortcut, side = 'bottom', children }: { label: ReactNode; shortcut?: string; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactNode }) {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="z-[80] rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-bg shadow-lg mdf-fade-in flex items-center gap-2 max-w-64">
          <span>{label}</span>
          {shortcut && <Kbd inverted>{shortcut}</Kbd>}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

export function Kbd({ children, inverted }: { children: ReactNode; inverted?: boolean }) {
  return <kbd className={cx('rounded px-1 font-mono text-[10px] leading-4', inverted ? 'bg-white/15 text-bg' : 'border border-line bg-surface-2 text-ink-3')}>{children}</kbd>;
}

/* ---------------- Popover ---------------- */

export function Popover({ trigger, children, side = 'bottom', align = 'start', className, open, onOpenChange }: {
  trigger: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'center' | 'end'; className?: string;
  open?: boolean; onOpenChange?: (o: boolean) => void;
}) {
  return (
    <RPopover.Root open={open} onOpenChange={onOpenChange}>
      <RPopover.Trigger asChild>{trigger}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content side={side} align={align} sideOffset={8} collisionPadding={12}
          className={cx('z-[70] rounded-xl border border-line bg-surface p-3 shadow-float mdf-fade-in max-h-[80vh] overflow-auto', className)}>
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}

/* ---------------- Menú ---------------- */

export const Menu = {
  Root: RMenu.Root,
  Trigger: RMenu.Trigger,
  Content: ({ children, align = 'start', side = 'bottom' }: { children: ReactNode; align?: 'start' | 'end' | 'center'; side?: 'bottom' | 'top' | 'right' | 'left' }) => (
    <RMenu.Portal>
      <RMenu.Content align={align} side={side} sideOffset={6} collisionPadding={12} className="z-[75] max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-float mdf-fade-in">
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  ),
  Item: ({ children, onSelect, icon, shortcut, danger, disabled }: { children: ReactNode; onSelect?: () => void; icon?: ReactNode; shortcut?: string; danger?: boolean; disabled?: boolean }) => (
    <RMenu.Item disabled={disabled} onSelect={onSelect}
      className={cx('flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-[13px] outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-40', danger ? 'text-loss' : 'text-ink')}>
      <span className="w-4 text-ink-3 [&>svg]:size-4">{icon}</span>
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-[11px] text-ink-3">{shortcut}</span>}
    </RMenu.Item>
  ),
  Separator: () => <RMenu.Separator className="my-1 h-px bg-line" />,
  Label: ({ children }: { children: ReactNode }) => <RMenu.Label className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-3">{children}</RMenu.Label>,
  Sub: RMenu.Sub,
  SubTrigger: ({ children, icon }: { children: ReactNode; icon?: ReactNode }) => (
    <RMenu.SubTrigger className="flex h-8 cursor-default items-center gap-2 rounded-lg px-2 text-[13px] text-ink outline-none data-[highlighted]:bg-surface-2 data-[state=open]:bg-surface-2">
      <span className="w-4 text-ink-3 [&>svg]:size-4">{icon}</span><span className="flex-1">{children}</span><ChevronRight className="size-3.5 text-ink-3" />
    </RMenu.SubTrigger>
  ),
  SubContent: ({ children }: { children: ReactNode }) => (
    <RMenu.Portal>
      <RMenu.SubContent sideOffset={4} className="z-[76] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto min-w-48 rounded-xl border border-line bg-surface p-1 shadow-float mdf-fade-in">{children}</RMenu.SubContent>
    </RMenu.Portal>
  ),
};

/* ---------------- Diálogo / superposición ---------------- */

export function Modal({ open, onOpenChange, title, subtitle, children, width = 'max-w-2xl', full, icon }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: string; full?: boolean; icon?: ReactNode;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-[60] bg-[var(--overlay)] backdrop-blur-[2px] mdf-fade-in" />
        <RDialog.Content aria-describedby={undefined} tabIndex={-1}
          onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
          className={cx('fixed z-[61] outline-none flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-float mdf-slide-b',
            full ? 'inset-3 md:inset-6' : `left-1/2 top-[8vh] max-h-[84vh] w-[calc(100%-32px)] -translate-x-1/2 ${width}`)}>
          <div className="flex items-start gap-3 border-b border-line px-5 py-3.5">
            {icon && <div className="mt-0.5 text-accent [&>svg]:size-5">{icon}</div>}
            <div className="min-w-0 flex-1">
              <RDialog.Title className="text-[15px] font-semibold tracking-tight text-ink">{title}</RDialog.Title>
              {subtitle && <div className="text-xs text-ink-3">{subtitle}</div>}
            </div>
            <RDialog.Close asChild><IconButton label="Cerrar" side="left"><X className="size-4" /></IconButton></RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/* ---------------- Formularios ---------------- */

export function Field({ label, hint, children, inline }: { label: ReactNode; hint?: ReactNode; children: ReactNode; inline?: boolean }) {
  return (
    <label className={cx('block', inline ? 'flex items-center justify-between gap-3' : 'space-y-1')}>
      <span className="block text-[11px] font-medium text-ink-2">{label}{hint && <span className="ml-1 font-normal text-ink-3">· {hint}</span>}</span>
      {children}
    </label>
  );
}

export const inputCls = 'h-7 w-full rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink placeholder:text-ink-3 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]';

export function TextInput({ value, onChange, placeholder, className, ...rest }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input {...rest} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, className)} />;
}

export function TextArea({ value, onChange, placeholder, rows = 3, className, ...rest }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return <textarea {...rest} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'h-auto py-1.5 leading-snug resize-y', className)} />;
}

/** Entrada numérica que confirma al salir o con Enter (no altera el valor mientras se escribe). */
export function NumberInput({ value, onChange, min, max, step = 1, suffix, className, percent, ...rest }: {
  value: number | null; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; className?: string; percent?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max' | 'step'>) {
  const shown = value == null ? '' : percent ? String(Math.round(value * 1000) / 10) : String(Math.round(value * 10000) / 10000);
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  const commit = () => {
    const raw = draft.replace(',', '.').trim();
    if (raw === '') { setDraft(shown); return; }
    let v = Number(raw);
    if (!Number.isFinite(v)) { setDraft(shown); return; }
    if (percent) v /= 100;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    if (v !== value) onChange(v);
    else setDraft(shown);
  };
  return (
    <div className={cx('relative', className)}>
      <input {...rest} inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') setDraft(shown); }}
        className={cx(inputCls, 'tabular text-right', (suffix || percent) && 'pr-6')} />
      {(suffix || percent) && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-3">{percent ? '%' : suffix}</span>}
    </div>
  );
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input aria-label={label} type="range" className="mdf-range" min={min} max={max} step={step} value={v}
      onChange={(e) => setV(Number(e.target.value))}
      onPointerUp={() => v !== value && onChange(v)} onKeyUp={() => v !== value && onChange(v)} onBlur={() => v !== value && onChange(v)} />
  );
}

export function Select<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label?: string }) {
  return (
    <div className={cx('relative', className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(inputCls, 'appearance-none pr-6 cursor-pointer')}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <RSwitch.Root aria-label={label} checked={checked} onCheckedChange={onChange}
      className="relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-accent">
      <RSwitch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-[15px]" />
    </RSwitch.Root>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = 'sm', label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; size?: 'xs' | 'sm'; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-surface-2 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={cx('rounded-md font-medium transition-all', size === 'xs' ? 'h-5 px-1.5 text-[10.5px]' : 'h-6 px-2 text-[11.5px]',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Secciones ---------------- */

export function Section({ title, icon, children, defaultOpen = true, aside, count, testId }: { title: ReactNode; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean; aside?: ReactNode; count?: number; testId?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-line last:border-b-0" data-testid={testId}>
      <div className="flex items-center gap-1 px-4">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-2 py-2.5 text-left">
          <ChevronRight className={cx('size-3.5 text-ink-3 transition-transform', open && 'rotate-90')} />
          {icon && <span className="text-ink-3 [&>svg]:size-3.5">{icon}</span>}
          <span className="text-[11.5px] font-semibold tracking-wide text-ink-2">{title}</span>
          {count != null && count > 0 && <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular text-ink-3">{count}</span>}
        </button>
        {aside}
      </div>
      {open && <div className="space-y-3 px-4 pb-4 mdf-fade-in">{children}</div>}
    </section>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'flow' | 'gain' | 'loss' | 'cond' | 'transform' | 'accent'; className?: string }) {
  const t = {
    neutral: 'bg-surface-2 text-ink-2',
    flow: 'bg-[color-mix(in_srgb,var(--flow)_14%,transparent)] text-flow',
    gain: 'bg-[color-mix(in_srgb,var(--gain)_14%,transparent)] text-gain',
    loss: 'bg-[color-mix(in_srgb,var(--loss)_13%,transparent)] text-loss',
    cond: 'bg-[color-mix(in_srgb,var(--condition)_15%,transparent)] text-cond',
    transform: 'bg-[color-mix(in_srgb,var(--transform)_14%,transparent)] text-transform',
    accent: 'bg-accent-soft text-accent-text',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-px text-[10.5px] font-medium', t, className)}>{children}</span>;
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="rounded-xl bg-surface-2 p-2.5 text-ink-3 [&>svg]:size-5">{icon}</div>}
      <div className="text-[13px] font-medium text-ink">{title}</div>
      {children && <div className="max-w-xs text-xs text-ink-3">{children}</div>}
    </div>
  );
}

export const fmt = (n: number | null | undefined, d = 1) => {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  return n.toLocaleString('es-ES', { maximumFractionDigits: a >= 100 ? 0 : a >= 10 ? Math.min(d, 1) : Math.max(d, 2), minimumFractionDigits: 0 });
};
export const pct = (r: number | null | undefined, d = 0) => (r == null || !Number.isFinite(r) ? '—' : `${(r * 100).toLocaleString('es-ES', { maximumFractionDigits: d })} %`);
