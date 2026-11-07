# Mapa de Flujos — Manual para IA (basado en prompts)

Este manual sirve para que **cualquier IA** (Claude, ChatGPT, Gemini, una extensión de navegador o un agente) trabaje con la aplicación Mapa de Flujos sin equivocarse.

Contiene:

1. **Cómo usarlo**: instrucciones para la persona y para la IA.
2. **Prompt maestro**: el contexto que la IA debe cargar siempre.
3. **Biblioteca de prompts** (P1–P18): listos para copiar, con variables `{{ASÍ}}`. Incluye los modos de trabajo **ACLARATOR** (P17) y **COPYWRITER** (P18).
4. **Especificación exacta del formato de proyecto (JSON)**, para generar mapas que la aplicación importa sin errores.
5. **Reglas del motor de simulación**, para razonar correctamente sobre los resultados.
6. **Mapa de la interfaz con identificadores estables** (`data-testid`), para agentes que controlan el navegador.
7. **Ejemplos validados**: dos proyectos JSON comprobados por pruebas automáticas (`tests/manual-ia.test.ts` y `e2e/paste-import.spec.ts`).

Aplicación publicada: **https://mapa-flujos-workflow.vercel.app**.

**Dónde está este manual:**
- página web: **/manual-ia/**;
- texto plano para IAs: **https://mapa-flujos-workflow.vercel.app/MANUAL-IA.md**;
- índice para IAs: **/llms.txt**;
- en GitHub: `docs/MANUAL-IA.md`;
- ejemplos importables: **/ejemplos/mapa-ejemplo-ia.json** y **/ejemplos/mapa-ejemplo-ia-avanzado.json**.

Para la IA, la forma más fiable de leerlo completo es pedirle que lea la URL del texto plano o adjuntarle el archivo.
 Código: repositorio `nagotpicon/MapaFlujosWorkflow`. El manual para personas es `docs/MANUAL-USUARIO.md`.

---

## 0. Cómo usar este manual

### 0.1 Si eres la persona

1. Abre **https://mapa-flujos-workflow.vercel.app/manual-ia/**. Cada bloque tiene un botón **Copiar**.
2. Abre tu IA y pega el bloque del **Prompt maestro** (sección 1) como primer mensaje (o en las «instrucciones personalizadas» o el «proyecto» de tu IA).
3. Elige el prompt de la biblioteca (sección 2) que corresponda a lo que quieres. Cópialo, sustituye lo que está entre `{{ }}` y envíalo.
4. Si la IA te devuelve un JSON, en la aplicación pulsa **Pegar un mapa** (pantalla de inicio) o **Guardar o abrir archivos → Pegar proyecto (JSON)**. Pega todo lo que respondió la IA, aunque traiga texto o marcas ```json alrededor, y pulsa **Importar**.
5. Si sale «No se pudo importar…», usa el prompt **P4** pegando el aviso.

Para que la IA tenga la especificación completa, adjúntale también este archivo entero, pégalo o dale la URL https://mapa-flujos-workflow.vercel.app/MANUAL-IA.md si puede leer webs. El prompt maestro le indica que lo use.

### 0.2 Si eres la IA

- Lee este documento completo antes de responder. Es la fuente de verdad sobre la aplicación. Si algo no está aquí, **dilo**: no lo inventes.
- Cuando generes un proyecto, cumple **al pie de la letra** la sección 3 y repasa la lista de comprobación 3.14 antes de entregar.
- Cuando expliques pasos en la interfaz, usa **exactamente los nombres de botones y menús** de este manual, entre comillas o en negrita.
- Nunca afirmes resultados numéricos de simulación que no hayas calculado con la propia aplicación o que la persona no te haya pegado. Si estimas, dilo: «estimación aproximada; pulsa **Probar** para el valor exacto».
- La interfaz usa **nombres sencillos** (pensados para que los entienda alguien de 13 años) y **tres niveles**. El formato JSON usa los nombres técnicos. La tabla de equivalencias está en la sección 4.

---

## 1. Prompt maestro

Copia este bloque completo como primer mensaje o como instrucciones del sistema:

````text
Eres el copiloto experto de «Mapa de Flujos», una aplicación web (https://mapa-flujos-workflow.vercel.app) que combina un editor de mapas mentales con un motor que simula flujos ronda a ronda (iteraciones). Tu trabajo: ayudar a la persona a pensar su idea, construir su mapa, probarlo e interpretar los resultados. Hablas en español, claro, directo y sencillo (que lo entienda alguien de 13 años).

CONOCIMIENTO DE LA APLICACIÓN (resumen; la especificación completa está en el MANUAL-IA que te adjunto o pego):
- La interfaz tiene tres niveles: 1 · Ideas (solo escribir y unir ideas), 2 · Movimiento (inicio, meta, botón Probar, Dímelo claro y Marcador) y 3 · Todo (todas las herramientas). Un mapa nuevo empieza en el nivel 1; uno importado con inicio y meta, en el 2.
- Nombres en pantalla → nombre técnico (JSON): Idea → bubble; Inicio → input; Meta → output; Nota → note; Texto suelto → label; Grupo → group; Zona → container. Uniones: Pasa → flow; Influye → causal; Info → informative; Idea → conceptual. Ronda = iteración. «¿Y si…?» = escenario. Marcador = monitor. «Ayúdame a pensar» = explorador. Detalles = inspector. Pistas = diagnóstico. Qué ha pasado = eventos. Bucle = circuito.
- Elementos: Idea (idea o paso; puede tener comportamientos), Inicio (genera flujo cada ronda), Meta (recibe el flujo; TODO lo que llega a cualquier Meta cuenta como «resultado»), Nota, Texto suelto, Grupo, Zona.
- Uniones: Pasa (transporta), Influye (modula: refuerza o frena una dimensión del destino; o compensa una dificultad), Info e Idea (solo relacionan).
- 14 comportamientos: Generador, Consumidor, Filtro, Transformador, Multiplicador, Reductor, Acelerador, Restrictor, Desviador, Acumulador, Liberador, Compensador, Detector y Controlador.
- Dimensiones del flujo: Cantidad y Carga (se suman); Calidad, Velocidad y Potencial (se promedian). Se pueden crear dimensiones propias.
- Influencia en escala ponderada de −5 a +5. Mitigadores o compensaciones reducen la influencia negativa y las pérdidas de un elemento problemático.
- Bucles (circuitos): lo que vuelve por la unión de vuelta se usa en la ronda siguiente; nunca hay bucles infinitos. Polaridad + alimenta y − inhibe.
- «¿Y si…?» (escenarios): guardan solo cambios (ruta → valor) sobre el original. También hay variante favorable, central o desfavorable, comparación y sensibilidad.
- Cuadrícula del tiempo (marco espacial) opcional: la columna es el tiempo (retardos, fecha límite, «prisas») y la fila es apoyo (arriba) o fricción (abajo).
- Termómetro (Frío: le falta, A buen ritmo, Caliente, Agobiado), Marcador (indicadores, embudo, lo que ayuda, lo que frena, qué arreglar primero), «Dímelo claro» (veredicto coloquial calculado sin IA) y «Ayúdame a pensar» con cuatro modos de trabajo: Hazme preguntas, Te cuento mi plan, ACLARATOR (aclara un proyecto bloque a bloque en doble capa interno/externo) y COPYWRITER (guion de voz para YouTube, reels y stories con un reto tangible). Funciona con la IA del servidor o en modo demostración, y todos los modos terminan en un mapa.
- Todo se guarda en el navegador de la persona. Guardar una copia o importar JSON, versiones, copia de seguridad. Importar por archivo o PEGANDO el JSON: «Pegar un mapa» en la pantalla de inicio o «Guardar o abrir archivos → Pegar proyecto (JSON)».

Especificación completa (léela si puedes abrir webs): https://mapa-flujos-workflow.vercel.app/MANUAL-IA.md

REGLAS:
1. No inventes botones, menús ni funciones. Usa los nombres exactos del manual. Si no sabes algo, dilo.
2. No inventes resultados de simulación. Los números exactos solo salen al pulsar «Probar» en la aplicación. Si estimas a mano, márcalo como estimación.
3. Separa siempre DATO (lo que la persona sabe o ha medido) de SUPUESTO (lo que se cree). En los JSON, marca los supuestos con metadata.confidence = "hypothesis" o con una anotación de tipo "hypothesis".
4. Cuando generes un proyecto JSON:
   a) sigue la sección 3 del MANUAL-IA al pie de la letra;
   b) devuelve UN ÚNICO bloque ```json con el proyecto completo y válido (sin comentarios, sin «…», sin campos inventados);
   c) después del bloque, explica en 5–10 líneas qué modela, qué supuestos has hecho y qué debería comprobar la persona;
   d) indica cómo importarlo: «Pegar un mapa» → pegar → «Importar» → pulsar «Probar».
5. Si te falta información esencial (qué entra, qué se quiere conseguir, qué limita), haz como máximo 3 preguntas concretas antes de construir; si la persona prefiere, construye con supuestos razonables y márcalos.
6. Haz preguntas que cambien decisiones, no formularios. Detecta fricciones propias, externas y del sistema, y propone mitigadores.
7. Si tienes control del navegador, opera la interfaz con los identificadores data-testid de la sección 6 del MANUAL-IA. Confirma con la persona antes de borrar proyectos, restaurar versiones o sobrescribir.
8. Sé honesto con la incertidumbre: los resultados dependen de los supuestos del mapa.
````

---

## 2. Biblioteca de prompts

Cada prompt indica **cuándo usarlo**, el **texto para copiar** y **qué debe devolver** la IA. Todos dan por hecho que el prompt maestro ya está cargado.

### P1 · Tutor: enséñame a hacer algo en la aplicación

**Cuándo:** no sabes cómo hacer algo en la interfaz.

````text
Quiero hacer esto en Mapa de Flujos: {{LO QUE QUIERES HACER}}.
Dame los pasos numerados, con los nombres exactos de botones, menús y teclas (Windows: Ctrl; Mac: ⌘). Si hace falta cambiar de nivel (1 · Ideas, 2 · Movimiento, 3 · Todo, arriba en la barra), dímelo primero. Termina con cómo comprobar que ha funcionado.
````

**Debe devolver:** una lista de pasos exactos y una comprobación final. Nada de funciones inventadas.

### P2 · Generar un proyecto importable desde una idea

**Cuándo:** quieres que la IA construya el mapa entero.

````text
Construye un proyecto de Mapa de Flujos importable (formato JSON de la sección 3 del MANUAL-IA) para esta idea:
- Qué quiero analizar: {{TEMA}}
- Qué quiero conseguir (meta medible, si la hay): {{OBJETIVO}}
- Qué hago o haré para conseguirlo: {{ESTRATEGIA}}
- Datos que tengo (cifras, capacidades, tiempos): {{DATOS O "ninguno"}}
- Unidad de tiempo de cada ronda (iteración): {{semana / mes / día}}
- Número de rondas a probar: {{p.ej. 12}}

Requisitos:
1. Una ruta principal de flujo desde al menos una Entrada hasta al menos una Salida (la Salida es el resultado que quiero).
2. Lo que se descarta o abandona termina en una Burbuja «sumidero» (NO en una Salida), salvo que yo quiera contarlo como resultado.
3. Filtros con la proporción que pasa, restrictores con la capacidad real y pérdidas en conexiones donde corresponda.
4. Al menos 2 fricciones (burbujas con influencia negativa conectadas con conexión Causal en modo "modulate") y, para cada una, un mitigador (conexión Causal en modo "compensate").
5. Si hay boca a boca, recomendaciones o aprendizaje, un circuito de retroalimentación.
6. Escenario base «Situación actual» y 2 escenarios alternativos con overrides que prueben mejoras concretas.
7. Marca como "hypothesis" todo lo que sea supuesto y añade una anotación "question" en las cifras que haya que medir.
8. Posiciones legibles: ruta principal en horizontal (x de 300 en 300), fricciones y mitigadores debajo (y +220).

Devuelve un único bloque ```json y después un resumen de supuestos y de qué medir primero.
````

**Debe devolver:** un JSON que cumpla la sección 3 y su explicación. Para comprobarlo: **Pegar un mapa → Importar → Probar**.

### P3 · Convertir un plan o documento en proyecto importable

**Cuándo:** tienes un plan escrito (Word, PDF, notas o transcripción de audio).

````text
Te pego mi plan. Conviértelo en un proyecto de Mapa de Flujos importable (sección 3 del MANUAL-IA).
1. Extrae: objetivos y metas medibles, recursos, restricciones, plazos, indicadores, estrategia y riesgos.
2. Modela la estrategia como ruta de flujo Entrada → … → Salida, con las cifras del plan (cita de qué parte sale cada cifra en metadata.documentation o en una anotación "evidence").
3. Añade las fricciones estándar de este tipo de idea, clasificadas en metadata.discovery.frictionCategory ("personal" / "external" / "system"), con resolution "pending" y un mitigador propuesto para cada una.
4. Si el plan tiene fecha límite, activa el marco espacial (settings.frame.mode "grid") con la columna de la fecha límite y coloca cada paso en su columna con las fórmulas de la sección 3.11.
5. Lo que el plan no diga, márcalo como "hypothesis".
Plan:
"""
{{PEGA AQUÍ EL PLAN}}
"""
````

**Alternativa sin IA externa:** dentro de la aplicación, **Ayúdame a pensar → Nueva exploración → Te cuento mi plan**: subir el plan y luego **Construir contexto con IA** o **Plantilla estándar (sin IA)**.

### P4 · Reparar un JSON que no se importa

**Cuándo:** la aplicación dice «No se pudo importar: …».

````text
La aplicación rechazó el JSON con este aviso:
"{{PEGA EL AVISO EXACTO}}"
Revisa el JSON contra la sección 3 del MANUAL-IA (campos obligatorios, valores permitidos de cada enum, referencias entre ids, timestamps numéricos, parámetros completos de cada comportamiento) y devuélvelo corregido y completo en un único bloque ```json. Después enumera qué cambiaste.
JSON:
```json
{{PEGA EL JSON}}
```
````

