import { Plus, Trash2 } from 'lucide-react';
import { useProject } from '../store/projectStore';
import { Button, Field, IconButton, NumberInput, Section, TextInput, Toggle } from '../ui/primitives';
import * as A from '../app/actions';
import type { ProjectSettings } from '../core/model/schema';
import { SHORTCUTS, displayCombo } from '../app/shortcuts';
import { newId } from '../core/model/factory';

export function SettingsPanel() {
  const s = useProject((x) => x.doc?.project.settings)!;
  const set = (patch: Partial<ProjectSettings>, key?: string) => A.apply((d) => ({ ...d, project: { ...d.project, settings: { ...d.project.settings, ...patch } } }), key);
  return (
    <div data-testid="settings">
      <Section title="Escala ponderada">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mínimo"><NumberInput value={s.weightedScale.min} max={0} onChange={(min) => set({ weightedScale: { ...s.weightedScale, min } })} /></Field>
          <Field label="Máximo"><NumberInput value={s.weightedScale.max} min={0.1} onChange={(max) => set({ weightedScale: { ...s.weightedScale, max } })} /></Field>
        </div>
      </Section>
      <Section title="Escalas cualitativas (interpretación para simular)">
        <p className="text-[11.5px] text-ink-3">Los niveles cualitativos no son datos exactos. Aquí decides cómo se aproximan (0–1) cuando hay que simular; los resultados que los usan se marcan como aproximación.</p>
        {s.qualitativeScales.map((sc, si) => (
          <div key={sc.id} className="space-y-1.5 rounded-xl border border-line p-2.5">
            <div className="flex items-center gap-2">
              <TextInput value={sc.name} onChange={(name) => set({ qualitativeScales: s.qualitativeScales.map((x, i) => (i === si ? { ...x, name } : x)) }, `sc-${sc.id}`)} aria-label="Nombre de la escala" />
              {s.qualitativeScales.length > 1 && <IconButton label="Eliminar escala" variant="danger" onClick={() => set({ qualitativeScales: s.qualitativeScales.filter((_, i) => i !== si) })}><Trash2 className="size-3.5" /></IconButton>}
            </div>
            {sc.levels.map((l, li) => (
              <div key={li} className="flex items-center gap-2">
                <TextInput value={l.label} onChange={(label) => set({ qualitativeScales: s.qualitativeScales.map((x, i) => (i === si ? { ...x, levels: x.levels.map((y, j) => (j === li ? { ...y, label } : y)) } : x)) }, `lvl-${sc.id}-${li}`)} aria-label="Nivel" />
                <NumberInput className="w-24" value={l.value} min={0} max={1} step={0.05} onChange={(value) => set({ qualitativeScales: s.qualitativeScales.map((x, i) => (i === si ? { ...x, levels: x.levels.map((y, j) => (j === li ? { ...y, value } : y)) } : x)) })} aria-label="Interpretación" />
              </div>
            ))}
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => set({ qualitativeScales: [...s.qualitativeScales, { id: newId('scale'), name: 'Nueva escala', levels: [{ label: 'Bajo', value: 0.25 }, { label: 'Medio', value: 0.5 }, { label: 'Alto', value: 0.75 }] }] })}><Plus className="size-3.5" />Nueva escala</Button>
      </Section>
      <Section title="Paleta semántica y leyenda" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(s.palette) as (keyof ProjectSettings['palette'])[]).map((k) => (
            <Field key={k} label={{ flow: 'Flujo', gain: 'Impulso', loss: 'Pérdida', condition: 'Condición', transform: 'Transformación', concept: 'Concepto' }[k]}>
              <input type="color" value={s.palette[k]} aria-label={k} onChange={(e) => set({ palette: { ...s.palette, [k]: e.target.value } })} className="h-7 w-full cursor-pointer rounded border border-line bg-transparent" />
            </Field>
          ))}
        </div>
        <p className="text-[11px] text-ink-3">El lienzo usa los colores semánticos del tema (diseñados y validados para cada tema). La paleta del proyecto se aplica a conexiones con color propio.</p>
        <Field label="Mostrar leyenda" inline><Toggle label="Leyenda" checked={s.legend.visible} onChange={(visible) => set({ legend: { ...s.legend, visible } })} /></Field>
        <Button size="sm" variant="ghost" onClick={() => set({ legend: { ...s.legend, items: {} } })}>Restaurar elementos de la leyenda</Button>
      </Section>
      <Section title="Animación" defaultOpen={false}>
        <Field label="Partículas de flujo" inline><Toggle label="Partículas" checked={s.animation.particles} onChange={(particles) => set({ animation: { ...s.animation, particles } })} /></Field>
        <p className="text-[11px] text-ink-3">El movimiento general se controla también desde la preferencia del sistema «reducir movimiento».</p>
      </Section>
      <Section title="Atajos de teclado" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {SHORTCUTS.map((sc) => (
            <label key={sc.id} className="flex items-center gap-2 text-[12px]">
              <span className="flex-1 text-ink-2">{sc.label}</span>
              <input className="h-6 w-28 rounded-md border border-line bg-surface px-1.5 text-center font-mono text-[11px] text-ink outline-none focus:border-accent" value={s.shortcuts[sc.id] ?? sc.default}
                onChange={(e) => set({ shortcuts: { ...s.shortcuts, [sc.id]: e.target.value } }, `sc-${sc.id}`)} aria-label={`Atajo: ${sc.label}`} title={displayCombo(s.shortcuts[sc.id] ?? sc.default)} />
            </label>
          ))}
        </div>
        <p className="text-[11px] text-ink-3">Formato: Mod+Shift+Tecla (Mod = Ctrl o ⌘).</p>
      </Section>
    </div>
  );
}
