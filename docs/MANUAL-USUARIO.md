# Mapa de Flujos — Manual de usuario

Guía completa para personas. Explica, en orden, todo lo que puedes hacer con la aplicación: desde abrirla por primera vez hasta simular escenarios, leer el Monitor, usar el Explorador con IA y guardar tu trabajo.

> **Dónde leer este manual:** en la web, en **https://mapa-flujos-workflow.vercel.app/manual/**. Dentro de la aplicación, con el botón **Manual** de la barra superior, en **Menú (···) → Manual de usuario**, en **Ayuda** o en la pantalla de inicio. En GitHub, en `docs/MANUAL-USUARIO.md`. El manual para IA está en **/manual-ia/**.

> **Convención de teclas.** «Ctrl» en Windows y Linux equivale a «⌘ (Cmd)» en Mac. Cuando leas **Ctrl+Z**, en Mac es **⌘Z**. «⇧» es la tecla Mayúsculas y «Supr» es la tecla Suprimir (en Mac, la tecla de borrar).

---

## Índice

1. [Qué es Mapa de Flujos](#1-qué-es-mapa-de-flujos)
2. [Cómo abrir la aplicación](#2-cómo-abrir-la-aplicación)
3. [Pantalla de inicio](#3-pantalla-de-inicio)
4. [Las zonas de la pantalla](#4-las-zonas-de-la-pantalla)
5. [Crear y editar elementos](#5-crear-y-editar-elementos)
6. [Conexiones](#6-conexiones)
7. [Organizar el mapa](#7-organizar-el-mapa)
8. [Las cinco vistas](#8-las-cinco-vistas)
9. [El inspector](#9-el-inspector)
10. [Peso, influencia e impacto](#10-peso-influencia-e-impacto)
11. [Comportamientos](#11-comportamientos)
12. [Condiciones](#12-condiciones)
13. [Mitigadores y compensaciones](#13-mitigadores-y-compensaciones)
14. [Dimensiones del flujo](#14-dimensiones-del-flujo)
15. [Bifurcación y convergencia](#15-bifurcación-y-convergencia)
16. [Circuitos y retroalimentación](#16-circuitos-y-retroalimentación)
17. [Simular](#17-simular)
18. [Escenarios, comparación, sensibilidad e incertidumbre](#18-escenarios-comparación-sensibilidad-e-incertidumbre)
19. [Marco espacial (cuadrícula que computa)](#19-marco-espacial-cuadrícula-que-computa)
20. [Termómetro de calor](#20-termómetro-de-calor)
21. [Monitor](#21-monitor)
22. [«Dímelo claro»](#22-dímelo-claro)
23. [Explorador de flujos y Creador de estrategias](#23-explorador-de-flujos-y-creador-de-estrategias)
24. [Guardar, versiones, exportar e importar](#24-guardar-versiones-exportar-e-importar)
25. [Ajustes del proyecto](#25-ajustes-del-proyecto)
26. [Buscador de comandos](#26-buscador-de-comandos)
27. [Atajos de teclado](#27-atajos-de-teclado)
28. [El proyecto de demostración](#28-el-proyecto-de-demostración)
29. [Activar la IA real](#29-activar-la-ia-real)
30. [Instalarla en tu ordenador (opcional)](#30-instalarla-en-tu-ordenador-opcional)
31. [Problemas frecuentes](#31-problemas-frecuentes)
32. [Recetas rápidas](#32-recetas-rápidas)
33. [Glosario](#33-glosario)

---

## 1. Qué es Mapa de Flujos

Mapa de Flujos es dos cosas a la vez:

- **Un editor de mapas mentales.** Escribes ideas en burbujas, las conectas, las agrupas y las organizas con total libertad.
- **Un simulador.** Si quieres, esas burbujas cobran vida. Por las conexiones circula un **flujo** (por ejemplo: clientes, llamadas, dinero, horas…). Cada burbuja puede filtrarlo, multiplicarlo, frenarlo, acumularlo o repartirlo. La aplicación calcula, iteración a iteración, cuánto llega al final, dónde se pierde y por qué.

Puedes usarla solo como mapa mental, solo como simulador o combinando ambas cosas. Nada te obliga a rellenar números.

**Ideas clave**

| Concepto | Qué significa |
|---|---|
| **Burbuja** | Una idea o un paso del proceso. |
| **Entrada** | Un elemento que genera flujo (el origen: «llamadas recibidas», «flyers repartidos»…). |
| **Salida** | Un elemento donde termina el flujo y se mide el resultado («ventas», «alumnos que pagan»…). |
| **Conexión** | Una línea entre dos elementos. Puede transportar flujo o solo expresar una relación. |
| **Iteración** | Un «paso de tiempo» de la simulación (una semana, un mes… tú decides qué representa). |
| **Escenario** | Una variante del mismo mapa con algunos valores cambiados («¿y si contrato a alguien?»). |

---

## 2. Cómo abrir la aplicación

### En internet (recomendado)

Abre **https://mapa-flujos-workflow.vercel.app** en Chrome, Edge, Firefox o Safari, en el ordenador. No hace falta cuenta.

> Si al abrir el enlace te pide iniciar sesión en Vercel, el propietario debe desactivar la protección del proyecto: en Vercel, abre **Settings → Deployment Protection → Vercel Authentication** y elige **Desactivado** o **Standard Protection**.

### Dónde se guarda tu trabajo

**Todo se guarda en tu navegador**, en el ordenador que estás usando. No se sube a ningún servidor. Esto implica:

- Si abres la aplicación en otro ordenador o en otro navegador, **no verás tus proyectos**. Para llevarlos, usa **Exportar** o **Copia de seguridad completa** (sección 24).
- Si borras los datos del navegador («borrar datos de sitios», «cookies y datos de sitios»), **perderás los proyectos**. Haz copias de seguridad de vez en cuando.
- En una ventana de incógnito los datos desaparecen al cerrarla.

---

## 3. Pantalla de inicio

Al abrir la aplicación sin ningún proyecto verás tres tarjetas y la lista de proyectos guardados:

| Opción | Qué hace |
|---|---|
| **Empezar en blanco** | Crea un proyecto nuevo con una burbuja. |
| **Ver la demostración** | Abre el proyecto de ejemplo «Éxito comercial de un operador de seguros» (valores ficticios). |
| **Explorar una idea** | Crea un proyecto llamado «Exploración» y abre el Explorador de flujos, que te hará preguntas antes de construir el mapa. |
| **Proyectos guardados** | Lista de tus proyectos en este navegador: nombre, número de elementos y fecha. Haz clic para abrir uno. |
| **Pegar JSON** | Abre un cuadro donde pegar el texto JSON de un proyecto, por ejemplo uno generado por una IA con el MANUAL-IA. |
| **Importar** | Abre un archivo `.json` exportado antes. |
| **Manual de usuario** · **Manual para IA** | Abren los manuales en otra pestaña. |
| Icono de papelera | Borra un proyecto y sus versiones. Pide un segundo clic de confirmación: «¿Borrar? No se puede deshacer». |

Si ya trabajaste antes, la aplicación abre directamente **el último proyecto** que usaste. Para volver a la lista, haz clic en el **logotipo** (arriba a la izquierda) o usa **Menú (···) → Proyectos…**.

---

## 4. Las zonas de la pantalla

```
┌───────────────────────── Barra superior ─────────────────────────┐
│ Logo · Nombre · Guardado · Escenario │ Vistas │ Herramientas      │
├──────┬──────────────────────────────────────────────┬────────────┤
│Barra │                                              │            │
│ de   │                 LIENZO                       │ INSPECTOR  │
│herra-│                                              │            │
│mien- │                    (leyenda y zoom abajo)    │            │
│tas   │                                              │            │
├──────┴──────────────────────────────────────────────┴────────────┤
│                 PANEL DE SIMULACIÓN (pestañas)                    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.1 Barra superior (de izquierda a derecha)

| Elemento | Función |
|---|---|
| **Logotipo** | Abre la lista de proyectos. |
| **Nombre del proyecto** | Clic para renombrar. Enter confirma y Escape cancela. Si es la demo, aparece la etiqueta «Demo». |
| **Indicador de guardado** | ✓ guardado · ⟳ «Cambios sin guardar» o «Guardando…» · ⚠ «Error al guardar» (pasa el ratón para ver el motivo). |
| **Selector de escenario** | Muestra el escenario activo y cuántos cambios tiene. Permite cambiar, crear, duplicar, restaurar y comparar escenarios (sección 18). |
| **Vista** | Mental · Flujo · Energía · Sistema · Simulación (sección 8). Teclas **1** a **5**. |
| **Explorador** (✦) | Abre el Explorador de flujos (sección 23). |
| **Monitor** | Abre el panel de métricas (sección 21). |
| **Dímelo claro** | Abre el veredicto en lenguaje llano (sección 22). |
| **Manual** (📖) | Abre este manual en otra pestaña. |
| **Cuadrícula** (#) | Ajustes del marco espacial (sección 19). Se resalta cuando la cuadrícula está activa. |
| **Termómetro** | Muestra u oculta el termómetro de calor. Tecla **H** (sección 20). |
| **Deshacer / Rehacer** | Ctrl+Z / Ctrl+⇧+Z (también Ctrl+Y). |
| **Lupa** | Buscador de elementos y comandos. Ctrl+K (sección 26). |
| **Reloj** | Historial de versiones (sección 24). |
| **Descarga** | Menú Importar/exportar: JSON, PNG, SVG, PDF, importar archivo, **pegar proyecto (JSON)**, copia de seguridad y restaurar. |
| **Sol / Luna / Pantalla** | Tema: Claro, Oscuro o Sistema (sigue al sistema operativo). |
| **Panel inferior** | Muestra u oculta el panel de simulación. |
| **Panel derecho** | Muestra u oculta el inspector. |
| **Menú (···)** | Proyectos…, Nuevo proyecto, Duplicar proyecto, Abrir proyecto de demostración, Ajustes del proyecto, Ayuda y atajos, Manual de usuario, Manual para IA (prompts), Guardar versión ahora (Ctrl+S). |

> En pantallas estrechas algunos botones muestran solo el icono. Pasa el ratón por encima para ver su nombre y su atajo.

### 4.2 Barra de herramientas (izquierda)

| Herramienta | Tecla | Uso |
|---|---|---|
| **Seleccionar** | V | Modo normal: seleccionar, mover y editar. |
| **Crear burbuja** | B | Haz clic en el lienzo para crear una burbuja. También puedes hacer doble clic en el lienzo con cualquier herramienta. |
| **Crear conexión** | C | Al hacer clic se abre un selector del **tipo de nueva conexión**: Flujo, Causal, Info o Idea. Luego arrastra desde un punto del borde de una burbuja hasta otra. El punto de color en el icono indica el tipo elegido. |
| **Agrupar** | Ctrl+G | Agrupa la selección o crea un grupo vacío. |
| **Crear entrada** | I | Clic en el lienzo: crea una entrada (genera flujo). |
| **Crear salida** | O | Clic en el lienzo: crea una salida (mide el resultado). |
| **Añadir nota** | N | Clic en el lienzo: crea una nota adhesiva. |
| **Añadir comentario** | — | Añade un comentario a la selección (o al lienzo si no hay selección). |
| **Etiquetas** | — | Pone etiquetas a la selección y filtra el mapa por etiqueta. |
| **Texto libre** | — | Clic en el lienzo: crea un texto suelto. |
| **Crear contenedor** | — | Crea una zona o subsistema con la selección dentro. |
| **Crear circuito** | — | Cierra un ciclo con las burbujas seleccionadas (sección 16). |
| **Capas** | — | Abajo del todo. Administra las capas (sección 7.5). |

Al pulsar una herramienta activa vuelves a **Seleccionar**. **Escape** también vuelve a Seleccionar y además limpia la selección, el rastreo y el modo enfoque.

### 4.3 Lienzo

- **Desplazarte**: arrastra sobre una zona vacía del lienzo.
- **Zoom**: rueda del ratón, gesto de pellizco o los botones **− / % / +** de la esquina inferior. El botón con el porcentaje vuelve al 100 %.
- **Ajustar al contenido**: tecla **F** o su botón. **Zoom a la selección**: **⇧F**.
- **Leyenda**: abajo a la derecha. Haz clic en «Leyenda» para desplegarla. Su contenido cambia según la vista activa.
- **Menú contextual**: clic derecho sobre el lienzo, sobre un elemento o sobre una conexión.

### 4.4 Inspector (derecha)

Muestra y edita las propiedades de lo que tengas seleccionado (sección 9). Sin nada seleccionado, muestra las propiedades del **proyecto**.

### 4.5 Panel de simulación (abajo)

Tiene seis pestañas: **Simulación, Resultados, Diagnóstico, Escenarios, Iteraciones y Eventos** (sección 17). Puedes cambiar su altura arrastrando el borde superior.

---

## 5. Crear y editar elementos

### 5.1 Formas de crear

| Cómo | Resultado |
|---|---|
| Doble clic en una zona vacía del lienzo | Burbuja nueva en ese punto. |
| Herramienta (B, I, O, N, texto libre) + clic en el lienzo | Burbuja, entrada, salida, nota o texto. |
| Clic derecho en el lienzo | «Nueva burbuja», «Nueva entrada», «Nueva salida», «Nota», «Etiqueta de texto», «Contenedor». |
| **Tab** con una burbuja seleccionada | Crea una **burbuja conectada** (hija) a su derecha, unida con el tipo de conexión elegido. |
| **⇧+Enter** con una burbuja seleccionada | Crea una **burbuja hermana** debajo, conectada al mismo padre. |
| Ctrl+K y escribe «Nueva…» | Crea desde el buscador. |

### 5.2 Tipos de elemento

| Tipo | Para qué sirve | ¿Participa en la simulación? |
|---|---|---|
| **Burbuja** | Idea o paso. Puede tener comportamientos. | Sí, si está conectada con flujo o tiene comportamientos. |
| **Entrada** | Genera flujo en cada iteración. | Sí: es un origen. |
| **Salida** | Recibe y mide el resultado final. | Sí: es donde se cuenta el resultado. |
| **Nota** | Texto adhesivo de apoyo. | No. |
| **Etiqueta** (texto libre) | Rótulo suelto. | No. |
| **Grupo** | Agrupa elementos y se puede plegar. | No calcula por sí mismo. |
| **Contenedor** | Zona o subsistema visual. | No calcula por sí mismo. |

Puedes cambiar el tipo de un elemento en el inspector, en **Tipo**.

### 5.3 Editar el texto

- **Doble clic** sobre la burbuja o **Enter** con ella seleccionada.
- O escribe en **Nombre** y **Descripción** en el inspector.

### 5.4 Seleccionar

| Acción | Cómo |
|---|---|
| Uno | Clic. |
| Varios | Ctrl+clic o ⇧+clic sobre cada uno. |
| Varios con un rectángulo | Mantén **⇧ (Mayúsculas)** y arrastra sobre el lienzo. |
| Todo | Ctrl+A. |
| Nada | Escape o clic en una zona vacía. |

### 5.5 Mover, cambiar el tamaño, copiar y borrar

- **Mover**: arrastra el elemento.
- **Cambiar el tamaño**: selecciónalo y arrastra los tiradores de las esquinas. En **Estilo → Tamaño automático** vuelve a su tamaño natural.
- **Copiar / Cortar / Pegar**: Ctrl+C / Ctrl+X / Ctrl+V.
- **Duplicar**: Ctrl+D. Crea una copia independiente.
- **Clonar (misma identidad)**: desde el menú contextual. El clon es **el mismo elemento** colocado en otro lugar: comparte propiedades y comportamiento, y el motor lo cuenta una sola vez. En el inspector de un clon tienes **Ir al original** y **Convertir en elemento independiente**.
- **Eliminar**: Supr (o la tecla de borrar). También con el icono de papelera del inspector o con «Eliminar» del menú contextual.

### 5.6 Menú contextual de un elemento

Clic derecho sobre una burbuja:

- Editar texto
- Añadir burbuja conectada
- Duplicar · Clonar (misma identidad) · Copiar · Cortar
- Agrupar · Desagrupar
- Plegar rama / Desplegar rama
- Rastrear hacia delante · Rastrear hacia atrás · Modo enfoque
- Añadir comentario
- Bloquear / Desbloquear
- Ocultar
- Eliminar

Clic derecho en el lienzo vacío: crear elementos, Pegar, Deshacer, Ajustar al contenido, Distribución automática y Mostrar ocultos.

---

## 6. Conexiones

### 6.1 Crear una conexión

1. (Opcional) Pulsa **C** y elige el tipo: **Flujo**, **Causal**, **Info** o **Idea**.
2. Pasa el ratón sobre una burbuja: aparecen **cuatro puntos** en su borde (arriba, derecha, abajo, izquierda).
3. Arrastra desde un punto hasta otra burbuja y suelta.

El tipo elegido con C se aplica a las conexiones nuevas. Puedes cambiarlo después en el inspector (**Tipo de conexión**).

### 6.2 Tipos de conexión

| Tipo | Qué expresa | ¿Transporta flujo? |
|---|---|---|
| **Flujo** | Por aquí pasa algo (clientes, dinero, horas…). | **Sí.** |
| **Causal** | Un elemento **influye** en otro: lo **refuerza**, lo **frena** o lo **compensa**. | No transporta: modifica. |
| **Informativa** («Info») | Relación de información o dependencia. | No. |
| **Conceptual** («Idea») | Relación de ideas propia de un mapa mental. | No. |

### 6.3 Menú contextual de una conexión

- **Invertir dirección**
- **Hacer unidireccional / Hacer bidireccional**
- **Duplicar conexión**
- **Añadir comentario**
- **Eliminar conexión**

### 6.4 Propiedades de una conexión (inspector)

Selecciona la conexión (clic sobre la línea). El inspector muestra:

**General**
- **Tipo de conexión**: Flujo, Causal, Informativa o Conceptual.
- **Dirección**: Un sentido, Ambos o Sin sentido. Con **Invertir dirección** se intercambian el origen y el destino.
- **Etiqueta**: texto sobre la línea.

**Comportamiento del flujo** (solo en conexiones de Flujo; nivel Avanzado o Experto)
- **Qué hace / Transporte**:
  - **Transfiere el flujo**: lo mueve del origen al destino. Es lo normal.
  - **Réplica / retroalimentación (genera en destino)**: no mueve el flujo, sino que genera una cantidad proporcional en el destino. Su **Polaridad** puede ser **+ Alimenta (refuerza)** o **− Inhibe (equilibra)**.
- **Rol en el reparto del origen**:
  - **Ruta principal**.
  - **Ruta de rechazo (lo filtrado)**: recibe lo que un filtro no deja pasar.
  - **Desborde (exceso de capacidad)**: recibe lo que no cabe en un restrictor.
  - **Desvío**: recibe lo que manda un desviador.
- **Peso del reparto / Reparto fijo / Prioridad**: cuánto le toca a esta salida cuando el origen reparte (sección 15).
- **Multiplicador**: multiplica lo que pasa (1 = sin cambio).
- **Pérdida**: porcentaje que se pierde por el camino.
- **Capacidad**: máximo que puede pasar por iteración.
- **Retardo**: iteraciones que tarda en llegar.
- **Resistencia**: frena la velocidad del flujo.
- **Intensidad**: afecta al potencial.
- **Dimensiones transportadas**: qué dimensiones viajan por esta conexión (por defecto, todas).
- **Peso en convergencia** (Experto): peso de esta llegada cuando el destino combina varias entradas.
- **Marcar como retorno (se procesa en la iteración siguiente)**: convierte la conexión en la vuelta de un ciclo.

**Influencia** (conexiones Causales)
- **Modalidad**:
  - **Modula al destino (refuerza o frena)**: cambia una dimensión del destino. Su fuerza depende de la influencia del origen, de la **Polaridad** (**+ Directa** o **− Inversa**), de la **Sensibilidad** y de la **Dimensión afectada**.
  - **Compensa / mitiga una dificultad**: el origen es una medida que reduce el efecto negativo del destino. Tiene **Tipo** (Parcial, Total, Condicionada, Temporal), **Unidad** (Puntos de escala o Porcentaje), **Cantidad** y periodo **Desde it. / Hasta it.**

**Condiciones de paso**: la conexión solo deja pasar el flujo si se cumplen (sección 12).

**Circuito**: si la conexión cierra un ciclo, aparece **Configurar como circuito** (sección 16).

**Apariencia**
- **Trazado**: Curva, Recta u Ortogonal.
- **Línea**: Continua, Discontinua o Punteada.
- **Modo de grosor**: Por magnitud (automático según la cantidad) o Manual (con **Grosor**).
- **Color de la conexión** y **Anclaje origen / destino**: Arriba, Derecha, Abajo o Izquierda.

**Comentarios**: anotaciones de la conexión.

---

## 7. Organizar el mapa

### 7.1 Alinear y distribuir

Selecciona varios elementos y usa el buscador (Ctrl+K):

- Alinear a la izquierda, Centrar horizontalmente, Alinear a la derecha.
- Alinear arriba, Centrar verticalmente, Alinear abajo.
- Distribuir horizontalmente, Distribuir verticalmente.

Con varios elementos seleccionados, el inspector muestra también **Organizar**: Agrupar, Contenedor, Crear circuito, Distribuir y Eliminar selección.

**Distribución automática** (clic derecho en el lienzo o Ctrl+K) recoloca todo el mapa de forma ordenada. Puedes deshacerlo con Ctrl+Z.

### 7.2 Grupos y contenedores

- **Agrupar** (Ctrl+G) y **Desagrupar** (Ctrl+⇧+G).
- Un grupo se **pliega y despliega** con la flecha de su cabecera.
- Un **contenedor** representa una zona o subsistema. Para meter elementos en un grupo o contenedor, **selecciónalos primero** y después pulsa Agrupar o Crear contenedor: el nuevo grupo los envuelve. Sin selección se crea vacío.
- **Desagrupar** saca los elementos del grupo o contenedor seleccionado.

### 7.3 Plegar ramas, ocultar y bloquear

- **Plegar rama**: oculta todo lo que cuelga de una burbuja. Se despliega igual.
- **Ocultar**: esconde un elemento. Para recuperarlo: clic derecho en el lienzo → **Mostrar ocultos**, o búscalo con Ctrl+K (sale en «Elementos ocultos»; al elegirlo se vuelve visible).
- **Bloquear**: evita moverlo o editarlo por accidente. Muestra un candado.

### 7.4 Rastrear y enfocar

- **Rastrear hacia delante**: resalta todo lo que depende de este elemento.
- **Rastrear hacia atrás**: resalta todo lo que alimenta a este elemento.
- **Modo enfoque**: atenúa todo lo que no está relacionado.
- Están en el menú contextual y en el inspector (**Relaciones**: Rastrear adelante, Rastrear atrás, Enfocar). Escape los quita.

### 7.5 Capas

El botón **Capas** está abajo en la barra de herramientas.

- Crea capas con nombre y color («Nueva capa…» y **+**).
- **Añadir selección a la capa / Quitar selección de la capa**.
- **Ocultar / Mostrar capa** (ojo) y **Bloquear / Desbloquear capa** (candado).
- **Subir / Bajar** para ordenarlas y **Eliminar capa**.
- Un elemento puede estar en varias capas sin duplicarse. Es visible si **alguna** de sus capas lo es.

### 7.6 Etiquetas

- Botón **Etiquetas**: escribe una etiqueta para añadirla a la selección.
- **Filtrar por etiqueta**: muestra solo los elementos con esa etiqueta. **Quitar filtro** vuelve a mostrarlo todo.
- También puedes poner etiquetas en el inspector (**Etiquetas**, «+ etiqueta»).

### 7.7 Comentarios y notas

En el inspector, sección **Comentarios y notas** → **Añadir comentario**. Cada anotación tiene un tipo: **Comentario, Nota, Hipótesis, Evidencia o Pregunta pendiente**. Úsalas para dejar claro qué es dato y qué es suposición.

---

## 8. Las cinco vistas

Las vistas cambian **cómo se ve** el mapa, nunca sus datos. Teclas **1** a **5**.

| Vista | Qué destaca | Leyenda |
|---|---|---|
| **1 · Mental** | Ideas, jerarquías y relaciones. | Relación, Causal (discontinua), Informativa (punteada). |
| **2 · Flujo** | Dirección, grosor y cantidad. | Grosor = cantidad · Opacidad = calidad · Partículas = velocidad · Halo = potencial · Bloqueada (roja discontinua) · Sin flujo. |
| **3 · Energía** | Impulsos, pérdidas y fricciones. | Verde = impulso/ganancia · Rojo = pérdida/fricción · Azul = flujo conservado. |
| **4 · Sistema** | Dependencias, condiciones y circuitos. | + refuerza · − frena · ⊕ compensa · ◆ condición. |
| **5 · Simulación** | Movimiento, iteraciones y estados. | Igual que Flujo, con animación por iteración. |

Si pulsas **Reproducir** estando en la vista Mental, la aplicación cambia sola a la vista Simulación.

---

## 9. El inspector

### 9.1 Sin nada seleccionado: el proyecto

- **Proyecto**: nombre y descripción («De qué trata este mapa…»).
- **Ajustes → Profundidad**: controla cuántas opciones ves:
  - **Básico**: crear, editar, conectar y organizar.
  - **Avanzado** (por defecto): además pesos, condiciones, comportamientos y dimensiones.
  - **Experto**: además fórmulas, puertos, rangos de incertidumbre y reglas avanzadas.
  - El enlace «Escalas, paleta, leyenda y atajos…» abre los Ajustes del proyecto.
- **Simulación → Iteraciones**: cuántos pasos se simulan (de 1 a 500; por defecto 12).
- **Dimensiones del flujo**: lista de dimensiones y alta de dimensiones propias (sección 14).
- **Circuitos configurados**: lista de los circuitos del mapa.

> Si no ves una opción descrita en este manual, sube la **Profundidad** a Avanzado o Experto.

### 9.2 Varios elementos seleccionados: edición conjunta

- **Edición conjunta**: Forma, Color, Etiqueta para todos, Influencia (ponderada) para todos y **Asignar comportamiento a todos**. «Varios» indica que hoy tienen valores distintos. Lo que cambies se aplica a todos.
- **Organizar**: Agrupar, Contenedor, Crear circuito, Distribuir y Eliminar selección.

### 9.3 Una burbuja seleccionada

Arriba aparece el tipo (Burbuja, Entrada…), un candado si está bloqueada y el botón **Eliminar**. Después:

1. **Identidad**:
   - **Nombre**, **Descripción** y **Tipo**.
   - **Categoría** (por ejemplo «Operativa»).
   - **Etiquetas**.
   - **Grado de confianza**: Hipótesis, Estimación, Observado o Verificado.
2. **Resumen de simulación**: cuánto **Entra**, cuánto **Sale** (o el **Resultado**, si es una salida), el stock y avisos como «condicionado». Si no tiene comportamiento, dice «Elemento conceptual (sin comportamiento)».
3. **Peso e influencia** (sección 10).
4. **Comportamientos** (sección 11).
5. **Condiciones de activación** (sección 12).
6. **Mitigadores y compensaciones** (sección 13).
7. **Dimensiones del flujo** (sección 14). Se abre sola en las entradas.
8. **Bifurcación y convergencia** (sección 15).
9. **Relaciones**: conexiones entrantes y salientes, y los botones Rastrear adelante, Rastrear atrás y Enfocar.
10. **Estilo**:
    - **Forma**: Burbuja, Píldora, Recto, Círculo, Rombo o Hexágono.
    - **Color**: Grafito, Azul, Verde, Rojo suave, Ámbar, Violeta, Cian o Rosa.
    - **Fondo propio**, para usar un color de fondo libre.
    - **Borde**: Continuo, Discontinuo, Punteado o Sin borde.
    - **Tipografía**: Sans, Serif o Mono. Además, **Tamaño / peso**: Normal, Medio o Fuerte.
    - **Icono**, una lista amplia o «Ninguno».
    - **Imagen**: subir una imagen o «Quitar imagen».
    - **Tamaño automático**.
11. **Comentarios y notas** (sección 7.7).
12. **Documentos adjuntos**: **Adjuntar documento**. Cada adjunto se puede **Descargar** o **Eliminar**.
13. **Avanzado**:
    - **Bloqueado** y **Rama plegada**.
    - **Capas**.
    - **Puertos**: entradas y salidas lógicas con nombre y capacidad.
    - **Documentación / enlaces** e **ID** interno.

Las notas, los textos libres, los grupos y los contenedores muestran solo las secciones que les aplican.

**Bloque de descubrimiento.** Los elementos insertados por el Explorador muestran arriba sus datos de descubrimiento (sección 23.6). Incluye los botones **Confirmar**, **Dudoso** y **Descartar**.

**Marca de escenario.** Si un valor está cambiado en el escenario activo, aparece una marca junto a su nombre. Al pasar el ratón dice «Modificado en «Escenario». Restaurar el valor base»; con un clic vuelves al valor base.

---

## 10. Peso, influencia e impacto

Sección **Peso e influencia** del inspector. Son tres cosas distintas:

| Campo | Qué es | ¿Lo usa el motor? |
|---|---|---|
| **Importancia** | Cuánto te interesa atender este elemento. | No: es para ti. |
| **Influencia** | Cuánto modifica a otros. Puede ser positiva, negativa o neutra. | **Sí.** |
| **Impacto esperado** | Tu expectativa sobre el resultado. | No. El impacto real lo calcula el Monitor. |

Cada uno se puede expresar en tres modos:

- **Núm.** (numérico): un número libre.
- **Pond.** (ponderado): un valor en la escala ponderada, por defecto de **−5 a +5**.
- **Cual.** (cualitativo): un nivel de una escala con palabras, por ejemplo Muy bajo, Bajo, Medio, Alto, Muy alto. El resultado se marca como **aproximación**.

**La influencia depende de**:
- **Su peso (fijo)**: el valor que pongas.
- **El flujo que recibe**: la influencia crece con el flujo, hasta el **Flujo de referencia** (influencia máxima).
- **Su stock**: la influencia depende de lo acumulado.

**Ejemplo.** «Fricción tecnológica» con influencia −3, conectada con una conexión **Causal** a «Conversación comercial», frena esa conversación. Si su influencia fuera +3, la reforzaría.

---

## 11. Comportamientos

Un comportamiento es **lo que hace una burbuja con el flujo**. Sin comportamientos, la burbuja deja pasar el flujo sin cambios (o solo es una idea). Para añadir uno: **Comportamientos → Añadir comportamiento** y elige de la lista.

### 11.1 Los 14 comportamientos

| Comportamiento | Qué hace | Parámetros principales |
|---|---|---|
| **Generador** | Produce flujo nuevo en cada iteración. | Cantidad por iteración (si el nodo no define la dimensión Cantidad) · Emisión: Continua o Pulso único · Desde / Hasta iteración (0 = sin fin) · Crecimiento por iteración (Experto). |
| **Consumidor** | Absorbe parte del flujo. Se registra como **consumido**, no como perdido. | Modo: Proporción o Cantidad fija · Proporción consumida / Cantidad consumida. |
| **Filtro** | Deja pasar una parte. Lo rechazado va a las conexiones de **rechazo** o se pierde. | Criterio: Proporción que pasa (**Pasa** %) o Umbral de dimensión (Dimensión evaluada, Operador ≥ > ≤ <, Umbral). |
| **Transformador** | Cambia características del flujo. | Operación: Escalar (×), Desplazar (+), Fijar valor o Convertir dimensión (Desde, Hacia, Proporción convertida) · Factor / Valor. |
| **Multiplicador** | Amplifica. El aumento se registra como **generación**. | Factor (por ejemplo 1,5). |
| **Reductor** | Disminuye. La reducción se registra como **pérdida**. | Modo: Proporción o Cantidad fija · Reducción / Cantidad. |
| **Acelerador** | Cambia la velocidad: más de 1 acelera, menos de 1 frena. | Factor de velocidad. |
| **Restrictor** | Limita la capacidad de paso por iteración. | Capacidad por iteración · Exceso: Encolar para la siguiente iteración, Se pierde, o Desbordar a conexiones de desborde. |
| **Desviador** | Manda una parte a las conexiones marcadas como **Desvío**. | Proporción desviada. |
| **Acumulador** | Guarda flujo (stock) para otro momento. | Stock máximo (0 = sin límite) · Stock inicial (Experto). |
| **Liberador** | Devuelve al flujo lo acumulado. | Modo: Proporción del stock, Cantidad fija o Todo · Proporción / Cantidad liberada. |
| **Compensador** | Mitiga el efecto negativo de otros elementos a través de sus conexiones de compensación. | Eficacia (100 % = completa). |
| **Detector** | Mide sin modificar y avisa al cruzar un umbral. | Mide: Entrada, Salida o Dimensión · Umbral de aviso (0 = ninguno). |
| **Controlador** | Cuando está activo, cambia un parámetro de **otro** comportamiento («SI condición → ENTONCES ajuste»). | Comportamiento controlado · Parámetro (por ejemplo `capacity`) · Ajuste: Multiplicar, Fijar o Sumar · Valor. |

### 11.2 Opciones de cada comportamiento

- **Nombre propio** (por ejemplo «Tasa de respuesta»), botón de encendido (**Activar / Desactivar**) y **Eliminar comportamiento**.
- **Dimensiones afectadas**: sobre qué dimensiones actúa. Las demás no cambian.
- **Combinación con otros del mismo tipo** (si hay varios iguales en la burbuja): Encadenada (uno tras otro), Multiplicativa, Aditiva, El mayor o El menor.
- **SI … (condiciones)** → **Añadir SI**: el comportamiento solo actúa si se cumple la condición. Sin condiciones: «Siempre activo».
- **SI NO**: qué pasa si no se cumple. **No actúa**, o **Actúa con otros valores** (parámetros alternativos).
- **Incertidumbre (escenario favorable / desfavorable)** (Experto): un valor favorable y otro desfavorable para cada parámetro numérico. El valor central es el actual.
- **Efectos secundarios**: notas descriptivas con polaridad (+/−). Por ejemplo: «consume tiempo del operador». No cambian el cálculo.

### 11.3 Orden en que actúan

Dentro de cada elemento, el motor siempre sigue este orden:

1. Recoger entradas.
2. Convergencia.
3. Condiciones.
4. Activación.
5. Generadores.
6. Filtros.
7. Transformaciones e influencias.
8. Capacidad.
9. Acumuladores.
10. Bifurcación.
11. Conexiones.
12. Retroalimentación.
13. Registro.

Por eso un filtro siempre actúa antes que un restrictor de la misma burbuja.

---

## 12. Condiciones

Las condiciones activan o desactivan cosas según el estado de la simulación. Se ponen en:

- un **elemento** (Condiciones de activación);
- un **comportamiento** (SI …);
- una **conexión** (Condiciones de paso);
- un **circuito**.

### 12.1 Construir una condición

**Añadir condición** y elige el **Tipo de cláusula**:

| Tipo | Ejemplo |
|---|---|
| **Comparación** | «Stock de *Almacén* ≥ 50». |
| **Rango** | «Calidad de *Leads* **entre** 0,4 y 0,8» (o **fuera de**). |
| **Umbral** | «Salida de *Ventas* **supera** 30» (o **por debajo de**). |
| **Iteración / tiempo** | «Iteración ≥ 4» (a partir de la semana 4). |
| **Depende de otro activo** | «Solo si *Campaña* está activa». |

En las cláusulas que miden un elemento eliges el **Elemento** y la **Métrica**: entrada, salida, stock, influencia, pérdida, resultado o dimensión (con su **Dimensión**). Operadores: > ≥ < ≤ = ≠.

Para combinar cláusulas usa **Grupo** con **Operador lógico** **Y (todas)** u **O (alguna)**, y **Negar (NO)** para invertir.

### 12.2 Resultado y activación

- **Resultado**: «Si se cumple: actúa» o «Si se cumple: no actúa».
- **Activación**:
  - **Cada iteración**: se evalúa siempre.
  - **Una vez cierta, queda**: en cuanto se cumple, se queda activa.
  - **Solo una vez**: actúa solo la primera vez.
- **Sostenida N it.**: debe cumplirse N iteraciones seguidas antes de activar.

### 12.3 Elemento inactivo

En **Bifurcación y convergencia → Si el elemento está inactivo** decides qué pasa cuando sus condiciones no se cumplen. **Deja pasar** el flujo sin cambios, o lo **Bloquea**.

---

## 13. Mitigadores y compensaciones

Sirven para modelar **«tengo un problema y una medida que lo suaviza»**.

1. Selecciona el elemento problemático, por ejemplo «Fricción tecnológica», con influencia negativa.
2. Abre **Mitigadores y compensaciones**:
   - **Medida existente** + **Vincular**: usa una burbuja que ya existe como medida.
   - **Nueva medida compensatoria**: crea una burbuja verde «Medida compensatoria» ya conectada.
3. Para cada medida ajusta:
   - **Tipo**: Parcial, Total, Condicionada o Temporal.
   - **Unidad**: **pt** (puntos de la escala) o **%**.
   - **Cantidad**.
   - **De la iteración … a …** (∞ = sin final).
4. **Cómo se combinan varias medidas**:
   - **Se suman**.
   - **Solo cuenta la mayor**.
   - **Rendimientos decrecientes (se solapan)**.

Una medida reduce la **influencia negativa** del problema y también **las pérdidas** de sus filtros, reductores y consumidores.

**Ejemplo.** Problema con influencia −5. Dos medidas de +2 y +1 (que se suman) dejan una influencia neta de **−2**.

Por dentro, una medida es una conexión **Causal** en modalidad «Compensa / mitiga una dificultad». También puedes crearla a mano así.

---

## 14. Dimensiones del flujo

El flujo no es solo una cantidad. Tiene varias **dimensiones** independientes:

| Dimensión | Qué mide | Cómo se combina |
|---|---|---|
| **Cantidad** | Volumen que circula. | Se **suma** (y se reparte al dividir). |
| **Calidad** | Proporción con valor (0–1). | Se **promedia** ponderado por cantidad. |
| **Velocidad** | Rapidez relativa (1 = normal). | Se promedia. |
| **Potencial** | Capacidad para producir resultado (0–1). | Se promedia. |
| **Carga** | Recursos necesarios para procesarlo. | Se suma. |

**En las entradas**, abre **Dimensiones del flujo** y pulsa **Definir** en cada dimensión que quieras dar. Para cada una:

- **Valor** y **Modo** (Núm., Pond. o Cual.).
- **Nivel**, si es cualitativo.
- **Confianza**: Hipótesis, Estimación, Observado o Verificado.
- **Origen del dato**.
- En Experto, un rango **bajo / alto** para la incertidumbre.

Con **Quitar valor** borras una dimensión.

**Dimensiones propias.** Con el inspector del proyecto (nada seleccionado) → **Dimensiones del flujo** puedes añadir las tuyas: confianza, riesgo, coste, motivación… Cada una lleva:

- **Nombre** y **Unidad**.
- **Agregación**: **Suma** para magnitudes como cantidad o coste; **Media** para cualidades como calidad o confianza.
- **Mínimo**, **Máximo** y **Color**.

Una operación sobre una dimensión **nunca** cambia las demás.

---

## 15. Bifurcación y convergencia

Sección **Bifurcación y convergencia** del inspector de una burbuja.

### 15.1 Convergencia: cuando llegan varios flujos

| Regla | Efecto |
|---|---|
| **Suma** | Se suman todos. |
| **Combinación ponderada** | Se combinan según el **Peso en convergencia** de cada conexión. |
| **Prioridad** | Primero el de mayor prioridad. |
| **Máximo / Mínimo** | Solo el mayor o el menor. |
| **Deduplicación (misma entidad)** | Evita contar dos veces lo mismo que llega por dos caminos. **Solapamiento entre rutas**: 100 % = son la misma oportunidad. |
| **Fórmula personalizada** (Experto) | Escribe una fórmula con `in1`, `in2`… y `sum`, `max`, `min`, `count`. |

Las retroalimentaciones negativas (inhibición) restan en este paso.

### 15.2 Bifurcación: cómo se reparte entre varias salidas

| Reparto | Efecto |
|---|---|
| **Proporcional al peso** | Según el **Peso del reparto** de cada conexión. |
| **Porcentajes fijos** | Según el **Reparto fijo** de cada conexión. |
| **Condicionado** | Según las condiciones de paso de cada conexión. |
| **Prioritario (llena por orden)** | Llena la primera salida (por **Prioridad**) hasta su capacidad y luego la siguiente. |
| **Competitivo (por capacidad)** | En proporción a la capacidad de cada salida. |
| **Dinámico (según influencia)** | Según la influencia de un **Nodo de referencia**. |

El reparto **conserva** el flujo: lo que entra sale repartido, sin crear ni destruir nada.

---

## 16. Circuitos y retroalimentación

Un **circuito** es un ciclo: A → B → C → vuelve a A. Ejemplos: «más ventas → más recomendaciones → más llamadas».

### 16.1 Por qué no se cuelga

El motor procesa por iteraciones. **Lo que vuelve por la conexión de retorno se usa en la iteración siguiente**, así que un ciclo nunca se calcula infinitamente dentro del mismo paso. El motor detecta solo qué conexión cierra cada ciclo. También puedes elegirla tú con **Marcar como retorno**.

### 16.2 Crear un circuito

- Selecciona las burbujas **en orden** y pulsa **Crear circuito** (barra de herramientas o inspector).
- O selecciona la conexión que cierra el ciclo y pulsa **Configurar como circuito**.

### 16.3 Ajustes del circuito

| Ajuste | Qué hace |
|---|---|
| **Nombre del circuito** · **Circuito activo** | Identificarlo y activarlo o desactivarlo. |
| **% de retorno** | Qué parte vuelve al inicio. |
| **Intensidad** | Fuerza del retorno. |
| **Polaridad del retorno** | **+ Alimenta (refuerza)**: suma al destino. **− Inhibe (equilibra)**: resta al destino. |
| **Tipo de bucle** | Automático (por polaridades), Reforzador, Equilibrador o Mixto. |
| **Dimensión afectada** | Sobre qué dimensión actúa el retorno. |
| **Retardo** | Iteraciones que tarda en volver. |
| **Frecuencia** | Actúa cada N iteraciones. |
| **Persistencia** | Cuántas iteraciones dura su efecto. |
| **Saturación** | Límite suave: el efecto se aplana al acercarse a ese valor. |
| **Límite mínimo / máximo** | Límites duros. |
| **Condición** | Solo actúa si se cumple. |
| **Eliminar circuito** | Lo borra (las conexiones se quedan). |

Los circuitos detectados aparecen en **Resultados → Circuitos detectados**, clasificados como **reforzadores** (todo suma), **equilibradores** (algo frena) o **mixtos**.

---

## 17. Simular

### 17.1 Pestaña Simulación (panel inferior)

| Control | Función |
|---|---|
| ▶ **Reproducir / Pausa** (Espacio) | Anima la simulación iteración a iteración. |
| ■ **Detener** | Para y vuelve al principio. |
| ↺ **Reiniciar** | Recalcula desde el estado inicial. |
| ⏮ / ⏭ **Iteración anterior / siguiente** | Teclas **,** y **.** |
| 👣 **Paso a paso** | Avanza **elemento a elemento**. Muestra «Paso N/M: «Elemento»» y lo que ocurrió en él. |
| 💾 **Guardar esta ejecución** | Guarda el resultado en «Ejecuciones guardadas». |
| **Velocidad visual** | Lenta, Normal o Rápida. **Solo cambia la animación**: el resultado matemático es siempre el mismo. |
| **Iteraciones** | Cuántos pasos se simulan. |
| **En vivo** | Activado: recalcula al instante cada vez que cambias algo. Desactivado: pulsa **Calcular**. |
| **Barra de iteración** | Arrastra para ir a cualquier iteración. |
| **Indicadores** | Entrada, Flujo activo, Resultado y Acumulado de la iteración actual. |
| **Conservación verificada** | Confirma que no aparecen ni desaparecen unidades sin explicar. |
| **≈** | Aviso: el resultado usa interpretaciones cualitativas o hipótesis. |

### 17.2 Resultados

- **Resultado por iteración**: gráfico de Resultado, Generado y Perdido.
- **Salidas**: el **Total** y la **Última** iteración de cada salida. Sin salidas verás «Añade un elemento de tipo «Salida» para medir resultados».
- **Circuitos detectados**.
- **Supuestos, aproximaciones y avisos**: qué partes del resultado se basan en hipótesis, escalas cualitativas o efectos del marco espacial.

### 17.3 Diagnóstico

Observaciones explicables sobre la simulación actual, con severidad **Crítico**, **Atención** o **Información**. Ejemplos:

- «Pérdida principal en …».
- «Conexión saturada …».
- «… bloquea el flujo».
- «Dependencia crítica …».
- «Alta influencia: …», el parámetro que más mueve el resultado.
- «Oportunidad de recuperación …».
- «Resultados basados en hipótesis y aproximaciones».

Cada observación tiene **Localizar en el mapa**. No son certezas: dependen de tus supuestos.

### 17.4 Iteraciones

Tabla por iteración con Generado, Resultado, Perdido, En stock/cola y En tránsito. Haz clic en una fila para saltar a esa iteración. Debajo están las **Ejecuciones guardadas**.

### 17.5 Eventos

Registro de todo lo que ocurrió, con su fase («Entradas», «Filtros», «Capacidad», «Retroalimentación»…). Ejemplos: «Filtro: pasa 65 %», «Restrictor: 12 en cola». Marca **Solo la selección** para ver solo lo del elemento seleccionado.

### 17.6 Cómo leer el flujo en el lienzo

En las vistas Flujo y Simulación:

- **Grosor** = cantidad.
- **Opacidad** = calidad.
- **Partículas** = velocidad.
- **Halo** = potencial.
- Línea **roja discontinua** = bloqueada.
- **Punteada tenue** = sin flujo.

---

## 18. Escenarios, comparación, sensibilidad e incertidumbre

### 18.1 Qué es un escenario

Todos los escenarios comparten el **mismo mapa**. Un escenario guarda **solo los valores que cambias** en él. El escenario base («Situación inicial») es el punto de partida. Cambiar de escenario **nunca** modifica el modelo base.

### 18.2 Trabajar con escenarios

- **Selector de escenario** (barra superior):
  - Elegir el escenario activo.
  - **Nuevo escenario** y **Duplicar «…»**.
  - **Restaurar valores iniciales**: quita todos los cambios.
  - **Comparar escenarios…**.
- **Pestaña Escenarios** (panel inferior):
  - Lista con **Activar**, **Duplicar**, **Eliminar** y **Nombre**.
  - Los cambios del escenario activo, cada uno con **Quitar cambio**.
  - **Nuevo**, **Comparar** y **Restaurar valores iniciales**.
- **Para cambiar un valor solo en un escenario**:
  1. Activa el escenario.
  2. Edita el parámetro en el inspector. Queda marcado.
  3. Para volver al valor base, haz clic en la marca.

### 18.3 Comparar

Abre **Comparar escenarios** y elige **Escenario A** y **Escenario B**. Verás:

- **Resultado total** de A → B y la diferencia.
- **Mejoran** y **Empeoran**: elementos que suben o bajan.
- **Cuellos resueltos** y **Nuevos cuellos de botella**.
- **Cambios en circuitos**.
- **Parámetros que difieren**.
- La etiqueta «Basado en hipótesis: resultados orientativos» cuando corresponde.

### 18.4 Sensibilidad

En la pestaña **Escenarios**, **Sensibilidad: altera un parámetro y observa**:

1. Elige un **Parámetro**.
2. Pulsa **Barrer**.
3. Verás cómo cambia el **Resultado total** al mover ese parámetro.

### 18.5 Incertidumbre

1. Define rangos (favorable / desfavorable) en las dimensiones de las entradas o en los comportamientos. Necesitas el nivel **Experto**.
2. Pulsa **Calcular banda** para ver el intervalo de resultados.
3. Con **Variante del escenario** (Desfavorable, Central, Favorable) simulas el escenario con esos extremos.

---

## 19. Marco espacial (cuadrícula que computa)

**Es opcional.** Por defecto el lienzo es un **tapiz libre**: la posición no cuenta nada. Con la cuadrícula, **dónde colocas un elemento cambia su peso y su momento**.

Abre el botón de **cuadrícula (#)** de la barra superior:

1. **Modo del lienzo**: **Tapiz libre** o **Cuadrícula que computa**.
2. **Ancho de columna** y **Alto de fila** (px).
3. **Eje horizontal = tiempo**. Cada **columna** es un periodo, y la **Unidad** se puede editar (por defecto «Semana»):
   - Una **entrada** empieza a generar en su columna.
   - Entre dos elementos conectados, **cada columna de separación añade una iteración de retardo**.
   - **Penalización por «prisas»**: si un efecto está colocado **antes** que su causa, pierde ese porcentaje por cada columna de inversión, y se avisa.
   - **Fecha límite (columna)**: lo que llega después se trata según **Lo que llega tarde**:
     - **Se penaliza**: conserva el % indicado en «Conserva lo que llega tarde».
     - **No cuenta**: se descarta.
     - «Quitar fecha límite» la elimina.
4. **Eje vertical = apoyo / fricción**. La fila central es el eje:
   - **Por encima** del eje = **apoyo**: su flujo sube un **Efecto por fila** (por ejemplo, +8 % por fila) y gana **Influencia por fila**.
   - **Por debajo** = **fricción**: su flujo baja ese porcentaje y pierde influencia.

Todos estos efectos se aplican como retardos, pérdidas y comportamientos normales del motor. Aparecen explicados en **Supuestos y avisos**, en el registro de **Eventos** y en el **Monitor → Efectos del marco espacial**.

---

## 20. Termómetro de calor

Pulsa el **termómetro** de la barra superior o la tecla **H**. Cada elemento y cada zona se colorea según su «temperatura» en la iteración actual:

| Estado | Significado |
|---|---|
| **Frío** (azul) | Le falta flujo, está infrautilizado, inactivo o bloqueado. |
| **Ritmo perfecto** (verde) | Fluye sin fricción relevante. |
| **Caliente** (ámbar) | Utilización alta, pérdidas o cola creciendo. |
| **Recalentado** (rojo) | Supera su capacidad, está saturado, llega fuera de plazo o tiene prisas. |

Las causas que se muestran incluyen, por ejemplo:

- «Presión 140 % de la capacidad».
- «Infrautilizado: 20 % de la capacidad».
- «Cola creciendo».
- «Fricción: pierde 30 %».
- «Llega fuera de plazo».
- «Prisas: colocado antes que su causa».
- «Fluye sin fricción relevante».

Con la cuadrícula activa también se calienta o enfría **cada zona** (columna × fila). El Monitor incluye el termómetro completo por iteración.

---

## 21. Monitor

Botón **Monitor** de la barra superior. Es un panel visual del escenario activo, siempre calculado con el motor:

- **Indicadores**:
  - **Resultado total**.
  - **Llega al final**: % que sobrevive desde la entrada.
  - **Eficiencia global**.
  - **Se pierde**.
  - **Puntos saturados**.
  - **Tendencia**.
- **Evolución**: gráfico de Generado, Perdido y Resultado por iteración.
- **Embudo de la ruta principal**: cuánto queda en cada etapa. Necesita que una entrada esté unida a una salida con conexiones de flujo.
- **Lo que más te impulsa**: elementos que, si los quitaras, te harían **perder** resultado («perderías sin ello»).
- **Lo que más te frena**: fricciones que, si se resolvieran, te harían **ganar** («ganarías si se resolviera»).
- **Puntos neurálgicos a tratar**: los puntos críticos que conviene atender primero.
- **Fricciones identificadas y su resolución**: cuántas fricciones hay (Propias, Externas, Del sistema, Sin clasificar) y cuántas tienen ya **decisión tomada**.
- **Termómetro: dónde y cuándo se calienta**: filas = elementos; columnas = iteraciones.
- **Efectos del marco espacial**, si la cuadrícula está activa.

> El impacto se calcula **simulando el sistema sin cada elemento** y comparando con la simulación completa. El símbolo **≈** indica que depende de hipótesis.

---

## 22. «Dímelo claro»

Botón **Dímelo claro**. Es una conclusión en **lenguaje coloquial y directo**, como te lo diría un familiar cercano que te quiere bien. Se basa **solo en lo que calcula la simulación** de tu mapa tal como está ahora. No es una predicción: es lo que sale de tus supuestos.

Apartados:

- **El mapa en este momento**: tu punto real.
- **La rueda**: cómo gira el sistema y los circuitos.
- **Lo que te salva**.
- **Lo que te frena**.
- **Dónde aprieta el zapato**.
- **Lo que haría yo mañana**.

Botones:

- **Copiar** al portapapeles.
- **Markdown** (.md) y **Texto** (.txt).
- **PDF con el mapa**: el veredicto más una imagen del mapa.
- **Pulir redacción con IA**: reescribe el texto con IA **usando los mismos datos y sin cifras nuevas**. Solo funciona si hay IA configurada (sección 29). Si no, avisa: «Ningún proveedor de IA configurado: el veredicto ya está calculado sin IA». La versión pulida aparece marcada como «Redactado por IA».

---

## 23. Explorador de flujos y Creador de estrategias

Botón **Explorador** (✦). Te ayuda a **pensar antes de construir**. Hace una pregunta cada vez (solo las que cambian decisiones, no un formulario), separa lo que sabes de lo que supones y termina proponiendo un mapa que revisas antes de insertar.

### 23.1 Modo demostración y modo IA

- **Con IA configurada** (sección 29), el panel indica el proveedor y el **Modelo**.
- **Sin IA**, aparece **«Modo demostración: no hay IA conectada»** («demo · guion local»). Las preguntas y propuestas salen de un guion y de plantillas locales. **Nunca simula que una IA está respondiendo.**

### 23.2 Empezar una exploración

1. **Nueva exploración**.
2. **Modo**:
   - **Entrevista guiada**: el Explorador te pregunta.
   - **Creador de estrategias (notas, audio, documentos)**: sueltas tu plan como te salga y él construye el contexto.
3. Rellena:
   - **¿Qué quieres analizar?**, por ejemplo «clases particulares de guitarra en mi barrio».
   - **¿Qué quieres conseguir?** (opcional), por ejemplo «5 alumnos recurrentes».
   - **Idea o estrategia inicial**, por ejemplo «repartir flyers por mi zona».
   - **Contexto adicional**.
4. **Destino** de lo que se cree:
   - **Mapa actual**.
   - **Mapa nuevo**.
   - **Conectar a la burbuja seleccionada**: cierra el panel, selecciona una burbuja y vuelve a abrirlo.
5. (Opcional) **Añadir plan (Word, Excel, PDF, texto)** (sección 23.5).
6. **Iniciar la exploración**. En el Creador de estrategias el botón es **Continuar**.

Puedes empezar con muy poca información.

### 23.3 La entrevista

- Responde en el cuadro inferior. **Enter** envía y **⇧+Enter** hace un salto de línea.
- **Comandos rápidos**:
  - No lo sé
  - Dame ejemplos
  - Profundiza
  - Cuestiona mi planteamiento
  - Busca alternativas
  - Simplifica
  - Cambia de perspectiva
  - Compara opciones
  - Prepara el flujo
  - Volver a una pregunta anterior
- **Micrófono**: dicta la respuesta.
- **Descubrimientos** (panel lateral) se va llenando con:
  - Lo que ya sabemos.
  - Todavía no sabemos.
  - Supuestos por comprobar.
  - Contradicciones.
  - Decisiones pendientes.
  - Fricciones separadas en **Propias**, **Del entorno** y **Del sistema**.
  - Alternativas.
- El Explorador también detecta el tipo de caso («Parece un caso de…»: servicio local, negocio digital, proyecto personal, proceso de equipo, producto, campaña…).
- Cuando aparece **«Listo para un primer flujo»**, pulsa **Crear el flujo inicial**. Puedes pulsarlo antes si quieres.

### 23.4 Creador de estrategias

1. Escribe tu plan, **habla sin límite de tiempo** (se transcribe por tramos de 1 minuto) o **Sube audio**.
2. Pulsa:
   - **Construir contexto con IA**, que necesita IA configurada; o
   - **Plantilla estándar (sin IA)**, que usa la plantilla del tipo de idea con sus fricciones habituales.
3. **Prefiero que me hagas preguntas primero** cambia a la entrevista.

**Sobre la voz:**
- La **transcripción de archivos de audio** necesita un proveedor con audio (Gemini o compatible con OpenAI).
- Sin él, puedes usar el **dictado del navegador** (Chrome/Edge). Aviso: el navegador puede enviar el audio a su propio servicio de voz.

### 23.5 Plan maestro como base de conocimiento

Sube tu plan en **.docx, .xlsx, .pdf o .txt**. El Explorador lo trocea y, en cada turno, usa **solo los fragmentos relevantes** como guía y fuente de datos.

- Haz clic en un documento subido para abrir su ficha. Verás el **Resumen como guía**, con los objetivos, recursos, restricciones e indicadores detectados (con IA si está configurada; si no, con un análisis local por apartados).
- Puedes eliminar documentos con el icono de papelera.

**Privacidad.** Al proveedor solo se envían tus respuestas, un resumen de la exploración y los fragmentos relevantes de tus documentos. **No se envía el proyecto completo ni datos de otros proyectos.** Abre **«Qué se envió en el último turno»** para verlo exactamente.

### 23.6 Revisar e insertar la propuesta

La propuesta muestra:

- una **vista previa del mapa propuesto**;
- **A · Descripción del sistema**;
- **B · Punto de entrada**;
- **C · Variables principales**;
- **E · Rutas alternativas**;
- **F · Fricciones**;
- **G · Mitigadores**;
- **H · Retroalimentaciones**;
- **I · Métricas y experimentos**;
- **J · Incertidumbres**;
- **K · Primer experimento**: qué probar, cuánto tiempo, «Confirma si», «Cuestiona si», «Parar cuando» y «Registrar».

En cada fricción eliges ya qué harás: **Pendiente**, **Eliminar**, **Convivir**, **Compensar** u **Otra ruta**.

- **Insertar en Mapa de Flujos** crea **elementos normales**: burbujas, conexiones, comportamientos y medidas, que puedes editar y simular. **Ctrl+Z deshace toda la inserción.**
- **Seguir preguntando** vuelve a la entrevista.
- Los datos que faltan se marcan como «sin dato: se usará un índice base 100».
- Las retroalimentaciones sin porcentaje se insertan **desactivadas** (multiplicador 0) con la etiqueta «(define el %)», para que pongas tú el valor.

Cada elemento insertado lleva un **bloque de descubrimiento** en el inspector:

- **Confirmar / Dudoso / Descartar**.
- **Categoría**: Fricción propia, Fricción externa o Fricción del sistema.
- **Control**: Control directo, Influencia parcial, Dependencia externa o Incontrolable.
- **¿Qué hacemos con ella?**: Pendiente, Eliminar, Convivir, Compensar u Otra ruta. Si eliges **Compensar**, añade abajo una medida compensatoria para que el motor lo tenga en cuenta.
- **Etapa** y **Evidencia**.

### 23.7 Memoria

Cada proyecto guarda sus exploraciones: preguntas, respuestas, descubrimientos y documentos. Aparecen en la lista del Explorador. **Eliminar exploración y sus datos** las borra.

---

## 24. Guardar, versiones, exportar e importar

### 24.1 Guardado automático

Cada cambio se guarda solo en el navegador a los ~0,5 segundos. El indicador junto al nombre lo confirma. Al recargar se abre el último proyecto.

### 24.2 Deshacer

Ctrl+Z y Ctrl+⇧+Z (o Ctrl+Y). El historial guarda los últimos ~120 cambios **de la sesión actual**: al recargar la página empieza vacío. Para volver atrás después de recargar, usa las **versiones**.

### 24.3 Versiones

- **Automáticas**: cada ~5 minutos de trabajo («Guardado automático»).
- **Manuales**: Ctrl+S, o **Historial de versiones** (reloj) → escribe un nombre (opcional) → **Guardar versión**.
- **Restaurar** recupera una versión. Antes crea una versión de seguridad («Antes de restaurar»), así que también se puede deshacer.
- **Eliminar versión** con su icono.

### 24.4 Exportar (menú Importar/exportar)

| Opción | Para qué |
|---|---|
| **Proyecto completo (.json)** | Mover o compartir el proyecto con todo: nodos, conexiones, comportamientos, escenarios, capas, comentarios, adjuntos, versiones y exploraciones. |
| **Imagen PNG** / **Imagen SVG** | Imagen del mapa (SVG se puede ampliar sin perder calidad). |
| **Documento PDF** | El mapa en PDF. |
| **Copia de seguridad completa** | **Todos** tus proyectos en un solo archivo. |

### 24.5 Importar

- **Importar proyecto (.json)** desde el menú o desde la pantalla de inicio.
- **Pegar proyecto (JSON)** (menú Importar/exportar, pantalla de inicio → «Pegar JSON», o Ctrl+K): pega el texto y pulsa **Importar**. «Pegar del portapapeles» lo trae directamente. Si el texto viene de una IA con marcas ```json o frases alrededor, se limpian solas. Si hay un error, el cuadro no se cierra y un aviso explica el motivo.
- El archivo **se valida y se actualiza** si es de una versión anterior.
- Si ya tienes ese proyecto, se importa **como copia** con «(importado)» en el nombre, **sin sobrescribir** nada.
- Si el archivo tenía referencias rotas (por ejemplo, una conexión a un nodo que no existe), se reparan y se avisa.
- **Restaurar copia de seguridad** importa todos los proyectos de una copia completa.

### 24.6 Llevar tus proyectos a otro ordenador

1. En el ordenador de origen: **Importar/exportar → Copia de seguridad completa**.
2. Lleva el archivo (correo, USB, nube).
3. En el ordenador de destino: abre la aplicación → **Importar/exportar → Restaurar copia de seguridad**.

### 24.7 Duplicar un proyecto

**Menú (···) → Duplicar proyecto** crea «Nombre (copia)».

---

## 25. Ajustes del proyecto

**Menú (···) → Ajustes del proyecto**:

- **Escala ponderada**: **Mínimo** y **Máximo** (por defecto −5 y +5).
- **Escalas cualitativas (interpretación para simular)**:
  - Vienen dos: «Muy bajo → Muy alto» (0,1 · 0,3 · 0,5 · 0,7 · 0,9) y «Muy bajo → Crítico» (0,1 · 0,3 · 0,5 · 0,75 · 0,95).
  - Puedes editar cada **Nivel** y su **Interpretación** (0–1), crear una **Nueva escala** o **Eliminar escala**.
  - Los resultados que usan niveles cualitativos se marcan como aproximación.
- **Paleta semántica y leyenda**:
  - Colores de Flujo, Impulso, Pérdida, Condición, Transformación y Concepto.
  - **Mostrar leyenda** y qué elementos aparecen en ella.
  - **Restaurar elementos de la leyenda**.
- **Animación**: **Partículas de flujo** activadas o desactivadas. Si tu sistema tiene activado «reducir movimiento», la aplicación lo respeta.
- **Atajos de teclado**: cambia cualquier atajo escribiendo la combinación en su casilla con el formato `Mod+Shift+Tecla`, donde Mod = Ctrl o ⌘. Ejemplos: `Mod+Shift+K`, `Alt+P`, `H`.

---

## 26. Buscador de comandos

**Ctrl+K** o la lupa. Escribe para buscar:

- **Elementos** del mapa por nombre, descripción o etiqueta. Al elegir uno se selecciona y se centra; si estaba oculto, se muestra.
- **Comandos**:
  - Crear: burbuja, entrada, salida, nota, contenedor, circuito.
  - Editar y vistas.
  - Organizar: alinear, distribuir, distribución automática, mostrar ocultos, bloquear, clonar.
  - Paneles: Monitor, Explorador, Dímelo claro, Comparar, Historial, Ajustes, Ayuda, Manual de usuario y Manual para IA.
  - Archivo: exportar, importar y pegar proyecto (JSON).
  - Tema.

Usa ↑ ↓ para moverte, Enter para ejecutar y Escape para cerrar. La búsqueda ignora tildes.

---

## 27. Atajos de teclado

(En Mac, Ctrl = ⌘.) Puedes cambiarlos en Ajustes del proyecto.

| Acción | Atajo |
|---|---|
| **Edición** | |
| Deshacer | Ctrl+Z |
| Rehacer | Ctrl+⇧+Z · Ctrl+Y |
| Copiar · Cortar · Pegar | Ctrl+C · Ctrl+X · Ctrl+V |
| Duplicar | Ctrl+D |
| Seleccionar todo | Ctrl+A |
| Eliminar | Supr (o la tecla de borrar) |
| Agrupar · Desagrupar | Ctrl+G · Ctrl+⇧+G |
| Editar texto | Enter |
| Burbuja conectada | Tab |
| Burbuja hermana | ⇧+Enter |
| **Navegación** | |
| Buscador de comandos | Ctrl+K |
| Ajustar al contenido | F |
| Zoom a la selección | ⇧+F |
| **Herramientas** | |
| Seleccionar · Burbuja · Conexión | V · B · C |
| Nota · Entrada · Salida | N · I · O |
| **Vistas** | |
| Mental · Flujo · Energía · Sistema · Simulación | 1 · 2 · 3 · 4 · 5 |
| Termómetro de calor | H |
| **Simulación** | |
| Reproducir / pausar | Espacio |
| Siguiente · anterior iteración | . · , |
| **Proyecto** | |
| Guardar versión | Ctrl+S |
| **General** | |
| Cancelar herramienta, selección, rastreo y enfoque | Escape |

Los atajos no actúan mientras escribes en un campo de texto.

---

## 28. El proyecto de demostración

**«SISTEMA DE ÉXITO COMERCIAL — OPERADOR DE SEGUROS DE HOGAR»**. Todos sus valores son **ficticios** y sirven para aprender.

- **Flujo principal**: Llamadas recibidas → Clasificación de llamadas → Llamadas útiles / no útiles → Capacidad del operador → Conversación comercial → Objeciones → Cierre → Ventas.
- **Factores**: Calidad de oportunidad, Tiempo disponible, Formación, Motivación, Fricción tecnológica, Argumentario.
- **Circuitos**: Recuperación de oportunidades, Aprendizaje y Mejora del sistema.
- **Escenarios**:
  - **A** · Situación inicial.
  - **B** · Mejorar la clasificación (el filtro deja pasar un 75 %).
  - **C** · Aumentar la formación (más influencia y más mitigación de la fricción).
  - **D** · Reducir la fricción tecnológica.
  - **E** · Combinar mejoras (B + C + D).

**Prueba esto:**
1. Pulsa ▶.
2. Cambia de escenario y observa el resultado.
3. Abre **Comparar escenarios** entre A y E.
4. Abre el **Monitor** y **Dímelo claro**.

---

## 29. Activar la IA real

Sin IA todo funciona (el Explorador en modo demostración). Para usar IA real:

### En la versión publicada en Vercel

1. Consigue una clave de API, por ejemplo de **Google Gemini** en Google AI Studio.
2. En **vercel.com** abre el proyecto `mapa-flujos-workflow` → **Settings → Environment Variables**.
3. Añade `GEMINI_API_KEY` con tu clave (entornos: Production, y si quieres Preview).
4. **Deployments** → en la última publicación → **Redeploy**.
5. Abre el Explorador: debe mostrar el proveedor y el modelo en lugar de «Modo demostración».

### Otros proveedores

| Proveedor | Variables |
|---|---|
| Google Gemini | `GEMINI_API_KEY` (opcional `GEMINI_MODEL`; si no lo indicas, se elige solo el modelo «flash» vigente). |
| OpenAI o cualquier API compatible (Mistral, Groq, OpenRouter, DeepSeek, Ollama, LM Studio…) | `EXPLORER_PROVIDER=openai`, `OPENAI_API_KEY`, `EXPLORER_BASE_URL` (por ejemplo `https://api.openai.com/v1`) y opcionalmente `OPENAI_MODEL` y `EXPLORER_TRANSCRIBE_MODEL` (por ejemplo `whisper-1`). |
| Anthropic Claude | `EXPLORER_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` (opcional `ANTHROPIC_MODEL`). |
| Genéricas | `EXPLORER_API_KEY` y `EXPLORER_MODEL` se aplican al proveedor elegido. |
| Límite | `EXPLORER_RATE_LIMIT` (peticiones por minuto y por IP; por defecto 40). |

**Seguridad.** La clave **solo vive en el servidor**. Nunca llega al navegador, ni se guarda en el almacenamiento local, ni en el código de la página.

---

## 30. Instalarla en tu ordenador (opcional)

Solo si quieres ejecutarla sin internet o modificarla.

1. Instala **Node.js 22.18 o superior** desde nodejs.org.
2. Descarga el código: el ZIP del proyecto o el repositorio de GitHub `nagotpicon/MapaFlujosWorkflow`.
3. Abre una terminal en la carpeta del proyecto e instala las dependencias:

   ```bash
   npm ci
   ```

4. Para usarla con recarga automática (desarrollo), en `http://localhost:5173`:

   ```bash
   npm run dev
   ```

5. O compílala:

   ```bash
   npm run build
   ```

   Y sírvela en `http://localhost:4321`:

   ```bash
   npm start
   ```

6. Para la IA, copia la plantilla de configuración, rellena tu clave en el archivo `.env` y reinicia:

   ```bash
   cp .env.example .env
   ```

---

## 31. Problemas frecuentes

| Problema | Solución |
|---|---|
| **El enlace pide iniciar sesión en Vercel.** | El propietario debe desactivar la protección: Vercel → Settings → Deployment Protection → Vercel Authentication → Desactivado o Standard Protection. |
| **No veo mis proyectos.** | Están en el navegador y ordenador donde los creaste. Usa ese navegador, o importa una copia de seguridad. |
| **La simulación da 0.** | Revisa que haya una **Entrada** con Cantidad, que esté unida a una **Salida** por conexiones de tipo **Flujo** (no Causal ni Idea) y que ningún filtro o condición lo bloquee. Mira **Diagnóstico** y **Eventos**. |
| **No aparecen las opciones de comportamientos o condiciones.** | Sube la **Profundidad** a Avanzado o Experto (inspector sin selección). |
| **Las conexiones Causales no transportan nada.** | Es correcto: modifican, no transportan. Usa conexiones de **Flujo** para transportar. |
| **Un elemento ha desaparecido.** | Puede estar oculto, plegado, en una capa oculta o filtrado por etiqueta. Prueba «Mostrar ocultos», **Quitar filtro** o busca con Ctrl+K. |
| **No puedo mover un elemento.** | Está **bloqueado** o en una **capa bloqueada**. |
| **El Explorador dice «Modo demostración».** | No hay clave de IA configurada en el servidor (sección 29). |
| **«Pulir redacción con IA» no hace nada.** | Igual: necesita IA configurada. |
| **No transcribe mis audios.** | Hace falta un proveedor con audio (Gemini o compatible con OpenAI). Alternativa: usa el dictado del navegador (Chrome/Edge). |
| **«No se pudo importar» al pegar el JSON de una IA.** | El aviso dice qué campo falla. Pide a la IA que lo corrija con el prompt **P4 · Reparar un JSON que no se importa** del MANUAL-IA, pegándole el aviso. |
| **«Error al guardar».** | El navegador puede estar sin espacio o en modo privado. Exporta el proyecto en JSON por seguridad y libera espacio. |
| **Ctrl+Z no recupera lo de ayer.** | El deshacer no sobrevive a recargar la página. Usa **Historial de versiones → Restaurar**. |
| **El resultado tiene «≈».** | Usa niveles cualitativos o hipótesis. Es orientativo, no un dato exacto. |
| **La posición cambia mis resultados.** | La **cuadrícula que computa** está activa. Vuelve a **Tapiz libre** si no lo quieres. |

---

## 32. Recetas rápidas

### A. Mapa mental puro (sin números)

1. **Empezar en blanco**.
2. Escribe la idea central: doble clic en la burbuja.
3. **Tab** para crear ramas y **⇧+Enter** para crear hermanas.
4. Conecta ideas con conexiones **Idea**.
5. Organiza con grupos, colores y **Distribución automática**.

### B. Embudo simple que se simula

1. Pulsa **I** y haz clic: crea la entrada «Contactos». En **Dimensiones del flujo → Cantidad**, pulsa **Definir** y pon 100.
2. Crea la burbuja «Interesados» y añade el comportamiento **Filtro** con Pasa 30 %.
3. Crea la burbuja «Citas» y añade un **Restrictor** con capacidad 10.
4. Pulsa **O** y crea la salida «Clientes».
5. Conecta todo con conexiones de **Flujo** en ese orden.
6. Pulsa ▶. Mira **Resultados**, **Diagnóstico** y el **Monitor**.

### C. Una fricción y su remedio

1. Crea «Falta de tiempo» con **Influencia** −3 (Pond.).
2. Conéctala con una conexión **Causal** (Modula) a «Citas».
3. En «Falta de tiempo» → **Mitigadores → Nueva medida compensatoria** → renómbrala «Agenda fija», con Cantidad 2 pt.
4. Compara el resultado con y sin la medida usando un **escenario**.

### D. Probar una idea sin estropear el original

1. Selector de escenario → **Nuevo escenario**.
2. Cambia los valores que quieras.
3. **Comparar escenarios** con la Situación inicial.

### E. Planificar en el tiempo con fecha límite

1. Activa la **Cuadrícula que computa**, con Unidad «Semana».
2. Coloca cada paso en su columna.
3. Pon la **Fecha límite** en la columna 8 con «Se penaliza» (conserva 50 %).
4. Activa el **termómetro (H)** para ver qué se recalienta.

### F. Que una IA te construya el mapa

1. Abre `docs/MANUAL-IA.md` y copia en tu IA el **Prompt maestro** y el prompt **P2 · Generar un proyecto importable**, rellenando tu idea.
2. Copia la respuesta de la IA, aunque traiga texto alrededor.
3. En la aplicación: **Pegar JSON** (inicio) o **Importar/exportar → Pegar proyecto (JSON)** → pega → **Importar**.
4. Pulsa ▶ y revisa el resultado.

### G. De un plan escrito a un mapa

1. **Explorador → Nueva exploración → Creador de estrategias**.
2. Sube tu plan (.docx, .pdf…) o díctalo.
3. Pulsa **Construir contexto con IA** o **Plantilla estándar (sin IA)**.
4. Revisa las fricciones, decide qué harás con cada una e **Insertar en Mapa de Flujos**.

---

## 33. Glosario

| Término | Definición |
|---|---|
| **Acumulador / stock** | Lo que se guarda en un elemento para más adelante. |
| **Bifurcación** | Reparto de un flujo entre varias salidas. |
| **Circuito / bucle** | Ciclo de elementos. **Reforzador** si se amplifica, **equilibrador** si se frena, **mixto** si tiene de las dos cosas. |
| **Compensación / mitigador** | Medida que reduce el efecto negativo de una fricción. |
| **Conservación** | Comprobación de que todo lo que entra se explica: o sale, o se pierde, o se consume, o queda en stock o en tránsito. |
| **Convergencia** | Cómo se combinan varios flujos que llegan a un mismo elemento. |
| **Dimensión** | Cada característica independiente del flujo (cantidad, calidad…). |
| **Escenario** | Variante del mapa que guarda solo sus cambios. |
| **Extensiva / intensiva** | Dimensión que se suma (cantidad) o que se promedia (calidad). |
| **Fricción** | Algo que frena o hace perder flujo. Puede ser **propia**, **externa (del entorno)** o **del sistema**. |
| **Influencia** | Cuánto modifica un elemento a otros, de −5 a +5 por defecto. |
| **Iteración** | Paso de tiempo de la simulación. |
| **Marco espacial** | Cuadrícula opcional donde la posición significa tiempo (columnas) y apoyo/fricción (filas). |
| **Retorno** | Conexión que cierra un ciclo. Entrega en la iteración siguiente. |
| **Termómetro** | Coloración por «temperatura»: frío, ritmo perfecto, caliente o recalentado. |