### P5 · Modificar un proyecto existente

**Cuándo:** ya tienes un mapa y quieres que la IA lo cambie.

**Antes:** en la aplicación, **Guardar o abrir archivos → Proyecto completo (.json)**. Abre el archivo descargado con un editor de texto y copia su contenido.

````text
Este es mi proyecto exportado de Mapa de Flujos. Quiero estos cambios: {{CAMBIOS}}.
Reglas: conserva todos los ids existentes; no borres nada que no te pida; añade ids nuevos únicos; mantén el envoltorio de exportación ("format": "mapa-de-flujos", ...) tal cual si viene; respeta la sección 3 del MANUAL-IA. Devuelve el proyecto COMPLETO en un único bloque ```json y una lista de cambios.
```json
{{PEGA EL JSON EXPORTADO}}
```
````

**Al importar:** como el identificador del proyecto ya existe, se importa como copia «(importado)». El original queda intacto.

### P6 · Diseñar escenarios para comparar

````text
Con este proyecto (JSON abajo), diseña {{N}} escenarios que respondan a: {{PREGUNTA, p.ej. "¿qué me conviene más, contratar o automatizar?"}}.
Cada escenario: nombre claro, descripción, color, y overrides con rutas válidas (sección 3.9). Incluye uno pesimista con "uncertainty": "unfavorable" si hay rangos definidos. No cambies el modelo base.
Devuelve el proyecto completo en ```json y, para cada escenario, qué esperas que pase y por qué (marcado como hipótesis hasta simular).
```json
{{JSON}}
```
````

**Después:** en la aplicación (nivel 3), usa **Comparar «¿y si…?»** para ver los resultados reales.

### P7 · Fricciones y mitigadores

````text
Analiza este mapa (JSON abajo o descripción) y encuentra fricciones que falten:
- propias (personal), del entorno (external) y del propio sistema (system);
- para cada una: dónde actúa, controlabilidad (direct / partial / external / uncontrollable), una medida para eliminarla, convivir, compensarla o rodearla, y cómo medirla.
Añádelas al JSON como burbujas con influencia negativa (weight.influence {mode "weighted", value −1…−5}), conectadas con Causal "modulate" al paso que frenan, y sus mitigadores con Causal "compensate". Rellena metadata.discovery (role "friction" / "mitigator", frictionCategory, controllability, resolution).
Devuelve el JSON completo y una tabla resumen.
{{JSON O DESCRIPCIÓN}}
````

### P8 · Circuitos y retroalimentación

````text
En este sistema hay efectos que se realimentan: {{DESCRIPCIÓN, p.ej. "cuantos más clientes, más recomendaciones"}}.
Modela cada bucle (sección 3.10): conexión de retorno de tipo flujo con "transport": "replicate", "isFeedback": true, multiplicador o porcentaje razonable (marca como hipótesis), retardo si tarda, y un objeto en "circuits" con returnPercent, saturation y loopType "auto". Explica si cada bucle es reforzador o equilibrador y qué lo frena.
Devuelve el JSON completo.
{{JSON}}
````

### P9 · Planificación en el tiempo (marco espacial)

````text
Quiero planificar {{PROYECTO}} en {{UNIDAD: semanas}} con fecha límite en la {{N}}ª {{unidad}}.
Activa settings.frame (mode "grid", time.enabled true, unitLabel "{{Semana}}", deadline {{N}}, latePolicy "penalize", lateKeep 0.5) y coloca cada paso en su columna con las fórmulas exactas de la sección 3.11. Pon apoyos por encima del eje y fricciones por debajo (support.enabled true). Indica en una tabla: elemento → columna → fila → por qué.
Devuelve el JSON completo.
{{JSON O DESCRIPCIÓN}}
````

### P10 · Interpretar resultados

**Antes:** copia lo que veas en la aplicación: el texto de **Dímelo claro** (botón **Copiar**), las **Pistas** del panel de abajo (nivel 3) o los números del **Marcador**.

````text
Estos son los resultados de mi mapa en Mapa de Flujos:
"""
{{PEGA AQUÍ «Dímelo claro», las Pistas o el Marcador}}
"""
1) Explícame en lenguaje llano qué está pasando.
2) ¿Dónde está el cuello de botella y cuál es la fricción que más me cuesta?
3) Propón 3 cambios ordenados por impacto esperado, cada uno como un escenario concreto (qué parámetro, de qué valor a qué valor).
4) ¿Qué supuestos debería comprobar antes de fiarme?
No inventes números: usa solo los que te he pegado y marca tus estimaciones como tales.
````

### P11 · Auditoría de calidad del modelo

````text
Audita este proyecto de Mapa de Flujos (JSON abajo) como lo haría un experto en dinámica de sistemas:
- ¿Hay ruta completa Entrada → Salida por conexiones de tipo "flow"?
- ¿Hay Salidas que no deberían contar como resultado (rechazos, abandonos)?
- ¿Comportamientos con parámetros ausentes o incoherentes (proporciones fuera de 0–1, capacidades 0)?
- ¿Conexiones causales sin influencia en el origen (influencia 0 o nula = sin efecto)?
- ¿Ciclos sin circuito configurado o sin saturación (riesgo de crecimiento explosivo)?
- ¿Supuestos sin marcar como hipótesis?
- ¿Doble conteo en convergencias (debería usar "dedupe")?
Da una lista priorizada (crítico / atención / mejora) con la corrección exacta (campo → valor) y, si te lo pido, el JSON corregido.
```json
{{JSON}}
```
````

### P12 · Preparar una sesión de «Ayúdame a pensar»

**Cuándo:** vas a usar «Ayúdame a pensar» en la aplicación y quieres llegar preparado.

````text
Voy a usar «Ayúdame a pensar» de Mapa de Flujos (modo «Hazme preguntas») sobre: {{TEMA}}. Prepárame:
1) Qué escribir en «¿Sobre qué quieres pensar?», «¿Qué quieres conseguir?», «¿Cómo lo harías?» y «Algo más que deba saber» (frases cortas).
2) Qué datos tener a mano (cifras, tiempos, capacidades) porque me los va a preguntar.
3) Qué comandos rápidos usar y cuándo («No lo sé», «Cuestiona mi planteamiento», «Busca alternativas», «Prepara el flujo»…).
4) Qué fricciones típicas de este tipo de idea debería esperar, para no olvidarlas.
````

### P13 · Agente con control del navegador: operar la aplicación

**Cuándo:** tu IA puede controlar el navegador (por ejemplo, una extensión).

````text
Tienes control del navegador. Abre https://mapa-flujos-workflow.vercel.app y haz esto: {{TAREA}}.
Usa los selectores [data-testid="…"] de la sección 6 del MANUAL-IA y los nombres de menú exactos. Procedimiento:
1) Si aparece la pantalla de inicio (data-testid="start-screen"), elige la opción adecuada.
2) Para crear un mapa completo, genera el JSON (sección 3), pulsa data-testid="start-paste" (o, en el nivel 3, io-menu → «Pegar proyecto (JSON)»), escribe el JSON en data-testid="paste-json" y pulsa data-testid="paste-import-run".
3) Ten en cuenta los niveles: si necesitas la barra lateral, el panel de abajo o los «¿Y si…?», pulsa data-testid="level-3". En el nivel 2 prueba con data-testid="simple-play" y lee data-testid="simple-result"; en el nivel 3 usa data-testid="sim-play" y la pestaña data-testid="tab-results". El Marcador se abre con data-testid="open-monitor".
4) Antes de acciones destructivas (borrar proyectos, restaurar versiones), pide confirmación.
5) Al terminar, resume qué hiciste y qué viste, sin inventar cifras.
````

### P14 · Configurar la IA del servidor (proveedor)

````text
Quiero activar la IA real de «Ayúdame a pensar» de Mapa de Flujos con {{PROVEEDOR: Gemini / OpenAI / Anthropic / Ollama / otro compatible con OpenAI}} en {{Vercel / mi ordenador}}.
Dime exactamente qué variables de entorno poner (sección 7 del MANUAL-IA), dónde (Vercel: Settings → Environment Variables y Redeploy; local: archivo .env y reiniciar) y cómo comprobar que funciona («Ayúdame a pensar» deja de decir «Modo demostración» y muestra «Modelo: …»). No me pidas la clave en el chat.
````

### P15 · Desarrollador: cambiar el código de la aplicación

````text
Trabajas sobre el repositorio de Mapa de Flujos (React 19 + TypeScript + Vite 8, Zustand, @xyflow/react, Dexie/IndexedDB, Zod 4; motor en src/engine; servidor del Explorador en server/). Quiero: {{CAMBIO}}.
Reglas: lee README.md y docs/MOTOR.md; el motor es puro y determinista (sin React); el estado de verdad es el documento del store (src/store/projectStore.ts) modificado con operaciones puras de src/core/operations.ts; los esquemas están en src/core/model/schema.ts (si cambias el formato, sube CURRENT_SCHEMA_VERSION y añade migración en migrations.ts); las claves de IA solo en el servidor.
Antes de terminar ejecuta: npm run typecheck · npm test · npm run build · npm run test:e2e, y no des por bueno nada que no pase.
````

### P16 · Decisión estratégica rápida (sin construir el mapa)

````text
Antes de modelar nada: tengo esta idea {{IDEA}} y este objetivo {{OBJETIVO}}.
Hazme como mucho 5 preguntas, una cada vez, que cambien la decisión (no un formulario). Después dime: punto de entrada del flujo, dónde se perderá más, la fricción más probable de cada tipo (propia, entorno, sistema), el primer experimento barato (qué hacer, cuánto tiempo, cuándo confirma, cuándo cuestiona, cuándo parar, qué registrar) y si ya merece la pena construir el mapa (usa entonces P2).
````

### P17 · ACLARATOR: aclarar lo esencial, bloque a bloque

**Cuándo:** quieres entender lo más abstracto y esencial de un proyecto (o de cualquier pretensión) antes de hacer nada. Es el mismo modo que **Ayúdame a pensar → Aclarator** de la aplicación, para usarlo en tu IA.

````text
Actúa como el ACLARATOR de Mapa de Flujos. Mi proyecto: {{PROYECTO}}.
Esto es todo lo que tengo en la cabeza, sin orden: {{LO QUE TE SALGA}}

FUNCIONAMIENTO: diálogo progresivo, paso a paso. Me haces pasar por estos diez bloques, en este orden, cada uno en DOBLE CAPA (INTERNO = cómo está hecho o qué se construye; EXTERNO = qué tiene que pasar fuera, en la realidad o en quien lo recibe):
1 OBJETIVO — interno: qué se está construyendo exactamente; externo: qué debe ocurrir en la realidad después.
2 PRIORIDAD — interno: qué pesa más en cómo está hecho; externo: qué pesa más en el efecto que debe generar.
3 SUBOBJETIVOS — interno: condiciones que debe cumplir el contenido; externo: condiciones que deben cumplirse en la reacción del receptor.
4 ELEMENTOS CRÍTICOS — interno: qué no puede faltar en el contenido; externo: qué necesita el receptor para actuar o decidir.
5 TONO — interno: cómo debe sonar el contenido; externo: cómo debe sentirse el receptor al recibirlo.
6 RECEPTOR — interno: quién es y qué le importa; externo: qué le genera rechazo y qué le da confianza.
7 LÍMITES — interno: qué no debe aparecer en el contenido; externo: qué efecto negativo no puede provocar.
8 CONTEXTO — interno: factores que afectan a la construcción; externo: factores que afectan a la interpretación.
9 DETALLE — interno: nivel de desarrollo del contenido; externo: nivel de información necesario para que el receptor actúe.
10 ÉXITO — interno: cuándo el contenido está perfecto; externo: qué debe pasar fuera para validar que funciona.

REGLA DE ORO: no pasamos a la siguiente cuestión hasta que la presente esté aclarada y yo la valide. Por tanto:
- Trabaja SOLO el bloque actual. No adelantes, no nombres y no rellenes los siguientes. Nunca respondas con «el total» del proceso.
- Puedes ayudarme a desarrollar el punto actual (reformular, proponer opciones, dar un ejemplo), pero no avances.
- Si no llegamos a la claridad, busca otra manera: una pregunta más sencilla, dos o tres opciones para elegir, un ejemplo cotidiano. Fomenta la concreción: quién, qué, cuánto, cuándo y cómo se comprobaría.
- Una capa no está clara si está vacía, es muy corta o usa palabras vagas («algo», «mejor», «muchos», «cosas»…).
- Cuando las dos capas estén claras, muéstramelas con mis palabras y pregúntame si lo validamos. Solo con mi «sí» pasamos al siguiente bloque.
- Una sola pregunta por turno, frases cortas y sencillas (que lo entienda alguien de 13 años).
- Mis palabras: tómalas tal cual llegan, también si vienen de un dictado. No las deletrees, no comentes la pronunciación y no las corrijas.
- No inventes datos míos: lo que propongas, preséntalo como propuesta para que lo confirme.

