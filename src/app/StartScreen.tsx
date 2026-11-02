import { useEffect, useState } from 'react';
import { ArrowRight, FileUp, Plus, Sparkles, Layers3 } from 'lucide-react';
import * as repo from '../persistence/repository';
import { Button, ConfirmDeleteButton } from '../ui/primitives';
import * as A from './actions';
import { importFromFile } from './io';
import { Logo } from './TopBar';
import { useUI } from '../store/uiStore';

export function ProjectList({ onOpen }: { onOpen?: () => void }) {
  const [list, setList] = useState<repo.ProjectSummary[] | null>(null);
  const load = () => void repo.listProjects().then(setList);
  useEffect(load, []);
  if (!list) return null;
  if (!list.length) return <p className="py-6 text-center text-[12px] text-ink-3">Todavía no hay proyectos guardados en este navegador.</p>;
  return (
    <ul className="divide-y divide-line" data-testid="project-list">
      {list.map((p) => (
        <li key={p.id} className="group flex items-center gap-3 py-2">
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
            onClick={async () => { const l = await repo.loadProject(p.id); if (l) { await A.openProject(l.doc, l.repairs); onOpen?.(); } }}>
            <div className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-ink-3"><Layers3 className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{p.name}</div>
              <div className="text-[11px] text-ink-3">{p.nodeCount} elementos · {new Date(p.updatedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}{p.isDemo ? ' · demo' : ''}</div>
            </div>
            <ArrowRight className="size-4 text-ink-3 opacity-0 group-hover:opacity-100" />
          </button>
          <ConfirmDeleteButton label={`Eliminar «${p.name}» y sus versiones`} confirmLabel="¿Borrar? No se puede deshacer" onConfirm={async () => { await repo.deleteProject(p.id); load(); }} />
        </li>
      ))}
    </ul>
  );
}

export function StartScreen() {
  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-bg p-6" data-testid="start-screen">
      <div className="w-full max-w-3xl mdf-slide-b">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink">Mapa de Flujos</h1>
            <p className="text-[13px] text-ink-2">Piensa en libertad. Después, pon tu pensamiento en movimiento.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => void A.newProject()} data-testid="new-project"
            className="group rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            <Plus className="mb-6 size-5 text-accent" />
            <div className="text-[14px] font-semibold text-ink">Empezar en blanco</div>
            <div className="text-[12px] text-ink-3">Una burbuja y toda la libertad.</div>
          </button>
          <button type="button" onClick={() => void A.openDemo()} data-testid="open-demo"
            className="group rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            <Layers3 className="mb-6 size-5 text-gain" />
            <div className="text-[14px] font-semibold text-ink">Ver la demostración</div>
            <div className="text-[12px] text-ink-3">Éxito comercial de un operador de seguros. Valores ficticios.</div>
          </button>
          <button type="button" onClick={async () => { await A.newProject('Exploración'); useUI.setState({ overlay: 'explorer' }); }} data-testid="start-explorer"
            className="group rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            <Sparkles className="mb-6 size-5 text-transform" />
            <div className="text-[14px] font-semibold text-ink">Explorar una idea</div>
            <div className="text-[12px] text-ink-3">Descubre lo que necesitas pensar antes de empezar.</div>
          </button>
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-ink">Proyectos guardados</h2>
            <Button variant="ghost" size="sm" onClick={() => void importFromFile()}><FileUp className="size-4" />Importar</Button>
          </div>
          <ProjectList />
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-3">Todo se guarda automáticamente en este navegador. No necesitas cuenta.</p>
      </div>
    </div>
  );
}
