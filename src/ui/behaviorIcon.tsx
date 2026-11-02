import { Database, Filter, Flame, Gauge, Minimize2, PackageOpen, Radar, ShieldCheck, Shuffle, SlidersHorizontal, Sparkles, Split, TrendingDown, X, type LucideProps } from 'lucide-react';
import type { BehaviorType } from '../core/model/schema';

const MAP: Record<BehaviorType, React.ComponentType<LucideProps>> = {
  generator: Sparkles, consumer: Flame, filter: Filter, transformer: Shuffle, multiplier: X, reducer: TrendingDown, accelerator: Gauge,
  restrictor: Minimize2, diverter: Split, accumulator: Database, releaser: PackageOpen, compensator: ShieldCheck, detector: Radar, controller: SlidersHorizontal,
};

export function BehaviorIcon({ type, ...rest }: { type: BehaviorType } & LucideProps) {
  const I = MAP[type];
  return <I strokeWidth={1.9} {...rest} />;
}
