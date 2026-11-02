/**
 * MODO DEMOSTRACIÓN del Explorador — entrevistador guionizado y determinista.
 * No es IA: selecciona preguntas de un banco según el tipo de idea, lo ya
 * respondido y comandos del usuario. Sirve para probar la interfaz sin
 * proveedor y se muestra SIEMPRE identificado como demostración.
 */
import { AREA_LABEL, emptyMemory, type ExplorerMemory, type ExplorerTurn, type TurnRequest } from './schemas.ts';
import { detectDomain, DOMAIN_LABEL, type Domain } from './templates.ts';

type Area = ExplorerTurn['area'];
interface Q { area: Area; q: string; why: string; stage: number }

const BANK: Record<string, Q> = {
  success: { area: 'success', stage: 0, q: 'Imagina que han pasado dos meses. ¿Qué resultado concreto (dinero neto, clientes recurrentes, avance) tendría que haber para que decidieras seguir e invertir más?', why: 'Esta respuesta condicionará todo el modelo de rentabilidad: sin umbral no sabremos si el flujo funciona.' },
  success_personal: { area: 'success', stage: 0, q: '¿Cómo sabrías dentro de tres meses que vas por buen camino? Piensa en un resultado intermedio concreto, no en el proyecto terminado.', why: 'Un objetivo intermedio visible es lo que sostiene la continuidad en los proyectos personales.' },
  modality: { area: 'logistics', stage: 2, q: '¿Tus clientes tendrían que venir a ti, te desplazarías tú o aceptarías ambas modalidades?', why: 'Podríamos conseguir clientes y descubrir que los desplazamientos hacen que la actividad no sea rentable.' },
  hours: { area: 'resources', stage: 2, q: '¿Qué días y cuántas horas puedes dedicar realmente cada semana, contando preparación, desplazamientos y seguimiento?', why: 'El tiempo real es el recurso que más suele limitar el flujo, y casi nunca se cuenta entero.' },
  money: { area: 'resources', stage: 4, q: '¿Qué cantidad podrías invertir y perder en la primera prueba sin que comprometa tu tranquilidad económica?', why: 'Define el tamaño máximo del primer experimento y cuándo parar.' },
  acquisition_local: { area: 'acquisition', stage: 2, q: '¿Cuántas acciones de captación (flyers, mensajes…) podrías hacer realmente en una sesión de dos horas, contando desplazamientos y descansos? ¿Dónde exactamente, y tienes permiso para dejar publicidad allí?', why: 'Convierte "repartir por mi zona" en una entrada medible del flujo.' },
  acquisition_digital: { area: 'acquisition', stage: 2, q: 'Si hoy no tienes audiencia, ¿a través de quién o de qué canal concreto llegarían las primeras 50 personas interesadas?', why: 'Sin una fuente de atención identificable no hay flujo que empiece.' },
  acquisition_team: { area: 'acquisition', stage: 1, q: '¿Cuántas entradas de trabajo (llamadas, oportunidades, tareas) recibe el equipo en una semana normal y cómo se reparten?', why: 'El volumen y el reparto determinan dónde se forma el cuello de botella.' },
  measure: { area: 'conversion', stage: 2, q: '¿Cómo sabrás qué contactos han llegado gracias a cada acción?', why: 'Si no puedes atribuir resultados al canal, no sabrás qué funciona ni dónde se pierde el flujo.' },
  conversion: { area: 'conversion', stage: 2, q: 'De cada 10 personas que contacten, ¿cuántas crees que tendrán intención real de pagar? ¿En qué te basas?', why: 'Es fácil calcular suponiendo que todos los interesados compran; aquí suele estar la mayor pérdida.' },
  demand: { area: 'demand', stage: 1, q: '¿Quién necesita exactamente esto, qué usa hoy en su lugar y qué le haría cambiar?', why: 'Separa tu deseo de vender de la existencia real de demanda.' },
  economics: { area: 'economics', stage: 4, q: '¿Qué precio cobrarías y qué coste tiene cada unidad o sesión, incluido tu tiempo no facturable?', why: 'Distingue entre ganar dinero y que tu tiempo salga rentable.' },
  capacity: { area: 'capacity', stage: 4, q: 'Si la captación funcionara mejor de lo esperado, ¿cuántos clientes o unidades podrías atender a la semana antes de saturarte?', why: 'El éxito también puede romper el sistema si no hay capacidad.' },
  capacity_team: { area: 'capacity', stage: 2, q: '¿Cuánto puede atender cada persona del equipo al día sin bajar la calidad, y dónde se acumula el trabajo?', why: 'Ahí está el punto neurálgico del sistema.' },
  rejection: { area: 'frictions', stage: 3, q: '¿Cuántas negativas o semanas sin resultados podrías tolerar antes de perder la motivación?', why: 'Es una fricción propia que decide si el flujo se mantiene el tiempo suficiente.' },
  dispersion: { area: 'frictions', stage: 3, q: '¿Qué suele hacer que abandones proyectos personales: falta de tiempo, aburrimiento, bloqueo técnico o cambiar a otra idea?', why: 'Identifica la fricción propia que más amenaza la continuidad.' },
  incentives: { area: 'frictions', stage: 3, q: '¿Qué premia hoy al equipo: volumen, calidad o resultados? ¿Hay algo que les empuje a hacer lo contrario de lo que necesitas?', why: 'Los incentivos desalineados son una fricción del propio sistema, no de las personas.' },
  cancellations: { area: 'retention', stage: 4, q: '¿Qué harías con los clientes que cancelan o faltan? ¿Cobrarías igual?', why: 'Las cancelaciones crean huecos que no se recuperan y desequilibran la rentabilidad.' },
  retention: { area: 'retention', stage: 4, q: '¿Cómo puede el resultado alimentar nuevas entradas: recomendaciones, repetición, contenido…?', why: 'Es el circuito de retroalimentación que puede abaratar la captación.' },
  alternatives: { area: 'alternatives', stage: 5, q: '¿Qué otra forma de conseguir lo mismo te costaría menos tiempo o dinero, aunque te guste menos?', why: 'La mejor estrategia no siempre es la primera que se nos ocurre.' },
  experiment: { area: 'experiment', stage: 6, q: '¿Cuál sería la prueba más pequeña que te daría información real en una o dos semanas, y qué resultado te haría seguir o parar?', why: 'Pensar no es validar: el primer experimento convierte hipótesis en datos.' },
};

