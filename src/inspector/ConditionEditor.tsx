/** Constructor visual de condiciones (Y / O / NO, comparaciones, rangos, umbrales, iteración, dependencias). Sin código. */
import { Plus, Trash2, Diamond } from 'lucide-react';
import type { Condition, ConditionExpr, Operand } from '../core/model/schema';
import { newId } from '../core/model/factory';
import * as op from '../core/operations';
import { describeExpr } from '../engine/conditions';
import * as A from '../app/actions';
import { Button, IconButton, NumberInput, Segmented, Select, cx } from '../ui/primitives';
import { NodeSelect, useInspector, useParam, OverrideMark } from './fields';

const METRICS: { value: Extract<Operand, { kind: 'metric' }>['metric']; label: string }[] = [
  { value: 'in', label: 'entrada' }, { value: 'out', label: 'salida' }, { value: 'result', label: 'resultado' }, { value: 'stock', label: 'stock' },
  { value: 'lost', label: 'pérdida' }, { value: 'influence', label: 'influencia' }, { value: 'dim', label: 'dimensión' },
];
const OPS = [{ value: '>', label: '>' }, { value: '>=', label: '≥' }, { value: '<', label: '<' }, { value: '<=', label: '≤' }, { value: '==', label: '=' }, { value: '!=', label: '≠' }];
type ClauseKind = 'compare' | 'iteration' | 'range' | 'threshold' | 'active' | 'group';

export function newClause(kind: ClauseKind, nodeId: string): ConditionExpr {
  const metric: Operand = { kind: 'metric', nodeId, metric: 'in', dimensionId: null };
  switch (kind) {
    case 'iteration': return { id: newId('cx'), conditionType: 'iteration', operator: '>=', operands: [{ kind: 'const', value: 2 }], children: [] };
    case 'range': return { id: newId('cx'), conditionType: 'range', operator: 'between', operands: [metric, { kind: 'const', value: 10 }, { kind: 'const', value: 100 }], children: [] };
    case 'threshold': return { id: newId('cx'), conditionType: 'threshold', operator: 'above', operands: [metric, { kind: 'const', value: 50 }], children: [] };
    case 'active': return { id: newId('cx'), conditionType: 'active', operator: null, operands: [{ ...metric, metric: 'active' }], children: [] };
    case 'group': return { id: newId('cx'), conditionType: 'or', operator: null, operands: [], children: [] };
    default: return { id: newId('cx'), conditionType: 'compare', operator: '>', operands: [metric, { kind: 'const', value: 0 }], children: [] };
  }
}

function MetricOperand({ o, onChange }: { o: Operand; onChange: (o: Operand) => void }) {
  const { doc } = useInspector();
  if (o.kind !== 'metric') return null;
  return (
    <div className="flex flex-wrap gap-1">
      <div className="min-w-0 flex-[2]"><NodeSelect label="Elemento" value={o.nodeId} onChange={(nodeId) => onChange({ ...o, nodeId })} /></div>
      <Select label="Métrica" className="flex-1" value={o.metric} onChange={(metric) => onChange({ ...o, metric })} options={METRICS} />
      {o.metric === 'dim' && <Select label="Dimensión" className="flex-1" value={o.dimensionId ?? 'quality'} onChange={(dimensionId) => onChange({ ...o, dimensionId })} options={Object.values(doc.dimensions).map((d) => ({ value: d.id, label: d.name }))} />}
    </div>
  );
}

const constVal = (o: Operand | undefined) => (o?.kind === 'const' ? o.value : 0);

