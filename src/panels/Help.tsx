import { SHORTCUTS, displayCombo } from '../app/shortcuts';
import { Kbd, Section } from '../ui/primitives';
import { BookOpen, Bot } from 'lucide-react';
import { MANUAL_IA_PATH, MANUAL_USER_PATH, manualUrl } from '../app/manuals';

export function HelpPanel() {
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];
  return (
    <div className="text-[13px] leading-relaxed text-ink-2">
      <div className="grid gap-2 px-5 pt-4 sm:grid-cols-2" data-testid="help-manuals">
        <a href={manualUrl(MANUAL_USER_PATH)} target="_blank" rel="noopener" className="flex items-start gap-3 rounded-xl border border-line p-3 no-underline hover:border-accent">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-accent" />
          <span><b className="block text-ink">Manual de usuario</b><span className="text-[12px] text-ink-3">Guía completa, paso a paso, de todo lo que hace la aplicación.</span></span>
        </a>
        <a href={manualUrl(MANUAL_IA_PATH)} target="_blank" rel="noopener" className="flex items-start gap-3 rounded-xl border border-line p-3 no-underline hover:border-accent">
          <Bot className="mt-0.5 size-5 shrink-0 text-transform" />
          <span><b className="block text-ink">Manual para IA</b><span className="text-[12px] text-ink-3">Prompts listos para copiar y el formato JSON para que una IA cree mapas.</span></span>
        </a>
      </div>
      <Section title="Nivel 1 · Ideas: suelta lo que tienes en la cabeza">
        <ul className="list-disc space-y-1 pl-4">
          <li><b className="text-ink">Doble clic</b> en cualquier sitio del lienzo: idea nueva. <b className="text-ink">Doble clic</b> en una idea: escribir en ella.</li>
          <li>Con una idea elegida, <b className="text-ink">Tab</b> crea otra unida a ella y <b className="text-ink">⇧↵</b> una «hermana» debajo.</li>
          <li>Para unir dos ideas, arrastra desde el <b className="text-ink">borde</b> de una hasta la otra (o usa «Unir»).</li>
          <li>«Ordenar» coloca todo en su sitio. Clic derecho: más opciones. Ctrl+Z: deshacer.</li>
        </ul>
      </Section>
      <Section title="Nivel 2 · Movimiento: mira qué llega a tu meta" defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-4">
          <li>Marca dónde empieza todo (<b className="text-ink">Inicio</b>) y qué quieres conseguir (<b className="text-ink">Meta</b>). Une los pasos en orden.</li>
          <li>Pulsa <b className="text-ink">Probar</b>: ronda a ronda (semana, mes…) verás cuánto llega a la meta.</li>
          <li>En cada paso puedes decir qué pasa: <b className="text-ink">Colador</b> (solo pasa una parte), <b className="text-ink">Límite</b> (solo caben unos cuantos), <b className="text-ink">Hucha</b> (lo guarda), <b className="text-ink">Multiplica</b>…</li>
          <li>«Dímelo claro» te cuenta, sin rodeos, dónde se pierde lo demás.</li>
        </ul>
      </Section>
      <Section title="Nivel 3 · Todo: para cuando quieras afinar" defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-4">
          <li><b className="text-ink">¿Y si…?</b>: prueba cambios (más tiempo, otro precio…) sin estropear tu mapa original, y compáralos.</li>
          <li><b className="text-ink">Frenos y remedios</b>: una idea puede frenar a otra; un remedio le quita fuerza al freno.</li>
          <li><b className="text-ink">Bucles</b>: lo que vuelve al principio, como el boca a boca. Se calcula ronda a ronda, así nunca se atasca.</li>
          <li><b className="text-ink">Cuadrícula del tiempo</b>, <b className="text-ink">termómetro</b> (qué se agobia y qué va tranquilo) y <b className="text-ink">Marcador</b> con lo que más te ayuda y te frena.</li>
        </ul>
      </Section>
      <Section title="Atajos de teclado" defaultOpen={false}>
        {groups.map((g) => (
          <div key={g} className="mb-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{g}</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {SHORTCUTS.filter((s) => s.group === g).map((s) => <div key={s.id} className="flex justify-between text-[12px]"><span>{s.label}</span><Kbd>{displayCombo(s.default)}</Kbd></div>)}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}