const ORDER: Record<Domain, string[]> = {
  local_service: ['success', 'modality', 'hours', 'money', 'acquisition_local', 'measure', 'conversion', 'economics', 'capacity', 'rejection', 'cancellations', 'alternatives', 'experiment'],
  digital: ['success', 'demand', 'acquisition_digital', 'hours', 'money', 'conversion', 'economics', 'capacity', 'retention', 'alternatives', 'experiment'],
  personal: ['success_personal', 'hours', 'dispersion', 'demand', 'alternatives', 'experiment'],
  team: ['success', 'acquisition_team', 'capacity_team', 'incentives', 'conversion', 'retention', 'alternatives', 'experiment'],
  product: ['success', 'demand', 'economics', 'money', 'capacity', 'acquisition_digital', 'retention', 'alternatives', 'experiment'],
  campaign: ['success', 'demand', 'money', 'measure', 'conversion', 'alternatives', 'experiment'],
  generic: ['success', 'hours', 'money', 'demand', 'capacity', 'alternatives', 'experiment'],
};

const NATURE: Record<Domain, string> = { local_service: 'negocio', digital: 'negocio digital', personal: 'proyecto personal', team: 'equipo', product: 'producto', campaign: 'campaña', generic: 'otro' };

const asked = (m: ExplorerMemory) => new Set(m.resolvedQuestions.filter((x) => x.startsWith('q:')).map((x) => x.slice(2)));

function classify(answer: string): 'unknown' | 'generic' | 'depends' | 'unthought' | 'normal' {
  const a = answer.toLowerCase();
  if (/^\s*(no (lo )?s[eé]|ni idea|no tengo ni idea)/.test(a)) return 'unknown';
  if (/no lo hab[ií]a pensado/.test(a)) return 'unthought';
  if (/^\s*depende/.test(a)) return 'depends';
  if (/\b(muchos?|muchas?|bastantes?|varios|algunos|poco|mucho)\b/.test(a) && !/\d/.test(a)) return 'generic';
  return 'normal';
}

const ASSUMPTION_RE = /(seguro que|la gente (llamar|comprar)|ser[aá] f[aá]cil|r[aá]pidamente|puedo atender a todos|no me costar[aá]|hay mucha demanda)/i;

