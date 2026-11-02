/**
 * Cliente del motor: usa un Web Worker si está disponible y, si no, ejecuta
 * en el hilo principal (pruebas, entornos sin workers).
 */
import { ENGINE_API, type EngineFn, type EngineResult } from './api';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(ev.data.id);
      if (!p) return;
      pending.delete(ev.data.id);
      if (ev.data.ok) p.resolve(ev.data.result);
      else p.reject(new Error(ev.data.error));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'Error en el motor'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

export function runEngine<F extends EngineFn>(fn: F, ...args: Parameters<(typeof ENGINE_API)[F]>): Promise<EngineResult<F>> {
  const w = getWorker();
  if (!w) {
    try {
      return Promise.resolve((ENGINE_API[fn] as (...a: unknown[]) => EngineResult<F>)(...args));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    w.postMessage({ id, fn, args });
  });
}
