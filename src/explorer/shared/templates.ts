/**
 * Generador LOCAL por plantillas (sin IA). Detecta el tipo de idea y construye
 * su contexto posible con las fricciones estándar de ese tipo. Todo lo que no
 * procede del usuario se marca como sugerencia sin confirmar.
 */
import type { Proposal } from './schemas.ts';

export type Domain = 'local_service' | 'digital' | 'personal' | 'team' | 'product' | 'campaign' | 'generic';

const KEYWORDS: [Domain, RegExp][] = [
  ['team', /\bequipo\b|comercial(es)?\b|departamento|operadores|empleados|plantilla|mejorar el funcionamiento/i],
  ['digital', /curso online|online|audiencia|e-?commerce|tienda online|suscripci|saas|newsletter|infoproducto|youtube|instagram|redes sociales/i],
  ['personal', /aprender|programaci|desarrollar una (app|aplicaci)|proyecto personal|poco tiempo|estudiar|hobby|oposici/i],
  ['local_service', /clases|guitarra|profesor|particulares|a domicilio|alumnos|peluquer|fontaner|reformas|fisioterap|entrenador|servicio local/i],
  ['product', /producto|fabricar|artesan|vender .* (unidades|piezas)|prototipo|tienda f[ií]sica/i],
  ['campaign', /campa[ñn]a|publicidad|anuncios|lanzamiento|evento/i],
];

export function detectDomain(text: string): Domain {
  for (const [d, re] of KEYWORDS) if (re.test(text)) return d;
  return 'generic';
}

export const DOMAIN_LABEL: Record<Domain, string> = {
  local_service: 'Servicio local / negocio de proximidad', digital: 'Negocio digital', personal: 'Proyecto personal', team: 'Proceso de equipo',
  product: 'Producto', campaign: 'Campaña', generic: 'Actividad',
};

interface Stage { id: string; title: string; role: Proposal['nodes'][number]['role']; description: string }
interface Friction { title: string; category: 'personal' | 'external' | 'system'; stage: string; control: 'direct' | 'partial' | 'external' | 'uncontrollable'; note: string; mitigation: string; route?: string }
interface Template {
  start: { title: string; description: string; unit: string };
  stages: Stage[];
  result: string;
  frictions: Friction[];
  alternatives: { name: string; description: string; advantages: string; limitations: string; firstExperiment: string }[];
  metrics: { name: string; why: string }[];
  experiment: { name: string; hypothesis: string; test: string; duration: string; confirmIf: string; questionIf: string; stopWhen: string; record: string[] };
  unknowns: string[];
  loop: { description: string; to: string };
  recovery?: { title: string; from: string; to: string };
}