function Clause({ expr, onChange, onRemove, ownerNode, depth }: { expr: ConditionExpr; onChange: (e: ConditionExpr) => void; onRemove: () => void; ownerNode: string; depth: number }) {
  const setOperand = (i: number, o: Operand) => onChange({ ...expr, operands: expr.operands.map((x, j) => (j === i ? o : x)) });
  if (expr.conditionType === 'and' || expr.conditionType === 'or') {
    return <Group expr={expr} onChange={onChange} onRemove={onRemove} ownerNode={ownerNode} depth={depth} />;
  }
  if (expr.conditionType === 'not') {
    const child = expr.children[0];
    return (
      <div className="rounded-lg border border-dashed border-line p-1.5">
        <div className="mb-1 flex items-center justify-between text-[10.5px] font-semibold text-cond">NO <IconButton size="xs" label="Eliminar" onClick={onRemove}><Trash2 className="size-3" /></IconButton></div>
        {child && <Clause expr={child} ownerNode={ownerNode} depth={depth + 1} onChange={(c) => onChange({ ...expr, children: [c] })} onRemove={onRemove} />}
      </div>
    );
  }
  return (
    <div className="space-y-1 rounded-lg bg-surface-2 p-1.5" data-testid="condition-clause">
      <div className="flex items-center gap-1">
        <Select label="Tipo de cláusula" className="flex-1" value={expr.conditionType} onChange={(t) => onChange(newClause(t as ClauseKind, ownerNode))}
          options={[{ value: 'compare', label: 'Comparación' }, { value: 'threshold', label: 'Umbral' }, { value: 'range', label: 'Rango' }, { value: 'iteration', label: 'Iteración / tiempo' }, { value: 'active', label: 'Depende de otro activo' }]} />
        <IconButton size="xs" label="Negar (NO)" onClick={() => onChange({ id: newId('cx'), conditionType: 'not', operator: null, operands: [], children: [expr] })}><span className="text-[10px] font-bold">NO</span></IconButton>
        <IconButton size="xs" label="Eliminar cláusula" onClick={onRemove}><Trash2 className="size-3" /></IconButton>
      </div>
      {expr.conditionType === 'compare' && (<>
        <MetricOperand o={expr.operands[0]} onChange={(o) => setOperand(0, o)} />
        <div className="flex gap-1">
          <Select label="Operador" className="w-16" value={expr.operator ?? '>'} onChange={(operator) => onChange({ ...expr, operator: operator as never })} options={OPS} />
          <NumberInput className="flex-1" value={constVal(expr.operands[1])} onChange={(v) => setOperand(1, { kind: 'const', value: v })} />
        </div>
      </>)}
      {expr.conditionType === 'threshold' && (<>
        <MetricOperand o={expr.operands[0]} onChange={(o) => setOperand(0, o)} />
        <div className="flex gap-1">
          <Select label="Sentido" className="w-28" value={expr.operator ?? 'above'} onChange={(operator) => onChange({ ...expr, operator: operator as never })} options={[{ value: 'above', label: 'supera' }, { value: 'below', label: 'por debajo de' }]} />
          <NumberInput className="flex-1" value={constVal(expr.operands[1])} onChange={(v) => setOperand(1, { kind: 'const', value: v })} />
        </div>
      </>)}
      {expr.conditionType === 'range' && (<>
        <MetricOperand o={expr.operands[0]} onChange={(o) => setOperand(0, o)} />
        <div className="flex items-center gap-1">
          <Select label="Rango" className="w-24" value={expr.operator ?? 'between'} onChange={(operator) => onChange({ ...expr, operator: operator as never })} options={[{ value: 'between', label: 'entre' }, { value: 'outside', label: 'fuera de' }]} />
          <NumberInput className="flex-1" value={constVal(expr.operands[1])} onChange={(v) => setOperand(1, { kind: 'const', value: v })} />
          <span className="text-[11px] text-ink-3">y</span>
          <NumberInput className="flex-1" value={constVal(expr.operands[2])} onChange={(v) => setOperand(2, { kind: 'const', value: v })} />
        </div>
      </>)}
      {expr.conditionType === 'iteration' && (
        <div className="flex items-center gap-1">
          <span className="text-[11.5px] text-ink-2">Iteración</span>
          <Select label="Operador" className="w-16" value={expr.operator ?? '>='} onChange={(operator) => onChange({ ...expr, operator: operator as never })} options={OPS} />
          <NumberInput className="flex-1" value={constVal(expr.operands[0])} min={1} onChange={(v) => onChange({ ...expr, operands: [{ kind: 'const', value: Math.round(v) }] })} />
        </div>
      )}
      {expr.conditionType === 'active' && expr.operands[0]?.kind === 'metric' && (
        <NodeSelect label="Elemento" value={expr.operands[0].nodeId} onChange={(nodeId) => setOperand(0, { ...(expr.operands[0] as Extract<Operand, { kind: 'metric' }>), nodeId })} />
      )}
    </div>
  );
}

