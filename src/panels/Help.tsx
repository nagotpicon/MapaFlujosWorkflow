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
      <Section title="1 · Pensar: suelta lo que tienes en la cabeza">
        <ul className="list-disc space-y-1 pl-4">
          <li>La <b className="text-ink">🧭 Brújula</b> (abajo) te hace <b className="text-ink">una pregunta cada vez</b> y te dice por qué. Contesta ahí mismo: lo que escribes aparece en el mapa, ya colocado.</li>
          <li><b className="text-ink">💡 Idea</b> añade una idea unida a la que tengas elegida. <b className="text-ink">Tab</b> hace lo mismo con el teclado.</li>
          <li>Para unir dos cosas, arrastra desde el <b className="text-ink">borde</b> de una hasta la otra (o usa «🔗 Unir»). «🧹 Ordenar» coloca todo. Ctrl+Z: deshacer.</li>
        </ul>
      </Section>
      <Section title="2 · Camino: de cómo está hoy a lo que quieres" defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-4">
          <li>El mapa es un camino: <b className="text-ink">🌱 Hoy → 👣 pasos → 🎯 Lo que quiero</b>. De Hoy salen 10 «empujones».</li>
          <li>Las <b className="text-ink">🪨 piedras</b> te frenan: se quedan con parte de los empujones. Las <b className="text-ink">🤝 ayudas</b> hacen más pequeñas las piedras.</li>
          <li>Arriba, el medidor dice cuántos <b className="text-ink">llegan de cada 10</b>. «¿Por qué?» abre <b className="text-ink">Lo que he descubierto</b> y tu <b className="text-ink">plan</b>.</li>
          <li>Toca cualquier cosa para decir qué es (paso, piedra, ayuda…), lo grande que es una piedra, o marcar ⭐ tu primer paso y ✅ lo que ya has hecho.</li>
        </ul>
      </Section>
      <Section title="3 · Experto: para cuando quieras afinar mucho" defaultOpen={false}>
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
