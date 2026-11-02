/**
 * «DÍMELO CLARO» — razonamiento y conclusión en lenguaje coloquial y franco,
 * generado SOLO a partir de los resultados calculados del mapa actual.
 * No inventa cifras: cada número procede del monitor/diagnóstico.
 */
import type { ProjectDoc } from '../core/model/schema';
import type { MonitorData } from './monitor';

export interface Verdict {
  headline: string;
  point: string;
  brakes: string[];
  saviors: string[];
  pinch: string[];
  warnings: string[];
  tomorrow: string;
  loops: string | null;
  facts: { label: string; value: string }[];
  /** cifras citadas en el texto (para comprobar que no se inventa nada) */
  citedNumbers: number[];
}

const nf = (n: number, d = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const pct = (r: number) => `${nf(r * 100, Math.abs(r) < 0.1 ? 1 : 0)} %`;

export function buildVerdict(doc: ProjectDoc, m: MonitorData, scenarioName: string): Verdict {
  const cited: number[] = [];
  const c = (n: number, d = 0) => { cited.push(n); return nf(n, d); };
  const cp = (r: number) => { cited.push(r * 100); return pct(r); };
  const k = m.kpis;
  const unit = m.unit;
  const start = m.funnel[0];
  const end = m.funnel[m.funnel.length - 1];
  const survival = start && end && start.value > 0 ? end.value / start.value : k.efficiency;
  const per100 = survival * 100;
  const topF = m.frictions.filter((f) => f.impact > 1e-6);
  const topD = m.drivers.filter((d) => d.impact > 1e-6);
  const bottleneck = m.neuralgic.find((d) => d.kind === 'bottleneck');
  const hyp = k.hypotheses + k.approximations;

  let headline: string;
  if (k.totalGenerated <= 1e-9) headline = 'Así no hay nada que medir todavía';
  else if (survival < 0.1) headline = 'Se te escapa casi todo por el camino';
  else if (survival < 0.3) headline = 'Funciona, pero a base de tirar mucho por el camino';
  else if (survival < 0.6) headline = 'Tiene sentido, aunque hay fugas que te están comiendo';
  else headline = 'Pinta bien: lo que entra, en buena parte, llega';
  if (k.trendPct != null && k.trendPct < -0.15) headline += ' (y encima va a menos)';

  let point: string;
  if (k.totalGenerated <= 1e-9) {
    point = 'Mira, ahora mismo el mapa no tiene ninguna entrada que genere flujo. Pon de dónde sale la cosa (llamadas, horas, dinero…) y entonces hablamos de verdad.';
  } else {
    point = `Te lo digo como es: de cada 100 que entran, te llegan unos ${c(per100)} al final.`;
    if (topF[0]) point += ` Lo que más te está frenando es «${topF[0].title}»: si lo resolvieras ganarías unas ${c(topF[0].impact)} ${unit} más (${cp(topF[0].impactPct)}).`;
    else if (bottleneck) point += ` Tu tapón está en «${bottleneck.title.replace(/^Cuello de botella: /, '').replace(/[«»]/g, '')}».`;
    if (bottleneck && topF[0] && !bottleneck.nodeIds.includes(topF[0].nodeId)) point += ` Y no te olvides del tapón: ${bottleneck.title.toLowerCase()}.`;
  }

  const brakes = topF.slice(0, 3).map((f) => `«${f.title}» te cuesta unas ${c(f.impact)} ${unit} (${cp(f.impactPct)} del resultado). ${f.reason}.${f.hypothesis ? ' Ojo: esto está puesto a ojo.' : ''}`);
  const saviors = topD.slice(0, 3).map((d) => `«${d.title}» te aporta unas ${c(d.impact)} ${unit}. Sin eso irías peor, cuídalo.`);
  const pinch = m.neuralgic.slice(0, 3).map((d) => `${d.title}: ${d.description}`);
  const warnings: string[] = [];
  if (hyp > 0) warnings.push(`Hay ${c(hyp)} cosas en el mapa que son suposiciones tuyas o valores “a ojo”. Las cuentas son tan buenas como esos supuestos, así que no te lo tomes como una predicción.`);
  if (doc.project.isDemo) warnings.push('Este es el proyecto de ejemplo: los números son de mentira, para aprender.');
  if (k.lostPct > 0.5) warnings.push(`Pierdes más de la mitad de lo que generas (${cp(k.lostPct)}). Antes de meter más gasolina, tapa agujeros.`);
  if (k.saturatedElements > 0) warnings.push(`Tienes ${c(k.saturatedElements)} punto(s) saturado(s): meter más volumen ahí no sirve si no amplías capacidad.`);

  let tomorrow: string;
  if (bottleneck && topF[0] && bottleneck.nodeIds.includes(topF[0].nodeId)) tomorrow = `Yo mañana me centraría en «${topF[0].title}». Es tu tapón y además lo que más resultado te devuelve.`;
  else if (bottleneck) tomorrow = `Yo mañana miraría cómo ampliar ${bottleneck.title.replace(/^Cuello de botella: /, '').toLowerCase()} antes de buscar más entrada, porque lo que traigas de más se va a quedar ahí atascado.`;
  else if (topF[0]) tomorrow = `Yo mañana atacaría «${topF[0].title}» con una prueba pequeña, de bajo coste, para ver si de verdad pesa lo que crees.`;
  else tomorrow = 'Yo mañana haría una prueba pequeña para confirmar los números que más pesan en el mapa; ahora mismo no veo un freno claro.';
  if (hyp > 0 && topF[0]?.hypothesis) tomorrow += ' Y antes de gastar un euro, comprueba ese dato, que lo tienes como hipótesis.';

  let loops: string | null = null;
  if (k.activeLoops > 0) {
    loops = k.trendPct != null && k.trendPct > 0.05
      ? `Tienes una rueda que se alimenta sola: el resultado vuelve al principio y va sumando (${cp(k.trendPct)} mejor al final que al principio).`
      : k.trendPct != null && k.trendPct < -0.05
        ? `Hay circuitos de vuelta, pero ahora mismo el sistema se va frenando (${cp(k.trendPct)}). Algo se come lo que vuelve.`
        : 'Hay circuitos de vuelta, pero el sistema se queda estable: no se dispara ni se hunde.';
  }

  const facts = [
    { label: 'Escenario', value: scenarioName },
    { label: 'Resultado total', value: `${c(k.totalResult, 1)} ${unit}` },
    { label: 'Generado', value: `${c(k.totalGenerated, 1)} ${unit}` },
    { label: 'Llega al final', value: cp(survival) },
    { label: 'Perdido', value: cp(k.lostPct) },
  ];
  return { headline, point, brakes, saviors, pinch, warnings, tomorrow, loops, facts, citedNumbers: cited };
}

export function verdictToMarkdown(doc: ProjectDoc, v: Verdict, date = new Date()): string {
  const lines: string[] = [];
  lines.push(`# Dímelo claro — ${doc.project.name}`);
  lines.push(`_${date.toLocaleString('es-ES')} · según el mapa tal como está ahora_`, '');
  lines.push(`## ${v.headline}`, '', v.point, '');
  if (v.brakes.length) { lines.push('### Lo que te frena'); for (const b of v.brakes) lines.push(`- ${b}`); lines.push(''); }
  if (v.saviors.length) { lines.push('### Lo que te salva'); for (const s of v.saviors) lines.push(`- ${s}`); lines.push(''); }
  if (v.pinch.length) { lines.push('### Dónde aprieta el zapato'); for (const p of v.pinch) lines.push(`- ${p}`); lines.push(''); }
  if (v.loops) lines.push('### La rueda', v.loops, '');
  lines.push('### Lo que haría yo mañana', v.tomorrow, '');
  if (v.warnings.length) { lines.push('### Ojo'); for (const w of v.warnings) lines.push(`- ${w}`); lines.push(''); }
  lines.push('### Datos en los que me baso');
  for (const f of v.facts) lines.push(`- ${f.label}: ${f.value}`);
  lines.push('', '_Generado por MAPA DE FLUJOS a partir de la simulación del mapa. No es una predicción: es lo que sale de tus supuestos._');
  return lines.join('\n');
}
