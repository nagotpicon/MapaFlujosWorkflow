/** Panel monitor: métricas que determinan el éxito, fricciones y puntos neurálgicos. */
import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Thermometer, TriangleAlert } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { runEngine } from '../engine/client';
import type { EngineResult } from '../engine/api';
import { HEAT_LABEL, type HeatState } from '../engine/heat';
import * as A from '../app/actions';
import { Badge, Empty, cx, fmt, pct } from '../ui/primitives';
import { BarList, LineChart } from '../ui/charts';
import { DiagnosticItem } from './BottomPanel';

type MonitorRes = EngineResult<'monitor'>;
const HEAT_VAR: Record<HeatState, string> = { cold: 'var(--heat-cold)', rhythm: 'var(--heat-rhythm)', warm: 'var(--heat-warm)', overheated: 'var(--heat-hot)', idle: 'var(--surface-2)' };

export function useMonitorData() {
  const doc = useProject((s) => s.doc);
  const [data, setData] = useState<MonitorRes | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!doc) return;
    let alive = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await runEngine('monitor', doc, doc.project.activeScenarioId, doc.project.settings.simulation.iterations);
        if (alive) setData(r);
      } finally { if (alive) setBusy(false); }
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [doc]);
  return { data, busy };
}

function Tile({ label, value, sub, tone, icon, testId }: { label: string; value: string; sub?: string; tone?: string; icon?: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4" data-testid={testId}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</div>
      <div className={cx('mt-1 flex items-center gap-1.5 text-[26px] font-semibold leading-none tracking-tight tabular text-ink', tone)}>{icon}{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

function Card({ title, children, aside, className }: { title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface p-4', className)}>
      <div className="mb-3 flex items-center gap-2"><h3 className="flex-1 text-[13px] font-semibold text-ink">{title}</h3>{aside}</div>
      {children}
    </section>
  );
}

export function MonitorPanel() {
  const doc = useProject((s) => s.doc)!;
  const { data, busy } = useMonitorData();
  if (!data) return <div className="flex h-full items-center justify-center text-ink-3"><Loader2 className="size-5 animate-spin" /></div>;
  const m = data.monitor;
  const k = m.kpis;
  const unit = m.unit;
  const scenario = doc.project.activeScenarioId ? doc.scenarios[doc.project.activeScenarioId] : undefined;
  const survival = m.funnel.length > 1 && m.funnel[0].value > 0 ? m.funnel[m.funnel.length - 1].value / m.funnel[0].value : k.efficiency;
  const go = (ids: string[]) => { useUI.setState({ overlay: null }); useUI.getState().setSelection(ids); setTimeout(() => A.fit(ids), 80); };
  const heatRows = (m.funnel.length ? m.funnel.map((f) => f.nodeId) : Object.keys(data.heat.nodes)).filter((id) => data.heat.nodes[id]).slice(0, 14);
  const N = m.series.result.length;
  return (
    <div className="h-full overflow-auto bg-bg p-5" data-testid="monitor">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-2">
          <span className="size-2 rounded-full" style={{ background: scenario?.color }} />Mirando <b className="text-ink">{scenario?.name}</b>
          <span className="text-ink-3">· {N} vueltas</span>
          {(k.hypotheses + k.approximations) > 0 && <Badge tone="cond"><TriangleAlert className="size-3" />{k.hypotheses + k.approximations} cosas supuestas: tómalo como orientación</Badge>}
          {busy && <Loader2 className="size-3.5 animate-spin text-ink-3" />}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Tile label="Llega a la meta" value={fmt(k.totalResult)} sub={`${unit} en total · última vuelta ${fmt(k.lastResult)}`} testId="tile-result" />
          <Tile label="Sobrevive" value={pct(survival)} sub="de lo que sale del inicio" tone={survival < 0.2 ? 'text-loss' : survival > 0.5 ? 'text-gain' : undefined} testId="tile-survival" />
          <Tile label="Aprovechas" value={pct(k.efficiency)} sub="de todo lo que se mueve" />
          <Tile label="Se pierde" value={pct(k.lostPct)} sub="por el camino" tone={k.lostPct > 0.5 ? 'text-loss' : undefined} />
          <Tile label="Va a…" value={k.trendPct == null ? '—' : pct(k.trendPct)} sub="la 2.ª mitad frente a la 1.ª"
            icon={k.trendPct == null ? null : k.trendPct >= 0 ? <ArrowUpRight className="size-5 text-gain" /> : <ArrowDownRight className="size-5 text-loss" />} />
          <Tile label="Atascos" value={String(k.saturatedElements)} sub={`${k.activeLoops} bucle(s) en marcha`} tone={k.saturatedElements ? 'text-cond' : undefined} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <Card title="Por dónde se va perdiendo" aside={<span className="text-[11px] text-ink-3">% que sigue vivo desde el inicio</span>}>
            {m.funnel.length < 2 ? <Empty title="Todavía no hay un camino completo">Une el inicio con la meta, paso a paso.</Empty> : (
              <ol className="space-y-2" data-testid="funnel">
                {m.funnel.map((f, i) => (
                  <li key={f.nodeId}>
                    <button type="button" className="group w-full text-left" onClick={() => go([f.nodeId])}>
                      <div className="flex items-baseline gap-2 text-[12.5px]">
                        <span className="w-5 text-right text-[11px] tabular text-ink-3">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-ink group-hover:underline">{f.title}</span>
                        {i > 0 && <span className={cx('text-[11px] tabular', f.pctOfPrev < 0.6 ? 'text-loss' : 'text-ink-3')}>{f.pctOfPrev < 1 ? `−${pct(1 - f.pctOfPrev)} en este paso` : f.pctOfPrev > 1 ? `+${pct(f.pctOfPrev - 1)}` : 'sin pérdida'}</span>}
                        <span className="w-14 text-right font-semibold tabular text-ink">{pct(f.pctOfStart)}</span>
                        <span className="w-16 text-right text-[11px] tabular text-ink-3">{fmt(f.value)}</span>
                      </div>
                      <div className="ml-7 mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(1.5, Math.min(100, f.pctOfStart * 100))}%`, background: 'var(--flow)', opacity: 0.45 + 0.55 * Math.min(1, f.pctOfStart) }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Termómetro: qué se agobia y cuándo" aside={<Thermometer className="size-4 text-ink-3" />}>
            {heatRows.length === 0 ? <Empty title="Aún no hay nada que medir" /> : (
              <div data-testid="heat-strip">
                <div className="space-y-1">
                  {heatRows.map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <button type="button" className="w-32 truncate text-left text-[11.5px] text-ink-2 hover:underline" onClick={() => go([id])}>{doc.nodes[id]?.title}</button>
                      <div className="flex flex-1 gap-[2px]">
                        {data.heat.nodes[id].map((h, i) => (
                          <div key={i} className="h-5 flex-1 rounded-[4px]" style={{ background: HEAT_VAR[h.state], opacity: h.state === 'idle' ? 1 : 0.35 + Math.abs(h.temperature) * 0.65 }}
                            title={`Vuelta ${i + 1} · ${HEAT_LABEL[h.state]}${h.causes.length ? `: ${h.causes.join(' · ')}` : ''}`} />
                        ))}
                      </div>
                      <span className="w-24 text-right text-[10.5px] text-ink-3">{HEAT_LABEL[data.heat.nodeAvg[id].state]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-2">
                  {(['cold', 'rhythm', 'warm', 'overheated'] as HeatState[]).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: HEAT_VAR[s] }} />{HEAT_LABEL[s]}</span>)}
                  <span className="text-ink-3">· cada columna es una vuelta</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Lo que más te frena" aside={<span className="text-[11px] text-ink-3">lo que ganarías si lo arreglas</span>}>
            {m.frictions.filter((f) => f.impact > 1e-6).length === 0 ? <Empty title="Nada te frena de forma clara" /> : (
              <BarList testId="frictions" unit={unit} signed items={m.frictions.filter((f) => f.impact > 1e-6).slice(0, 8).map((f) => ({
                id: f.nodeId, label: f.title, value: f.impact, color: 'var(--loss)', badge: `${pct(f.impactPct)}${f.hypothesis ? ' ≈' : ''}`,
                detail: `${f.reason}${f.category ? ` · fricción ${f.category === 'personal' ? 'propia' : f.category === 'external' ? 'externa' : 'del sistema'}` : ''}${f.hypothesis ? ' · basada en hipótesis' : ''}`, onClick: () => go([f.nodeId]),
              }))} />
            )}
            <p className="mt-3 text-[10.5px] text-ink-3">Calculado probando tu mapa sin cada freno y comparando. ≈ = depende de cosas que has supuesto.</p>
          </Card>
          <Card title="Lo que más te ayuda" aside={<span className="text-[11px] text-ink-3">lo que perderías sin ello</span>}>
            {m.drivers.filter((d) => d.impact > 1e-6).length === 0 ? <Empty title="Nada destaca todavía" /> : (
              <BarList testId="drivers" unit={unit} items={m.drivers.filter((d) => d.impact > 1e-6).slice(0, 8).map((d) => ({
                id: d.nodeId, label: d.title, value: d.impact, color: 'var(--gain)', badge: `${pct(d.impactPct)}${d.hypothesis ? ' ≈' : ''}`, detail: d.reason, onClick: () => go([d.nodeId]),
              }))} />
            )}
          </Card>
          <Card title="Lo primero que arreglaría">
            {m.neuralgic.length === 0 ? <Empty title="No veo nada urgente" /> : <ul className="space-y-1.5" data-testid="neuralgic">{m.neuralgic.slice(0, 6).map((d) => <DiagnosticItem key={d.id} d={d} />)}</ul>}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Cómo va vuelta a vuelta">
            <LineChart height={170} unit={unit} series={[
              { id: 'r', label: 'Resultado', color: 'var(--gain)', values: m.series.result },
              { id: 'g', label: 'Generado', color: 'var(--flow)', values: m.series.generated, dashed: true },
              { id: 'l', label: 'Perdido', color: 'var(--loss)', values: m.series.lost, dashed: true },
            ]} />
          </Card>
          <Card title="Frenos que has encontrado">
            {m.frictionStatus.total === 0 ? (
              <p className="text-[12px] text-ink-3">Cuando «Ayúdame a pensar» te propone frenos (tuyos, de fuera o del propio sistema), aquí ves en cuántos ya has decidido qué hacer: quitarlo, convivir con él, compensarlo o ir por otro camino.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-6">
                  <div><div className="text-[26px] font-semibold tabular text-ink">{m.frictionStatus.resolved}/{m.frictionStatus.total}</div><div className="text-[11px] text-ink-3">con decisión tomada</div></div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gain" style={{ width: `${(m.frictionStatus.resolved / m.frictionStatus.total) * 100}%` }} /></div>
                </div>
                <BarList items={([['personal', 'Propias'], ['external', 'Externas'], ['system', 'Del sistema'], ['unclassified', 'Sin clasificar']] as const).filter(([c]) => m.frictionStatus.byCategory[c] > 0).map(([c, l]) => ({ id: c, label: l, value: m.frictionStatus.byCategory[c], color: 'var(--transform)' }))} />
              </div>
            )}
          </Card>
        </div>
        {data.frameNotes.length > 0 && (
          <Card title="Lo que cambia por la cuadrícula del tiempo">
            <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-ink-2">{data.frameNotes.slice(0, 12).map((n, i) => <li key={i}>{n}</li>)}</ul>
          </Card>
        )}
      </div>
    </div>
  );
}
