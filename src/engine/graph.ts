/**
 * Motor de grafos: dependencias, orden de procesamiento determinista,
 * detección de ciclos y alcanzabilidad. Sin dependencias de React.
 */

export interface DepEdge {
  /** clave única de la dependencia */
  key: string;
  from: string;
  to: string;
  kind: 'flow' | 'replicate' | 'causal' | 'condition' | 'control' | 'compensate' | 'dynamic';
  edgeId?: string;
  /** el usuario la marcó explícitamente como retorno (retroalimentación) */
  forcedBack?: boolean;
}

class MinHeap<T> {
  private a: T[] = [];
  constructor(private cmp: (x: T, y: T) => number) {}
  get size() { return this.a.length; }
  push(v: T) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Calcula un orden topológico determinista. Las dependencias que cierran
 * ciclos se marcan como "de retorno": se resuelven con el estado de la
 * iteración anterior, lo que impide procesamientos infinitos dentro de una
 * misma iteración.
 *
 * @param nodeIds nodos en orden estable de preferencia (rango)
 */
export function computeProcessingOrder(nodeIds: string[], deps: DepEdge[]): { order: string[]; back: Set<string> } {
  const rank = new Map(nodeIds.map((id, i) => [id, i]));
  const back = new Set<string>();
  const adj = new Map<string, DepEdge[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const d of deps) {
    if (!rank.has(d.from) || !rank.has(d.to)) continue;
    if (d.forcedBack || d.from === d.to) {
      back.add(d.key);
      continue;
    }
    adj.get(d.from)!.push(d);
  }
  for (const list of adj.values()) list.sort((x, y) => rank.get(x.to)! - rank.get(y.to)! || x.key.localeCompare(y.key));

  // DFS iterativo: aristas hacia nodos en la pila actual = retorno
  const color = new Map<string, 0 | 1 | 2>();
  for (const root of nodeIds) {
    if (color.get(root)) continue;
    const stack: { id: string; i: number }[] = [{ id: root, i: 0 }];
    color.set(root, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const out = adj.get(top.id)!;
      if (top.i < out.length) {
        const d = out[top.i++];
        const c = color.get(d.to) ?? 0;
        if (c === 1) back.add(d.key);
        else if (c === 0) {
          color.set(d.to, 1);
          stack.push({ id: d.to, i: 0 });
        }
      } else {
        color.set(top.id, 2);
        stack.pop();
      }
    }
  }

  // Kahn con desempate por rango
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  for (const list of adj.values()) for (const d of list) if (!back.has(d.key)) indeg.set(d.to, indeg.get(d.to)! + 1);
  const heap = new MinHeap<string>((x, y) => rank.get(x)! - rank.get(y)!);
  for (const id of nodeIds) if (indeg.get(id) === 0) heap.push(id);
  const order: string[] = [];
  while (heap.size) {
    const id = heap.pop()!;
    order.push(id);
    for (const d of adj.get(id)!) {
      if (back.has(d.key)) continue;
      const n = indeg.get(d.to)! - 1;
      indeg.set(d.to, n);
      if (n === 0) heap.push(d.to);
    }
  }
  // Por seguridad (no debería ocurrir): añadir los restantes
  if (order.length < nodeIds.length) {
    const seen = new Set(order);
    for (const id of nodeIds) if (!seen.has(id)) order.push(id);
  }
  return { order, back };
}

/** Componentes fuertemente conexas (Tarjan, iterativo). */
export function stronglyConnected(nodeIds: string[], edges: { from: string; to: string }[]): string[][] {
  const adj = new Map<string, string[]>(nodeIds.map((n) => [n, []]));
  for (const e of edges) if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from)!.push(e.to);
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];
  for (const start of nodeIds) {
    if (idx.has(start)) continue;
    const work: { v: string; i: number }[] = [{ v: start, i: 0 }];
    idx.set(start, index); low.set(start, index); index++;
    stack.push(start); onStack.add(start);
    while (work.length) {
      const frame = work[work.length - 1];
      const nbrs = adj.get(frame.v)!;
      if (frame.i < nbrs.length) {
        const w = nbrs[frame.i++];
        if (!idx.has(w)) {
          idx.set(w, index); low.set(w, index); index++;
          stack.push(w); onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v)!, idx.get(w)!));
        }
      } else {
        work.pop();
        if (work.length) {
          const parent = work[work.length - 1].v;
          low.set(parent, Math.min(low.get(parent)!, low.get(frame.v)!));
        }
        if (low.get(frame.v) === idx.get(frame.v)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== frame.v);
          result.push(comp);
        }
      }
    }
  }
  return result;
}

export interface GraphEdgeRef { id: string; from: string; to: string }

/**
 * Enumera ciclos simples (algoritmo de Johnson acotado) devolviendo las aristas
 * de cada ciclo. Limitado para mapas grandes.
 */
export function findSimpleCycles(nodeIds: string[], edges: GraphEdgeRef[], maxCycles = 60, maxLength = 24): GraphEdgeRef[][] {
  const cycles: GraphEdgeRef[][] = [];
  const order = new Map(nodeIds.map((n, i) => [n, i]));
  const outEdges = new Map<string, GraphEdgeRef[]>(nodeIds.map((n) => [n, []]));
  for (const e of edges) if (order.has(e.from) && order.has(e.to)) outEdges.get(e.from)!.push(e);

  // autolazos
  for (const e of edges) if (e.from === e.to && order.has(e.from)) cycles.push([e]);

  const sccs = stronglyConnected(nodeIds, edges.filter((e) => e.from !== e.to));
  for (const comp of sccs) {
    if (comp.length < 2) continue;
    const inComp = new Set(comp);
    const sorted = [...comp].sort((a, b) => order.get(a)! - order.get(b)!);
    for (let si = 0; si < sorted.length && cycles.length < maxCycles; si++) {
      const start = sorted[si];
      const allowed = new Set(sorted.slice(si));
      const path: GraphEdgeRef[] = [];
      const onPath = new Set<string>([start]);
      const dfs = (v: string): void => {
        if (cycles.length >= maxCycles || path.length >= maxLength) return;
        for (const e of outEdges.get(v)!) {
          if (e.from === e.to || !inComp.has(e.to) || !allowed.has(e.to)) continue;
          if (e.to === start) {
            cycles.push([...path, e]);
            if (cycles.length >= maxCycles) return;
          } else if (!onPath.has(e.to)) {
            onPath.add(e.to);
            path.push(e);
            dfs(e.to);
            path.pop();
            onPath.delete(e.to);
          }
        }
      };
      dfs(start);
    }
  }
  return cycles;
}

export function reachable(start: string, edges: { from: string; to: string }[], direction: 'forward' | 'backward'): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const [a, b] = direction === 'forward' ? [e.from, e.to] : [e.to, e.from];
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  }
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const v = queue.shift()!;
    for (const w of adj.get(v) ?? []) if (!seen.has(w)) { seen.add(w); queue.push(w); }
  }
  return seen;
}