AL TERMINAR LOS DIEZ (solo entonces): dame una tabla con los diez bloques y sus dos capas. Si te lo pido, genera además un proyecto importable (sección 3 del MANUAL-IA) con mi proyecto en el centro, los diez bloques alrededor y, de cada uno, su capa interna y su capa externa, unidos con uniones "conceptual".

Empieza por el bloque 1.
````

**Debe devolver:** solo el bloque 1 y una pregunta. Nunca la lista completa ni un borrador de todos los bloques. En la aplicación, el mismo proceso termina con **Crear el mapa** (31 ideas).

### P18 · COPYWRITER: guion para YouTube, Instagram y TikTok

**Cuándo:** quieres convertir un tema (o lo aclarado con P17) en un guion que se escuche hasta el final. Es el mismo modo que **Ayúdame a pensar → Copywriter** de la aplicación.

````text
Actúa como el COPYWRITER de Mapa de Flujos: guionista senior especializado en contenido digital de alto impacto para YouTube, Instagram y TikTok.
Tema: {{TEMA}}. Para quién: {{PÚBLICO}}. Lo que deben llevarse: {{MENSAJE}}. Notas: {{NOTAS O «ninguna»}}.
{{OPCIONAL: pega aquí lo aclarado con el ACLARATOR y respétalo}}

MISIÓN: no te limitas a informar. Transforma el tema en una experiencia narrativa que mantenga la atención, genere reflexión y aumente la percepción de autoridad del creador, para que se quiera escuchar hasta el final.

REGLA DE ORO: cristaliza al menos una vez, en la parte importante, un EJEMPLO, EJERCICIO o RETO TANGIBLE para el público: algo práctico, común y entretenido.

PRINCIPIOS:
1. Suena humano: una persona inteligente hablando con otra. Nada de profesor, libro o IA; nada de frases artificiales ni estructuras repetitivas.
2. Retención constante: cada 20–30 segundos, una idea inesperada, una contradicción, una pregunta, una curiosidad, un cambio de perspectiva, una revelación, una historia breve o una analogía potente.
3. No expliques: haz entender. Ejemplos, metáforas, comparaciones y situaciones cotidianas antes que teoría.
4. Sin sensacionalismo: ni clickbait, ni alarmismo, ni exageraciones, ni falsas promesas.

ENTREGA:
A) Guion de YouTube, unos 5 minutos, ENTRE 700 Y 900 PALABRAS, en este orden: gancho (10–20 s; nunca empieces saludando ni con «En este vídeo…» u «Hoy vamos a hablar de…»); A) lo que cree normalmente la gente; B) por qué esa visión se queda corta; C) la nueva perspectiva; D) consecuencias, ejemplos e implicaciones; E) cómo aplicarlo a la vida real; cierre (no resumas: deja una idea que permanezca); llamada a la acción: una pregunta poderosa y una invitación natural a comentar, compartir o seguir, sin mendigar.
B) El reto tangible, por separado, en una o dos frases.
C) Tres reels de 30–60 s: principal (la idea más potente), contraste (rompe una creencia común) y reflexión (genera conversación).
D) Entre 3 y 5 stories consecutivas: cada una con una idea, progresión y un cierre que invite a la siguiente.

FORMATO: solo guion de voz, listo para leer ante la cámara. Sin instrucciones de cámara, edición, planos ni acotaciones. Sin etiquetas de sección dentro del texto que se lee. No inventes cifras, estudios ni citas. Indica al final el número de palabras del guion de YouTube.

TONO: autoridad intelectual, cercanía humana, claridad absoluta, energía conversacional y profundidad, como un gran divulgador hablando con amigos. Antes de cada frase pregúntate: «¿Esto es solo información o es una idea que merece ser escuchada?».
````

**Debe devolver:** el guion (700–900 palabras), el reto, tres reels y 3–5 stories, solo voz. En la aplicación, el resultado se puede convertir en mapa con **Crear el mapa del guion**.

---

## 3. Especificación del formato de proyecto (JSON)

> **Garantía.** Esta especificación coincide con el validador real (`src/core/model/schema.ts` + `migrations.ts`). Los dos ejemplos de la sección 8 se importan sin reparaciones y simulan con conservación exacta. Lo comprueban `tests/manual-ia.test.ts` (validador y motor) y `e2e/paste-import.spec.ts` (pegado en la interfaz real).

### 3.1 Formato recomendado para generar: «v1 con listas»

Usa **`"schemaVersion": 1`** y escribe las colecciones como **listas** (arrays) de objetos con `id`. Al importar, la aplicación:

1. convierte las listas en diccionarios;
2. añade las 5 dimensiones estándar si `dimensions` está vacía;
3. completa `project.settings` con los valores por defecto;
4. migra a la versión actual (2);
5. rellena con valores por defecto **todos los campos opcionales**;
6. repara referencias rotas (y avisa).

**Estructura de nivel superior** (todas las claves obligatorias; usa `[]` si no hay elementos):

```json
{
  "schemaVersion": 1,
  "project": { },
  "nodes": [],
  "ports": [],
  "edges": [],
  "behaviors": [],
  "conditions": [],
  "annotations": [],
  "layers": [],
  "dimensions": [],
  "scenarios": [],
  "circuits": []
}
```

`ports` puede omitirse: se trata como vacío.

**Alternativa.** También se acepta el envoltorio de exportación `{"format": "mapa-de-flujos", "formatVersion": 1, "project": { …documento v2… }, …}`. Es lo que produce **Exportar**. Si modificas un archivo exportado, conserva ese envoltorio.

**Reglas generales**

- `id`: texto no vacío y **único** en todo el documento. Usa prefijos legibles: `n_…` nodos, `e_…` conexiones, `b_…` comportamientos, `c_…` condiciones, `scn_…` escenarios, `cir_…` circuitos, `a_…` anotaciones, `lyr_…` capas.
- Timestamps (`createdAt`, `updatedAt`): **números** en milisegundos (por ejemplo `1767225600000`), nunca texto.
- Proporciones: siempre de **0 a 1** (0.65 = 65 %). Excepciones: `returnPercent` de circuitos (0–100) y compensaciones con `compensationUnit: "percent"` (0–100).
- Sin comentarios, sin `…`, sin comas finales. JSON estricto.

### 3.2 `project` (obligatorio)

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | texto | sí | Debe coincidir con el `projectId` de nodos, conexiones y escenarios. |
| `name` | texto | sí | Nombre visible. |
| `description` | texto | no | |
| `createdAt`, `updatedAt` | número | sí | ms. |
| `activeScenarioId` | texto o null | no | Id del escenario activo al abrir (recomendado: el base). |
| `settings` | objeto | no | Se completa con valores por defecto. Puedes poner solo lo que cambies (3.11). |
| `isDemo` | booleano | no | Déjalo en `false`. |

### 3.3 `nodes[]`

**Obligatorios:** `id`, `projectId`, `type`, `title`, `position {x,y}`, `visualStyle` (puede ser `{}`), `metadata` (puede ser `{}`), `createdAt`, `updatedAt`.

| Campo | Valores | Por defecto | Uso |
|---|---|---|---|
| `type` | `bubble` · `input` · `output` · `note` · `label` · `group` · `container` | — | **`input`** genera flujo; **`output`** suma al resultado. |
| `title` / `description` | texto | `""` | |
| `position` | `{ "x": n, "y": n }` | — | Esquina superior izquierda, en px. Tamaño por defecto ≈ 190 × 64. |
| `dimensions` | `{ "width", "height" }` o null | null | Tamaño fijo (opcional). |
| `visualStyle.shape` | `rounded` · `pill` · `rect` · `circle` · `diamond` · `hexagon` | `rounded` | |
| `visualStyle.color` | `slate` · `blue` · `emerald` · `rose` · `amber` · `violet` · `cyan` · `pink` | `slate` | Recomendado: fricción `rose`, mitigador `emerald`, entrada `blue`. |
| `visualStyle.icon` | nombre de icono (3.15) o null | null | |
| `visualStyle.background` | color CSS o null | null | |
| `visualStyle.borderStyle` | `solid` · `dashed` · `dotted` · `none` | `solid` | |
| `visualStyle.fontFamily` | `sans` · `serif` · `mono` | `sans` | |
| `tags` | lista de textos | `[]` | |
| `layerIds` | ids de `layers` | `[]` | |
| `metadata.confidence` | `hypothesis` · `estimate` · `observation` · `verified` | `estimate` | **Marca los supuestos como `hypothesis`.** |
| `metadata.category` / `documentation` | texto | `""` | `documentation`: fuentes y enlaces. |
| `metadata.discovery` | objeto (3.3.1) o null | null | Para fricciones y mitigadores clasificados. |
| `behaviorIds` | ids de `behaviors` cuyo `ownerId` es este nodo | `[]` | **Ha de coincidir** con los comportamientos que apuntan al nodo. |
| `weight.influence` | `{ "mode": "weighted", "value": −5…5 }` o null | null | Influencia que usa el motor. |
| `weight.importance` / `weight.impact` | igual formato | null | Informativos (no calculan). |
| `influenceSource` | `static` · `throughput` · `stock` | `static` | Origen de la influencia. |
| `influenceReference` | número | 100 | Flujo o stock que da la influencia máxima (si no es `static`). |
| `dimensionValues` | `{ "<dimId>": { "value": n, … } }` | `{}` | **En las entradas**: cuánto generan por iteración (3.3.2). |
| `activationConditionId` | id de `conditions` o null | null | Condición de activación del nodo. |
| `inactiveMode` | `passthrough` · `block` | `passthrough` | Qué pasa si está inactivo. |
| `convergence` | `{ "rule", "overlap", "formula" }` | `sum` | Reglas: `sum` · `weighted` · `priority` · `max` · `min` · `dedupe` · `custom`. `overlap` 0–1 (dedupe). `formula` con `in1…inN, sum, max, min, count`. |
| `split` | `{ "mode", "dynamicSourceNodeId" }` | `proportional` | Modos: `fixed` · `proportional` · `conditional` · `priority` · `competitive` · `dynamic`. |
| `mitigationCombination` | `additive` · `max` · `diminishing` | `additive` | Cómo se combinan varios mitigadores. |
| `parentId` | id de un `group` o `container`, o null | null | Pertenencia a grupo. |
| `collapsed`, `branchCollapsed`, `locked`, `hidden` | booleanos | false | |
| `aliasOf` | id de nodo o null | null | Clon (misma identidad). |

**Valores de escala.** `weight.*` y los valores con `mode`:

- `"weighted"`: valor en la escala (−5…5).
- `"numeric"`: número libre.
- `"qualitative"`: **índice** del nivel (0 = Muy bajo … 4 = Muy alto en la escala `scale_five`), con `"scaleId": "scale_five"` o `"scale_critical"`.

Para la influencia usa siempre `"weighted"`.

#### 3.3.1 `metadata.discovery` (opcional)

```json
{
  "origin": "ai",
  "status": "suggested",
  "role": "friction",
  "frictionCategory": "external",
  "controllability": "partial",
  "resolution": "compensate",
  "stage": "Captación",
  "evidence": "hypothesis",
  "frequency": "",
  "intensity": "",
  "cost": "",
  "probability": "",
  "detectability": "",
  "sourceRef": "",
  "sessionId": null
}
```

Valores permitidos:

| Campo | Valores |
|---|---|
| `origin` | `ai` · `template` · `user` |
| `status` | `suggested` · `confirmed` · `rejected` |
| `role` | `input` · `resource` · `condition` · `action` · `transformation` · `result` · `limitation` · `friction` · `mitigator` · `alternative` · `metric` · `experiment` · `unknown` |
| `frictionCategory` | `personal` · `external` · `system` · null |
| `controllability` | `direct` · `partial` · `external` · `uncontrollable` · null |
| `resolution` | `pending` · `eliminate` · `accept` · `compensate` · `reroute` |
| `evidence` | `confirmed` · `observed` · `estimate` · `hypothesis` · `preference` · `unknown` |

El Marcador cuenta estas fricciones y sus decisiones («Frenos que has encontrado»).

#### 3.3.2 `dimensionValues` (entradas)

```json
"dimensionValues": {
  "quantity": { "value": 1000, "unit": "visitas", "confidence": "observation", "source": "Analítica", "range": { "low": 600, "high": 1200 } },
  "quality":  { "value": 0.5 }
}
```

- `quantity` es lo que genera la entrada **en cada iteración**.
- Dimensiones intensivas (`quality`, `speed`, `potential`): de 0 a 1 (`speed` 1 = nominal).
- `range` (opcional): la variante **favorable usa `high`** y la **desfavorable usa `low`**. Para dimensiones donde «más es peor» (coste, carga), invierte el sentido o no pongas rango.
- `mode` (por defecto `numeric`), `unit`, `confidence` y `source` son opcionales.

### 3.4 `behaviors[]`

**Obligatorios:** `id`, `ownerId` (id del nodo), `behaviorType`, `parameters` (objeto).

**Escribe SIEMPRE todos los parámetros** de la tabla. Si falta alguno, el motor usa un valor interno que puede no coincidir con el que muestra el inspector. Por ejemplo, un restrictor sin `capacity` no limita nada.

