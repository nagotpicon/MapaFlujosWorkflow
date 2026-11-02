/**
 * Interpretación de escalas. Los valores cualitativos NO se convierten
 * automáticamente en datos exactos: cuando el motor necesita un número usa la
 * interpretación configurable de la escala y lo marca como aproximación.
 */
import type { DimensionValue, FlowDimensionDef, ProjectSettings, QualitativeScale, ScaleValue } from '../core/model/schema';

export interface Interpreted {
  value: number;
  approximate: boolean;
  note: string;
}

export function findScale(settings: ProjectSettings, scaleId: string | null | undefined): QualitativeScale {
  return settings.qualitativeScales.find((s) => s.id === scaleId)
    ?? settings.qualitativeScales.find((s) => s.id === settings.defaultScaleId)
    ?? settings.qualitativeScales[0];
}

export function qualitativeLabel(settings: ProjectSettings, scaleId: string | null | undefined, index: number): string {
  const scale = findScale(settings, scaleId);
  const i = Math.max(0, Math.min(scale.levels.length - 1, Math.round(index)));
  return scale.levels[i].label;
}

/** Valor de peso/influencia en unidades de la escala ponderada (p.ej. −5..+5). */
export function scaleValueToWeighted(sv: ScaleValue | null | undefined, settings: ProjectSettings): Interpreted {
  if (!sv) return { value: 0, approximate: false, note: '' };
  const { max } = settings.weightedScale;
  if (sv.mode === 'weighted' || sv.mode === 'numeric') return { value: sv.value, approximate: false, note: '' };
  const scale = findScale(settings, sv.scaleId);
  const i = Math.max(0, Math.min(scale.levels.length - 1, Math.round(sv.value)));
  const level = scale.levels[i];
  return {
    value: level.value * max,
    approximate: true,
    note: `«${level.label}» interpretado como ${(level.value * max).toFixed(2)} en la escala ponderada (aproximación configurable)`,
  };
}

/** Valor de una dimensión expresado en el rango numérico de la dimensión. */
export function dimensionValueToNumber(dv: DimensionValue, def: FlowDimensionDef | undefined, settings: ProjectSettings): Interpreted {
  const range = def?.range ?? { min: 0, max: 1 };
  if (dv.mode === 'numeric') return { value: dv.value, approximate: false, note: '' };
  if (dv.mode === 'weighted') {
    const { min, max } = settings.weightedScale;
    const t = (dv.value - min) / (max - min || 1);
    const v = range.min + t * (range.max - range.min);
    return { value: v, approximate: true, note: `${dv.value} (ponderado) interpretado como ${v.toFixed(2)}` };
  }
  const scale = findScale(settings, def?.scaleId ?? null);
  const i = Math.max(0, Math.min(scale.levels.length - 1, Math.round(dv.value)));
  const level = scale.levels[i];
  const span = range.max - range.min;
  // Para rangos muy amplios (cantidades) el nivel se interpreta sobre 0..1 × 100
  const v = span > 10 ? level.value * 100 : range.min + level.value * span;
  return { value: v, approximate: true, note: `«${level.label}» interpretado como ${v.toFixed(2)} (aproximación)` };
}

/** Convierte un número de vuelta a la etiqueta cualitativa más cercana. */
export function nearestLabel(settings: ProjectSettings, scaleId: string | null | undefined, value01: number): string {
  const scale = findScale(settings, scaleId);
  let best = scale.levels[0];
  for (const l of scale.levels) if (Math.abs(l.value - value01) < Math.abs(best.value - value01)) best = l;
  return best.label;
}
