/**
 * Motor de condiciones: AND, OR, NOT, comparaciones, rangos, umbrales,
 * activación por vuelta y dependencias de otros elementos.
 */
import type { Condition, ConditionExpr, Operand } from '../core/model/schema';

export interface MetricReader {
  (nodeId: string, metric: Extract<Operand, { kind: 'metric' }>['metric'], dimensionId: string | null): number;
}

export interface ConditionContext {
  iteration: number;
  read: MetricReader;
}

export interface ConditionMemory {
  consecutive: number;
  latched: boolean;
  fired: boolean;
}

function operandValue(o: Operand, ctx: ConditionContext): number {
  switch (o.kind) {
    case 'const': return o.value;
    case 'iteration': return ctx.iteration;
    case 'metric': return ctx.read(o.nodeId, o.metric, o.dimensionId);
  }
}

function compare(a: number, op: string | null, b: number): boolean {
  switch (op) {
    case '>': return a > b;
    case '>=': return a >= b;
    case '<': return a < b;
    case '<=': return a <= b;
    case '==': return Math.abs(a - b) < 1e-9;
    case '!=': return Math.abs(a - b) >= 1e-9;
    default: return false;
  }
}

export function evaluateExpr(expr: ConditionExpr, ctx: ConditionContext): boolean {
  switch (expr.conditionType) {
    case 'const': return expr.value ?? true;
    case 'and': return expr.children.length === 0 || expr.children.every((c) => evaluateExpr(c, ctx));
    case 'or': return expr.children.some((c) => evaluateExpr(c, ctx));
    case 'not': return expr.children.length > 0 ? !evaluateExpr(expr.children[0], ctx) : true;
    case 'compare': {
      const [a, b] = expr.operands;
      if (!a || !b) return true;
      return compare(operandValue(a, ctx), expr.operator, operandValue(b, ctx));
    }
    case 'iteration': {
      const b = expr.operands[0];
      return compare(ctx.iteration, expr.operator, b ? operandValue(b, ctx) : 0);
    }
    case 'range': {
      const [v, lo, hi] = expr.operands;
      if (!v || !lo || !hi) return true;
      const x = operandValue(v, ctx);
      const inside = x >= operandValue(lo, ctx) && x <= operandValue(hi, ctx);
      return expr.operator === 'outside' ? !inside : inside;
    }
    case 'threshold': {
      const [v, t] = expr.operands;
      if (!v || !t) return true;
      const x = operandValue(v, ctx);
      const th = operandValue(t, ctx);
      return expr.operator === 'below' ? x < th : x >= th;
    }
    case 'active': {
      const v = expr.operands[0];
      return v && v.kind === 'metric' ? ctx.read(v.nodeId, 'active', null) > 0.5 : true;
    }
  }
}

/** Evalúa una condición aplicando sus reglas de activación (sostenimiento, enclavamiento, disparo único). */
export function evaluateCondition(cond: Condition, ctx: ConditionContext, mem: Map<string, ConditionMemory>): boolean {
  const m = mem.get(cond.id) ?? { consecutive: 0, latched: false, fired: false };
  let raw = evaluateExpr(cond.expr, ctx);
  if (cond.result === 'deactivate') raw = !raw;
  m.consecutive = raw ? m.consecutive + 1 : 0;
  let value = m.consecutive >= (cond.activationRules?.sustain ?? 1);
  const mode = cond.activationRules?.mode ?? 'always';
  if (mode === 'latch') {
    if (value) m.latched = true;
    value = m.latched;
  } else if (mode === 'once') {
    if (value && !m.fired) { m.fired = true; value = true; } else value = false;
  }
  mem.set(cond.id, m);
  return value;
}

/** Nodos de los que depende una expresión (para el grafo de dependencias). */
export function exprDependencies(expr: ConditionExpr, out: Set<string> = new Set()): Set<string> {
  for (const o of expr.operands) if (o.kind === 'metric') out.add(o.nodeId);
  for (const c of expr.children) exprDependencies(c, out);
  return out;
}

const OP_WORD: Record<string, string> = { '>': 'es más de', '>=': 'es por lo menos', '<': 'es menos de', '<=': 'es como mucho', '==': 'es justo', '!=': 'no es' };
const ROUND_WORD: Record<string, string> = { '>': 'después de la vuelta', '>=': 'desde la vuelta', '<': 'antes de la vuelta', '<=': 'hasta la vuelta', '==': 'en la vuelta', '!=': 'en todas menos la vuelta' };
const METRIC_LABEL: Record<string, string> = {
  in: 'lo que le llega a', out: 'lo que sale de', stock: 'lo que tiene guardado', influence: 'la fuerza de', lost: 'lo que pierde', result: 'lo que llega a la meta desde', dim: 'cómo es lo de', active: 'encendida',
};

/** La condición contada en una frase sencilla (la que se ve encima del editor). */
export function describeExpr(expr: ConditionExpr, nodeName: (id: string) => string): string {
  const od = (o: Operand | undefined): string => {
    if (!o) return '?';
    if (o.kind === 'const') return String(o.value);
    if (o.kind === 'iteration') return 'la vuelta';
    if (o.kind === 'metric' && o.metric === 'active') return `«${nodeName(o.nodeId)}»`;
    return `${METRIC_LABEL[o.metric] ?? o.metric} «${nodeName(o.nodeId)}»${o.dimensionId && o.metric === 'dim' ? ` (${o.dimensionId})` : ''}`;
  };
  switch (expr.conditionType) {
    case 'const': return expr.value === false ? 'nunca' : 'siempre';
    case 'and': return expr.children.map((c) => describeExpr(c, nodeName)).join(' y además ') || 'siempre';
    case 'or': return expr.children.map((c) => describeExpr(c, nodeName)).join(' o ') || 'nunca';
    case 'not': return `que NO pase esto: ${expr.children[0] ? describeExpr(expr.children[0], nodeName) : '…'}`;
    case 'compare': return `${od(expr.operands[0])} ${OP_WORD[expr.operator ?? ''] ?? expr.operator} ${od(expr.operands[1])}`;
    case 'iteration': return `${ROUND_WORD[expr.operator ?? ''] ?? `vuelta ${expr.operator}`} ${od(expr.operands[0])}`;
    case 'range': return `${od(expr.operands[0])} ${expr.operator === 'outside' ? 'está fuera de' : 'está entre'} ${od(expr.operands[1])} y ${od(expr.operands[2])}`;
    case 'threshold': return `${od(expr.operands[0])} ${expr.operator === 'below' ? 'no llega a' : 'pasa de'} ${od(expr.operands[1])}`;
    case 'active': return `${od(expr.operands[0])} está encendida`;
  }
}