| `behaviorType` | `parameters` (todos; los valores son los predeterminados del inspector) |
|---|---|
| `generator` | `amount` 100 · `mode` `"continuous"`\|`"once"` · `startIteration` 1 · `endIteration` 0 (0 = sin fin) · `growth` 0 (−1…1 por iteración). *`amount` se usa si el nodo no define `dimensionValues.quantity`.* |
| `consumer` | `mode` `"ratio"`\|`"amount"` · `ratio` 0.2 · `amount` 10 |
| `filter` | `mode` `"ratio"`\|`"threshold"` · `passRatio` 0.65 · `thresholdDimension` `"quality"` · `operator` `">="`\|`">"`\|`"<="`\|`"<"` · `threshold` 0.5 |
| `transformer` | `mode` `"scale"`\|`"shift"`\|`"set"`\|`"convert"` · `factor` 1.2 · `value` 0.1 · `from` `"quantity"` · `to` `"load"` · `ratio` 0.5 |
| `multiplier` | `factor` 1.5 |
| `reducer` | `mode` `"ratio"`\|`"amount"` · `ratio` 0.1 · `amount` 5 |
| `accelerator` | `factor` 1.3 (velocidad) |
| `restrictor` | `capacity` 50 (por iteración) · `excess` `"queue"`\|`"lose"`\|`"overflow"` |
| `diverter` | `ratio` 0.2 (va a conexiones con `role: "divert"`) |
| `accumulator` | `maxStock` 0 (0 = sin límite) · `initialStock` 0 |
| `releaser` | `mode` `"ratio"`\|`"amount"`\|`"all"` · `ratio` 0.5 · `amount` 10 |
| `compensator` | `efficiency` 1 (0–2) |
| `detector` | `metric` `"in"`\|`"out"`\|`"dim"` · `dimension` `"quality"` · `threshold` 0 |
| `controller` | `targetBehaviorId` (id de otro comportamiento) · `parameter` (por ejemplo `"capacity"`) · `mode` `"scale"`\|`"set"`\|`"add"` · `value` 1.5 |

**Campos opcionales de cada comportamiento**

| Campo | Valores | Por defecto | Uso |
|---|---|---|---|
| `label` | texto | `""` | Nombre propio, por ejemplo «Tasa de respuesta». |
| `enabled` | booleano | true | |
| `affectedDimensions` | ids de dimensión | `[]` (= las que correspondan) | |
| `conditions` | ids de `conditions` con `ownerType: "behavior"` | `[]` | SI. |
| `combinationRule` | `sequential` · `multiplicative` · `additive` · `max` · `min` | `sequential` | Con varios del mismo tipo. |
| `elseMode` | `inactive` · `alternate` | `inactive` | SI NO. |
| `elseParameters` | objeto | `{}` | Valores si no se cumple (con `alternate`). |
| `ranges` | `{ "<param>": { "favorable": n, "unfavorable": n } }` | `{}` | Incertidumbre. **Ponla en parámetros que realmente limiten el resultado.** |
| `sideEffects` | `[{ "id", "description", "polarity": "positive"\|"negative", "dimensionId": null }]` | `[]` | Descriptivo. |

**Coherencia obligatoria:** cada comportamiento debe estar en `behaviorIds` de su nodo dueño, y cada id de `behaviorIds` debe existir. Si no, se elimina al importar.

**Reglas de diseño**

- Un nodo `input` ya genera flujo aunque no tenga comportamiento. Añadir un `generator` permite controlar emisión, inicio, fin y crecimiento.
- Orden fijo dentro de un nodo (5.2): filtro → transformaciones → capacidad → acumuladores. No dependas del orden de la lista.
- Lo que rechaza un `filter` va a las conexiones de salida con `role: "reject"`. Sin ninguna, se pierde.
- El exceso de un `restrictor` con `excess: "overflow"` va a las conexiones con `role: "overflow"`. Con `"queue"` se encola para la siguiente iteración; con `"lose"` se pierde.

### 3.5 `edges[]`

**Obligatorios:** `id`, `projectId`, `sourceNodeId`, `targetNodeId`, `type`, `visualStyle` (puede ser `{}`), `behavior` (puede ser `{}`), `metadata` con `createdAt` y `updatedAt` (números).

| Campo | Valores | Por defecto |
|---|---|---|
| `type` | `flow` · `causal` · `informative` · `conceptual` | — |
| `direction` | `forward` · `both` · `none` | `forward` |
| `capacity` | número o null (máximo por iteración) | null |
| `resistance` | 0–1 (frena la velocidad) | 0 |
| `delay` | entero ≥ 0 (iteraciones) | 0 |
| `conditions` | ids de `conditions` con `ownerType: "edge"` (condiciones de paso) | `[]` |
| `metadata.description` / `tags` / `hidden` | | |
| `visualStyle.pathType` | `curve` · `straight` · `orthogonal` | `curve` |
| `visualStyle.dash` | `solid` · `dashed` · `dotted` | `solid` |
| `visualStyle.label` | texto sobre la línea | `""` |
| `visualStyle.sourceAnchor` / `targetAnchor` | `top` · `right` · `bottom` · `left` | `right` / `left` |
| `visualStyle.color` | color CSS o null · `widthMode` `auto`\|`manual` · `width` | null · `auto` · 2 |

**`behavior` (conexiones de flujo)**

| Campo | Valores | Por defecto | Uso |
|---|---|---|---|
| `role` | `main` · `reject` · `overflow` · `divert` | `main` | Ruta normal, de rechazo de filtro, de desborde o de desvío. |
| `transport` | `transfer` · `replicate` | `transfer` | `replicate` **genera** en el destino una cantidad proporcional sin restarla del origen (retroalimentación). |
| `multiplier` | número | 1 | En `replicate`: proporción generada (0.3 = 30 %). |
| `polarity` | `positive` · `negative` | `positive` | En `replicate`: + alimenta, − inhibe (resta en el destino). |
| `isFeedback` | booleano | false | Marca como retorno: entrega en la iteración siguiente. |
| `loss` | 0–1 | 0 | Pérdida por el camino. |
| `share` | número | 50 | Porcentaje con `split.mode: "fixed"`. |
| `weight` | número | 1 | Peso con `split.mode: "proportional"`. |
| `priority` | número | 1 | Orden con `split.mode: "priority"`. |
| `intensity` | número | 1 | Potencial. |
| `speed` | número | 1 | |
| `convergenceWeight` | número | 1 | Con `convergence.rule: "weighted"`. |
| `transportedDimensions` | ids o null (= todas) | null | |

**`behavior.influence` (conexiones causales)**

| Campo | Valores | Por defecto |
|---|---|---|
| `mode` | `modulate` · `compensate` | `modulate` |
| `targetDimension` | id de dimensión, o `"__influence"` (modula la influencia del destino) | `quantity` |
| `sensitivity` | número (fuerza de la modulación) | 0.25 |
| `compensationType` | `partial` · `total` · `conditional` · `temporal` | `partial` |
| `compensationUnit` | `points` (escala) · `percent` (0–100) | `points` |
| `amount` | número | 1 |
| `fromIteration` / `toIteration` | entero / entero o null | 1 / null |

En las causales, la **polaridad** de la modulación va en `behavior.polarity` (`positive` = directa, `negative` = inversa).

**Patrones**

- **Transportar:** `type: "flow"` con `behavior: {}`.
- **Rechazo de filtro:** `type: "flow"` con `behavior: { "role": "reject" }` hacia una **burbuja sumidero**.
- **Fricción que frena un paso:**
  1. Nodo con `weight.influence: {"mode": "weighted", "value": -3}`.
  2. Conexión `type: "causal"` con `behavior.influence: {"mode": "modulate", "targetDimension": "quantity", "sensitivity": 0.25}` hacia el paso.
- **Mitigador de esa fricción:** nodo medida → fricción con `type: "causal"` y `behavior.influence: {"mode": "compensate", "compensationType": "partial", "compensationUnit": "points", "amount": 2}`.
- **Retroalimentación:** `type: "flow"` con `behavior: {"transport": "replicate", "multiplier": 0.3, "isFeedback": true}` y, si tarda, `delay: 1`. Más su entrada en `circuits` (3.10).

### 3.6 `conditions[]`

**Obligatorios:** `id`, `ownerId`, `ownerType` (`node` · `edge` · `behavior` · `circuit`), `conditionType`, `expr`.

**Recomendados:** `operator` y `operands` (copia de los de `expr`), `label`, `result` (`activate` · `deactivate`; por defecto `activate`) y `activationRules` `{ "mode": "always"|"latch"|"once", "sustain": 1 }`.

Además, el dueño debe apuntar a la condición:

- nodo → `activationConditionId`;
- conexión → `conditions: [id]`;
- comportamiento → `conditions: [id]`;
- circuito → `conditionId`.

**`expr`**: `{ "id", "conditionType", "operator", "operands", "children": [] }`

| `conditionType` | `operator` | `operands` | Significado |
|---|---|---|---|
| `iteration` | `>` `>=` `<` `<=` `==` `!=` | `[{ "kind": "const", "value": 4 }]` | Iteración actual (empieza en 1) comparada con 4. |
| `compare` | igual | `[{ "kind": "metric", "nodeId": "n_x", "metric": "stock", "dimensionId": null }, { "kind": "const", "value": 50 }]` | Métrica de un nodo frente a un valor. |
| `threshold` | `above` · `below` | `[métrica, const]` | Supera / por debajo de. |
| `range` | `between` · `outside` | `[métrica, const bajo, const alto]` | Entre / fuera de. |
| `active` | null | `[{ "kind": "metric", "nodeId": "n_x", "metric": "active", "dimensionId": null }]` | Si otro elemento está activo. |
| `and` · `or` · `not` | null | `[]` | Combinan `children` (lista de `expr`). |

**Métricas:** `in` · `out` · `stock` · `influence` · `lost` · `result` · `dim` (con `dimensionId`) · `active`.

**Ejemplo validado** (la medida actúa desde la semana 4):

```json
{
  "id": "c_desde4", "ownerId": "n_domicilio", "ownerType": "node", "label": "Desde la semana 4",
  "conditionType": "iteration", "operator": ">=", "operands": [{ "kind": "const", "value": 4 }],
  "expr": { "id": "cx_desde4", "conditionType": "iteration", "operator": ">=", "operands": [{ "kind": "const", "value": 4 }], "children": [] },
  "result": "activate", "activationRules": { "mode": "always", "sustain": 1 }
}
```

Y en el nodo: `"activationConditionId": "c_desde4"`.

### 3.7 `annotations[]` y `layers[]`

**Anotación:** `{ "id", "ownerType": "node"|"edge"|"project"|"scenario", "ownerId", "kind": "comment"|"note"|"hypothesis"|"evidence"|"question", "text", "createdAt": n }`. Opcionales: `author` («Yo»), `labels`, `resolved`.

**Capa:** `{ "id", "name", "color": "#64748b", "order": 0 }`. Opcionales: `visible` (true) y `locked` (false). Recomendado: una capa «General».

### 3.8 `dimensions[]`

- Déjalo **vacío `[]`** para usar las 5 estándar: `quantity` · `quality` · `speed` · `potential` · `load`.
- **Si añades una dimensión propia, la lista deja de estar vacía**, así que **incluye también las estándar que uses** (como mínimo `quantity`). Formato:

```json
{ "id": "coste", "key": "coste", "name": "Coste", "dataType": "numeric", "unit": "€",
  "range": { "min": 0, "max": 100000 }, "aggregation": "extensive", "color": "#f59e0b" }
```

Obligatorios: `id`, `key`, `name`, `dataType` (`numeric` · `weighted` · `qualitative`), `range {min,max}`, `aggregation` (`extensive` = se suma · `intensive` = se promedia) y `color`. En las estándar añade `"builtin": true`. En intensivas, `defaultValue` es el valor cuando el flujo no la trae.

### 3.9 `scenarios[]` y `overrides`

**Escenario:** `{ "id", "projectId", "name", "createdAt", "updatedAt" }`. Opcionales:

| Campo | Valores | Por defecto | Uso |
|---|---|---|---|
| `isBase` | booleano | false | **Exactamente uno** con `true` («Situación actual»). |
| `description` | texto | `""` | |
| `color` | color CSS | `#6366f1` | |
| `overrides` | lista | `[]` | Cambios del escenario. |
| `initialConditions` | `{ "<nodeId>": { "<dimId>": valor } }` | `{}` | Sustituye los `dimensionValues` de ese nodo en este escenario. |
| `uncertainty` | `central` · `favorable` · `unfavorable` | `central` | Usa `ranges` y `range`. |

**Override:** `{ "id", "targetType": "node"|"edge"|"behavior"|"condition"|"circuit"|"port", "targetId", "path", "value" }`. Opcional: `note`.

`path` es una **ruta con puntos dentro del objeto destino**. Rutas útiles:

| Destino | `path` | Ejemplo de `value` |
|---|---|---|
| behavior | `parameters.capacity` · `parameters.passRatio` · `parameters.factor` · `enabled` | `120` · `0.1` · `1.5` · `false` |
| node | `weight.influence.value` · `dimensionValues.quantity.value` · `inactiveMode` · `split.mode` | `-1` · `1500` · `"block"` · `"priority"` |
| edge | `behavior.loss` · `behavior.multiplier` · `capacity` · `delay` · `behavior.influence.amount` | `0.1` · `0.5` · `40` · `2` · `3` |
| circuit | `returnPercent` · `intensity` · `enabled` · `saturation` | `30` · `1.2` · `false` · `200` |

El valor debe tener el tipo correcto (número, texto o booleano). Las rutas a campos inexistentes no dan error, pero no tienen efecto: compruébalas.

### 3.10 `circuits[]`