const T: Record<Domain, Template> = {
  local_service: {
    start: { title: 'Acciones de captación', description: 'Lo que inicia el flujo (flyers, mensajes, contactos…).', unit: 'acciones' },
    stages: [
      { id: 'contact', title: 'Contactos recibidos', role: 'transformation', description: 'Personas que responden y contactan.' },
      { id: 'valid', title: 'Contactos válidos', role: 'condition', description: 'Con interés real, zona y horario compatibles.' },
      { id: 'trial', title: 'Clase o visita de prueba', role: 'action', description: 'Primera experiencia del cliente.' },
      { id: 'client', title: 'Clientes que pagan', role: 'transformation', description: 'Conversión a cliente.' },
      { id: 'recurrent', title: 'Clientes recurrentes', role: 'result', description: 'Los que se quedan mes a mes.' },
    ],
    result: 'Ingresos netos',
    frictions: [
      { title: 'Tiempo real disponible', category: 'personal', stage: 'trial', control: 'direct', note: 'Horas incluyendo preparación, desplazamientos y seguimiento.', mitigation: 'Agrupar sesiones por zona y franjas fijas' },
      { title: 'Tolerancia al rechazo', category: 'personal', stage: 'contact', control: 'partial', note: 'Muchas acciones no obtienen respuesta.', mitigation: 'Objetivos semanales pequeños y medibles' },
      { title: 'Desplazamientos', category: 'system', stage: 'client', control: 'partial', note: 'Tiempo y coste no facturable entre clientes.', mitigation: 'Clases agrupadas o en un lugar fijo', route: 'Clases online o en tu domicilio' },
      { title: 'Cancelaciones', category: 'external', stage: 'recurrent', control: 'partial', note: 'Huecos que no se recuperan.', mitigation: 'Política de cancelación y pago por adelantado' },
      { title: 'Demanda local incierta', category: 'external', stage: 'contact', control: 'uncontrollable', note: 'No sabemos cuánta gente busca esto en tu zona.', mitigation: 'Prueba limitada en una zona concreta' },
      { title: 'Permisos para publicidad', category: 'external', stage: 'contact', control: 'external', note: 'No todos los espacios permiten flyers.', mitigation: 'Acuerdos con comercios del barrio' },
      { title: 'Sin forma de medir el canal', category: 'system', stage: 'valid', control: 'direct', note: 'Si no sabes de dónde viene cada contacto no sabrás qué funciona.', mitigation: 'Código o pregunta "¿cómo nos conociste?"' },
    ],
    alternatives: [
      { name: 'Recomendaciones de conocidos', description: 'Pedir a tu red que te recomiende.', advantages: 'Coste casi nulo, más confianza.', limitations: 'Alcance limitado.', firstExperiment: 'Escribir a 20 contactos esta semana.' },
      { name: 'Acuerdo con tienda o academia', description: 'Colaborar con un negocio que ya tiene clientes.', advantages: 'Público ya interesado.', limitations: 'Depende de un tercero; comisión.', firstExperiment: 'Visitar 3 tiendas con una propuesta concreta.' },
      { name: 'Clases online o grupos reducidos', description: 'Reducir desplazamientos y atender a más personas.', advantages: 'Más ingresos por hora.', limitations: 'Otra experiencia; no a todos les sirve.', firstExperiment: 'Ofrecer un grupo de 3 personas.' },
    ],
    metrics: [{ name: 'Coste por cliente', why: 'Dice si el canal compensa.' }, { name: 'Ingreso neto por hora real', why: 'Rentabilidad de tu tiempo, no solo del dinero.' }, { name: 'Tasa de prueba → cliente', why: 'Mide la conversión real.' }],
    experiment: { name: 'Prueba limitada de captación', hypothesis: 'El canal elegido genera contactos válidos a un coste razonable.', test: 'Una zona concreta durante una o dos semanas con un número fijo de acciones.', duration: '1–2 semanas', confirmIf: 'Al menos N contactos válidos (defínelo antes)', questionIf: 'Contactos pero ninguno válido', stopWhen: 'Has invertido el máximo que aceptas perder', record: ['Acciones realizadas', 'Tiempo empleado', 'Coste', 'Contactos', 'Contactos válidos', 'Clientes', 'Ingresos'] },
    unknowns: ['Cuántas acciones puedes hacer realmente por semana', 'Qué porcentaje de contactos es válido', 'Precio que el cliente aceptará', 'Distancia o tiempo máximo rentable por desplazamiento'],
    loop: { description: 'Clientes satisfechos recomiendan y traen nuevos contactos.', to: 'contact' },
    recovery: { title: 'Seguimiento de interesados', from: 'valid', to: 'trial' },
  },
  digital: {
    start: { title: 'Contenido / alcance', description: 'Lo que pone a la gente en contacto contigo.', unit: 'impactos' },
    stages: [
      { id: 'visits', title: 'Visitas o seguidores', role: 'transformation', description: 'Atención captada.' },
      { id: 'leads', title: 'Interesados (lista)', role: 'transformation', description: 'Personas que dejan su contacto.' },
      { id: 'validation', title: 'Validación de la oferta', role: 'condition', description: '¿Hay quien pague antes de producirlo todo?' },
      { id: 'buyers', title: 'Compradores', role: 'transformation', description: 'Conversión a venta.' },
      { id: 'delivery', title: 'Entrega y soporte', role: 'action', description: 'Lo que ocurre después de vender.' },
    ],
    result: 'Ventas netas',
    frictions: [
      { title: 'Sin audiencia previa', category: 'external', stage: 'visits', control: 'partial', note: 'Empezar de cero en atención.', mitigation: 'Colaboraciones con quien ya tiene audiencia', route: 'Venta directa a una comunidad existente' },
      { title: 'Constancia creando contenido', category: 'personal', stage: 'visits', control: 'direct', note: 'Exige regularidad durante meses.', mitigation: 'Calendario mínimo sostenible' },
      { title: 'Plataformas y algoritmos', category: 'external', stage: 'visits', control: 'uncontrollable', note: 'Dependencia de terceros.', mitigation: 'Lista de correo propia' },
      { title: 'Confianza del comprador', category: 'external', stage: 'buyers', control: 'partial', note: 'Comprar a alguien desconocido.', mitigation: 'Muestra gratuita y garantía' },
      { title: 'Tiempo de producción', category: 'personal', stage: 'validation', control: 'direct', note: 'Producir antes de validar consume mucho.', mitigation: 'Preventa antes de producir' },
      { title: 'Soporte posventa', category: 'system', stage: 'delivery', control: 'direct', note: 'Dudas y reembolsos consumen tiempo.', mitigation: 'Preguntas frecuentes y comunidad' },
    ],
    alternatives: [
      { name: 'Preventa a una lista pequeña', description: 'Vender antes de producir.', advantages: 'Valida con dinero real.', limitations: 'Requiere algo de audiencia.', firstExperiment: 'Página de preventa con 20 plazas.' },
      { name: 'Colaboración con creador afín', description: 'Usar una audiencia existente.', advantages: 'Alcance inmediato.', limitations: 'Reparto de ingresos.', firstExperiment: 'Proponer un taller conjunto.' },
      { name: 'Servicio 1:1 antes del curso', description: 'Aprender qué necesitan cobrando sesiones.', advantages: 'Ingresos y aprendizaje rápidos.', limitations: 'No escala.', firstExperiment: 'Ofrecer 5 sesiones.' },
    ],
    metrics: [{ name: 'Interesados por semana', why: 'Ritmo real de captación.' }, { name: 'Conversión interesado → comprador', why: 'Valida la oferta.' }, { name: 'Horas de producción por venta', why: 'Rentabilidad del tiempo.' }],
    experiment: { name: 'Preventa mínima', hypothesis: 'Hay personas dispuestas a pagar por esta oferta.', test: 'Página sencilla y difusión a contactos durante 2 semanas.', duration: '2 semanas', confirmIf: 'Alcanzas el mínimo de reservas fijado', questionIf: 'Muchas visitas y ninguna reserva', stopWhen: 'Plazo cumplido sin reservas', record: ['Visitas', 'Interesados', 'Reservas', 'Ingresos', 'Horas invertidas'] },
    unknowns: ['Quién es exactamente el cliente', 'Qué problema urgente resuelve', 'Precio aceptable', 'Canal de captación más eficaz'],
    loop: { description: 'Compradores satisfechos generan testimonios y recomendaciones.', to: 'leads' },
  },
  personal: {
    start: { title: 'Horas semanales disponibles', description: 'El recurso que alimenta el proyecto.', unit: 'h' },
    stages: [
      { id: 'learning', title: 'Aprendizaje', role: 'transformation', description: 'Conocimientos que necesitas.' },
      { id: 'practice', title: 'Práctica', role: 'action', description: 'Construir para aprender.' },
      { id: 'milestone', title: 'Objetivo intermedio', role: 'condition', description: 'Un entregable pequeño y concreto.' },
      { id: 'build', title: 'Construcción del proyecto', role: 'action', description: 'Avance real hacia el objetivo.' },
    ],
    result: 'Proyecto terminado',
    frictions: [
      { title: 'Tiempo fragmentado', category: 'personal', stage: 'learning', control: 'partial', note: 'Sesiones cortas cuestan arrancar.', mitigation: 'Bloques fijos y una tarea por sesión' },
      { title: 'Riesgo de dispersión', category: 'personal', stage: 'practice', control: 'direct', note: 'Saltar entre tecnologías o ideas.', mitigation: 'Alcance mínimo cerrado' },
      { title: 'Curva de aprendizaje', category: 'system', stage: 'learning', control: 'partial', note: 'Los primeros meses avanzan lento.', mitigation: 'Ruta guiada y proyecto pequeño' },
      { title: 'Pérdida de motivación', category: 'personal', stage: 'build', control: 'partial', note: 'Sin resultados visibles se abandona.', mitigation: 'Hitos visibles cada 2 semanas' },
      { title: 'Alcance demasiado grande', category: 'system', stage: 'milestone', control: 'direct', note: 'El objetivo inicial no cabe en el tiempo.', mitigation: 'Recortar a una primera versión', route: 'Usar herramientas sin código para una primera versión' },
    ],
    alternatives: [
      { name: 'Versión mínima con herramientas sin código', description: 'Llegar antes a algo usable.', advantages: 'Resultados rápidos.', limitations: 'Menos aprendizaje técnico.', firstExperiment: 'Prototipo en un fin de semana.' },
      { name: 'Curso con proyecto guiado', description: 'Estructura externa.', advantages: 'Menos dispersión.', limitations: 'Coste y ritmo ajeno.', firstExperiment: 'Probar la primera unidad.' },
    ],
    metrics: [{ name: 'Horas efectivas por semana', why: 'Lo que realmente alimenta el flujo.' }, { name: 'Hitos completados', why: 'Avance visible.' }],
    experiment: { name: 'Dos semanas de ritmo real', hypothesis: 'Puedo sostener N horas por semana.', test: 'Registrar cada sesión durante 2 semanas.', duration: '2 semanas', confirmIf: 'Cumples ≥ 80% de lo previsto', questionIf: 'Cumples < 50%', stopWhen: 'Tras 2 semanas, revisa el plan', record: ['Horas', 'Tareas completadas', 'Bloqueos'] },
    unknowns: ['Horas reales sostenibles', 'Qué es "terminado" para ti', 'Conocimientos que ya tienes'],
    loop: { description: 'Cada hito completado refuerza la motivación y la constancia.', to: 'practice' },
  },
  team: {
    start: { title: 'Entradas de trabajo', description: 'Oportunidades, llamadas o tareas que entran.', unit: 'unidades' },
    stages: [
      { id: 'distribution', title: 'Distribución del trabajo', role: 'action', description: 'Cómo se asigna.' },
      { id: 'capacity', title: 'Capacidad del equipo', role: 'limitation', description: 'Cuánto puede atenderse.' },
      { id: 'execution', title: 'Ejecución', role: 'action', description: 'Trabajo realizado.' },
      { id: 'quality', title: 'Control de calidad', role: 'condition', description: 'Lo que cumple el estándar.' },
    ],
    result: 'Resultados del equipo',
    frictions: [
      { title: 'Reparto desigual', category: 'system', stage: 'distribution', control: 'direct', note: 'Unos saturados, otros ociosos.', mitigation: 'Reglas de reparto por capacidad' },
      { title: 'Incentivos desalineados', category: 'system', stage: 'execution', control: 'partial', note: 'Se premia volumen y no calidad.', mitigation: 'Revisar objetivos e incentivos' },
      { title: 'Cuello de botella en capacidad', category: 'system', stage: 'capacity', control: 'partial', note: 'Entra más de lo que se atiende.', mitigation: 'Priorización y cola visible' },
      { title: 'Herramientas lentas', category: 'external', stage: 'execution', control: 'partial', note: 'Fricción tecnológica.', mitigation: 'Automatizar registros repetitivos' },
      { title: 'Coordinación entre turnos', category: 'system', stage: 'quality', control: 'direct', note: 'Información que se pierde.', mitigation: 'Traspaso estándar' },
      { title: 'Formación desigual', category: 'personal', stage: 'execution', control: 'direct', note: 'Diferencias de habilidad.', mitigation: 'Mentoría por parejas' },
    ],
    alternatives: [
      { name: 'Especialización por tipo de entrada', description: 'Cada persona en lo que mejor hace.', advantages: 'Más calidad.', limitations: 'Menos flexibilidad.', firstExperiment: 'Probar dos semanas con una parte del equipo.' },
      { name: 'Filtrado previo de entradas', description: 'Descartar antes lo que no aporta.', advantages: 'Menos carga.', limitations: 'Riesgo de descartar oportunidades.', firstExperiment: 'Clasificar una semana de entradas.' },
    ],
    metrics: [{ name: 'Utilización de capacidad', why: 'Detecta saturación o huecos.' }, { name: 'Calidad / retrabajo', why: 'Volumen sin calidad no sirve.' }],
    experiment: { name: 'Medición de una semana real', hypothesis: 'El cuello de botella está en la capacidad.', test: 'Registrar entradas, asignación, tiempos y resultados durante una semana.', duration: '1 semana', confirmIf: 'Se acumula trabajo en una etapa', questionIf: 'Las colas aparecen en otra parte', stopWhen: 'Una semana completa', record: ['Entradas', 'Asignadas', 'Atendidas', 'Tiempos', 'Errores'] },
    unknowns: ['Volumen real de entradas', 'Capacidad real por persona', 'Dónde se acumula el trabajo'],
    loop: { description: 'Lo aprendido en los resultados mejora la distribución y la formación.', to: 'distribution' },
  },
  product: {
    start: { title: 'Interesados', description: 'Personas que conocen el producto.', unit: 'personas' },
    stages: [
      { id: 'need', title: 'Necesidad confirmada', role: 'condition', description: '¿Les resuelve algo de verdad?' },
      { id: 'production', title: 'Producción', role: 'action', description: 'Fabricar o preparar.' },
      { id: 'distribution', title: 'Distribución', role: 'action', description: 'Hacer que llegue.' },
      { id: 'sales', title: 'Ventas', role: 'transformation', description: 'Conversión.' },
    ],
    result: 'Margen',
    frictions: [
      { title: 'Coste de producción', category: 'system', stage: 'production', control: 'partial', note: 'Margen bajo por unidad.', mitigation: 'Lotes y proveedores alternativos' },
      { title: 'Dependencia de proveedores', category: 'external', stage: 'production', control: 'external', note: 'Plazos y calidad ajenos.', mitigation: 'Segundo proveedor' },
      { title: 'Canal de distribución', category: 'external', stage: 'distribution', control: 'partial', note: 'Intermediarios y comisiones.', mitigation: 'Venta directa a una parte' },
      { title: 'Capital inmovilizado', category: 'personal', stage: 'production', control: 'direct', note: 'Stock sin vender.', mitigation: 'Producir bajo pedido al principio' },
    ],
    alternatives: [{ name: 'Producción bajo pedido', description: 'Fabricar solo lo vendido.', advantages: 'Menos riesgo.', limitations: 'Plazos más largos.', firstExperiment: '10 pedidos de prueba.' }],
    metrics: [{ name: 'Margen por unidad', why: 'Viabilidad.' }, { name: 'Rotación de stock', why: 'Capital inmovilizado.' }],
    experiment: { name: 'Lote piloto', hypothesis: 'Se vende a un precio con margen suficiente.', test: 'Lote pequeño en un canal.', duration: '1 mes', confirmIf: 'Vendes el lote con margen', questionIf: 'Vendes solo con descuento', stopWhen: 'Fin del mes', record: ['Unidades', 'Precio real', 'Coste', 'Tiempo'] },
    unknowns: ['Coste unitario real', 'Precio aceptado', 'Canal más eficaz'],
    loop: { description: 'Clientes repiten y recomiendan.', to: 'need' },
  },
  campaign: {
    start: { title: 'Impactos de la campaña', description: 'Alcance inicial.', unit: 'impactos' },
    stages: [
      { id: 'attention', title: 'Atención', role: 'transformation', description: 'Quien se fija.' },
      { id: 'response', title: 'Respuesta', role: 'transformation', description: 'Quien actúa.' },
      { id: 'conversion', title: 'Conversión', role: 'transformation', description: 'Objetivo cumplido.' },
    ],
    result: 'Objetivo de la campaña',
    frictions: [
      { title: 'Saturación del canal', category: 'external', stage: 'attention', control: 'uncontrollable', note: 'Mucho ruido competidor.', mitigation: 'Mensaje muy específico' },
      { title: 'Presupuesto limitado', category: 'personal', stage: 'attention', control: 'direct', note: 'Alcance acotado.', mitigation: 'Concentrar en un segmento' },
      { title: 'Medición incompleta', category: 'system', stage: 'response', control: 'direct', note: 'No saber qué funcionó.', mitigation: 'Enlaces o códigos por canal' },
    ],
    alternatives: [{ name: 'Campaña con socio', description: 'Compartir alcance.', advantages: 'Más alcance.', limitations: 'Coordinación.', firstExperiment: 'Una acción conjunta.' }],
    metrics: [{ name: 'Coste por respuesta', why: 'Eficiencia.' }, { name: 'Conversión final', why: 'Resultado real.' }],
    experiment: { name: 'Prueba A/B pequeña', hypothesis: 'Un mensaje rinde más que otro.', test: 'Dos versiones con el mismo presupuesto.', duration: '1 semana', confirmIf: 'Una supera claramente', questionIf: 'Diferencia mínima', stopWhen: 'Presupuesto de prueba agotado', record: ['Impactos', 'Respuestas', 'Conversiones', 'Coste'] },
    unknowns: ['Tasa de respuesta del canal', 'Coste real por conversión'],
    loop: { description: 'Quienes convierten amplifican la campaña.', to: 'attention' },
  },
  generic: {
    start: { title: 'Entrada inicial', description: 'Lo que inicia el flujo.', unit: 'unidades' },
    stages: [
      { id: 'activity', title: 'Actividad principal', role: 'action', description: 'Lo que hay que hacer.' },
      { id: 'filter', title: 'Lo que realmente sirve', role: 'condition', description: 'Parte válida del flujo.' },
      { id: 'transform', title: 'Transformación', role: 'transformation', description: 'Lo que convierte esfuerzo en resultado.' },
    ],
    result: 'Resultado buscado',
    frictions: [
      { title: 'Tiempo disponible', category: 'personal', stage: 'activity', control: 'partial', note: 'Capacidad real.', mitigation: 'Bloques de tiempo protegidos' },
      { title: 'Dependencia de terceros', category: 'external', stage: 'transform', control: 'external', note: 'Lo que no depende de ti.', mitigation: 'Alternativas para cada dependencia' },
      { title: 'Pasos innecesarios', category: 'system', stage: 'filter', control: 'direct', note: 'Fricción del propio diseño.', mitigation: 'Simplificar el proceso' },
    ],
    alternatives: [{ name: 'Versión más pequeña', description: 'Reducir alcance para validar antes.', advantages: 'Menos riesgo.', limitations: 'Resultado parcial.', firstExperiment: 'Prueba de una semana.' }],
    metrics: [{ name: 'Resultado por unidad de esfuerzo', why: 'Eficiencia real.' }],
    experiment: { name: 'Prueba mínima', hypothesis: 'La idea funciona a pequeña escala.', test: 'Ejecutar una versión reducida.', duration: '1–2 semanas', confirmIf: 'Alcanzas el umbral fijado', questionIf: 'Resultados ambiguos', stopWhen: 'Plazo o presupuesto agotado', record: ['Esfuerzo', 'Coste', 'Resultado'] },
    unknowns: ['Umbral de éxito', 'Recursos reales', 'Dependencias críticas'],
    loop: { description: 'El resultado alimenta nuevas entradas.', to: 'activity' },
  },
};

