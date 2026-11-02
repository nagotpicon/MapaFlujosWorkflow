# Mapa de Flujos

> **Manuales:** [Manual de usuario](docs/MANUAL-USUARIO.md) (guía completa para personas) · [Manual para IA](docs/MANUAL-IA.md) (prompts, especificación JSON importable y selectores para agentes). Ejemplos validados en `docs/ejemplos/`.

**Mapa mental + motor de comportamiento + circuitos de retroalimentación.**
Una herramienta de pensamiento visual en la que cada burbuja puede ser una idea o
una fuerza, y cada conexión una relación o un canal por el que circula un flujo
multidimensional que se filtra, se transforma, se pierde, se compensa, se acumula
y vuelve a su origen.

Funciona en el navegador, **local‑first** (IndexedDB) y sin cuenta.

---

## 1. Qué se ha construido

| Área | Qué ofrece |
|---|---|
| **Editor de mapas** | Lienzo infinito con zoom, minimapa y selección múltiple. Burbujas con formas, colores, iconos, imágenes y adjuntos. Conexiones curvas, rectas u ortogonales, con etiquetas, anclajes, bidireccionales y autolazos. Grupos, subgrupos, contenedores y plegado. Ramas plegables y capas con pertenencia múltiple. Clonar con la misma identidad, duplicar, copiar, cortar y pegar. Alinear y distribución automática. Búsqueda global, filtros por etiqueta, menú contextual, paleta de comandos y atajos configurables. Deshacer y rehacer. |
| **Propiedades** | Importancia, influencia e impacto en escala cualitativa, ponderada (−5…+5) o numérica. 14 comportamientos combinables con reglas de combinación. Condiciones visuales (Y, O, NO, comparación, rango, umbral, iteración y dependencia de otro elemento) con SI / SI NO y reglas de activación. Mitigadores parciales, totales, condicionados o temporales. Efectos secundarios declarados. |
| **Motor de flujos** | Dimensiones independientes: cantidad, calidad, velocidad, potencial, carga y las personalizadas. Filtrar, dividir, fusionar, multiplicar, reducir, transformar, convertir, acumular, liberar, limitar, condicionar, compensar, retardar, desviar, consumir y generar. Libro de conservación sin unidades inexplicadas y rastreo del origen de cada unidad. Ver [`docs/MOTOR.md`](docs/MOTOR.md). |
| **Bifurcaciones y convergencias** | Reparto fijo, proporcional, condicionado, prioritario, competitivo y dinámico. Convergencia por suma, ponderada, prioridad, máximo, mínimo, deduplicación (solapamiento) o fórmula segura. Rutas de rechazo, desborde y desvío. |
| **Circuitos** | Ciclos reales procesados por iteraciones, sin bucles infinitos. Detección de bucles reforzadores, equilibradores y mixtos. Por circuito: porcentaje de retorno, intensidad, retardo, frecuencia, condición, persistencia, saturación y límites. Réplicas que alimentan (+) o inhiben (−). |
| **Simulación** | Modos continuo, paso a paso (elemento a elemento), iterativo y experimentación en vivo. Controles: reproducir, pausa, parar, reiniciar, iteración siguiente y anterior. El ritmo visual no altera el cálculo. Se ejecuta en un Web Worker y solo se invalida cuando cambian datos relevantes. |
| **Escenarios** | Escenarios independientes que guardan solo sus cambios. Crear, duplicar, renombrar, restaurar, comparar (diferencias, mejoras, empeoramientos, cuellos nuevos, circuitos), banda de incertidumbre favorable, central y desfavorable, y barrido de sensibilidad. |
| **Diagnóstico** | Cuellos de botella, pérdidas, influencia (sensibilidad ±20 %), rutas bloqueadas, saturaciones, bucles, compensaciones, efectos cruzados, oportunidades de recuperación, dependencias críticas y cambios de comportamiento. Cada uno indica regla, datos, supuestos y nivel de confianza. |
| **Vistas** | Mental, Flujo, Energía, Sistema y Simulación sobre el mismo modelo, con leyenda configurable. Codificación visual distinta por dimensión: grosor = cantidad, partículas = velocidad, opacidad = calidad, halo = potencial. Los estados se distinguen por iconos y no solo por color. |
| **Monitor** | Indicadores clave, embudo de la ruta principal, impulsores y fricciones con su impacto calculado por contrafactuales reales, puntos neurálgicos, termómetro temporal y estado de resolución de fricciones. |
| **Termómetro de calor** | Temperatura por elemento, iteración y zona del marco: frío, ritmo perfecto, caliente o recalentado, cada una con sus causas. |
| **Marco espacial** (opcional) | Tapiz libre o cuadrícula que computa: columnas = tiempo (retardos, prisas, fecha límite) y filas = apoyo o fricción. Todo se activa con un botón y se pondera a voluntad. |
| **«Dímelo claro»** | Veredicto coloquial y franco calculado a partir del mapa actual, sin inventar cifras. Se exporta en .md, .txt y PDF con la imagen del mapa. Opcionalmente se puede pulir la redacción con IA. |
| **Explorador de flujos** | Entrevista adaptativa (una pregunta operativa cada vez), comandos rápidos, memoria de descubrimientos y separación de fricciones propias, externas y del sistema. **Plan maestro** (.docx, .xlsx, .pdf, .txt o .md) como guía. **Creador de estrategias** a partir de texto, notas de voz sin límite de tiempo y documentos. Vista previa revisable antes de insertar elementos nativos, con inserción deshacible. |
| **Persistencia** | IndexedDB (Dexie) con autoguardado, recuperación al recargar, versiones automáticas y manuales, ejecuciones guardadas, adjuntos, exportación e importación JSON validada con Zod, migración de esquema (v1 → v2), copia de seguridad completa, y exportación PNG, SVG y PDF. |
| **Temas** | Claro y oscuro diseñados por separado (el oscuro no es una inversión) y opción Sistema. La preferencia se recuerda. La paleta semántica del tema oscuro está validada con la herramienta de visualización. |
| **Demostración** | *Sistema de éxito comercial — operador de seguros de hogar*: 18 elementos, ruta de recuperación, fricciones y medidas compensatorias, circuito de referidos y aprendizaje, y 5 escenarios (A–E). Valores ficticios identificados como tales. |

