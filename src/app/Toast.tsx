import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useUI } from '../store/uiStore';
import { IcoText } from '../ui/ico';

export function Toast() {
  const toast = useUI((s) => s.toast);
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = setTimeout(() => setShown(null), toast.tone === 'error' ? 6000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!shown) return null;
  const Icon = shown.tone === 'error' ? CircleAlert : shown.tone === 'success' ? CircleCheck : Info;
  return (
    <div role="status" aria-live="polite" data-testid="toast"
      className="fixed right-4 top-[68px] z-[100] flex max-w-sm items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink shadow-float mdf-slide-b">
      <Icon className={`size-4 shrink-0 ${shown.tone === 'error' ? 'text-loss' : shown.tone === 'success' ? 'text-gain' : 'text-accent'}`} />
      <span><IcoText text={shown.text} size={14} /></span>
    </div>
  );
}