function Group({ expr, onChange, onRemove, ownerNode, depth }: { expr: ConditionExpr; onChange: (e: ConditionExpr) => void; onRemove?: () => void; ownerNode: string; depth: number }) {
  return (
    <div className={cx('space-y-1.5', depth > 0 && 'rounded-lg border border-line p-1.5')}>
      <div className="flex items-center gap-1.5">
        <Segmented size="xs" label="Operador lógico" value={expr.conditionType} onChange={(t) => onChange({ ...expr, conditionType: t })}
          options={[{ value: 'and', label: 'Y (todas)' }, { value: 'or', label: 'O (alguna)' }]} />
        <div className="flex-1" />
        {depth > 0 && onRemove && <IconButton size="xs" label="Eliminar grupo" onClick={onRemove}><Trash2 className="size-3" /></IconButton>}
      </div>
      {expr.children.map((c, i) => (
        <Clause key={c.id} expr={c} ownerNode={ownerNode} depth={depth + 1}
          onChange={(nc) => onChange({ ...expr, children: expr.children.map((x, j) => (j === i ? nc : x)) })}
          onRemove={() => onChange({ ...expr, children: expr.children.filter((_, j) => j !== i) })} />
      ))}
      <div className="flex gap-1">
        <Button size="xs" variant="subtle" onClick={() => onChange({ ...expr, children: [...expr.children, newClause('compare', ownerNode)] })} data-testid="add-clause"><Plus className="size-3" />Cláusula</Button>
        {depth < 2 && <Button size="xs" variant="ghost" onClick={() => onChange({ ...expr, children: [...expr.children, newClause('group', ownerNode)] })}><Plus className="size-3" />Grupo</Button>}
      </div>
    </div>
  );
}

/** Editor completo de una condición existente. */
export function ConditionBlock({ condition, ownerNode, onDelete }: { condition: Condition; ownerNode: string; onDelete: () => void }) {
  const { doc } = useInspector();
  const [expr, setExpr, o] = useParam<ConditionExpr>('condition', condition.id, 'expr');
  const root: ConditionExpr = expr.conditionType === 'and' || expr.conditionType === 'or' ? expr : { id: newId('cx'), conditionType: 'and', operator: null, operands: [], children: [expr] };
  const title = (id: string) => doc.nodes[id]?.title ?? '?';
  return (
    <div className="space-y-2 rounded-xl border border-line p-2" data-testid="condition-block">
      <div className="flex items-start gap-1.5">
        <Diamond className="mt-0.5 size-3.5 shrink-0 text-cond" />
        <p className="flex-1 text-[11.5px] leading-snug text-ink-2">{describeExpr(root, title)}</p>
        <OverrideMark {...o} />
        <IconButton size="xs" label="Eliminar condición" variant="danger" onClick={onDelete}><Trash2 className="size-3" /></IconButton>
      </div>
      <Group expr={root} onChange={setExpr} ownerNode={ownerNode} depth={0} />
      <div className="grid grid-cols-2 gap-1.5 border-t border-line pt-2">
        <Select label="Resultado" value={condition.result} onChange={(result) => A.apply((d) => op.updateCondition(d, condition.id, { result }))}
          options={[{ value: 'activate', label: 'Si se cumple: actúa' }, { value: 'deactivate', label: 'Si se cumple: no actúa' }]} />
        <Select label="Activación" value={condition.activationRules.mode} onChange={(mode) => A.apply((d) => op.updateCondition(d, condition.id, { activationRules: { ...condition.activationRules, mode } }))}
          options={[{ value: 'always', label: 'Cada iteración' }, { value: 'latch', label: 'Una vez cierta, queda' }, { value: 'once', label: 'Solo una vez' }]} />
      </div>
      <label className="flex items-center justify-between gap-2 text-[11px] text-ink-2">
        Debe cumplirse durante
        <span className="flex w-24 items-center gap-1"><NumberInput value={condition.activationRules.sustain} min={1} onChange={(v) => A.apply((d) => op.updateCondition(d, condition.id, { activationRules: { ...condition.activationRules, sustain: Math.max(1, Math.round(v)) } }))} /> it.</span>
      </label>
    </div>
  );
}

export function ConditionsList({ ownerType, ownerId, ids, ownerNode, emptyText, addLabel = 'Añadir condición' }: {
  ownerType: Condition['ownerType']; ownerId: string; ids: string[]; ownerNode: string; emptyText: string; addLabel?: string;
}) {
  const { doc } = useInspector();
  const conds = ids.map((id) => doc.conditions[id]).filter(Boolean);
  return (
    <div className="space-y-2">
      {conds.length === 0 && <p className="text-[11.5px] text-ink-3">{emptyText}</p>}
      {conds.map((c) => <ConditionBlock key={c.id} condition={c} ownerNode={ownerNode} onDelete={() => A.apply((d) => op.removeCondition(d, c.id))} />)}
      <Button size="sm" variant="outline" onClick={() => A.apply((d) => op.addCondition(d, ownerType, ownerId, { id: newId('cx'), conditionType: 'and', operator: null, operands: [], children: [newClause('compare', ownerNode)] }).doc)} data-testid="add-condition">
        <Plus className="size-3.5" />{addLabel}
      </Button>
    </div>
  );
}