## 2. Arquitectura

- **Stack:** React 19 + TypeScript estricto, Vite 8, `@xyflow/react` 12, Zustand 5, Dexie 4, Zod 4, Tailwind CSS 4, Radix UI, Lucide, Vitest 5 y Playwright.
- **Separación por capas:**

```
src/core/model      Modelo de datos (Zod = fuente de los tipos), fábricas, migraciones, biblioteca de comportamientos
src/core/operations Operaciones de edición puras (doc → doc): nodos, conexiones, grupos, capas, escenarios…
src/engine          Motor independiente de React: grafo, condiciones, simulación, circuitos, escenarios,
                    diagnóstico, análisis (rastreo, sensibilidad, comparación), monitor, calor, marco, veredicto
src/workers         Web Worker del motor
src/persistence     IndexedDB (Dexie) + repositorio (importar/exportar, versiones, copias de seguridad)
src/store           Estado: proyecto (historial + autoguardado), interfaz, simulación
src/editor          Lienzo: derivación eficiente de nodos y conexiones, vistas, cuadrícula, leyenda, menú contextual
src/inspector       Inspector contextual consciente del escenario
src/panels          Panel inferior, Monitor, Dímelo claro, versiones, comparación, ajustes, ayuda
src/explorer        Explorador: cliente, sesión, inserción, plan maestro, audio + shared/ (esquemas, prompts,
                    plantillas, modo demostración, recuperación) compartido con el servidor
server/             API del Explorador (Node http): proveedores de IA, extracción de documentos, servidor independiente
tests/  e2e/        Vitest (unidad e integración) y Playwright (extremo a extremo)
```

- **Principios:**
  - el motor nunca depende de la interfaz;
  - la animación nunca calcula;
  - todo cambio pasa por operaciones puras con historial;
  - los circuitos se representan con IDs, de modo que el documento siempre se puede serializar.

