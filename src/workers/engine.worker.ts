/// <reference lib="webworker" />
/** Web Worker del motor: ejecuta simulaciones y análisis fuera del hilo de la interfaz. */
import { ENGINE_API, type EngineFn } from '../engine/api';

self.onmessage = (ev: MessageEvent<{ id: number; fn: EngineFn; args: unknown[] }>) => {
  const { id, fn, args } = ev.data;
  try {
    const f = ENGINE_API[fn] as (...a: unknown[]) => unknown;
    const result = f(...args);
    (self as unknown as Worker).postMessage({ id, ok: true, result });
  } catch (e) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: (e as Error).message });
  }
};
