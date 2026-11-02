import { ChevronDown, CopyPlus, GitCompare, Plus, RotateCcw } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { useUI } from '../store/uiStore';
import { Menu, cx } from '../ui/primitives';
import * as op from '../core/operations';
import * as A from './actions';

export function ScenarioSwitcher() {
  const scenarios = useProject((s) => s.doc?.scenarios);
  const activeId = useProject((s) => s.doc?.project.activeScenarioId);
  if (!scenarios) return null;
  const list = Object.values(scenarios).sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.createdAt - b.createdAt);
  const active = activeId ? scenarios[activeId] : list[0];
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button type="button" className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[12px] text-ink-2 hover:bg-surface-2" data-testid="scenario-switcher" aria-label="Escenario activo">
          <span className="size-2 rounded-full" style={{ background: active?.color }} />
          <span className="max-w-44 truncate font-medium text-ink">{active?.name}</span>
          {active && active.overrides.length > 0 && <span className="rounded bg-surface-2 px-1 text-[10px] tabular text-ink-3">{active.overrides.length} cambios</span>}
          <ChevronDown className="size-3.5 text-ink-3" />
        </button>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>Escenarios</Menu.Label>
        {list.map((s) => (
          <Menu.Item key={s.id} onSelect={() => A.apply((d) => op.setActiveScenario(d, s.id))}
            icon={<span className={cx('mt-1 block size-2 rounded-full', s.id === activeId && 'ring-2 ring-accent ring-offset-1 ring-offset-[var(--surface)]')} style={{ background: s.color }} />}
            shortcut={s.id === activeId ? 'activo' : s.overrides.length ? `${s.overrides.length}` : undefined}>
            {s.name}
          </Menu.Item>
        ))}
        <Menu.Separator />
        <Menu.Item icon={<Plus />} onSelect={() => A.apply((d) => { const r = op.addScenario(d, `Escenario ${Object.keys(d.scenarios).length + 1}`); return op.setActiveScenario(r.doc, r.id); })}>Nuevo escenario</Menu.Item>
        {active && <Menu.Item icon={<CopyPlus />} onSelect={() => A.apply((d) => { const r = op.addScenario(d, `${active.name} (copia)`, active.id); return op.setActiveScenario(r.doc, r.id); })}>Duplicar «{active.name}»</Menu.Item>}
        {active && !active.isBase && <Menu.Item icon={<RotateCcw />} onSelect={() => A.apply((d) => op.updateScenario(d, active.id, { overrides: [], initialConditions: {} }))}>Restaurar valores iniciales</Menu.Item>}
        <Menu.Item icon={<GitCompare />} onSelect={() => useUI.setState({ overlay: 'compare' })}>Comparar escenarios…</Menu.Item>
      </Menu.Content>
    </Menu.Root>
  );
}
