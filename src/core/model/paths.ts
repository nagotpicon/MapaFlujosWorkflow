/** Utilidades para leer y escribir valores por ruta con puntos de forma inmutable. */

export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const rec = (cur: unknown, i: number): unknown => {
    const base = cur != null && typeof cur === 'object' ? (Array.isArray(cur) ? [...cur] : { ...(cur as object) }) : {};
    const k = keys[i];
    (base as Record<string, unknown>)[k] = i === keys.length - 1 ? value : rec((cur as Record<string, unknown> | undefined)?.[k], i + 1);
    return base;
  };
  return rec(obj, 0) as T;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a == null || b == null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  return true;
}
