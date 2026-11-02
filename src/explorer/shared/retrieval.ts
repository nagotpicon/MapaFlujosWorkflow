/**
 * Plan maestro como base de conocimiento: troceado por secciones, búsqueda por
 * relevancia (BM25 simplificado, sin servicios externos) y resumen heurístico
 * cuando no hay proveedor de IA.
 */
import type { KnowledgeSnippet, PlanSummary } from './schemas.ts';

export interface Chunk { section: string; order: number; text: string }

const STOP = new Set('a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era es esa esas ese eso esos esta estas este esto estos fue ha hay la las le les lo los mas me mi mis mucho muy nada ni no nos o otra otro para pero poco por porque que quien se ser si sin sobre su sus también te tiene tu un una uno unos y ya the of and to in'.split(' '));

export function tokenize(s: string): string[] {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w));
}

/** Divide un texto en fragmentos de ~maxLen caracteres respetando encabezados y párrafos. */
export function chunkText(text: string, maxLen = 1100): Chunk[] {
  const lines = text.replace(/\r/g, '').split('\n');
  const chunks: Chunk[] = [];
  let section = 'Inicio';
  let buf: string[] = [];
  const flush = () => {
    const body = buf.join('\n').trim();
    if (!body) { buf = []; return; }
    for (let i = 0; i < body.length; i += maxLen) {
      let end = Math.min(body.length, i + maxLen);
      if (end < body.length) { const dot = body.lastIndexOf('. ', end); if (dot > i + maxLen * 0.5) end = dot + 1; }
      chunks.push({ section, order: chunks.length, text: body.slice(i, end).trim() });
      if (end !== i + maxLen) i = end - maxLen;
    }
    buf = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const isHeading = /^#{1,6}\s/.test(line) || (/^[A-ZÁÉÍÓÚÑ0-9][^.!?]{2,80}$/.test(line.trim()) && line.trim() === line.trim().toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(line)) || /^(\d+(\.\d+)*[.)]?\s+)[A-ZÁÉÍÓÚÑ].{2,80}$/.test(line.trim()) || /^\[Hoja: .+\]$/.test(line.trim());
    if (isHeading) { flush(); section = line.replace(/^#+\s*/, '').replace(/^\[Hoja: (.+)\]$/, 'Hoja $1').trim().slice(0, 90); continue; }
    buf.push(line);
    if (buf.join('\n').length > maxLen * 2) flush();
  }
  flush();
  return chunks;
}

export interface Searchable { documentName: string; section: string; text: string }

/** BM25 simplificado. Devuelve los k fragmentos más relevantes para la consulta. */
export function searchChunks<T extends Searchable>(chunks: T[], query: string, k = 4): T[] {
  const q = [...new Set(tokenize(query))];
  if (!q.length || !chunks.length) return chunks.slice(0, Math.min(k, 2));
  const docs = chunks.map((c) => tokenize(`${c.section} ${c.text}`));
  const avg = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  const N = docs.length;
  const scored = docs.map((d, i) => {
    const tf = new Map<string, number>();
    for (const w of d) tf.set(w, (tf.get(w) ?? 0) + 1);
    let s = 0;
    for (const w of q) {
      const f = tf.get(w) ?? 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avg))));
    }
    return { i, s };
  });
  return scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => chunks[x.i]);
}

export function toSnippets(chunks: Searchable[]): KnowledgeSnippet[] {
  return chunks.map((c) => ({ documentName: c.documentName, section: c.section, text: c.text }));
}

/** Resumen heurístico (sin IA): extrae líneas que parecen objetivos, plazos, recursos… */
export function heuristicPlanSummary(text: string): PlanSummary {
  // líneas con la sección a la que pertenecen
  const rows: { line: string; section: string }[] = [];
  let section = '';
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    if (/^#{1,6}\s/.test(l) || /^\[Hoja: /.test(l) || (l.length < 60 && l === l.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(l))) { section = l.replace(/^#+\s*/, ''); continue; }
    for (const part of l.split(/(?<=\.)\s+/)) if (part.length > 8 && part.length < 260) rows.push({ line: part, section });
  }
  const pick = (re: RegExp, n = 6) => [...new Set(rows.filter((r) => re.test(r.line) || re.test(r.section)).map((r) => r.line))].slice(0, n);
  return {
    objectives: pick(/objetivo|finalidad|prop[oó]sito|queremos|pretend/i),
    goals: pick(/meta|alcanzar|conseguir|\d+\s*(%|clientes|ventas|euros|€|usuarios|alumnos)/i),
    deadlines: pick(/plazo|fecha|antes de|trimestre|\bmes(es)?\b|semana|\b20\d\d\b|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i),
    resources: pick(/presupuesto|recurso|equipo|personal|herramienta|inversi[oó]n|horas/i),
    constraints: pick(/limitaci|restricci|no podemos|depende|normativ|permiso/i),
    kpis: pick(/kpi|indicador|m[eé]trica|medir|tasa|ratio|conversi[oó]n/i),
    strategy: pick(/estrategia|l[ií]nea|canal|acci[oó]n|plan de/i),
    risks: pick(/riesgo|amenaza|problema|dificultad|competencia/i, 4),
    summary: rows.slice(0, 3).map((r) => r.line).join(' ').slice(0, 400),
  };
}
