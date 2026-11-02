import { useEffect, useState } from 'react';
import { useUI } from '../store/uiStore';

export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useUI((s) => s.theme);
  const [sys, setSys] = useState<'light' | 'dark'>(() => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setSys(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const resolved = pref === 'system' ? sys : pref;
  useEffect(() => { document.documentElement.dataset.theme = resolved; }, [resolved]);
  return resolved;
}
