/** Panel inferior plegable: control de la simulación, resultados, diagnóstico, escenarios, historial y eventos. */
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronsLeft, ChevronsRight, CircleAlert, CircleCheck, Footprints, Info, Loader2, Pause, Play, RotateCcw, Save, Square, TriangleAlert,
  Gauge, Sparkles, GitCompare, CopyPlus, Trash2, Plus, Radio, X,
} from 'lucide-react';
import { useProject } from '../store/projectStore';
import { SPEEDS, requestSimulation, useSim, type SpeedKey } from '../store/simStore';
import { useUI, writeLS, type BottomTab } from '../store/uiStore';
import { qty, PRIMARY } from '../engine/packet';
import { diagnose, type Diagnostic } from '../engine/diagnostics';
import { runEngine } from '../engine/client';
import { listNumericParams, type ParamRef } from '../engine/analysis';
import * as op from '../core/operations';
import * as A from '../app/actions';
import * as repo from '../persistence/repository';
import { Badge, Button, Empty, IconButton, NumberInput, Segmented, Select, Tip, cx, fmt, pct } from '../ui/primitives';
import { LineChart, Sparkline } from '../ui/charts';
import type { SimulationRunSummary } from '../core/model/schema';
import { setView } from '../app/useShortcuts';

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'simulation', label: 'Simulación' }, { id: 'results', label: 'Resultados' }, { id: 'diagnostics', label: 'Diagnóstico' },
  { id: 'scenarios', label: 'Escenarios' }, { id: 'history', label: 'Iteraciones' }, { id: 'events', label: 'Eventos' },
];

export function BottomPanel() {
  const tab = useUI((s) => s.bottomTab);
  const status = useSim((s) => s.status);
  const diagCount = useSim((s) => s.diagnostics.filter((d) => d.severity === 'critical' || d.severity === 'warning').length);
  const [height, setHeight] = useState(() => { try { return Number(localStorage.getItem('mdf.bottomH')) || 250; } catch { return 250; } });
  const startDrag = (e: React.PointerEvent) => {
    const y0 = e.clientY;
    const h0 = height;
    const move = (ev: PointerEvent) => setHeight(Math.max(150, Math.min(window.innerHeight * 0.7, h0 + (y0 - ev.clientY))));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); try { localStorage.setItem('mdf.bottomH', String(height)); } catch { /* */ } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <section className="relative flex shrink-0 flex-col border-t border-line bg-surface mdf-slide-b" style={{ height }} aria-label="Panel de simulación" data-testid="bottom-panel">
      <div className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize" onPointerDown={startDrag} aria-hidden />
      <div className="flex items-center gap-1 border-b border-line px-3" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => useUI.setState({ bottomTab: t.id })} data-testid={`tab-${t.id}`}
            className={cx('relative h-9 px-2.5 text-[12px] font-medium transition-colors', tab === t.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}>
            {t.label}
            {t.id === 'diagnostics' && diagCount > 0 && <span className="ml-1 rounded-full bg-[color-mix(in_srgb,var(--loss)_15%,transparent)] px-1.5 text-[10px] text-loss tabular">{diagCount}</span>}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
        <div className="flex-1" />
        {status === 'running' && <Loader2 className="size-3.5 animate-spin text-ink-3" aria-label="Calculando" />}
        <IconButton label="Ocultar panel" onClick={() => { useUI.setState({ bottomOpen: false }); writeLS('mdf.bottomOpen', false); }}><ChevronDown className="size-4" /></IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'simulation' && <SimulationTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'diagnostics' && <DiagnosticsTab />}
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'events' && <EventsTab />}
      </div>
    </section>
  );
}

