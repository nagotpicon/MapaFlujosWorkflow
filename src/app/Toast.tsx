import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useUI } from '../store/uiStore';

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
      className="fixed bottom-6 left-1/2 z-[100] flex max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink shadow-float mdf-slide-b">
      <Icon className={`size-4 shrink-0 ${shown.tone === 'error' ? 'text-loss' : shown.tone === 'success' ? 'text-gain' : 'text-accent'}`} />
      {shown.text}
    </div>
  );
}