## 3. Puesta en marcha

Requisitos: **Node ≥ 22.18** (el servidor ejecuta TypeScript de forma nativa).

Instala las dependencias:

```bash
npm ci
```

Arranca el entorno de desarrollo (aplicación y API del Explorador en http://localhost:5173):

```bash
npm run dev
```

Para producción, compila:

```bash
npm run build
```

Y sirve la aplicación con la API en http://localhost:4321 (configurable con `PORT`):

```bash
npm start
```

Verificado desde un clon limpio: `npm ci` → `npm run build` → `npm start` sirve la aplicación y la API.

### Configurar la IA del Explorador (opcional)

Copia el ejemplo de configuración:

```bash
cp .env.example .env
```

Después indica `GEMINI_API_KEY`, o bien `EXPLORER_PROVIDER=openai` junto con `OPENAI_API_KEY` y `EXPLORER_BASE_URL` (esta opción sirve para OpenAI, Mistral, Groq, OpenRouter, Ollama o LM Studio), o `EXPLORER_PROVIDER=anthropic` con su clave. Reinicia el servidor.

- Si no indicas un modelo, se descubre el vigente.
- Las claves **solo** viven en el servidor.
- Sin clave, el Explorador funciona en **modo demostración**: guion local y plantillas, claramente identificado.

## 4. Guardar y recuperar

- **Automático:** cada cambio se guarda en IndexedDB a los ~0,5 s. Al recargar se abre el último proyecto.
- **Versiones:** se crean automáticamente cada 5 minutos de trabajo. También manualmente con ⌘S o Historial → «Guardar versión». Restaurar crea antes una versión de seguridad y se puede deshacer.
- **Exportar** el proyecto completo en JSON con versión de esquema (nodos, posiciones, conexiones, capas, comentarios, propiedades, comportamientos, condiciones, escenarios, configuración visual, adjuntos y exploraciones) desde Importar/exportar.
- **Importar:** el archivo se valida y migra, y se importa como copia si ya existe, sin sobrescribir.
- **Copia de seguridad completa** de todos los proyectos y su restauración, en el mismo menú.

## 5. Pruebas ejecutadas (resultados reales)

| Batería | Resultado |
|---|---|
| `npx tsc -b --noEmit` | sin errores |
| `npm test` (Vitest) | **90 superadas**, 3 omitidas (evaluación en vivo del proveedor: no hay clave en este entorno) |
| `npm run test:e2e` (Playwright, Chromium) | **20 superadas** |

Cobertura del plan obligatorio:

- **Motor:** del 1 al 15, incluidas la conservación sin unidades inexplicadas, la regla de compensación aditiva y por máximo, la convergencia y la saturación.
- **Circuitos:** del 1 al 10 (reforzador, equilibrador, retardo, saturación y ausencia de bucle infinito).
- **Editor:** del 1 al 14 en el navegador real.
- **Propiedades:** del 1 al 8, con verificación del efecto neto en el motor.
- **Escenarios:** del 1 al 8, con recarga e independencia.
- **Visuales:** ambos temas, cambio de tema, paneles, inspector y accesibilidad básica.
- **Explorador:** escenarios A–G sobre el entrevistador de demostración; validación y reparación de estructuras con un proveedor simulado; extracción real de Word, Excel y PDF; inserción nativa deshacible.
- **Marco espacial**, termómetro, monitor y veredicto («no inventa cifras»).

**Rendimiento** (Chromium sin GPU):

| Prueba | Resultado |
|---|---|
| Motor | 600 nodos y 806 conexiones × 24 iteraciones en ≈ 0,55 s (Web Worker) |
| Arrastre en un mapa de 400 nodos, sin animación | p50 16,7 ms (60 fps) |
| Arrastre en un mapa de 400 nodos, con partículas | p50 ≈ 33–66 ms, según la carga de la máquina de pruebas |

Para reproducir:

```bash
npm run test:all
```

## 6. Errores detectados durante el desarrollo y cómo se corrigieron

| # | Error | Causa | Corrección |
|---|---|---|---|
| 1 | Iconos de la barra lateral de 8 px | El botón icono heredaba a la vez `px-3` y `px-0` | Botones cuadrados sin relleno horizontal (`square`) |
| 2 | Las conexiones robaban los clics de las burbujas | `zIndex` de las conexiones de flujo y elevación al seleccionar | Las conexiones quedan siempre bajo las burbujas |
| 3 | Redimensionar movía la burbuja | El contenido tapaba los controles y se ignoraban los cambios de dimensión con `setAttributes` | `z-index` en los controles y dimensiones escritas en el modelo durante la transacción |
| 4 | El lienzo se reencuadraba al crear la primera burbuja | `fitView` inicial y encuadre programado tras abrir un proyecto vacío | Solo se encuadra si el mapa tiene contenido |
| 5 | El menú «Añadir comportamiento» se salía de la pantalla | Menú sin desplazamiento | Altura máxima disponible y desplazamiento |
| 6 | Escape no cerraba los diálogos | El foco automático abría un tooltip que consumía Escape | Foco inicial en el contenido del diálogo |
| 7 | Indicador «Cambios sin guardar» bloqueado | Deshacer y rehacer antes de escribir dejaba el documento igual al guardado | Se reconoce el estado ya guardado |
| 8 | Arrastre lento en mapas grandes | Huella de simulación calculada en cada fotograma y partículas en cientos de conexiones | Huella calculada en el rebote, presupuesto de 40 partículas y pausa al arrastrar |
| 9 | Datos de la demo que no enseñaban nada | La capacidad del operador era el cuello de botella y la mejora de la clasificación no cambiaba el resultado | Valores ficticios coherentes; el motor y el diagnóstico lo detectaron |
| 10 | Vista previa del Explorador distorsionada | El ciclo de retroalimentación descolocaba las columnas | Se excluyen las aristas de retorno al calcular la disposición |
| 11 | Paleta oscura con poca separación rojo/verde y fuera de banda | Validada con el script de la guía de visualización | Tonos validados, con signo, icono o etiqueta siempre asociados |
| 12 | Se ocultaba la atribución de React Flow | Sin suscripción Pro | Atribución visible y discreta |

## 7. Pendiente y limitaciones conocidas

- **Proveedores de IA reales sin verificar aquí.** Este entorno no tiene ninguna clave. La integración está probada con un proveedor simulado (streaming, validación Zod, reparación, cancelación, límites, ocultación de claves) y con el SDK oficial `@google/genai` comprobado por tipos. `tests/explorer.live.test.ts` evalúa A, E y la propuesta contra el proveedor real con `EXPLORER_LIVE=1`.
- **Calidad conversacional con IA.** Las pruebas A–G verifican el entrevistador *de demostración*, que es determinista. Con Gemini u otros modelos, la calidad depende del modelo; la instrucción de sistema implementa todas las reglas pedidas e incluye el ejemplo de estilo.
- **Grabación de voz.** La grabación por tramos con MediaRecorder y el dictado del navegador no se pueden automatizar sin micrófono. La ruta de transcripción está probada con el proveedor simulado. Anthropic no transcribe audio. Los archivos de audio muy largos se trocean en el navegador y consumen memoria; con Gemini se suben por la Files API.
- **Búsqueda externa con fuentes** no conectada: está prevista en el diseño, pero el Explorador declara que no investiga el mercado.
- El **historial de deshacer** no sobrevive a una recarga; las versiones sí.
- Los **cambios estructurales** (añadir o eliminar elementos) afectan a todos los escenarios, por diseño. Los escenarios guardan parámetros.
- El **PDF del mapa** contiene una imagen rasterizada. El SVG mantiene vectores.
- **Colaboración multiusuario** no implementada (el modelo admite un backend remoto detrás del repositorio).
- La interfaz está pensada para **escritorio**: se adapta a otras resoluciones, pero no es una versión móvil completa.
- `npm audit`: 9 avisos moderados transitivos de `exceljs`, que solo se usa para leer .xlsx en el servidor.
- Los **valores cualitativos** se simulan mediante una interpretación configurable y los resultados que los usan se marcan como aproximación.