export function demoTurn(req: TurnRequest): ExplorerTurn {
  const text = [req.inputs.topic, req.inputs.objective, req.inputs.strategy, req.inputs.context].join(' ');
  const domain = detectDomain(text);
  const memory: ExplorerMemory = structuredClone(req.memory ?? emptyMemory());
  const done = asked(memory);
  const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const lastQ = [...memory.resolvedQuestions].reverse().find((x) => x.startsWith('q:'))?.slice(2);
  let intro = '';
  let forceKey: string | null = null;

  // Registrar la respuesta anterior
  if (lastUser && lastQ && !req.command) {
    const kind = classify(lastUser);
    const q = BANK[lastQ];
    if (kind === 'unknown') {
      memory.unknowns.push(`${q?.q.split('?')[0]}?`);
      intro = 'No pasa nada, no hace falta inventarse una cifra. Podemos averiguarlo con una prueba pequeña: por ejemplo, dedicar una sesión acotada y anotar el resultado. Lo dejo registrado como dato a obtener. ';
    } else if (kind === 'generic') {
      intro = `Cuando dices "${lastUser.trim().slice(0, 40)}", ¿cuánto sería en una cifra concreta (aunque sea aproximada) para una semana normal? `;
      forceKey = lastQ;
      memory.resolvedQuestions = memory.resolvedQuestions.filter((x) => x !== `q:${lastQ}`);
    } else if (kind === 'depends') {
      intro = '¿De qué depende exactamente? Si me dices los dos o tres factores que más lo cambian, los añadimos como condiciones del flujo. ';
      memory.discovered.push(`La respuesta a «${q?.area}» depende de factores aún no identificados`);
    } else if (kind === 'unthought') {
      memory.discovered.push(`No contemplado hasta ahora: ${q?.q.split('?')[0]}?`);
      intro = 'Buen descubrimiento: lo registro como algo que no estaba en el plan. ';
    } else {
      memory.known.push({ text: `${q ? `${AREA_LABEL[q.area]}: ` : ''}${lastUser.trim().slice(0, 160)}`, evidence: /\d/.test(lastUser) ? 'estimate' : 'preference' });
      intro = /^(s[ií]|vale|ok|de acuerdo)\b/i.test(lastUser.trim()) ? 'Entendido. ' : 'Bien. ';
    }
    if (ASSUMPTION_RE.test(lastUser)) {
      memory.assumptions.push(lastUser.trim().slice(0, 120));
      intro += 'Ojo: eso que das por hecho todavía no está comprobado; lo trato como hipótesis. ';
    }
    // Contradicciones de horas
    const hourMentions = req.messages.filter((m) => m.role === 'user').map((m) => Number(m.content.match(/(\d+)\s*h(oras)?/i)?.[1])).filter((n) => Number.isFinite(n));
    if (hourMentions.length >= 2) {
      const [a, b] = [Math.min(...hourMentions), Math.max(...hourMentions)];
      const already = memory.contradictions.some((c) => c.includes('horas'));
      if (b >= a * 1.5 && !already) {
        memory.contradictions.push(`Hablas de ${a} horas disponibles y de algo que exige ${b} horas`);
        return {
          message: `${intro}Hay una diferencia entre las ${a} horas que mencionas y las ${b} que parece exigir lo que describes. ¿Quieres ampliar tu disponibilidad o preferimos rediseñar la estrategia para que quepa en ${a} horas?`,
          question: '¿Ampliar disponibilidad o rediseñar la estrategia?', why: 'No conviene construir un modelo incoherente: una de las dos cifras tiene que cambiar.',
          area: 'resources', stage: 2, systemNature: NATURE[domain], memory, readyForMap: false,
        };
      }
    }
  }

  // Comandos
  const nextKey = () => ORDER[domain].find((k) => !done.has(k) && k !== lastQ) ?? 'experiment';
  switch (req.command) {
    case 'examples': {
      const q = BANK[lastQ ?? nextKey()];
      return { message: `Algunos ejemplos ilustrativos (no son datos): «unas 3 horas los martes y jueves», «200 € como máximo», «5 clientes que repitan cada mes». Con eso en mente: ${q.q}`, question: q.q, why: q.why, area: q.area, stage: q.stage, systemNature: NATURE[domain], memory, readyForMap: false };
    }
    case 'challenge': {
      const weak = memory.assumptions[0] ?? (req.inputs.strategy ? `que «${req.inputs.strategy}» sea la mejor forma de empezar` : 'que la demanda existe');
      return { message: `Voy a cuestionar algo con respeto: estás dando por hecho ${weak}. ¿Qué tendría que ocurrir en la primera semana para demostrar que no es así?`, question: '¿Qué lo refutaría?', why: 'Un supuesto sin evidencia puede sostener todo el plan.', area: 'frictions', stage: 3, systemNature: NATURE[domain], memory, readyForMap: false };
    }
    case 'alternatives':
    case 'compare': {
      const alts = domain === 'local_service' ? ['recomendaciones de conocidos', 'un acuerdo con una tienda o academia', 'grupos reducidos u online'] : domain === 'digital' ? ['preventa a una lista pequeña', 'colaborar con alguien que ya tiene audiencia', 'servicio 1:1 antes del producto'] : ['una versión más pequeña', 'apoyarte en alguien que ya lo hace', 'cambiar el orden de las etapas'];
      memory.alternatives.push(...alts.filter((a) => !memory.alternatives.includes(a)));
      return { message: `Además de tu idea inicial, hay otras rutas que podrían encajar: ${alts.join('; ')}. Cada una cambia el tiempo, el coste y la dependencia de terceros. Según lo que me has contado, ¿qué te importa más ahora: gastar poco, avanzar rápido o depender poco de otros?`, question: '¿Qué criterio pesa más?', why: 'La mejor estrategia es la que encaja con tus recursos reales, no la de mayor potencial teórico.', area: 'alternatives', stage: 5, systemNature: NATURE[domain], memory, readyForMap: false };
    }
    case 'simplify': return { message: 'En corto: quieres que algo entre, se transforme y salga un resultado que merezca la pena. Lo que más necesito saber ahora es una sola cosa: ¿cuánto tiempo real tienes a la semana?', question: '¿Cuánto tiempo real tienes a la semana?', why: 'Es el recurso que más limita.', area: 'resources', stage: 2, systemNature: NATURE[domain], memory, readyForMap: false };
    case 'perspective': return { message: 'Cambiemos de lado: ponte en el lugar de tu cliente ideal. ¿Qué le haría dudar o decir que no en el primer contacto?', question: '¿Qué le haría decir que no?', why: 'Las objeciones del otro lado suelen ser fricciones externas invisibles desde dentro.', area: 'demand', stage: 3, systemNature: NATURE[domain], memory, readyForMap: false };
    case 'prepare': return { message: `Con lo que sabemos ya puedo proponerte un primer flujo. Sabemos ${memory.known.length} cosas, quedan ${memory.unknowns.length} incógnitas registradas y ${memory.assumptions.length} supuestos por comprobar. ¿Genero el mapa inicial para que lo revises antes de insertarlo?`, question: '¿Genero el mapa inicial?', why: 'Lo desconocido queda registrado; no es excusa para no avanzar.', area: 'map', stage: 7, systemNature: NATURE[domain], memory, readyForMap: true };
    case 'back': {
      const prev = [...memory.resolvedQuestions].reverse().filter((x) => x.startsWith('q:'))[1]?.slice(2);
      if (prev) { const q = BANK[prev]; return { message: `Volvamos a esto: ${q.q}`, question: q.q, why: q.why, area: q.area, stage: q.stage, systemNature: NATURE[domain], memory, readyForMap: false }; }
      break;
    }
    case 'deepen': forceKey = lastQ ?? null; intro = 'Profundicemos en lo último. '; break;
    case 'dont_know': {
      memory.unknowns.push(lastQ ? `${BANK[lastQ]?.q.split('?')[0]}?` : 'Dato pendiente');
      intro = 'Entonces no lo inventemos: lo convertimos en algo a medir con una prueba pequeña. ';
      break;
    }
  }

  const key = forceKey ?? nextKey();
  const q = BANK[key];
  memory.resolvedQuestions.push(`q:${key}`);
  const answeredCount = asked(memory).size;
  const ready = answeredCount >= Math.min(7, ORDER[domain].length - 1);
  const first = req.messages.filter((m) => m.role === 'user').length === 0;
  const opening = first ? `Vamos a mirar «${req.inputs.topic}» como ${DOMAIN_LABEL[domain].toLowerCase()}. Antes de hablar de tácticas, quiero entender lo que tiene que pasar para que merezca la pena. ` : '';
  return {
    message: `${opening}${intro}${q.q}\n\nTe lo pregunto porque ${q.why.charAt(0).toLowerCase()}${q.why.slice(1)}${ready ? '\n\nCon esto ya podríamos preparar un primer flujo cuando quieras.' : ''}`,
    question: q.q, why: q.why, area: q.area, stage: q.stage, systemNature: NATURE[domain], memory, readyForMap: ready,
  };
}
