/** Operaciones sobre paquetes de flujo multidimensionales. */
import type { DimMap, Packet } from './types';

export const EPS = 1e-9;
export const PRIMARY = 'quantity';

export const emptyPacket = (): Packet => ({ ext: {}, int: {}, origins: {} });

export const qty = (p: Packet): number => p.ext[PRIMARY] ?? 0;

export function clonePacket(p: Packet): Packet {
  return { ext: { ...p.ext }, int: { ...p.int }, origins: { ...p.origins } };
}

export function clean(n: number): number {
  return Math.abs(n) < EPS ? 0 : n;
}

export function addTo(map: DimMap, key: string, v: number): void {
  if (!v) return;
  map[key] = clean((map[key] ?? 0) + v);
}

export function sumMaps(a: DimMap, b: DimMap): DimMap {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) addTo(out, k, v);
  return out;
}

/** Escala las magnitudes extensivas (y el origen) por f; las intensivas no cambian. */
export function scalePacket(p: Packet, f: number): Packet {
  const ext: DimMap = {};
  for (const [k, v] of Object.entries(p.ext)) ext[k] = clean(v * f);
  const origins: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.origins)) {
    const s = clean(v * f);
    if (s) origins[k] = s;
  }
  return { ext, int: { ...p.int }, origins };
}

/** Divide un paquete en (fracción, resto). */
export function splitPacket(p: Packet, fraction: number): [Packet, Packet] {
  const f = Math.max(0, Math.min(1, fraction));
  return [scalePacket(p, f), scalePacket(p, 1 - f)];
}

/** Fusiona paquetes: suma extensivas y origen; promedio ponderado por cantidad de las intensivas. */
export function mergePackets(list: Packet[]): Packet {
  const out = emptyPacket();
  const intW: DimMap = {};
  const intSum: DimMap = {};
  const intPlain: DimMap = {};
  const intCount: DimMap = {};
  for (const p of list) {
    for (const [k, v] of Object.entries(p.ext)) addTo(out.ext, k, v);
    for (const [k, v] of Object.entries(p.origins)) addTo(out.origins, k, v);
    const w = qty(p);
    for (const [k, v] of Object.entries(p.int)) {
      intSum[k] = (intSum[k] ?? 0) + v * w;
      intW[k] = (intW[k] ?? 0) + w;
      intPlain[k] = (intPlain[k] ?? 0) + v;
      intCount[k] = (intCount[k] ?? 0) + 1;
    }
  }
  for (const k of Object.keys(intCount)) {
    out.int[k] = intW[k] > EPS ? intSum[k] / intW[k] : intPlain[k] / intCount[k];
  }
  return out;
}

export function isEmpty(p: Packet): boolean {
  return Object.values(p.ext).every((v) => Math.abs(v) < EPS);
}

export function totalOf(map: DimMap): number {
  return Object.values(map).reduce((s, v) => s + v, 0);
}
