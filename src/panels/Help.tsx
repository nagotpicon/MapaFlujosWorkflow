import { SHORTCUTS, displayCombo } from '../app/shortcuts';
import { Kbd, Section } from '../ui/primitives';

export function HelpPanel() {
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];
  return (
    <div className="text-[13px] leading-relaxed text-ink-2">
      <Section title="Básico: crear, editar, conectar, organizar">
        <ul className="list-disc space-y-1 pl-4">
          <li><b className="text-ink">Doble clic</b> en el lienzo crea una burbuja. <b className="text-ink">Doble clic</b> en una burbuja edita su texto.</li>
          <li>Arrastra desde un <b className="text-ink">punto del borde</b> de una burbuja hasta otra para conectarlas. Elige el tipo de conexión en la barra lateral.</li>
          <li><b className="text-ink">Tab</b> crea una burbuja conectada; <b className="text-ink">⇧↵</b> una hermana. Clic derecho abre el menú contextual.</li>
          <li>Mayúsculas + arrastrar selecciona varias. ⌘G agrupa; los grupos se pliegan con su flecha.</li>
        </ul>
      </Section>
      <Section title="Avanzado: pesos, condiciones, comportamientos, dimensiones" defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-4">
          <li>Una burbuja puede ser solo una idea o tener <b className="text-ink">comportamientos</b> (filtrar, multiplicar, acumular…) que actúan sobre el flujo.</li>
          <li>Las <b className="text-ink">entradas</b> generan flujo con varias dimensiones independientes: cantidad, calidad, velocidad, potencial y carga.</li>
          <li>Las conexiones <b className="text-ink">causales</b> refuerzan, frenan o compensan; las de <b className="text-ink">flujo</b> transportan.</li>
          <li>Los valores cualitativos se interpretan como aproximación configurable y se marcan como tal.</li>
        </ul>
      </Section>
      <Section title="Experto: reglas, fórmulas, circuitos, simulaciones" defaultOpen={false}>
        <ul className="list-disc space-y-1 pl-4">
          <li>Los ciclos se procesan por iteraciones: una conexión de retorno entrega en la iteración siguiente, así nunca hay bucles infinitos.</li>
          <li>Pipeline por elemento: entradas → convergencia → condiciones → activación → filtros → transformaciones e influencias → capacidad → acumuladores → bifurcación → conexiones → retroalimentación → registro.</li>
          <li>Cada aumento o pérdida queda en el libro de conservación con su mecanismo: no aparecen unidades sin explicar.</li>
          <li>Los escenarios guardan solo sus cambios; el modelo base es compartido.</li>
        </ul>
      </Section>
      <Section title="Atajos" defaultOpen={false}>
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
