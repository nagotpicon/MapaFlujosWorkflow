import { useEffect } from 'react';
import { SPEEDS, useSim } from '../store/simStore';

/** Reproducción visual de la simulación. La velocidad no afecta al cálculo. */
export function useSimPlayback() {
  const play = useSim((s) => s.play);
  const speed = useSim((s) => s.speed);
  useEffect(() => {
    if (play !== 'playing') return;
    const t = setInterval(() => {
      const s = useSim.getState();
      if (!s.result) return;
      if (s.cursor >= s.result.iterationCount - 1) { useSim.setState({ play: 'paused' }); return; }
      useSim.setState({ cursor: s.cursor + 1, step: -1 });
    }, SPEEDS[speed]);
    return () => clearInterval(t);
  }, [play, speed]);
}
