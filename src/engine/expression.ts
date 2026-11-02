/**
 * Evaluador seguro de fórmulas (sin eval). Usado en convergencias
 * personalizadas (nivel experto).
 * Soporta: números, variables, + - * / ^, paréntesis, menos unario y las
 * funciones min, max, abs, sqrt, round, clamp, avg, if(cond, a, b).
 */

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.eE]/.test(src[j])) j++;
      const v = Number(src.slice(i, j));
      if (Number.isNaN(v)) throw new Error(`Número no válido en posición ${i}`);
      out.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/^(),<>'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Carácter no permitido: "${c}"`);
  }
  return out;
}

const FUNCS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  abs: (a) => Math.abs(a[0]),
  sqrt: (a) => Math.sqrt(Math.max(0, a[0])),
  round: (a) => Math.round(a[0]),
  clamp: (a) => Math.min(Math.max(a[0], a[1]), a[2]),
  avg: (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0),
  if: (a) => (a[0] ? a[1] : a[2]),
};

export function evaluateExpression(src: string, vars: Record<string, number>): number {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const eat = (v?: string) => {
    const tok = tokens[p];
    if (!tok || (v !== undefined && !(tok.t === 'op' && tok.v === v))) throw new Error(`Se esperaba "${v ?? 'expresión'}"`);
    p++;
    return tok;
  };
  const isOp = (v: string) => { const t = peek(); return t?.t === 'op' && t.v === v; };

  function comparison(): number {
    let left = additive();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && ['>', '<', '>=', '<=', '==', '!='].includes(t.v)) {
        p++;
        const r = additive();
        switch (t.v) {
          case '>': left = left > r ? 1 : 0; break;
          case '<': left = left < r ? 1 : 0; break;
          case '>=': left = left >= r ? 1 : 0; break;
          case '<=': left = left <= r ? 1 : 0; break;
          case '==': left = left === r ? 1 : 0; break;
          default: left = left !== r ? 1 : 0;
        }
      } else return left;
    }
  }
  function additive(): number {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = eat().v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term(): number {
    let v = power();
    while (isOp('*') || isOp('/')) {
      const op = eat().v;
      const r = power();
      v = op === '*' ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  }
  function power(): number {
    const b = unary();
    if (isOp('^')) { eat('^'); return Math.pow(b, power()); }
    return b;
  }
  function unary(): number {
    if (isOp('-')) { eat('-'); return -unary(); }
    if (isOp('+')) { eat('+'); return unary(); }
    return primary();
  }
  function primary(): number {
    const t = peek();
    if (!t) throw new Error('Expresión incompleta');
    if (t.t === 'num') { p++; return t.v; }
    if (t.t === 'id') {
      p++;
      if (isOp('(')) {
        const fn = FUNCS[t.v];
        if (!fn) throw new Error(`Función desconocida: ${t.v}`);
        eat('(');
        const args: number[] = [];
        if (!isOp(')')) {
          args.push(comparison());
          while (isOp(',')) { eat(','); args.push(comparison()); }
        }
        eat(')');
        return fn(args);
      }
      if (!(t.v in vars)) throw new Error(`Variable desconocida: ${t.v}`);
      return vars[t.v];
    }
    if (isOp('(')) { eat('('); const v = comparison(); eat(')'); return v; }
    throw new Error(`Símbolo inesperado: ${t.v}`);
  }
  const v = comparison();
  if (p < tokens.length) throw new Error('Sobran símbolos al final de la expresión');
  return Number.isFinite(v) ? v : 0;
}

export function validateExpression(src: string, vars: string[]): string | null {
  try {
    evaluateExpression(src, Object.fromEntries(vars.map((v) => [v, 1])));
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