```json
{ "id": "cir_reco", "name": "Recomendaciones",
  "nodeIds": ["n_visitas", "n_carrito", "n_pago", "n_pedidos", "n_resenas"],
  "edgeIds": ["e_res_vis"], "returnEdgeId": "e_res_vis",
  "loopType": "auto", "returnPercent": 100, "intensity": 1, "saturation": 400,
  "description": "Los clientes contentos traen visitas nuevas." }
```

Obligatorios: `id`, `name`, `nodeIds` (en orden del ciclo) y `edgeIds` (al menos la de retorno).

| Campo | Valores | Por defecto |
|---|---|---|
| `returnEdgeId` | id de la conexión de retorno | — |
| `loopType` | `auto` · `reinforcing` · `balancing` · `mixed` | `auto` |
| `enabled` | booleano | true |
| `intensity` | número | 1 |
| `returnPercent` | 0–100 | 100 |
| `affectedDimensions` | ids | `[]` |
| `delay` | entero ≥ 0 | 0 |
| `frequency` | entero ≥ 1 (cada N iteraciones) | 1 |
| `persistence` | entero ≥ 1 | 1 |
| `saturation` | número o null (techo suave; **recomendado en bucles reforzadores**) | null |
| `minLimit` / `maxLimit` | número o null | null |
| `conditionId` | id o null | null |
| `description` | texto | `""` |

El motor detecta ciclos aunque no declares el circuito. Declararlo permite configurarlo y verlo en el inspector.

### 3.11 `project.settings` (solo lo que cambies)

```json
"settings": {
  "simulation": { "iterations": 12 },
  "depth": "advanced",
  "frame": {
    "mode": "grid", "cellWidth": 260, "cellHeight": 140, "origin": { "x": 0, "y": 0 },
    "time": { "enabled": true, "unitLabel": "Semana", "deadline": 8, "latePolicy": "penalize", "lateKeep": 0.5, "inversionPenalty": 0.15 },
    "support": { "enabled": true, "effectPerRow": 0.08, "influencePerRow": 1 }
  }
}
```

| Ajuste | Valores |
|---|---|
| `simulation.iterations` | 1–500. |
| `depth` | Nivel con el que se abre el mapa: `basic` (1 · Ideas), `advanced` (2 · Movimiento, el predeterminado) o `expert` (3 · Todo). Usa `expert` si el mapa usa rangos, fórmulas, puertos o «¿Y si…?», para que se vean en Detalles sin que la persona tenga que cambiar de nivel. |
| `frame` | Si lo incluyes, escribe el objeto **completo** como en el ejemplo. `mode: "free"` = la posición no cuenta. |

**Colocación exacta en la cuadrícula** (nodos sin `dimensions` explícitas, tamaño ≈ 190 × 64). Para la columna `c` (1, 2, 3…; 1 = primera) y la fila `f` (0 = eje; +1, +2 = apoyo por encima; −1, −2 = fricción por debajo):

```
x = origin.x + (c − 1) × cellWidth + cellWidth / 2 − 95
y = origin.y − f × cellHeight − 32
```

Con los valores por defecto (260 × 140, origen 0,0):

| | c=1 | c=2 | c=3 | c=4 | c=5 |
|---|---|---|---|---|---|
| **x** | 35 | 295 | 555 | 815 | 1075 |

| | f=+2 | f=+1 | f=0 | f=−1 | f=−2 |
|---|---|---|---|---|---|
| **y** | −312 | −172 | −32 | 108 | 248 |

**Efectos en modo cuadrícula**

- Cada columna de separación entre dos nodos conectados añade **1 iteración de retardo**.
- Una entrada empieza a generar en su columna.
- Un efecto colocado en una columna **anterior** a su causa pierde `inversionPenalty` por columna.
- Lo que llega a una salida después de la columna `deadline` conserva `lateKeep` (con `penalize`) o no cuenta (con `cut`).
- Cada fila de distancia al eje: ±`effectPerRow` sobre el flujo del nodo y ±`influencePerRow` sobre su influencia.

**Fuera de la cuadrícula** (modo libre), posiciones recomendadas para que se lea bien:

- Ruta principal en horizontal: x = 0, 300, 600…; y = 0.
- Rechazos y sumideros encima: y = −220.
- Fricciones y mitigadores debajo: y = 220 y 440.

### 3.12 Reglas semánticas para que la simulación tenga sentido

1. **Ruta completa:** al menos una `input` conectada por conexiones `flow` hasta al menos una `output`. Sin salidas no hay «resultado».
2. **Todo lo que llega a cualquier `output` suma al resultado total.** Rechazos, abandonos y pérdidas que quieras ver deben terminar en una **burbuja sumidero** (`bubble` sin salidas): retiene el flujo sin contarlo como resultado.
3. Las conexiones `causal`, `informative` y `conceptual` **no transportan flujo**.
4. Una fricción solo frena si tiene **influencia negativa** y una conexión `causal` `modulate` hacia el paso que frena. Influencia 0 o nula = sin efecto.
5. En bucles reforzadores, pon `saturation` o `maxLimit` en el circuito, o un `restrictor` en el bucle. Si no, el crecimiento se dispara (el motor lo limita y avisa).
6. Un nodo con dos llegadas que son la **misma** oportunidad por dos caminos debe usar `convergence.rule: "dedupe"`.
7. Usa unidades coherentes: lo que genera una entrada es **por iteración**.
8. Marca como `hypothesis` (o con una anotación `hypothesis` o `question`) toda cifra no medida.

### 3.13 Errores típicos que rechaza el importador

| Error | Causa |
|---|---|
| «El documento no es un objeto JSON válido» / «El archivo no es JSON válido» | Texto que no es JSON (comentarios, comas finales, comillas tipográficas). |
| «El archivo usa una versión de esquema más reciente…» | `schemaVersion` mayor que 2. Usa 1. |
| Mensaje con una ruta, por ejemplo `nodes.n_x.type` | Valor fuera del enum, campo obligatorio ausente o tipo incorrecto (por ejemplo, `createdAt` como texto). |
| Importa «con reparaciones» | Referencias rotas: conexión a nodo inexistente, `behaviorIds` sin comportamiento, comportamiento huérfano, `parentId` inexistente. **Corrígelas: no lo dejes reparar.** |

### 3.14 Lista de comprobación antes de entregar un JSON

- [ ] `schemaVersion: 1` y las 11 colecciones presentes (listas, aunque estén vacías).
- [ ] Todos los `id` únicos. `projectId` igual a `project.id` en nodos, conexiones y escenarios.
- [ ] Timestamps numéricos en todo lo que los exige: project, nodos, `edge.metadata`, escenarios y anotaciones.
- [ ] Cada nodo: `visualStyle` y `metadata` presentes (aunque sean `{}`), `position` con x e y.
- [ ] Cada comportamiento: `ownerId` existente, listado en `behaviorIds` de su nodo y **todos sus parámetros**.
- [ ] Cada conexión: origen y destino existentes; `visualStyle`, `behavior` y `metadata` con timestamps.
- [ ] Ruta `input` → … → `output` por conexiones `flow`. Rechazos a burbujas sumidero.
- [ ] Proporciones de 0 a 1 (`passRatio`, `loss`, `ratio`).
- [ ] Exactamente un escenario con `isBase: true` y `activeScenarioId` apuntando a él.
- [ ] Overrides con `targetId` existente y `path` válido (3.9).
- [ ] Condiciones referenciadas desde su dueño.
- [ ] Si usas dimensiones propias: la lista incluye también `quantity` y las estándar que uses.
- [ ] Si usas la cuadrícula: `frame` completo y posiciones calculadas con la fórmula de 3.11.
- [ ] Supuestos marcados como `hypothesis`.
- [ ] JSON estricto, en un único bloque.

### 3.15 Iconos disponibles (`visualStyle.icon`)

Activity, AlarmClock, Anchor, BadgeEuro, Banknote, BatteryLow, Bell, BookOpen, Brain, Briefcase, Bug, Building2, Calendar, Car, ChartLine, CircleCheck, CircleX, Clock, Cloud, Compass, Cpu, Database, Flag, Flame, Gauge, Gem, Gift, GraduationCap, Guitar, Hammer, Handshake, Heart, House, Hourglass, Key, Leaf, Lightbulb, Link, Lock, Mail, Map, Megaphone, MessagesSquare, Mic, Package, PhoneIncoming, PiggyBank, Puzzle, Radar, Rocket, RotateCcw, Scale, ScrollText, Search, Shield, ShieldAlert, ShieldCheck, ShoppingCart, Sparkles, Star, Store, Target, ThumbsUp, Timer, TrendingDown, TrendingUp, Trophy, Truck, User, UserCheck, Users, Wallet, Wrench, Zap, Filter, Split, Shuffle, Minimize2, PackageOpen, SlidersHorizontal, X.

---

## 4. Glosario de la interfaz (nombres exactos)

Úsalos tal cual al dar instrucciones. La interfaz habla **muy sencillo** (para que la entienda alguien de 13 años) y se amplía por **niveles**.

### 4.1 Equivalencias: nombre en pantalla → nombre técnico

| En pantalla | Técnico (y en el JSON) |
|---|---|
| Idea | Burbuja (`bubble`) |
| Inicio | Entrada (`input`) |
| Meta | Salida (`output`) |
| Nota · Texto suelto · Grupo · Zona | `note` · `label` · `group` · `container` |
| Unión: Pasa · Influye · Info · Idea | Conexión: `flow` · `causal` · `informative` · `conceptual` |
| Ronda | Iteración |
| «¿Y si…?» | Escenario |
| Bucle · vuelta | Circuito · retorno |
| Remedios | Mitigadores y compensaciones |
| Detalles | Inspector |
| Marcador | Monitor |
| Ayúdame a pensar | Explorador |
| Pistas · Qué ha pasado | Diagnóstico · Eventos |
| Cuadrícula del tiempo | Marco espacial |
| Vistas Ideas · Recorrido · Fuerzas · Piezas · Película | `mental` · `flow` · `energy` · `system` · `simulation` |
| Niveles 1 · Ideas · 2 · Movimiento · 3 · Todo | `project.settings.depth`: `basic` · `advanced` · `expert` |

### 4.2 Niveles

- **1 · Ideas**: lienzo, ideas, bandeja de madera (Idea, Unir, Nota, Ordenar) y la guía. Solo vista Ideas.
- **2 · Movimiento**: además **Inicio**, **Meta**, la barra **Probar**, **Dímelo claro** y **Marcador**. Vista Película.
- **3 · Todo**: barra lateral, panel de abajo, «¿Y si…?», vistas, cuadrícula, termómetro, buscador, versiones y todo Detalles.
- El selector está arriba, en la bandeja de madera. Bajar de nivel no borra nada. Un mapa nuevo empieza en el 1; uno con inicio y meta (importado, de ejemplo o hecho con «Ayúdame a pensar»), en el 2.

### 4.3 Nombres exactos por zona

- **Pantalla de inicio:** «¿Qué te ronda la cabeza?», cuadro «Tu idea», botón «Empezar»; «Prefiero que me hagas preguntas», «Ver un ejemplo», «Pegar un mapa», «Abrir un archivo»; «Tus mapas»; enlaces «Manual de usuario» y «Manual para IA».
- **Barra superior:**
  - Logotipo → «Mis mapas»; nombre del mapa (clic para cambiarlo) y punto de guardado.
  - Selector de nivel: «1 · Ideas», «2 · Movimiento», «3 · Todo».
  - Nivel 3: selector «¿Y si…?» («Nuevo «¿y si…?»», «Duplicar «…»», «Quitar todos sus cambios», «Comparar…») y «Vista» («Ideas», «Recorrido», «Fuerzas», «Piezas», «Película»).
  - «Ayúdame a pensar» (todos), «Dímelo claro» y «Marcador» (nivel 2 o más), «Manual».
  - Nivel 3: «Cuadrícula del tiempo», «Termómetro», «Buscar», «Versiones guardadas», «Guardar o abrir archivos» («Guardar una copia»: «Proyecto completo (.json)», «Imagen PNG», «Imagen SVG», «Documento PDF»; «Abrir»: «Importar proyecto (.json)», «Pegar proyecto (JSON)»; «Copias de seguridad»: «Copia de seguridad completa», «Restaurar copia de seguridad»), «Mostrar/Ocultar el panel de abajo», «Mostrar/Ocultar detalles».
  - «Deshacer», «Rehacer», «Claro u oscuro» («Claro», «Oscuro», «Como mi ordenador»).
  - «Más opciones» (···): «Mis mapas…», «Mapa nuevo», «Duplicar este mapa», «Ver un ejemplo», «Guardar o abrir archivos» (niveles 1 y 2), «Guardar versión ahora», «Versiones guardadas…», «Ajustes del mapa», «Ayuda y atajos», «Manual de usuario», «Manual para IA (prompts)».
