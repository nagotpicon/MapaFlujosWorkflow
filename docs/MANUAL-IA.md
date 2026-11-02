# Mapa de Flujos — Manual para IA (basado en prompts)

Este manual sirve para que **cualquier IA** (Claude, ChatGPT, Gemini, una extensión de navegador o un agente) trabaje con la aplicación Mapa de Flujos sin equivocarse.

Contiene:

1. **Cómo usarlo**: instrucciones para la persona y para la IA.
2. **Prompt maestro**: el contexto que la IA debe cargar siempre.
3. **Biblioteca de prompts** (P1–P16): listos para copiar, con variables `{{ASÍ}}`.
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
4. Si la IA te devuelve un JSON, en la aplicación pulsa **Pegar JSON** (pantalla de inicio) o **Importar/exportar → Pegar proyecto (JSON)**. Pega todo lo que respondió la IA, aunque traiga texto o marcas ```json alrededor, y pulsa **Importar**.
5. Si sale «No se pudo importar…», usa el prompt **P4** pegando el aviso.

Para que la IA tenga la especificación completa, adjúntale también este archivo entero, pégalo o dale la URL https://mapa-flujos-workflow.vercel.app/MANUAL-IA.md si puede leer webs. El prompt maestro le indica que lo use.

### 0.2 Si eres la IA

- Lee este documento completo antes de responder. Es la fuente de verdad sobre la aplicación. Si algo no está aquí, **dilo**: no lo inventes.
- Cuando generes un proyecto, cumple **al pie de la letra** la sección 3 y repasa la lista de comprobación 3.14 antes de entregar.
- Cuando expliques pasos en la interfaz, usa **exactamente los nombres de botones y menús** de este manual, entre comillas o en negrita.
- Nunca afirmes resultados numéricos de simulación que no hayas calculado con la propia aplicación o que la persona no te haya pegado. Si estimas, dilo: «estimación aproximada; pulsa ▶ para el valor exacto».

---

## 1. Prompt maestro

Copia este bloque completo como primer mensaje o como instrucciones del sistema:

````text
Eres el copiloto experto de «Mapa de Flujos», una aplicación web (https://mapa-flujos-workflow.vercel.app) que combina un editor de mapas mentales con un motor que simula flujos por iteraciones. Tu trabajo: ayudar a la persona a pensar su idea, construir su mapa, simularlo e interpretar los resultados. Hablas en español, claro y directo.

CONOCIMIENTO DE LA APLICACIÓN (resumen; la especificación completa está en el MANUAL-IA que te adjunto o pego):
- Elementos: Burbuja (idea o paso; puede tener comportamientos), Entrada (genera flujo cada iteración), Salida (recibe el flujo; TODO lo que llega a cualquier Salida cuenta como «resultado»), Nota, Etiqueta (texto libre), Grupo, Contenedor.
- Conexiones: Flujo (transporta), Causal (modula: refuerza o frena una dimensión del destino; o compensa una dificultad), Informativa y Conceptual (solo relacionan).
- 14 comportamientos: Generador, Consumidor, Filtro, Transformador, Multiplicador, Reductor, Acelerador, Restrictor, Desviador, Acumulador, Liberador, Compensador, Detector y Controlador.
- Dimensiones del flujo: Cantidad y Carga (se suman); Calidad, Velocidad y Potencial (se promedian). Se pueden crear dimensiones propias.
- Influencia en escala ponderada de −5 a +5. Mitigadores o compensaciones reducen la influencia negativa y las pérdidas de un elemento problemático.
- Circuitos (ciclos): lo que vuelve por la conexión de retorno se usa en la iteración siguiente; nunca hay bucles infinitos. Polaridad + alimenta y − inhibe.
- Escenarios: guardan solo cambios (ruta → valor) sobre el modelo base. También hay variante favorable, central o desfavorable, comparación y sensibilidad.
- Marco espacial opcional: cuadrícula donde la columna es el tiempo (retardos, fecha límite, «prisas») y la fila es apoyo (arriba) o fricción (abajo).
- Termómetro de calor (frío, ritmo perfecto, caliente, recalentado), Monitor (KPIs, embudo, impulsores, frenos, puntos neurálgicos), «Dímelo claro» (veredicto coloquial calculado sin IA) y Explorador (entrevista o creador de estrategias; con IA del servidor o en modo demostración).
- Todo se guarda en el navegador de la persona. Exportar o importar JSON, versiones, copia de seguridad. Importar por archivo o PEGANDO el JSON: «Pegar JSON» en la pantalla de inicio o «Importar/exportar → Pegar proyecto (JSON)».

Especificación completa (léela si puedes abrir webs): https://mapa-flujos-workflow.vercel.app/MANUAL-IA.md

REGLAS:
1. No inventes botones, menús ni funciones. Usa los nombres exactos del manual. Si no sabes algo, dilo.
2. No inventes resultados de simulación. Los números exactos solo salen al pulsar ▶ en la aplicación. Si estimas a mano, márcalo como estimación.
3. Separa siempre DATO (lo que la persona sabe o ha medido) de SUPUESTO (lo que se cree). En los JSON, marca los supuestos con metadata.confidence = "hypothesis" o con una anotación de tipo "hypothesis".
4. Cuando generes un proyecto JSON:
   a) sigue la sección 3 del MANUAL-IA al pie de la letra;
   b) devuelve UN ÚNICO bloque ```json con el proyecto completo y válido (sin comentarios, sin «…», sin campos inventados);
   c) después del bloque, explica en 5–10 líneas qué modela, qué supuestos has hecho y qué debería comprobar la persona;
   d) indica cómo importarlo: «Pegar JSON» → pegar → «Importar» → pulsar ▶.
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
Dame los pasos numerados, con los nombres exactos de botones, menús y teclas (Windows: Ctrl; Mac: ⌘). Si hace falta subir la «Profundidad» (Básico / Avanzado / Experto), dímelo primero. Termina con cómo comprobar que ha funcionado.
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
- Unidad de tiempo de cada iteración: {{semana / mes / día}}
- Número de iteraciones a simular: {{p.ej. 12}}

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

