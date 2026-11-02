/** Ajustes del marco espacial: activar/desactivar y ponderar cada eje. */
import type { ReactNode } from 'react';
import { Grid3x3 } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { Field, NumberInput, Popover, Segmented, TextInput, Toggle } from '../ui/primitives';
import * as A from './actions';
import type { Frame } from '../core/model/schema';

export function FramePopover({ trigger }: { trigger: ReactNode }) {
  const f = useProject((s) => s.doc?.project.settings.frame);
  if (!f) return <>{trigger}</>;
  const set = (patch: (f: Frame) => Frame, key?: string) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, frame: patch(d.project.settings.frame) } } }), key);
  const grid = f.mode === 'grid';
  return (
    <Popover trigger={trigger} align="end" className="w-[330px]">
      <div className="space-y-3" data-testid="frame-popover">
        <div className="flex items-start gap-2">
          <Grid3x3 className="mt-0.5 size-4 text-accent" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-ink">Marco espacial</div>
            <div className="text-[11.5px] text-ink-3">En el tapiz libre la posición no cuenta. En cuadrícula, la columna es tiempo y la fila es apoyo/fricción.</div>
          </div>
        </div>
        <Segmented label="Modo del lienzo" value={f.mode} onChange={(mode) => set((x) => ({ ...x, mode }))}
          options={[{ value: 'free', label: 'Tapiz libre' }, { value: 'grid', label: 'Cuadrícula que computa' }]} />
        {grid && (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ancho de columna"><NumberInput value={f.cellWidth} min={40} onChange={(v) => set((x) => ({ ...x, cellWidth: v }))} suffix="px" /></Field>
              <Field label="Alto de fila"><NumberInput value={f.cellHeight} min={40} onChange={(v) => set((x) => ({ ...x, cellHeight: v }))} suffix="px" /></Field>
            </div>
            <Field label="Eje horizontal = tiempo" inline><Toggle label="Tiempo" checked={f.time.enabled} onChange={(v) => set((x) => ({ ...x, time: { ...x.time, enabled: v } }))} /></Field>
            {f.time.enabled && (
              <div className="space-y-2 rounded-lg bg-surface-2 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Unidad"><TextInput value={f.time.unitLabel} onChange={(v) => set((x) => ({ ...x, time: { ...x.time, unitLabel: v || 'Periodo' } }), 'frame-unit')} /></Field>
                  <Field label="Fecha límite (columna)"><NumberInput value={f.time.deadline} min={1} placeholder="sin límite" onChange={(v) => set((x) => ({ ...x, time: { ...x.time, deadline: Math.round(v) } }))} /></Field>
                </div>
                {f.time.deadline != null && (
                  <>
                    <Segmented label="Lo que llega tarde" value={f.time.latePolicy} onChange={(v) => set((x) => ({ ...x, time: { ...x.time, latePolicy: v } }))}
                      options={[{ value: 'penalize', label: 'Se penaliza' }, { value: 'cut', label: 'No cuenta' }]} size="xs" />
                    {f.time.latePolicy === 'penalize' && <Field label="Conserva lo que llega tarde"><NumberInput percent value={f.time.lateKeep} min={0} max={1} onChange={(v) => set((x) => ({ ...x, time: { ...x.time, lateKeep: v } }))} /></Field>}
                    <button type="button" className="text-[11px] text-ink-3 underline" onClick={() => set((x) => ({ ...x, time: { ...x.time, deadline: null } }))}>Quitar fecha límite</button>
                  </>
                )}
                <Field label="Penalización por «prisas»" hint="por columna de inversión"><NumberInput percent value={f.time.inversionPenalty} min={0} max={1} onChange={(v) => set((x) => ({ ...x, time: { ...x.time, inversionPenalty: v } }))} /></Field>
              </div>
            )}
            <Field label="Eje vertical = apoyo / fricción" inline><Toggle label="Apoyo y fricción" checked={f.support.enabled} onChange={(v) => set((x) => ({ ...x, support: { ...x.support, enabled: v } }))} /></Field>
            {f.support.enabled && (
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-2.5">
                <Field label="Efecto por fila"><NumberInput percent value={f.support.effectPerRow} min={0} max={1} onChange={(v) => set((x) => ({ ...x, support: { ...x.support, effectPerRow: v } }))} /></Field>
                <Field label="Influencia por fila"><NumberInput value={f.support.influencePerRow} min={0} step={0.5} onChange={(v) => set((x) => ({ ...x, support: { ...x.support, influencePerRow: v } }))} suffix="pt" /></Field>
              </div>
            )}
            <p className="text-[11px] leading-snug text-ink-3">Los efectos de la posición se aplican como retardos, pérdidas y comportamientos normales del motor y aparecen explicados en el registro de eventos.</p>
          </div>
        )}
      </div>
    </Popover>
  );
}