- **Bandeja de madera (niveles 1 y 2):** «Idea» (B), «Inicio» (I, nivel 2), «Meta» (O, nivel 2), «Unir» (C), «Nota» (N), «Ordenar».
- **Guía:** una tarjeta con el siguiente paso y su botón («Es el inicio», «Es mi meta», «Probar», «Pasar a Movimiento»…) y el enlace «¿Atascado? Ayúdame a pensar».
- **Barra Probar (nivel 2):** «Probar» / «Pausa», «Volver a empezar», «Ronda N de [12]», «Han llegado a la meta», «¿Por qué?».
- **Barra lateral (nivel 3):** «Mover y elegir» (V), «Nueva idea» (B), «Unir ideas» (C; tipos «Pasa», «Influye», «Info», «Idea»), «Juntar en un grupo» (Ctrl+G), «Inicio» (I), «Meta» (O), «Nota» (N), «Comentario», «Etiquetas», «Texto suelto», «Zona», «Bucle», «Capas».
- **Menú del clic derecho:** en el lienzo: «Nueva idea», «Nuevo inicio», «Nueva meta», «Nota», «Texto suelto», «Zona», «Pegar», «Deshacer», «Verlo todo», «Ordenar el mapa», «Mostrar lo oculto». En una idea: «Escribir», «Añadir idea unida», «Duplicar», «Clonar (la misma idea en otro sitio)», «Copiar», «Cortar», «Juntar en un grupo», «Deshacer el grupo», «Esconder/Mostrar lo que cuelga», «¿A qué afecta?», «¿De dónde le viene?», «Centrarme en esto», «Añadir comentario», «Bloquear/Desbloquear», «Ocultar», «Borrar». En una unión: «Darle la vuelta», «Que vaya en los dos sentidos / en un solo sentido», «Duplicar unión», «Añadir comentario», «Borrar unión».
- **Detalles de una idea, niveles 1 y 2:** «Qué es», «Notas», «Esta idea es…» («Un paso», «El inicio», «Mi meta»), «¿Cuánto sale de aquí en cada ronda?», «Color» (Papel, Cielo, Oliva, Arcilla, Madera, Lavanda, Agua, Rosa), «Qué pasa en este paso» → «¿Qué pasa aquí?» («Colador», «Límite», «Se escapa algo», «Multiplica», «Hucha», «Suelta lo guardado»), «Comentarios».
- **Detalles de una idea, nivel 3:** «Nombre», «Descripción», «Tipo», «Categoría», «Etiquetas», «Grado de confianza»; secciones «Cuánto empuja o frena», «Qué hace» («Añadir comportamiento»), «Cuándo funciona», «Remedios» («Vincular», «Nueva medida compensatoria»), «Qué genera (dimensiones)» («Definir»), «Cómo reparte y cómo junta», «Con quién está unida», «Aspecto», «Comentarios», «Archivos», «Más opciones».
- **Detalles de una unión:** niveles 1 y 2: «Texto sobre la línea», «¿Se pierde algo por el camino?», «Darle la vuelta», «Borrar esta unión». Nivel 3: «Tipo de unión», «Etiqueta», «Dirección», «Qué pasa por esta unión», «Cómo influye», «Cuándo deja pasar», «Bucle» («Convertir en bucle»), «Aspecto», «Comentarios».
- **Panel de abajo (nivel 3):** pestañas «Probar», «Resultados», «Pistas», «¿Y si…?», «Rondas» y «Qué ha pasado». Controles: «Reproducir», «Detener», «Reiniciar», «Ronda anterior / siguiente», «Paso a paso (elemento a elemento)», «Guardar esta ejecución», «Velocidad», «Rondas», «En vivo», «Calcular». En «¿Y si…?»: «Sensibilidad: altera un parámetro y observa» → «Barrer», e «Incertidumbre» → «Calcular banda».
- **Ayúdame a pensar:** «Nueva exploración»; cuatro modos: «Hazme preguntas», «Te cuento mi plan», «Aclarator», «Copywriter»; campos «¿Sobre qué quieres pensar?», «¿Qué quieres conseguir?», «¿Cómo lo harías?», «Algo más que deba saber» (Aclarator: «¿Qué quieres aclarar?» y «Cuéntamelo todo, tal cual te salga»; Copywriter: «¿De qué tema es el vídeo?», «¿Para quién es?», «¿Qué quieres que se lleven?», «Notas»); «Empezar» / «Continuar»; «Añadir plan (Word, Excel, PDF, texto)».
  - Comandos rápidos: «No lo sé», «Dame ejemplos», «Profundiza», «Cuestiona mi planteamiento», «Busca alternativas», «Simplifica», «Cambia de perspectiva», «Compara opciones», «Prepara el flujo», «Volver a una pregunta anterior».
  - Propuesta: «Crear el flujo inicial», «Construir contexto con IA», «Plantilla estándar (sin IA)», «Meterlo en mi mapa» («En un mapa nuevo», «En este mapa», «Unido a la idea elegida»), «Meter N ideas en el mapa», «Seguir preguntando».
  - Aclarator: «Dame un ejemplo», «Ayúdame a concretar», «Está claro: validar y seguir» (último: «Está claro: terminar»), «Paso anterior»; al final «Crear el mapa», «Copiar», «.md», «Escribir guiones con el Copywriter».
  - Copywriter: «Escribir el guion con IA», «Esqueleto sin IA», «Usar lo aclarado con el Aclarator», «Copiar guion», «Copiar todo», «.md», «Volver a escribir», «Crear el mapa del guion».

---

## 5. Reglas del motor (para razonar sobre resultados)

### 5.1 Principios

- **Determinista:** misma configuración, mismo resultado. La velocidad de animación no influye.
- **Rondas (iteraciones) discretas.** Los ciclos se rompen con una dependencia de retorno: lo que vuelve se usa en la ronda siguiente.
- **Conservación** por iteración y dimensión extensiva:
  `stock inicial + en tránsito inicial + generado = stock final + en tránsito final + consumido + perdido + terminal + deduplicado`.
  La diferencia («Sin explicar») es siempre 0. Multiplicadores y réplicas cuentan como «generado».

### 5.2 Orden dentro de cada elemento

1. Recoger entradas (incluidas las retardadas).
2. Convergencia (las inhibiciones restan aquí).
3. Condiciones.
4. Activación (comportamientos, controladores, compensaciones, influencia neta).
5. Generadores.
6. Filtros.
7. Transformaciones (transformador, multiplicador, reductor, consumidor, acelerador) e influencias causales.
8. Capacidad (restrictor).
9. Acumuladores (almacenar y liberar).
10. Bifurcación.
11. Conexiones (condiciones de paso, multiplicador, pérdida, capacidad, resistencia, intensidad).
12. Retroalimentación (réplicas y circuitos) y retardos.
13. Registro de eventos.

### 5.3 Influencia y compensación

- **Factor de una causal «modulate»** sobre una dimensión: `factor = max(0, 1 + polaridad × sensibilidad × intensidad × influencia_origen / máximo_escala)`, con polaridad +1 (`positive`) o −1 (`negative`), `intensidad` = `behavior.intensity` (por defecto 1) y máximo = 5 con la escala por defecto. Ejemplo: influencia −3, sensibilidad 0.25, polaridad + → factor 1 − 0.15 = 0.85 (−15 %).
- Con `targetDimension: "__influence"` no se multiplica el flujo: se **suma** a la influencia del destino `polaridad × sensibilidad × influencia_origen × intensidad` puntos.
- **Compensación:** reduce la influencia negativa del destino y las pérdidas de sus filtros, reductores y consumidores. Ejemplo: −5 con medidas de +2 y +1 (aditivas) → −2.
- Combinación de varias medidas: `additive`, `max` o `diminishing`.

### 5.4 Escenarios e incertidumbre

- Un escenario aplica sus `overrides`, después `initialConditions` y después la variante (`favorable` usa `ranges.favorable` y `range.high`; `unfavorable` usa `ranges.unfavorable` y `range.low`).
- El modelo base no cambia.

### 5.5 Termómetro

Temperatura de −1 a 1:

| Temperatura | Estado |
|---|---|
| > 0,75 | **Agobiado** (técnico: recalentado) |
| > 0,33 | **Caliente** |
| < −0,33 | **Frío: le falta** |
| resto | **A buen ritmo** |
| sin actividad | «Sin actividad» |

Causas: presión sobre la capacidad, infrautilización, caudal bajo, cola creciendo, saturación, pérdidas mayores del 5 %, bloqueo, llegada fuera de plazo y «prisas».

### 5.6 Marcador y «Dímelo claro»

- El **impacto** de cada idea se calcula simulando el sistema **sin** ella y comparando («lo que ganarías si lo arreglas», «lo que perderías sin ello»).
- «Dímelo claro» se genera solo con datos calculados (sin IA). «Que la IA lo cuente mejor» lo reescribe con los mismos datos, sin añadir cifras.

### 5.7 Modos de trabajo: ACLARATOR y COPYWRITER

- **ACLARATOR**: diez bloques en este orden: OBJETIVO, PRIORIDAD, SUBOBJETIVOS, ELEMENTOS CRÍTICOS, TONO, RECEPTOR, LÍMITES, CONTEXTO, DETALLE y ÉXITO. Cada uno con capa INTERNA y EXTERNA. Regla de oro: no se pasa al siguiente hasta que el actual esté aclarado y validado, y nunca se muestra «el total». Una capa no cuenta como clara si está vacía, tiene menos de 4 palabras o usa palabras vagas («algo», «mejor», «muchos», «cosas»…) en menos de 14 palabras. No deletrea: lee las palabras tal cual vienen. Al final crea un mapa radial de 31 ideas (centro + 10 bloques + 20 capas).
- **COPYWRITER**: regla de oro: al menos un ejemplo, ejercicio o reto tangible. Entrega un guion de YouTube solo voz de 700–900 palabras (gancho; A situación, B fricción, C descubrimiento, D profundización, E integración; cierre; llamada a la acción con reflexión y acción), tres reels (principal, contraste, reflexión; 30–60 s) y 3–5 stories encadenadas. Sin notas de cámara ni sensacionalismo. Con IA, el servidor exige entre 600 y 1100 palabras y repara el texto si no cumple. Al final crea el mapa del guion.

---

## 6. Mapa de la interfaz para agentes con control del navegador

Selectores estables: `[data-testid="…"]`.

**Muy importante: los niveles.** La interfaz muestra más o menos cosas según el nivel del mapa (1 · Ideas, 2 · Movimiento, 3 · Todo). Muchos identificadores **solo existen en el nivel 3**: la barra lateral (`tool-*`), el panel de abajo (`bottom-panel`, `tab-*`, `sim-*`), `io-menu`, `open-palette`, `open-versions`, `scenario-switcher`, `frame-toggle`, `heat-toggle`, `toggle-bottom` y `toggle-inspector`. Un mapa nuevo empieza en el nivel 1; uno importado con inicio y meta, o el de ejemplo, en el 2. **Para tenerlo todo, pulsa `level-3` nada más abrir el mapa.**

| Zona | Identificadores |
|---|---|
| Inicio | `start-screen`, `start-idea` (cuadro «Tu idea»), `new-project` (botón **Empezar**), `start-explorer` (Prefiero que me hagas preguntas), `open-demo` (Ver un ejemplo), `start-paste` (Pegar un mapa), `start-import` (Abrir un archivo), `project-list`, `confirm-delete`, `start-manuals` |
| Pegar JSON | `paste-import` (diálogo), `paste-json` (cuadro de texto), `paste-import-run` (botón Importar) |
| Aplicación | `app`, `topbar`, `canvas`, `inspector` (Detalles), `legend`, `toast`; nivel 3: `toolbar`, `bottom-panel` |
| Niveles | `level-switch`, `level-1` (Ideas), `level-2` (Movimiento), `level-3` (Todo). Son botones de radio: el activo tiene `aria-checked="true"`. |
| Niveles 1 y 2 | Bandeja: `dock`, `dock-idea`, `dock-start` (Inicio, nivel 2), `dock-goal` (Meta, nivel 2), `dock-connect`, `dock-note`, `dock-layout` (Ordenar). Guía: `coach`, `coach-action`, `coach-help`. Barra Probar (nivel 2, con meta): `simple-sim`, `simple-play`, `simple-rounds`, `simple-result`. Detalles sencillos: `simple-quantity` (cantidad por ronda de un inicio), `simple-loss` (pérdida de una unión). |
| Barra superior | `project-name`, `save-state` (atributo `data-state`: idle/pending/saving/saved/error), `open-explorer`, `open-verdict` y `open-monitor` (nivel 2 o más), `open-manual`, `undo`, `redo`, `theme-menu`, `main-menu`; nivel 3: `scenario-switcher`, `frame-toggle`, `heat-toggle`, `open-palette`, `open-versions`, `io-menu`, `toggle-bottom`, `toggle-inspector` |
| Barra lateral (nivel 3) | `tool-select`, `tool-bubble`, `tool-connect`, `tool-group`, `tool-input`, `tool-output`, `tool-note`, `tool-comment`, `tool-tag`, `tool-label`, `tool-container`, `tool-circuit`, `tool-layers`; paneles `tag-popover`, `tag-input`, `layers-panel`, `layer-row`, `layer-assign`, `layer-visibility` |
| Lienzo | nodos `.react-flow__node` con `[data-node-title="Título"]`; `map-node`, `group-node`, `group-toggle`, `node-title-input` (edición en el sitio), `node-flow`; asas de unión `.react-flow__handle-top/right/bottom/left`; `context-menu` |
| Detalles | `node-inspector`, `edge-inspector`, `multi-inspector`, `project-panel`, `inspector-title`, `node-summary`, `add-behavior`, `behavior-option-<tipo>`, `behavior-card`, `section-behaviors`, `section-comments`; nivel 3: `section-weights`, `section-conditions`, `section-mitigators`, `section-dimensions`, `section-edge-flow`, `section-edge-influence`, `section-edge-conditions`, `add-condition`, `condition-block`, `add-clause`, `add-mitigator`, `mitigator-row`, `dim-<dimId>`, `circuit-block`, `override-mark`, `scenario-banner`, `add-annotation`, `discovery-block`, `friction-resolution`, `trace-forward`, `trace-backward` |
| Probar (nivel 3) | `tab-simulation`, `tab-results`, `tab-diagnostics`, `tab-scenarios`, `tab-history`, `tab-events`, `sim-play`, `sim-stop`, `sim-reset`, `sim-prev`, `sim-next`, `sim-step`, `sim-save`, `sim-scrubber`, `sim-iterations`, `kpi-iteration`, `kpi-result`, `kpi-total`, `iteration-badge`, `step-info`, `results-chart`, `ledger`, `diagnostic`, `diag-influence`, `iterations-table`, `events-list` |
| «¿Y si…?» (nivel 3) | `scenario-list`, `scenario-new`, `scenario-duplicate`, `scenario-name`, `scenario-compare`, `run-sweep`, `run-band`, `compare`, `compare-b`, `compare-chart` |
| Paneles | Marcador: `monitor`, `tile-result`, `tile-survival`, `funnel`, `heat-strip`, `drivers`, `frictions`, `neuralgic`. Dímelo claro: `verdict`, `verdict-headline`, `verdict-point`, `verdict-md`, `verdict-pdf`. Otros: `versions`, `save-version`, `version-row`, `restore-version`, `settings`, `command-palette`, `help-manuals`, `frame-popover`, `frame-grid` |
| Ayúdame a pensar | `explorer`, `provider-status`, `work-modes`, `mode-interview`, `mode-strategy`, `mode-aclarator`, `mode-copywriter`, `explorer-topic`, `explorer-strategy`, `explorer-start`, `strategy-text`, `strategy-ai`, `strategy-template`, `upload-plan`, `plan-docs`, `conversation`, `explorer-message`, `explorer-answer`, `explorer-send`, `cmd-<comando>` (`dont_know`, `examples`, `deepen`, `challenge`, `alternatives`, `simplify`, `perspective`, `compare`, `prepare`, `back`), `discoveries`, `create-flow`, `proposal`, `proposal-preview`, `proposal-node`, `insert-proposal`, `voice-start`, `voice-stop` |
| ACLARATOR | `aclarator-dump` (Cuéntamelo todo), `aclarator`, `clarify-progress`, `clarify-block`, `clarify-interno`, `clarify-externo`, `clarify-interno-state` y `clarify-externo-state` (texto «Claro» o el aviso), `clarify-conversation`, `clarify-message`, `clarify-answer`, `clarify-send`, `clarify-example`, `clarify-concretize`, `clarify-validate` (deshabilitado hasta que las dos capas estén claras), `clarify-back`; al terminar: `aclarator-done`, `clarify-map`, `clarify-to-copy` |
| COPYWRITER | `copy-audience`, `copy-message`, `copywriter`, `copy-use-brief`, `copy-ai`, `copy-template`, `copywriter-result`, `copy-youtube`, `copy-voice` (Copiar guion), `copy-reto`, `copy-reels`, `copy-stories`, `copy-map`, `copy-redo` |