**Debe devolver:** un JSON que cumpla la sección 3 y su explicación. Para comprobarlo: **Pegar JSON → Importar → ▶**.

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

**Alternativa sin IA externa:** dentro de la aplicación, **Explorador → Nueva exploración → Creador de estrategias**: subir el plan y luego **Construir contexto con IA** o **Plantilla estándar (sin IA)**.

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

**Antes:** en la aplicación, **Importar/exportar → Proyecto completo (.json)**. Abre el archivo descargado con un editor de texto y copia su contenido.

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

**Después:** usa **Comparar escenarios** en la aplicación para ver los resultados reales.

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

**Antes:** copia lo que veas en la aplicación: el texto de **Dímelo claro** (botón **Copiar**), los avisos de la pestaña **Diagnóstico** o los números del **Monitor**.

````text
Estos son los resultados de mi mapa en Mapa de Flujos:
"""
{{PEGA AQUÍ «Dímelo claro», Diagnóstico o Monitor}}
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

### P12 · Preparar una sesión del Explorador

**Cuándo:** vas a usar el Explorador de la aplicación y quieres llegar preparado.

````text
Voy a usar el «Explorador de flujos» de Mapa de Flujos sobre: {{TEMA}}. Prepárame:
1) Qué escribir en «¿Qué quieres analizar?», «¿Qué quieres conseguir?», «Idea o estrategia inicial» y «Contexto adicional» (frases cortas).
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
2) Para crear un mapa completo, genera el JSON (sección 3), pulsa data-testid="start-paste" (o io-menu → «Pegar proyecto (JSON)»), escribe el JSON en data-testid="paste-json" y pulsa data-testid="paste-import-run".
3) Simula con data-testid="sim-play" y lee los resultados en la pestaña data-testid="tab-results" y en Monitor (data-testid="open-monitor").
4) Antes de acciones destructivas (borrar proyectos, restaurar versiones), pide confirmación.
5) Al terminar, resume qué hiciste y qué viste, sin inventar cifras.
````

### P14 · Configurar la IA del servidor (proveedor)

````text
Quiero activar la IA real del Explorador de Mapa de Flujos con {{PROVEEDOR: Gemini / OpenAI / Anthropic / Ollama / otro compatible con OpenAI}} en {{Vercel / mi ordenador}}.
Dime exactamente qué variables de entorno poner (sección 7 del MANUAL-IA), dónde (Vercel: Settings → Environment Variables y Redeploy; local: archivo .env y reiniciar) y cómo comprobar que funciona (el Explorador deja de decir «Modo demostración» y muestra «Modelo: …»). No me pidas la clave en el chat.
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

El Monitor cuenta estas fricciones y sus decisiones.

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
| `depth` | `basic` · `advanced` · `expert`. Usa `expert` si el mapa usa rangos, fórmulas o puertos, para que se vean en el inspector. |
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

Úsalos tal cual al dar instrucciones.

- **Pantalla de inicio:** «Empezar en blanco», «Ver la demostración», «Explorar una idea», «Proyectos guardados», «Pegar JSON», «Importar».
- **Barra superior:**
  - Logotipo → «Proyectos».
  - Nombre del proyecto (clic para renombrar) e indicador de guardado.
  - Selector de escenario: «Nuevo escenario», «Duplicar «…»», «Restaurar valores iniciales», «Comparar escenarios…».
  - Vista: «Mental», «Flujo», «Energía», «Sistema», «Simulación».
  - «Explorador», «Monitor», «Dímelo claro», «Manual».
  - Cuadrícula «Marco espacial» y «Termómetro de calor».
  - «Deshacer», «Rehacer», «Buscar y comandos», «Historial de versiones».
  - «Importar / exportar»:
    - «Proyecto completo (.json)», «Imagen PNG», «Imagen SVG», «Documento PDF»;
    - «Importar proyecto (.json)», «Pegar proyecto (JSON)»;
    - «Copia de seguridad completa», «Restaurar copia de seguridad».
  - «Tema» (Claro / Oscuro / Sistema), «Mostrar u ocultar panel de simulación», «Mostrar u ocultar inspector».
  - «Menú»: «Proyectos…», «Nuevo proyecto», «Duplicar proyecto», «Abrir proyecto de demostración», «Ajustes del proyecto», «Ayuda y atajos», «Manual de usuario», «Manual para IA (prompts)», «Guardar versión ahora».
- **Barra de herramientas:** «Seleccionar» (V), «Crear burbuja» (B), «Crear conexión» (C; tipos Flujo / Causal / Info / Idea), «Agrupar selección» (Ctrl+G), «Crear entrada» (I), «Crear salida» (O), «Añadir nota» (N), «Añadir comentario», «Añadir etiqueta a la selección», «Texto libre», «Crear contenedor», «Crear circuito», «Administrar capas».
- **Inspector de nodo** (secciones): «Peso e influencia», «Comportamientos» («Añadir comportamiento»), «Condiciones de activación», «Mitigadores y compensaciones» («Vincular», «Nueva medida compensatoria»), «Dimensiones del flujo» («Definir»), «Bifurcación y convergencia», «Relaciones», «Estilo», «Comentarios y notas», «Documentos adjuntos», «Avanzado».
- **Inspector de conexión:** «Tipo de conexión», «Dirección», «Comportamiento del flujo», «Influencia», «Condiciones de paso», «Circuito» («Configurar como circuito»), «Apariencia», «Comentarios».
- **Profundidad** (inspector sin selección → Ajustes): «Básico», «Avanzado», «Experto».
- **Panel inferior:**
  - Pestañas «Simulación», «Resultados», «Diagnóstico», «Escenarios», «Iteraciones» y «Eventos».
  - Controles: ▶ «Reproducir», «Detener», «Reiniciar», «Iteración anterior / siguiente», «Paso a paso», «Guardar esta ejecución», «Velocidad visual», «Iteraciones», «En vivo», «Calcular».
  - En Escenarios: «Sensibilidad … Barrer» e «Incertidumbre … Calcular banda».
- **Explorador:**
  - Inicio: «Nueva exploración», modo «Entrevista guiada» o «Creador de estrategias (notas, audio, documentos)», «Destino», «Añadir plan (Word, Excel, PDF, texto)», «Iniciar la exploración» / «Continuar».
  - Comandos rápidos: «No lo sé», «Dame ejemplos», «Profundiza», «Cuestiona mi planteamiento», «Busca alternativas», «Simplifica», «Cambia de perspectiva», «Compara opciones», «Prepara el flujo», «Volver a una pregunta anterior».
  - Propuesta: «Crear el flujo inicial», «Construir contexto con IA», «Plantilla estándar (sin IA)», «Insertar en Mapa de Flujos», «Seguir preguntando».

---

## 5. Reglas del motor (para razonar sobre resultados)

### 5.1 Principios

- **Determinista:** misma configuración, mismo resultado. La velocidad de animación no influye.
- **Iteraciones discretas.** Los ciclos se rompen con una dependencia de retorno: lo que vuelve se usa en la iteración siguiente.
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
| > 0,75 | **Recalentado** |
| > 0,33 | **Caliente** |
| < −0,33 | **Frío** |
| resto | **Ritmo perfecto** |
| sin actividad | «Sin actividad» |

Causas: presión sobre la capacidad, infrautilización, caudal bajo, cola creciendo, saturación, pérdidas mayores del 5 %, bloqueo, llegada fuera de plazo y «prisas».

### 5.6 Monitor y «Dímelo claro»

- El **impacto** de cada elemento se calcula simulando el sistema **sin** él y comparando.
- «Dímelo claro» se genera solo con datos calculados (sin IA). «Pulir redacción con IA» reescribe el texto sin añadir cifras.

---

## 6. Mapa de la interfaz para agentes con control del navegador

Selectores estables: `[data-testid="…"]`.

| Zona | Identificadores |
|---|---|
| Inicio | `start-screen`, `new-project`, `open-demo`, `start-explorer`, `start-paste`, `project-list`, `confirm-delete`, `start-manuals` |
| Pegar JSON | `paste-import` (diálogo), `paste-json` (cuadro de texto), `paste-import-run` (botón Importar) |
| Aplicación | `app`, `topbar`, `toolbar`, `canvas`, `inspector`, `bottom-panel`, `legend`, `toast` |
| Barra superior | `project-name`, `save-state` (atributo `data-state`: idle/pending/saving/saved/error), `scenario-switcher`, `open-explorer`, `open-monitor`, `open-verdict`, `open-manual`, `frame-toggle`, `heat-toggle`, `undo`, `redo`, `open-palette`, `open-versions`, `io-menu`, `theme-menu`, `toggle-bottom`, `toggle-inspector`, `main-menu` |
| Herramientas | `tool-select`, `tool-bubble`, `tool-connect`, `tool-group`, `tool-input`, `tool-output`, `tool-note`, `tool-comment`, `tool-tag`, `tool-label`, `tool-container`, `tool-circuit`, `tool-layers` |
| Lienzo | nodos `.react-flow__node` con `[data-node-title="Título"]`; `map-node`, `group-node`, `group-toggle`; asas de conexión `.react-flow__handle-top/right/bottom/left`; `context-menu` |
| Inspector | `node-inspector`, `edge-inspector`, `multi-inspector`, `project-panel`, `inspector-title`, `node-summary`, `add-behavior`, `behavior-option-<tipo>`, `behavior-card`, `add-condition`, `condition-block`, `add-clause`, `add-mitigator`, `mitigator-row`, `dim-<dimId>`, `circuit-block`, `override-mark`, `add-annotation`, `discovery-block`, `friction-resolution`, `trace-forward`, `trace-backward` |
| Simulación | `tab-simulation`, `tab-results`, `tab-diagnostics`, `tab-scenarios`, `tab-history`, `tab-events`, `sim-play`, `sim-stop`, `sim-reset`, `sim-prev`, `sim-next`, `sim-step`, `sim-save`, `sim-scrubber`, `sim-iterations`, `iteration-badge`, `step-info`, `ledger`, `diagnostic`, `iterations-table`, `events-list` |
| Escenarios | `scenario-list`, `scenario-new`, `scenario-duplicate`, `scenario-name`, `scenario-compare`, `run-sweep`, `run-band`, `compare`, `compare-b` |
| Paneles | `monitor`, `funnel`, `neuralgic`, `heat-strip`, `verdict`, `verdict-headline`, `verdict-point`, `verdict-md`, `verdict-pdf`, `versions`, `save-version`, `version-row`, `restore-version`, `settings`, `command-palette`, `help-manuals` |
| Explorador | `explorer`, `provider-status`, `explorer-topic`, `explorer-strategy`, `explorer-start`, `strategy-text`, `strategy-ai`, `strategy-template`, `upload-plan`, `plan-docs`, `conversation`, `explorer-message`, `explorer-answer`, `explorer-send`, `cmd-<comando>` (`dont_know`, `examples`, `deepen`, `challenge`, `alternatives`, `simplify`, `perspective`, `compare`, `prepare`, `back`), `discoveries`, `create-flow`, `proposal`, `proposal-preview`, `proposal-node`, `insert-proposal`, `voice-start`, `voice-stop` |

**Secuencias fiables**

- **Crear un mapa entero:** `start-paste` (o `io-menu` → menuitem «Pegar proyecto (JSON)») → rellenar `paste-json` → `paste-import-run` → esperar a que `project-name` muestre el nombre.
- **Simular y leer:**
  1. `sim-play` (o tecla Espacio).
  2. `tab-results`: el texto incluye «Total N». Los números usan **coma decimal** (33,6).
  3. `open-monitor` para KPIs.
  4. `open-verdict` → `verdict-md` para descargar el veredicto.
- **Cambiar un valor en un escenario:**
  1. `scenario-switcher` → elegir el escenario.
  2. Seleccionar el nodo (clic en `[data-node-title="…"]`).
  3. Editar el campo en `inspector`.
  4. Aparece `override-mark`.
- **Atajos útiles:** Ctrl+K (buscador), 1–5 (vistas), H (calor), Espacio (play), «.» y «,» (iteraciones), Ctrl+S (versión), Escape (limpiar). Los atajos no actúan con el foco en un campo de texto.
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

Las claves solo viven en el servidor. **Nunca pidas la clave en el chat ni la escribas en el código.** Sin clave, el Explorador funciona en «Modo demostración» y lo dice claramente.

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