function Kpi({ label, value, sub, tone, testId }: { label: string; value: string; sub?: string; tone?: string; testId?: string }) {
  return (
    <div className="min-w-[96px]" data-testid={testId}>
      <div className="text-[10.5px] font-medium uppercase tracking-wider text-ink-3">{label}</div>
      <div className={cx('text-[20px] font-semibold leading-tight tracking-tight tabular text-ink', tone)}>{value}</div>
      {sub && <div className="text-[10.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

function SimulationTab() {
  const doc = useProject((s) => s.doc)!;
  const r = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  const step = useSim((s) => s.step);
  const play = useSim((s) => s.play);
  const speed = useSim((s) => s.speed);
  const live = useSim((s) => s.live);
  const view = useUI((s) => s.view);
  const it = r?.iterations[cursor];
  const unit = doc.dimensions.quantity?.unit || 'u.';
  const playPause = () => { if (view === 'mental') setView('simulation'); useSim.setState({ play: play === 'playing' ? 'paused' : 'playing', step: -1, ...(play === 'stopped' || (r && cursor >= r.iterationCount - 1) ? { cursor: 0 } : {}) }); };
  const stop = () => useSim.setState({ play: 'stopped', cursor: 0, step: -1 });
  const reset = () => { useSim.setState({ play: 'stopped', cursor: 0, step: -1 }); requestSimulation(doc, { force: true, immediate: true }); };
  const nextStep = () => {
    if (!r) return;
    if (view === 'mental') setView('simulation');
    const s = useSim.getState();
    if (s.step < r.order.length - 1) useSim.setState({ step: s.step + 1, play: 'paused' });
    else useSim.setState({ step: -1, cursor: Math.min(r.iterationCount - 1, s.cursor + 1) });
  };
  const stepNode = r && step >= 0 ? r.order[step] : null;
  const stepEvents = it && stepNode ? it.events.filter((e) => e.nodeId === stepNode || (e.edgeId && doc.edges[e.edgeId.replace('~rev', '')]?.sourceNodeId === stepNode)) : [];
  const approx = (r?.approximations.length ?? 0) + (r?.hypotheses.length ?? 0);
  const generated = it?.ledger.generated[PRIMARY] ?? 0;
  const result = it ? qty(it.result) : 0;
  const total = r?.metrics.totalResult[PRIMARY] ?? 0;
  let activeFlow = 0;
  if (it) for (const es of Object.values(it.edges)) activeFlow += qty(es.delivered);
  return (
    <div className="flex h-full gap-6 px-4 py-3">
      <div className="flex shrink-0 flex-col gap-2.5">
        <div className="flex items-center gap-1" role="toolbar" aria-label="Controles de simulación">
          <Tip label={play === 'playing' ? 'Pausa' : play === 'paused' ? 'Reanudar' : 'Reproducir'} side="top">
            <Button variant="solid" size="md" square onClick={playPause} aria-label={play === 'playing' ? 'Pausa' : 'Reproducir'} data-testid="sim-play">
              {play === 'playing' ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
          </Tip>
          <IconButton label="Detener" side="top" onClick={stop} data-testid="sim-stop"><Square className="size-3.5" /></IconButton>
          <IconButton label="Reiniciar (recalcula desde el estado inicial)" side="top" onClick={reset} data-testid="sim-reset"><RotateCcw className="size-4" /></IconButton>
          <div className="mx-1 h-5 w-px bg-line" />
          <IconButton label="Iteración anterior" side="top" disabled={cursor === 0} onClick={() => useSim.setState({ cursor: Math.max(0, cursor - 1), step: -1 })} data-testid="sim-prev"><ChevronsLeft className="size-4" /></IconButton>
          <IconButton label="Siguiente iteración" side="top" disabled={!r || cursor >= r.iterationCount - 1} onClick={() => useSim.setState({ cursor: cursor + 1, step: -1 })} data-testid="sim-next"><ChevronsRight className="size-4" /></IconButton>
          <IconButton label="Paso a paso (elemento a elemento)" side="top" onClick={nextStep} active={step >= 0} data-testid="sim-step"><Footprints className="size-4" /></IconButton>
          <div className="mx-1 h-5 w-px bg-line" />
          <IconButton label="Guardar esta ejecución" side="top" onClick={() => { requestSimulation(doc, { save: true, immediate: true }); useUI.getState().notify('Ejecución guardada en el historial', 'success'); }} data-testid="sim-save"><Save className="size-4" /></IconButton>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          Ritmo visual
          <Segmented size="xs" label="Velocidad visual" value={speed} onChange={(v: SpeedKey) => useSim.setState({ speed: v })} options={(Object.keys(SPEEDS) as SpeedKey[]).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))} />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          Iteraciones
          <NumberInput className="w-16" value={doc.project.settings.simulation.iterations} min={1} max={500} onChange={(v) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, simulation: { iterations: Math.round(v) } } } }))} data-testid="sim-iterations" />
          <Tip label="Experimentación manual: recalcula al instante cuando cambias un parámetro" side="top">
            <button type="button" onClick={() => useSim.setState({ live: !live })} className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5', live ? 'bg-accent-soft text-accent-text' : 'bg-surface-2')} aria-pressed={live}>
              <Radio className="size-3" />En vivo
            </button>
          </Tip>
          {!live && <Button size="xs" variant="subtle" onClick={() => requestSimulation(doc, { force: true, immediate: true })}>Calcular</Button>}
        </div>
        <p className="max-w-[300px] text-[10.5px] leading-snug text-ink-3">El ritmo solo cambia la animación; el resultado matemático es siempre el mismo.</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-end gap-6">
          <Kpi label="Iteración" value={r ? `${cursor + 1}/${r.iterationCount}` : '—'} testId="kpi-iteration" />
          <Kpi label="Entrada" value={fmt(generated)} sub={unit} />
          <Kpi label="Flujo activo" value={fmt(activeFlow)} sub="en conexiones" tone="text-flow" />
          <Kpi label="Resultado" value={fmt(result)} sub="esta iteración" tone="text-gain" testId="kpi-result" />
          <Kpi label="Acumulado" value={fmt(total)} sub={`eficiencia ${pct(r?.metrics.efficiency)}`} testId="kpi-total" />
          {approx > 0 && (
            <Tip label="El resultado usa interpretaciones cualitativas o hipótesis. Ver Resultados.">
              <span className="mb-1"><Badge tone="cond"><TriangleAlert className="size-3" />{approx} supuestos</Badge></span>
            </Tip>
          )}
          {r && r.metrics.maxUnexplained < 1e-6 && <span className="mb-1"><Badge tone="gain"><CircleCheck className="size-3" />Conservación verificada</Badge></span>}
        </div>
        {r && (
          <div className="flex items-center gap-3">
            <input type="range" className="mdf-range flex-1" min={0} max={r.iterationCount - 1} value={cursor} aria-label="Iteración" onChange={(e) => useSim.setState({ cursor: Number(e.target.value), step: -1 })} data-testid="sim-scrubber" />
            <Sparkline values={r.metrics.resultSeries} cursor={cursor} color="var(--gain)" width={160} />
          </div>
        )}
        {stepNode && (
          <div className="rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-[12px]" data-testid="step-info">
            <div className="mb-1 font-semibold text-ink">Paso {step + 1}/{r!.order.length}: «{doc.nodes[stepNode]?.title}»</div>
            {stepEvents.length ? stepEvents.slice(0, 6).map((e, i) => <div key={i} className="text-ink-2">· {e.message}</div>) : <div className="text-ink-3">Sin cambios en este elemento.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsTab() {
  const doc = useProject((s) => s.doc)!;
  const r = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  if (!r) return <Empty title="Sin resultados todavía" />;
  const it = r.iterations[cursor];
  const L = it.ledger;
  const outs = Object.entries(r.metrics.perOutput);
  const rows: [string, number, string][] = [
    ['Generado', L.generated[PRIMARY] ?? 0, 'text-gain'], ['En tránsito (inicio)', L.inFlightStart[PRIMARY] ?? 0, ''],
    ['Resultado / terminal', L.terminal[PRIMARY] ?? 0, 'text-flow'], ['Perdido', L.lost[PRIMARY] ?? 0, 'text-loss'], ['Consumido', L.consumed[PRIMARY] ?? 0, ''],
    ['Acumulado', L.accumulated[PRIMARY] ?? 0, 'text-cond'], ['Liberado', L.released[PRIMARY] ?? 0, ''], ['Deduplicado', L.deduplicated[PRIMARY] ?? 0, ''],
    ['En tránsito (fin)', L.inFlightEnd[PRIMARY] ?? 0, ''], ['Sin explicar', L.unexplained[PRIMARY] ?? 0, Math.abs(L.unexplained[PRIMARY] ?? 0) > 1e-6 ? 'text-loss' : 'text-gain'],
  ];
  return (
    <div className="grid h-full grid-cols-1 gap-4 px-4 py-3 lg:grid-cols-[1.2fr_1fr_1fr]">
      <div>
        <div className="mb-1 text-[11.5px] font-semibold text-ink-2">Resultado por iteración</div>
        <LineChart height={150} unit={doc.dimensions.quantity?.unit} series={[
          { id: 'res', label: 'Resultado', color: 'var(--gain)', values: r.metrics.resultSeries },
          { id: 'gen', label: 'Generado', color: 'var(--flow)', values: r.iterations.map((x) => x.ledger.generated[PRIMARY] ?? 0), dashed: true },
          { id: 'lost', label: 'Perdido', color: 'var(--loss)', values: r.iterations.map((x) => x.ledger.lost[PRIMARY] ?? 0), dashed: true },
        ]} testId="results-chart" />
      </div>
      <div className="space-y-2">
        <div className="text-[11.5px] font-semibold text-ink-2">Salidas</div>
        {outs.length ? outs.map(([id, o]) => (
          <div key={id} className="rounded-lg border border-line p-2 text-[12px]">
            <div className="font-medium text-ink">{doc.nodes[id]?.title}</div>
            <div className="flex gap-4 text-ink-2"><span>Total <b className="tabular text-ink">{fmt(o.total)}</b></span><span>Última <b className="tabular text-ink">{fmt(o.last)}</b></span></div>
            <div className="flex flex-wrap gap-x-3 text-[11px] text-ink-3">{Object.entries(o.int).map(([d, v]) => <span key={d}>{doc.dimensions[d]?.name ?? d}: <b className="tabular text-ink-2">{fmt(v, 2)}</b></span>)}</div>
          </div>
        )) : <p className="text-[11.5px] text-ink-3">Añade un elemento de tipo «Salida» para medir resultados.</p>}
        {r.loops.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[11.5px] font-semibold text-ink-2">Circuitos detectados</div>
            {r.loops.map((l) => (
              <button key={l.id} type="button" className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[12px] hover:bg-surface-2" onClick={() => { useUI.getState().setSelection(l.nodeIds, l.edgeIds); A.fit(l.nodeIds); }}>
                <Badge tone={l.polarity === 'balancing' ? 'loss' : l.polarity === 'mixed' ? 'cond' : 'gain'}>{l.label.split(' ')[0]}</Badge>
                <span className="truncate text-ink-2">{l.nodeIds.map((n) => doc.nodes[n]?.title).join(' → ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="text-[11.5px] font-semibold text-ink-2">Libro de conservación · iteración {cursor + 1}</div>
        <table className="w-full text-[12px]" data-testid="ledger">
          <tbody>{rows.map(([k, v, t]) => <tr key={k} className="border-b border-line/60"><td className="py-0.5 text-ink-3">{k}</td><td className={cx('py-0.5 text-right tabular font-medium', t || 'text-ink')}>{fmt(v)}</td></tr>)}</tbody>
        </table>
        {(r.approximations.length > 0 || r.hypotheses.length > 0 || r.frameNotes.length > 0 || r.warnings.length > 0) && (
          <details className="text-[11.5px] text-ink-2" open={r.warnings.length > 0}>
            <summary className="cursor-pointer font-semibold">Supuestos, aproximaciones y avisos</summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-3">
              {r.warnings.map((w, i) => <li key={`w${i}`} className="text-loss">{w}</li>)}
              {r.frameNotes.map((w, i) => <li key={`f${i}`}>{w}</li>)}
              {r.hypotheses.map((w, i) => <li key={`h${i}`}>{w}</li>)}
              {r.approximations.map((a, i) => <li key={`a${i}`}>{a.message}</li>)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

const SEV: Record<Diagnostic['severity'], { icon: typeof Info; cls: string; label: string }> = {
  critical: { icon: CircleAlert, cls: 'text-loss', label: 'Crítico' },
  warning: { icon: TriangleAlert, cls: 'text-cond', label: 'Atención' },
  positive: { icon: CircleCheck, cls: 'text-gain', label: 'Favorable' },
  info: { icon: Info, cls: 'text-ink-3', label: 'Información' },
};

export function DiagnosticItem({ d }: { d: Diagnostic }) {
  const [open, setOpen] = useState(false);
  const S = SEV[d.severity];
  return (
    <li className="rounded-xl border border-line" data-testid="diagnostic" data-kind={d.kind}>
      <button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <S.icon className={cx('mt-0.5 size-4 shrink-0', S.cls)} aria-label={S.label} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium text-ink">{d.title}</span>
          <span className="block text-[11.5px] text-ink-2">{d.description}</span>
        </span>
        <Badge tone={d.confidence === 'alta' ? 'gain' : d.confidence === 'media' ? 'neutral' : 'cond'}>confianza {d.confidence}</Badge>
      </button>
      {open && (
        <div className="space-y-1 border-t border-line px-3 py-2 text-[11.5px] text-ink-2 mdf-fade-in">
          <div><b className="text-ink">Regla:</b> {d.rule}</div>
          {d.data.length > 0 && <div><b className="text-ink">Datos:</b> {d.data.join(' · ')}</div>}
          {d.assumptions.length > 0 && <div><b className="text-ink">Supuestos:</b> {d.assumptions.slice(0, 4).join(' · ')}</div>}
          {(d.nodeIds.length > 0 || d.edgeIds.length > 0) && (
            <Button size="xs" variant="subtle" onClick={() => { useUI.getState().setSelection(d.nodeIds, d.edgeIds); if (d.nodeIds.length) A.fit(d.nodeIds); }}>Localizar en el mapa</Button>
          )}
        </div>
      )}
    </li>
  );
}

function DiagnosticsTab() {
  const doc = useProject((s) => s.doc)!;
  const r = useSim((s) => s.result);
  const base = useSim((s) => s.diagnostics);
  const [withInfluence, setWithInfluence] = useState<Diagnostic[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setWithInfluence(null), [r]);
  if (!r) return <Empty title="Sin resultados" />;
  const list = withInfluence ?? base;
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[11.5px] text-ink-3">Observaciones descriptivas y explicables sobre la simulación actual. No son certezas: dependen de tus supuestos.</p>
        <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
          setBusy(true);
          const t = await runEngine('tornado', doc, doc.project.activeScenarioId, doc.project.settings.simulation.iterations);
          setWithInfluence(diagnose(doc, r, t));
          setBusy(false);
        }} data-testid="diag-influence">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Gauge className="size-3.5" />}Detectar elementos de mayor influencia</Button>
      </div>
      {list.length === 0 ? <Empty icon={<Sparkles />} title="Nada destacable">El sistema fluye sin pérdidas ni saturaciones relevantes.</Empty> : (
        <ul className="grid gap-1.5 xl:grid-cols-2">{list.map((d) => <DiagnosticItem key={d.id} d={d} />)}</ul>
      )}
    </div>
  );
}

function ScenariosTab() {
  const doc = useProject((s) => s.doc)!;
  const scenarios = Object.values(doc.scenarios).sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.createdAt - b.createdAt);
  const active = doc.project.activeScenarioId;
  const s = active ? doc.scenarios[active] : undefined;
  const [band, setBand] = useState<{ central: number[]; favorable: number[]; unfavorable: number[]; totals: Record<string, number> } | null>(null);
  const params = useMemo(() => listNumericParams(doc), [doc]);
  const [pIdx, setPIdx] = useState('0');
  const [sweep, setSweep] = useState<{ value: number; result: number }[] | null>(null);
  const title = (kind: string, id: string) => kind === 'node' ? doc.nodes[id]?.title : kind === 'behavior' ? doc.nodes[doc.behaviors[id]?.ownerId]?.title : kind === 'edge' ? `${doc.nodes[doc.edges[id]?.sourceNodeId]?.title} → ${doc.nodes[doc.edges[id]?.targetNodeId]?.title}` : kind === 'circuit' ? doc.circuits[id]?.name : id;
  return (
    <div className="grid h-full gap-4 px-4 py-3 lg:grid-cols-[1fr_1fr_1fr]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[11.5px] font-semibold text-ink-2">Escenarios</div>
          <div className="flex gap-1">
            <Button size="xs" variant="subtle" onClick={() => A.apply((d) => { const r = op.addScenario(d, `Escenario ${Object.keys(d.scenarios).length + 1}`); return op.setActiveScenario(r.doc, r.id); })} data-testid="scenario-new"><Plus className="size-3" />Nuevo</Button>
            <Button size="xs" variant="subtle" onClick={() => useUI.setState({ overlay: 'compare' })} data-testid="scenario-compare"><GitCompare className="size-3" />Comparar</Button>
          </div>
        </div>
        <ul className="space-y-1" data-testid="scenario-list">
          {scenarios.map((x) => (
            <li key={x.id} className={cx('flex items-center gap-1.5 rounded-lg border px-2 py-1', x.id === active ? 'border-accent bg-accent-soft/50' : 'border-line')}>
              <button type="button" className="size-2.5 rounded-full" style={{ background: x.color }} aria-label="Activar escenario" onClick={() => A.apply((d) => op.setActiveScenario(d, x.id))} />
              <input aria-label="Nombre del escenario" className="h-6 min-w-0 flex-1 bg-transparent text-[12px] font-medium text-ink outline-none" value={x.name}
                onFocus={() => x.id !== active && A.apply((d) => op.setActiveScenario(d, x.id))}
                onChange={(e) => A.apply((d) => op.updateScenario(d, x.id, { name: e.target.value }), `scn-${x.id}`)} data-testid="scenario-name" />
              <span className="text-[10.5px] tabular text-ink-3">{x.isBase ? 'base' : `${x.overrides.length} cambios`}</span>
              <IconButton size="xs" label="Duplicar" onClick={() => A.apply((d) => { const r = op.addScenario(d, `${x.name} (copia)`, x.id); return op.setActiveScenario(r.doc, r.id); })} data-testid="scenario-duplicate"><CopyPlus className="size-3" /></IconButton>
              {!x.isBase && <IconButton size="xs" label="Eliminar escenario" variant="danger" onClick={() => A.apply((d) => op.deleteScenario(d, x.id))}><Trash2 className="size-3" /></IconButton>}
            </li>
          ))}
        </ul>
        {s && !s.isBase && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-ink-2">Cambios de «{s.name}» <Button size="xs" variant="ghost" onClick={() => A.apply((d) => op.updateScenario(d, s.id, { overrides: [], initialConditions: {} }))}><RotateCcw className="size-3" />Restaurar valores iniciales</Button></div>
            {s.overrides.length === 0 ? <p className="text-[11px] text-ink-3">Edita cualquier parámetro en el inspector: se guardará solo en este escenario.</p> : s.overrides.map((o) => (
              <div key={o.id} className="flex items-center gap-1.5 text-[11.5px]">
                <span className="min-w-0 flex-1 truncate text-ink-2">{title(o.targetType, o.targetId)} · <span className="font-mono text-[10.5px]">{o.path}</span></span>
                <span className="tabular text-ink">{typeof o.value === 'object' ? '…' : String(o.value)}</span>
                <IconButton size="xs" label="Quitar cambio" onClick={() => A.apply((d) => op.updateScenario(d, s.id, { overrides: s.overrides.filter((x) => x.id !== o.id) }))}><X className="size-3" /></IconButton>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-[11.5px] font-semibold text-ink-2">Incertidumbre</div>
          <Button size="xs" variant="subtle" onClick={async () => active && setBand(await runEngine('band', doc, active, doc.project.settings.simulation.iterations))} data-testid="run-band">Calcular banda</Button>
        </div>
        {s && <Segmented size="xs" label="Variante del escenario" value={s.uncertainty} onChange={(uncertainty) => A.apply((d) => op.updateScenario(d, s.id, { uncertainty }))} options={[{ value: 'unfavorable', label: 'Desfavorable' }, { value: 'central', label: 'Central' }, { value: 'favorable', label: 'Favorable' }]} />}
        {band ? (
          <>
            <LineChart height={120} series={[{ id: 'c', label: 'Central', color: 'var(--flow)', values: band.central }]} band={{ low: band.unfavorable, high: band.favorable, color: 'var(--flow)' }} />
            <p className="text-[11px] text-ink-3">Total: desfavorable {fmt(band.totals.unfavorable)} · central {fmt(band.totals.central)} · favorable {fmt(band.totals.favorable)}. Resultados derivados de hipótesis (rangos definidos en entradas y comportamientos).</p>
          </>
        ) : <p className="text-[11px] text-ink-3">Define rangos en las dimensiones de las entradas o en los comportamientos (nivel experto) y calcula la banda favorable / desfavorable.</p>}
      </div>
      <div className="space-y-1.5">
        <div className="text-[11.5px] font-semibold text-ink-2">Sensibilidad: altera un parámetro y observa</div>
        {params.length ? (
          <>
            <div className="flex gap-1">
              <Select label="Parámetro" className="flex-1" value={pIdx} onChange={(v) => { setPIdx(v); setSweep(null); }} options={params.map((p, i) => ({ value: String(i), label: p.label }))} />
              <Button size="sm" variant="subtle" onClick={async () => {
                const p: ParamRef = params[Number(pIdx)];
                const coll = doc[p.targetType === 'node' ? 'nodes' : p.targetType === 'edge' ? 'edges' : p.targetType === 'behavior' ? 'behaviors' : 'circuits'] as Record<string, unknown>;
                const base = Number(p.path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], coll[p.targetId])) || 1;
                const isRatio = /passRatio|ratio|loss/.test(p.path);
                const vals = Array.from({ length: 9 }, (_, i) => (isRatio ? Math.max(0, Math.min(1, base * (0.5 + i * 0.125))) : base * (0.5 + i * 0.125)));
                setSweep(await runEngine('sweep', doc, active, p, vals, doc.project.settings.simulation.iterations));
              }} data-testid="run-sweep">Barrer</Button>
            </div>
            {sweep && (
              <>
                <LineChart height={110} xLabel="Valor (−50 % → +50 %)" series={[{ id: 's', label: 'Resultado total', color: 'var(--gain)', values: sweep.map((x) => x.result) }]} />
                <p className="text-[11px] text-ink-3">De {fmt(sweep[0].value, 2)} a {fmt(sweep[sweep.length - 1].value, 2)}: el resultado total va de {fmt(sweep[0].result)} a {fmt(sweep[sweep.length - 1].result)}.</p>
              </>
            )}
          </>
        ) : <p className="text-[11px] text-ink-3">No hay parámetros numéricos todavía.</p>}
      </div>
    </div>
  );
}

function HistoryTab() {
  const doc = useProject((s) => s.doc)!;
  const r = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
  useEffect(() => { void repo.listRuns(doc.project.id).then(setRuns); }, [doc.project.id, r]);
  if (!r) return <Empty title="Sin iteraciones" />;
  return (
    <div className="grid gap-4 px-4 py-3 lg:grid-cols-[2fr_1fr]">
      <table className="w-full text-[12px]" data-testid="iterations-table">
        <thead className="text-left text-[10.5px] uppercase tracking-wider text-ink-3">
          <tr><th className="py-1 font-medium">It.</th><th className="font-medium text-right">Generado</th><th className="font-medium text-right">Resultado</th><th className="font-medium text-right">Perdido</th><th className="font-medium text-right">En stock/cola</th><th className="font-medium text-right">En tránsito</th></tr>
        </thead>
        <tbody>
          {r.iterations.map((it, i) => {
            const stock = Object.values(it.nodes).reduce((s, n) => s + (n.stock[PRIMARY] ?? 0) + (n.queue[PRIMARY] ?? 0), 0);
            return (
              <tr key={i} onClick={() => useSim.setState({ cursor: i, step: -1 })} className={cx('cursor-pointer border-b border-line/60 hover:bg-surface-2', i === cursor && 'bg-accent-soft/60')}>
                <td className="py-0.5 tabular text-ink-2">{i + 1}</td>
                <td className="text-right tabular">{fmt(it.ledger.generated[PRIMARY] ?? 0)}</td>
                <td className="text-right tabular font-medium text-ink">{fmt(qty(it.result))}</td>
                <td className="text-right tabular text-loss">{fmt(it.ledger.lost[PRIMARY] ?? 0)}</td>
                <td className="text-right tabular">{fmt(stock)}</td>
                <td className="text-right tabular">{fmt(it.ledger.inFlightEnd[PRIMARY] ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="space-y-1">
        <div className="text-[11.5px] font-semibold text-ink-2">Ejecuciones guardadas</div>
        {runs.length === 0 ? <p className="text-[11px] text-ink-3">Pulsa «Guardar ejecución» para conservar un resultado.</p> : runs.slice(0, 12).map((x) => (
          <div key={x.id} className="flex items-center gap-2 text-[11.5px]">
            <span className="text-ink-3">{new Date(x.executionDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <span className="flex-1 truncate text-ink-2">{doc.scenarios[x.scenarioId]?.name ?? 'escenario eliminado'}</span>
            <b className="tabular text-ink">{fmt((x.metrics as { totalResult?: Record<string, number> })?.totalResult?.quantity ?? 0)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventsTab() {
  const doc = useProject((s) => s.doc)!;
  const r = useSim((s) => s.result);
  const cursor = useSim((s) => s.cursor);
  const sel = useUI((s) => s.selection);
  const [onlySel, setOnlySel] = useState(false);
  if (!r) return <Empty title="Sin eventos" />;
  const it = r.iterations[cursor];
  const evs = it.events.filter((e) => !onlySel || (e.nodeId && sel.nodes.includes(e.nodeId)) || (e.edgeId && sel.edges.includes(e.edgeId.replace('~rev', ''))));
  const PH = ['', 'Entradas', 'Condiciones', 'Activación', 'Filtros', 'Transformación', 'Bifurcación', 'Capacidad', 'Convergencia', 'Acumuladores', 'Retroalimentación', 'Estado', 'Registro'];
  return (
    <div className="px-4 py-2">
      <div className="mb-1 flex items-center gap-2 text-[11.5px] text-ink-3">
        Iteración {cursor + 1} · {evs.length} eventos
        <label className="ml-auto inline-flex items-center gap-1"><input type="checkbox" checked={onlySel} onChange={(e) => setOnlySel(e.target.checked)} />Solo la selección</label>
      </div>
      <ol className="space-y-0.5 text-[12px]" data-testid="events-list">
        {evs.slice(0, 400).map((e, i) => (
          <li key={i} className="flex gap-2 border-b border-line/50 py-0.5">
            <span className="w-24 shrink-0 text-[10.5px] text-ink-3">{e.phase}. {PH[e.phase]}</span>
            <span className="flex-1 text-ink-2">{e.message}</span>
            <span className="shrink-0 text-[10.5px] text-ink-3">{e.mechanism}</span>
          </li>
        ))}
      </ol>
      {evs.length === 0 && <p className="py-4 text-center text-[11.5px] text-ink-3">Sin eventos{onlySel ? ' para la selección' : ''}.</p>}
      <p className="mt-2 text-[10.5px] text-ink-3">Orden de procesamiento: {r.order.map((id) => doc.nodes[id]?.title).filter(Boolean).slice(0, 30).join(' → ')}</p>
    </div>
  );
}