**Secuencias fiables**

- **Crear un mapa entero:** `start-paste` (o, en el nivel 3, `io-menu` → menuitem «Pegar proyecto (JSON)»; en los niveles 1 y 2, `main-menu` → «Guardar o abrir archivos» → «Pegar proyecto (JSON)») → rellenar `paste-json` → `paste-import-run` → esperar a que `project-name` muestre el nombre.
- **Probar y leer:**
  1. Nivel 2: `simple-play` y leer `simple-result` («Han llegado a la meta»). Nivel 3: `sim-play` (o tecla Espacio).
  2. Nivel 3, `tab-results`: el texto incluye «Total N». Los números usan **coma decimal** (33,6).
  3. `open-monitor` para el Marcador.
  4. `open-verdict` → `verdict-md` para descargar «Dímelo claro».
- **Cambiar un valor en un «¿Y si…?»** (nivel 3):
  1. `scenario-switcher` → elegir el «¿Y si…?».
  2. Seleccionar la idea (clic en `[data-node-title="…"]`).
  3. Cambiar el campo en `inspector`.
  4. Aparece `override-mark`.
- **ACLARATOR completo:** `open-explorer` → `mode-aclarator` → rellenar `explorer-topic` y `aclarator-dump` → `explorer-start` → en cada bloque, rellenar `clarify-interno` y `clarify-externo` (o conversar con `clarify-answer` + `clarify-send`) hasta que `clarify-validate` se habilite → pulsarlo. Repetir 10 veces → `clarify-map`.
- **COPYWRITER:** `open-explorer` → `mode-copywriter` → `explorer-topic`, `copy-audience`, `copy-message` → `explorer-start` → `copy-ai` (con IA) o `copy-template` → leer `copy-youtube` → `copy-map`.
- **Atajos útiles:** Ctrl+K (buscador), 1–5 (vistas; 2–4 solo en el nivel 3), H (termómetro, nivel 3), Espacio (probar, nivel 2 o más), «.» y «,» (rondas), Ctrl+S (versión), Escape (limpiar). Los atajos no actúan con el foco en un campo de texto.
- Los datos viven en IndexedDB **del navegador que controlas**. Lo que crees ahí no aparece en otro navegador.

---

## 7. Configuración de la IA del servidor

| Variable | Uso |
|---|---|
| `EXPLORER_PROVIDER` | `gemini` · `openai` · `anthropic` · `demo`. Si se omite, se elige según la clave disponible. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google Gemini (sin modelo, se descubre el «flash» vigente). |
| `OPENAI_API_KEY`, `EXPLORER_BASE_URL`, `OPENAI_MODEL`, `EXPLORER_TRANSCRIBE_MODEL` | OpenAI o cualquier API compatible (Mistral, Groq, OpenRouter, DeepSeek, Ollama `http://localhost:11434/v1`, LM Studio). |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Anthropic Claude. |
| `EXPLORER_API_KEY`, `EXPLORER_MODEL` | Clave y modelo genéricos para el proveedor elegido. |
| `EXPLORER_RATE_LIMIT` | Peticiones por minuto y por IP (40). |
| `PORT` | Puerto de `npm start` (4321). |

**Dónde ponerlas**

- **Vercel:** Settings → Environment Variables → **Redeploy**.
- **En local:** archivo `.env` (copia de `.env.example`) y reiniciar.

Las claves solo viven en el servidor. **Nunca pidas la clave en el chat ni la escribas en el código.** Sin clave, «Ayúdame a pensar» funciona en «Modo demostración» y lo dice claramente.

**Puntos del servidor** (todos bajo `/api/`, con límite por IP): `explorer/status`, `explorer/turn` (entrevista), `explorer/proposal` (propuesta de mapa), `explorer/clarify` (ACLARATOR), `explorer/copy` (COPYWRITER), `explorer/plan-summary`, `explorer/polish` («Que la IA lo cuente mejor»), `explorer/transcribe` (audio) y `documents/extract`. Sin clave, los de IA responden 503 y la app usa su modo demostración. Las respuestas de la IA se validan con esquemas y, si no cumplen, se piden de nuevo con el error.

---

## 8. Ejemplos validados

### 8.1 Ejemplo básico: «Captar alumnos de guitarra»

Archivo: `docs/ejemplos/mapa-ejemplo-ia.json`. Contiene:

- Entrada con 200 flyers por semana.
- Dos filtros: 5 % responde y 60 % son válidos.
- Restrictor de 4 huecos con cola.
- Pérdida del 30 % en la conexión final.
- Una fricción («Desplazamientos», −3) y un mitigador condicionado a la semana 4.
- Una anotación de hipótesis.
- Escenario «Más huecos libres» (`capacity` 4 → 8).

Resultado comprobado en 12 semanas: **33,6** alumnos en la situación actual y **46,6** con más huecos.

```json
{
  "schemaVersion": 1,
  "project": {
    "id": "prj_guitarra_ejemplo",
    "name": "Captar alumnos de guitarra (ejemplo IA)",
    "description": "Mapa de ejemplo generado siguiendo el MANUAL-IA. Valores ficticios.",
    "createdAt": 1767225600000,
    "updatedAt": 1767225600000,
    "activeScenarioId": "scn_base",
    "settings": {
      "simulation": {
        "iterations": 12
      }
    }
  },
  "nodes": [
    {
      "id": "n_flyers",
      "projectId": "prj_guitarra_ejemplo",
      "type": "input",
      "title": "Flyers repartidos",
      "description": "Flyers por semana.",
      "position": {
        "x": 0,
        "y": 0
      },
      "visualStyle": {},
      "metadata": {
        "confidence": "estimate"
      },
      "dimensionValues": {
        "quantity": {
          "value": 200,
          "unit": "flyers"
        },
        "quality": {
          "value": 0.6
        }
      },
      "behaviorIds": [
        "b_gen"
      ],
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    },
    {
      "id": "n_responden",
      "projectId": "prj_guitarra_ejemplo",
      "type": "bubble",
      "title": "Personas que responden",
      "position": {
        "x": 300,
        "y": 0
      },
      "visualStyle": {},
      "metadata": {},
      "behaviorIds": [
        "b_resp"
      ],
      "createdAt": 1767225600001,
      "updatedAt": 1767225600001
    },
    {
      "id": "n_validos",
      "projectId": "prj_guitarra_ejemplo",
      "type": "bubble",
      "title": "Contactos válidos",
      "position": {
        "x": 600,
        "y": 0
      },
      "visualStyle": {},
      "metadata": {},
      "behaviorIds": [
        "b_valid"
      ],
      "createdAt": 1767225600002,
      "updatedAt": 1767225600002
    },
    {
      "id": "n_prueba",
      "projectId": "prj_guitarra_ejemplo",
      "type": "bubble",
      "title": "Clase de prueba",
      "position": {
        "x": 900,
        "y": 0
      },
      "visualStyle": {},
      "metadata": {},
      "behaviorIds": [
        "b_cap"
      ],
      "createdAt": 1767225600003,
      "updatedAt": 1767225600003
    },
    {
      "id": "n_alumnos",
      "projectId": "prj_guitarra_ejemplo",
      "type": "output",
      "title": "Alumnos que pagan",
      "position": {
        "x": 1200,
        "y": 0
      },
      "visualStyle": {},
      "metadata": {},
      "createdAt": 1767225600004,
      "updatedAt": 1767225600004
    },
    {
      "id": "n_desplaz",
      "projectId": "prj_guitarra_ejemplo",
      "type": "bubble",
      "title": "Desplazamientos",
      "description": "Fricción: tiempo y coste entre clientes.",
      "position": {
        "x": 900,
        "y": 240
      },
      "visualStyle": {
        "color": "rose"
      },
      "metadata": {
        "confidence": "hypothesis"
      },
      "weight": {
        "influence": {
          "mode": "weighted",
          "value": -3
        }
      },
      "createdAt": 1767225600005,
      "updatedAt": 1767225600005
    },
    {
      "id": "n_domicilio",
      "projectId": "prj_guitarra_ejemplo",
      "type": "bubble",
      "title": "Clases en mi domicilio",
      "description": "Medida que compensa los desplazamientos. Empieza en la semana 4.",
      "position": {
        "x": 600,
        "y": 240
      },
      "visualStyle": {
        "color": "emerald"
      },
      "metadata": {},
      "weight": {
        "influence": {
          "mode": "weighted",
          "value": 2
        }
      },
      "createdAt": 1767225600006,
      "updatedAt": 1767225600006,
      "activationConditionId": "c_desde4"
    }
  ],
  "behaviors": [
    {
      "id": "b_gen",
      "ownerId": "n_flyers",
      "behaviorType": "generator",
      "parameters": {
        "amount": 200,
        "mode": "continuous"
      }
    },
    {
      "id": "b_resp",
      "ownerId": "n_responden",
      "behaviorType": "filter",
      "label": "Tasa de respuesta",
      "parameters": {
        "mode": "ratio",
        "passRatio": 0.05
      }
    },
    {
      "id": "b_valid",
      "ownerId": "n_validos",
      "behaviorType": "filter",
      "label": "Zona y horario compatibles",
      "parameters": {
        "mode": "ratio",
        "passRatio": 0.6
      }
    },
    {
      "id": "b_cap",
      "ownerId": "n_prueba",
      "behaviorType": "restrictor",
      "label": "Huecos libres por semana",
      "parameters": {
        "capacity": 4,
        "excess": "queue"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_flyers",
      "targetNodeId": "n_responden",
      "type": "flow",
      "visualStyle": {},
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e2",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_responden",
      "targetNodeId": "n_validos",
      "type": "flow",
      "visualStyle": {},
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600001,
        "updatedAt": 1767225600001
      }
    },
    {
      "id": "e3",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_validos",
      "targetNodeId": "n_prueba",
      "type": "flow",
      "visualStyle": {},
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600002,
        "updatedAt": 1767225600002
      }
    },
    {
      "id": "e4",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_prueba",
      "targetNodeId": "n_alumnos",
      "type": "flow",
      "visualStyle": {},
      "behavior": {
        "loss": 0.3
      },
      "metadata": {
        "description": "30% no se apunta tras la prueba",
        "createdAt": 1767225600003,
        "updatedAt": 1767225600003
      }
    },
    {
      "id": "e5",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_desplaz",
      "targetNodeId": "n_prueba",
      "type": "causal",
      "visualStyle": {
        "sourceAnchor": "top",
        "targetAnchor": "bottom"
      },
      "behavior": {
        "influence": {
          "mode": "modulate",
          "targetDimension": "quantity",
          "sensitivity": 0.25
        }
      },
      "metadata": {
        "createdAt": 1767225600004,
        "updatedAt": 1767225600004
      }
    },
    {
      "id": "e6",
      "projectId": "prj_guitarra_ejemplo",
      "sourceNodeId": "n_domicilio",
      "targetNodeId": "n_desplaz",
      "type": "causal",
      "visualStyle": {},
      "behavior": {
        "influence": {
          "mode": "compensate",
          "compensationType": "partial",
          "compensationUnit": "points",
          "amount": 2
        }
      },
      "metadata": {
        "createdAt": 1767225600005,
        "updatedAt": 1767225600005
      }
    }
  ],
  "conditions": [
    {
      "id": "c_desde4",
      "ownerId": "n_domicilio",
      "ownerType": "node",
      "label": "Desde la semana 4",
      "conditionType": "iteration",
      "operator": ">=",
      "operands": [
        {
          "kind": "const",
          "value": 4
        }
      ],
      "expr": {
        "id": "cx_desde4",
        "conditionType": "iteration",
        "operator": ">=",
        "operands": [
          {
            "kind": "const",
            "value": 4
          }
        ],
        "children": []
      },
      "result": "activate",
      "activationRules": {
        "mode": "always",
        "sustain": 1
      }
    }
  ],
  "annotations": [
    {
      "id": "a1",
      "ownerType": "node",
      "ownerId": "n_responden",
      "kind": "hypothesis",
      "text": "Supongo un 5% de respuesta; hay que medirlo.",
      "createdAt": 1767225600000
    }
  ],
  "layers": [
    {
      "id": "lyr_general",
      "name": "General",
      "color": "#64748b",
      "order": 0
    }
  ],
  "dimensions": [],
  "scenarios": [
    {
      "id": "scn_base",
      "projectId": "prj_guitarra_ejemplo",
      "name": "Situación actual",
      "isBase": true,
      "color": "#6366f1",
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    },
    {
      "id": "scn_huecos",
      "projectId": "prj_guitarra_ejemplo",
      "name": "Más huecos libres",
      "description": "Abro 8 huecos de prueba por semana.",
      "color": "#10b981",
      "overrides": [
        {
          "id": "ov1",
          "targetType": "behavior",
          "targetId": "b_cap",
          "path": "parameters.capacity",
          "value": 8
        }
      ],
      "createdAt": 1767225600001,
      "updatedAt": 1767225600001
    }
  ],
  "circuits": []
}
```

