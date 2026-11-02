import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, TriangleAlert } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { runEngine } from '../engine/client';
import type { ScenarioComparison } from '../engine/analysis';
import { Badge, Select, fmt, pct } from '../ui/primitives';
import { LineChart } from '../ui/charts';

export function ComparePanel() {
  const doc = useProject((s) => s.doc)!;
  const list = Object.values(doc.scenarios).sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.createdAt - b.createdAt);
  const [a, setA] = useState(list[0]?.id ?? '');
  const [b, setB] = useState((list.find((s) => s.id === doc.project.activeScenarioId && !s.isBase) ?? list[1] ?? list[0])?.id ?? '');
  const [cmp, setCmp] = useState<ScenarioComparison | null>(null);
  useEffect(() => {
    if (!a || !b) return;
    setCmp(null);
    void runEngine('compare', doc, a, b, doc.project.settings.simulation.iterations).then(setCmp);
  }, [a, b, doc]);
  const SA = doc.scenarios[a];
  const SB = doc.scenarios[b];
  const opts = list.map((s) => ({ value: s.id, label: s.name }));
  const q = cmp?.dimensionDeltas.find((d) => d.dimension === 'quantity');
  return (
    <div className="space-y-4 px-5 py-4" data-testid="compare">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="size-2 rounded-full" style={{ background: SA?.color }} /><Select label="Escenario A" className="w-56" value={a} onChange={setA} options={opts} />
        <span className="text-ink-3">frente a</span>
        <span className="size-2 rounded-full" style={{ background: SB?.color }} /><Select label="Escenario B" className="w-56" value={b} onChange={setB} options={opts} />
        {cmp?.hypothesisBased && <Badge tone="cond"><TriangleAlert className="size-3" />Basado en hipótesis: resultados orientativos</Badge>}
      </div>
      {!cmp ? <div className="flex h-40 items-center justify-center text-ink-3"><Loader2 className="size-5 animate-spin" /></div> : (
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl border border-line p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-ink-3">Resultado total</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-[13px] text-ink-2">{fmt(q?.a)}</span><span className="text-ink-3">→</span>
                <span className="text-[28px] font-semibold tabular text-ink" data-testid="compare-b">{fmt(q?.b)}</span>
                {q && <span className={q.delta >= 0 ? 'text-gain' : 'text-loss'}>{q.delta >= 0 ? '+' : ''}{fmt(q.delta)} ({q.a ? pct(q.delta / q.a) : '—'})</span>}
              </div>
              <div className="mt-3 space-y-1 text-[12px]">
                {cmp.dimensionDeltas.filter((d) => d.dimension !== 'quantity').map((d) => <div key={d.dimension} className="flex justify-between text-ink-2"><span>{d.name}</span><span className="tabular">{fmt(d.a)} → <b className="text-ink">{fmt(d.b)}</b></span></div>)}
                {cmp.intensiveDeltas.map((d) => <div key={d.dimension} className="flex justify-between text-ink-2"><span>{d.name} (final)</span><span className="tabular">{fmt(d.a, 2)} → <b className="text-ink">{fmt(d.b, 2)}</b></span></div>)}
              </div>
            </div>
            <div className="rounded-2xl border border-line p-4">
              <LineChart height={170} series={[
                { id: 'a', label: SA?.name ?? 'A', color: 'var(--concept)', values: cmp.seriesA, dashed: true },
                { id: 'b', label: SB?.name ?? 'B', color: 'var(--accent)', values: cmp.seriesB },
              ]} testId="compare-chart" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <List title="Mejoran" icon={<ArrowUpRight className="size-4 text-gain" />} items={cmp.improved.slice(0, 8).map((d) => `${d.title}: ${fmt(d.a)} → ${fmt(d.b)}${d.pct != null ? ` (+${pct(d.pct)})` : ''}`)} />
            <List title="Empeoran" icon={<ArrowDownRight className="size-4 text-loss" />} items={cmp.worsened.slice(0, 8).map((d) => `${d.title}: ${fmt(d.a)} → ${fmt(d.b)}${d.pct != null ? ` (${pct(d.pct)})` : ''}`)} />
            <div className="space-y-3">
              <List title="Nuevos cuellos de botella" items={cmp.newBottlenecks} empty="Ninguno" />
              <List title="Cuellos resueltos" items={cmp.resolvedBottlenecks} empty="Ninguno" />
              <List title="Cambios en circuitos" items={cmp.loopChanges.map((l) => `${l.label}: ${l.change}`)} empty="Sin cambios" />
            </div>
          </div>
          <List title="Parámetros que difieren" items={cmp.parameterDiffs.map((p) => `${p.label}: ${JSON.stringify(p.a)} → ${JSON.stringify(p.b)}`)} empty="Los dos escenarios tienen la misma configuración." />
        </>
      )}
    </div>
  );
}

function List({ title, items, icon, empty = '—' }: { title: string; items: string[]; icon?: React.ReactNode; empty?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink">{icon}{title}</div>
      {items.length ? <ul className="space-y-0.5 text-[12px] text-ink-2">{items.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="text-[12px] text-ink-3">{empty}</p>}
    </div>
  );
}