/** Busca una cifra explícita del usuario ("500 flyers", "5 horas"). */
export function extractStartingValue(text: string): { value: number; unit: string } | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(flyers|folletos|llamadas|horas|h\b|euros|€|clientes|alumnos|visitas|seguidores|contactos|unidades|personas)/i);
  if (!m) return null;
  return { value: Number(m[1].replace(',', '.')), unit: m[2].toLowerCase() };
}

export function templateProposal(input: { topic: string; objective?: string; strategy?: string; context?: string; freeText?: string }): Proposal {
  const text = [input.topic, input.objective, input.strategy, input.context, input.freeText].filter(Boolean).join('\n');
  const domain = detectDomain(text);
  const t = T[domain];
  const sv = extractStartingValue(text);
  const nodes: Proposal['nodes'] = [];
  const edges: Proposal['edges'] = [];
  const base = {
    stage: '', evidence: 'hypothesis' as const, behavior: null, weight: null, weightIsSuggestion: true, value: null, unit: null, frictionCategory: null,
    controllability: null, frequency: '', intensity: '', cost: '', probability: '', detectability: '', mitigation: '', alternativeRoute: '', confirmed: false, sourceRef: 'Plantilla estándar',
  };
  const startTitle = input.strategy?.trim() ? input.strategy.trim().slice(0, 48) : t.start.title;
  nodes.push({ ...base, tempId: 'start', title: startTitle, role: 'input', description: t.start.description, evidence: sv ? 'confirmed' : input.strategy ? 'preference' : 'hypothesis', confirmed: !!input.strategy, value: sv?.value ?? null, unit: sv?.unit ?? t.start.unit, sourceRef: input.strategy ? 'Dicho por el usuario' : 'Plantilla estándar' });
  let prev = 'start';
  for (const s of t.stages) {
    nodes.push({ ...base, tempId: s.id, title: s.title, role: s.role, description: s.description, stage: s.title });
    edges.push({ from: prev, to: s.id, type: 'flow', label: '', role: 'main', mode: 'modulate', polarity: 'positive' });
    prev = s.id;
  }
  nodes.push({ ...base, tempId: 'result', title: input.objective?.trim() ? input.objective.trim().slice(0, 48) : t.result, role: 'result', description: 'Resultado buscado.', confirmed: !!input.objective, evidence: input.objective ? 'preference' : 'hypothesis' });
  edges.push({ from: prev, to: 'result', type: 'flow', label: '', role: 'main', mode: 'modulate', polarity: 'positive' });
  t.frictions.forEach((f, i) => {
    const id = `f${i + 1}`;
    nodes.push({ ...base, tempId: id, title: f.title, role: 'friction', description: f.note, stage: t.stages.find((s) => s.id === f.stage)?.title ?? '', frictionCategory: f.category, controllability: f.control, mitigation: f.mitigation, alternativeRoute: f.route ?? '' });
    edges.push({ from: id, to: f.stage, type: 'causal', label: 'frena', role: 'main', mode: 'modulate', polarity: 'negative' });
    if (i < 4) {
      const mid = `m${i + 1}`;
      nodes.push({ ...base, tempId: mid, title: f.mitigation.slice(0, 48), role: 'mitigator', description: `Mitiga: ${f.title}` });
      edges.push({ from: mid, to: id, type: 'causal', label: 'mitiga', role: 'main', mode: 'compensate', polarity: 'positive' });
    }
  });
  if (t.recovery) {
    nodes.push({ ...base, tempId: 'recovery', title: t.recovery.title, role: 'alternative', description: 'Ruta para recuperar lo que se queda por el camino.' });
    edges.push({ from: t.recovery.from, to: 'recovery', type: 'flow', label: 'no avanzan', role: 'reject', mode: 'modulate', polarity: 'positive' });
    edges.push({ from: 'recovery', to: t.recovery.to, type: 'flow', label: 'recuperados', role: 'main', mode: 'modulate', polarity: 'positive' });
  }
  edges.push({ from: 'result', to: t.loop.to, type: 'flow', label: 'retorno', role: 'main', mode: 'modulate', polarity: 'positive' });
  const cat = (c: 'personal' | 'external' | 'system') => t.frictions.filter((f) => f.category === c).map((f) => f.title);
  return {
    discovery: {
      topic: input.topic, objective: input.objective ?? '', strategy: input.strategy ?? '',
      summary: `Contexto posible para «${input.topic}» (${DOMAIN_LABEL[domain].toLowerCase()}), generado con una plantilla estándar sin IA. Todo lo que no has dicho tú está marcado como sugerencia sin confirmar.`,
    },
    startingPoint: { description: startTitle, type: 'acción', initialValue: sv?.value ?? null, unit: sv?.unit ?? null, confidence: sv ? 'confirmed' : 'unknown' },
    nodes,
    edges,
    frictions: { personal: cat('personal'), external: cat('external'), system: cat('system') },
    mitigators: t.frictions.slice(0, 4).map((f) => f.mitigation),
    alternatives: t.alternatives.map((a) => ({ ...a, audience: '', channel: '', resources: '', setupTime: '', initialCost: '', complexity: '', dependencies: '', risks: '', timeToInfo: '', successIndicators: '', continueOrStop: '', fit: 'Por confirmar según tus capacidades' })),
    assumptions: ['Las etapas y fricciones son las habituales para este tipo de idea: revisa cuáles aplican de verdad.'],
    unknowns: t.unknowns,
    metrics: t.metrics,
    experiments: [{ ...t.experiment, resources: '' }],
    feedbackLoops: [{ from: 'result', to: t.loop.to, description: t.loop.description, type: 'reinforcing' }],
    recommendedNextAction: `Revisa las fricciones propuestas, descarta las que no apliquen y define el criterio de éxito de «${t.experiment.name}».`,
  };
}