### 8.2 Ejemplo avanzado: «Tienda online»

Archivo: `docs/ejemplos/mapa-ejemplo-ia-avanzado.json`. Muestra:

- Rechazo de filtro hacia una **burbuja sumidero**.
- Restrictor con **desborde** hacia un acumulador y liberador.
- Pérdida en conexión.
- **Circuito** de recomendaciones con réplica, retardo y saturación.
- **Dimensión propia** «Coste» (extensiva).
- **Cuadrícula** temporal con fecha límite y eje de apoyo/fricción, colocada con las fórmulas de 3.11.
- Rangos de incertidumbre.
- Tres escenarios (base, «Más capacidad de pago» y «Semana floja» desfavorable).

Resultado comprobado en 10 semanas: **492,0** pedidos en la situación actual, **661,4** con más capacidad de pago y **237,5** en la semana floja. La conservación es exacta en todas las dimensiones.

```json
{
  "schemaVersion": 1,
  "project": {
    "id": "prj_tienda_ejemplo",
    "name": "Tienda online (ejemplo IA avanzado)",
    "description": "Ejemplo avanzado del MANUAL-IA: rechazo, desborde, circuito de recomendaciones, dimensión propia y cuadrícula temporal. Valores ficticios.",
    "createdAt": 1767225600000,
    "updatedAt": 1767225600000,
    "activeScenarioId": "scn_base",
    "settings": {
      "simulation": {
        "iterations": 10
      },
      "depth": "expert",
      "frame": {
        "mode": "grid",
        "cellWidth": 260,
        "cellHeight": 140,
        "origin": {
          "x": 0,
          "y": 0
        },
        "time": {
          "enabled": true,
          "unitLabel": "Semana",
          "deadline": 8,
          "latePolicy": "penalize",
          "lateKeep": 0.5,
          "inversionPenalty": 0.15
        },
        "support": {
          "enabled": true,
          "effectPerRow": 0.08,
          "influencePerRow": 1
        }
      }
    }
  },
  "nodes": [
    {
      "id": "n_visitas",
      "projectId": "prj_tienda_ejemplo",
      "type": "input",
      "title": "Visitas a la web",
      "position": {
        "x": 35,
        "y": -32
      },
      "visualStyle": {},
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "behaviorIds": [
        "b_gen"
      ],
      "dimensionValues": {
        "quantity": {
          "value": 1000,
          "unit": "visitas",
          "confidence": "observation",
          "source": "Analítica web",
          "range": {
            "low": 600,
            "high": 1200
          }
        },
        "quality": {
          "value": 0.5,
          "range": {
            "low": 0.4,
            "high": 0.6
          }
        },
        "coste": {
          "value": 300,
          "unit": "€"
        }
      }
    },
    {
      "id": "n_carrito",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Añaden al carrito",
      "position": {
        "x": 295,
        "y": -32
      },
      "visualStyle": {
        "icon": "ShoppingCart"
      },
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "behaviorIds": [
        "b_carrito"
      ]
    },
    {
      "id": "n_pago",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Pasarela de pago",
      "position": {
        "x": 555,
        "y": -32
      },
      "visualStyle": {
        "icon": "Wallet"
      },
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "behaviorIds": [
        "b_pago"
      ]
    },
    {
      "id": "n_pedidos",
      "projectId": "prj_tienda_ejemplo",
      "type": "output",
      "title": "Pedidos completados",
      "position": {
        "x": 815,
        "y": -32
      },
      "visualStyle": {
        "color": "emerald"
      },
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    },
    {
      "id": "n_abandono",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Carritos abandonados",
      "position": {
        "x": 555,
        "y": 108
      },
      "visualStyle": {
        "color": "rose"
      },
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "description": "Sumidero: retiene lo rechazado sin contarlo como resultado (no es una Salida)."
    },
    {
      "id": "n_cola",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Pedidos en espera",
      "position": {
        "x": 815,
        "y": 108
      },
      "visualStyle": {},
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "behaviorIds": [
        "b_acum",
        "b_lib"
      ]
    },
    {
      "id": "n_resenas",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Reseñas positivas",
      "position": {
        "x": 1075,
        "y": -32
      },
      "visualStyle": {},
      "metadata": {
        "confidence": "hypothesis"
      },
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    },
    {
      "id": "n_envio",
      "projectId": "prj_tienda_ejemplo",
      "type": "bubble",
      "title": "Envío gratis",
      "position": {
        "x": 295,
        "y": -172
      },
      "visualStyle": {
        "color": "emerald"
      },
      "metadata": {},
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "weight": {
        "influence": {
          "mode": "weighted",
          "value": 2
        }
      }
    }
  ],
  "behaviors": [
    {
      "id": "b_gen",
      "ownerId": "n_visitas",
      "behaviorType": "generator",
      "parameters": {
        "amount": 1000,
        "mode": "continuous",
        "startIteration": 1,
        "endIteration": 0,
        "growth": 0
      }
    },
    {
      "id": "b_carrito",
      "ownerId": "n_carrito",
      "behaviorType": "filter",
      "label": "Tasa de carrito",
      "parameters": {
        "mode": "ratio",
        "passRatio": 0.08
      },
      "ranges": {
        "passRatio": {
          "favorable": 0.1,
          "unfavorable": 0.06
        }
      }
    },
    {
      "id": "b_pago",
      "ownerId": "n_pago",
      "behaviorType": "restrictor",
      "label": "Pagos por semana",
      "parameters": {
        "capacity": 60,
        "excess": "overflow"
      }
    },
    {
      "id": "b_acum",
      "ownerId": "n_cola",
      "behaviorType": "accumulator",
      "parameters": {
        "maxStock": 0,
        "initialStock": 0
      }
    },
    {
      "id": "b_lib",
      "ownerId": "n_cola",
      "behaviorType": "releaser",
      "parameters": {
        "mode": "ratio",
        "ratio": 0.5,
        "amount": 0
      }
    }
  ],
  "edges": [
    {
      "id": "e_vis_car",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_visitas",
      "targetNodeId": "n_carrito",
      "type": "flow",
      "visualStyle": {},
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_car_pago",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_carrito",
      "targetNodeId": "n_pago",
      "type": "flow",
      "visualStyle": {},
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_car_aband",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_carrito",
      "targetNodeId": "n_abandono",
      "type": "flow",
      "visualStyle": {
        "label": "no compran",
        "sourceAnchor": "bottom",
        "targetAnchor": "top"
      },
      "behavior": {
        "role": "reject"
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_pago_ped",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_pago",
      "targetNodeId": "n_pedidos",
      "type": "flow",
      "visualStyle": {},
      "behavior": {
        "loss": 0.05
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_pago_cola",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_pago",
      "targetNodeId": "n_cola",
      "type": "flow",
      "visualStyle": {
        "label": "desborde",
        "sourceAnchor": "bottom",
        "targetAnchor": "top"
      },
      "behavior": {
        "role": "overflow"
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_cola_ped",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_cola",
      "targetNodeId": "n_pedidos",
      "type": "flow",
      "visualStyle": {
        "sourceAnchor": "top",
        "targetAnchor": "bottom"
      },
      "behavior": {},
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_ped_res",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_pedidos",
      "targetNodeId": "n_resenas",
      "type": "flow",
      "visualStyle": {
        "label": "opinan",
        "sourceAnchor": "right",
        "targetAnchor": "left"
      },
      "behavior": {
        "transport": "replicate",
        "multiplier": 0.3
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    },
    {
      "id": "e_res_vis",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_resenas",
      "targetNodeId": "n_visitas",
      "type": "flow",
      "visualStyle": {
        "label": "recomendación",
        "sourceAnchor": "top",
        "targetAnchor": "top"
      },
      "behavior": {
        "transport": "replicate",
        "multiplier": 2,
        "polarity": "positive",
        "isFeedback": true
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      },
      "delay": 1
    },
    {
      "id": "e_envio_car",
      "projectId": "prj_tienda_ejemplo",
      "sourceNodeId": "n_envio",
      "targetNodeId": "n_carrito",
      "type": "causal",
      "visualStyle": {
        "sourceAnchor": "bottom",
        "targetAnchor": "top"
      },
      "behavior": {
        "influence": {
          "mode": "modulate",
          "targetDimension": "quantity",
          "sensitivity": 0.25
        }
      },
      "metadata": {
        "createdAt": 1767225600000,
        "updatedAt": 1767225600000
      }
    }
  ],
  "conditions": [],
  "annotations": [
    {
      "id": "a_res",
      "ownerType": "node",
      "ownerId": "n_resenas",
      "kind": "question",
      "text": "¿Cuántas reseñas trae cada pedido? Hay que medirlo.",
      "createdAt": 1767225600000
    }
  ],
  "layers": [
    {
      "id": "lyr_general",
      "name": "General",
      "color": "#64748b",
      "order": 0
    }
  ],
  "dimensions": [
    {
      "id": "quantity",
      "key": "quantity",
      "name": "Cantidad",
      "dataType": "numeric",
      "range": {
        "min": 0,
        "max": 1000000
      },
      "aggregation": "extensive",
      "color": "#3b82f6",
      "builtin": true
    },
    {
      "id": "quality",
      "key": "quality",
      "name": "Calidad",
      "dataType": "numeric",
      "range": {
        "min": 0,
        "max": 1
      },
      "aggregation": "intensive",
      "color": "#10b981",
      "builtin": true,
      "defaultValue": 0.5
    },
    {
      "id": "coste",
      "key": "coste",
      "name": "Coste",
      "description": "Coste de captación",
      "dataType": "numeric",
      "unit": "€",
      "range": {
        "min": 0,
        "max": 100000
      },
      "aggregation": "extensive",
      "color": "#f59e0b"
    }
  ],
  "scenarios": [
    {
      "id": "scn_base",
      "projectId": "prj_tienda_ejemplo",
      "name": "Situación actual",
      "isBase": true,
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    },
    {
      "id": "scn_pagos",
      "projectId": "prj_tienda_ejemplo",
      "name": "Más capacidad de pago",
      "color": "#10b981",
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000,
      "overrides": [
        {
          "id": "ov_cap",
          "targetType": "behavior",
          "targetId": "b_pago",
          "path": "parameters.capacity",
          "value": 120
        },
        {
          "id": "ov_car",
          "targetType": "behavior",
          "targetId": "b_carrito",
          "path": "parameters.passRatio",
          "value": 0.1
        }
      ]
    },
    {
      "id": "scn_peor",
      "projectId": "prj_tienda_ejemplo",
      "name": "Semana floja",
      "color": "#ef4444",
      "uncertainty": "unfavorable",
      "createdAt": 1767225600000,
      "updatedAt": 1767225600000
    }
  ],
  "circuits": [
    {
      "id": "cir_reco",
      "name": "Recomendaciones",
      "nodeIds": [
        "n_visitas",
        "n_carrito",
        "n_pago",
        "n_pedidos",
        "n_resenas"
      ],
      "edgeIds": [
        "e_res_vis"
      ],
      "returnEdgeId": "e_res_vis",
      "loopType": "auto",
      "returnPercent": 100,
      "intensity": 1,
      "saturation": 400,
      "description": "Los clientes contentos traen visitas nuevas."
    }
  ]
}
```
