# Mapa de Flujos — Manual de usuario

Guía completa para personas. Explica, en orden, todo lo que puedes hacer con la aplicación: desde abrirla por primera vez y dejar que la **Brújula** te pregunte (modo fácil: secciones 3 y 4, pensado para que lo entienda un niño de 8 años) hasta las herramientas del nivel experto (probar, «¿Y si…?», Marcador, «Ayúdame a pensar» con el ACLARATOR y el COPYWRITER…) y guardar tu trabajo.

> **Dónde leer este manual:** en la web, en **https://mapa-flujos-workflow.vercel.app/manual/**. Dentro de la aplicación, con el botón **Manual** de la barra superior, en **Menú (···) → Manual de usuario**, en **Ayuda** o en la pantalla de inicio. En GitHub, en `docs/MANUAL-USUARIO.md`. El manual para IA está en **/manual-ia/**.

> **Convención de teclas.** «Ctrl» en Windows y Linux equivale a «⌘ (Cmd)» en Mac. Cuando leas **Ctrl+Z**, en Mac es **⌘Z**. «⇧» es la tecla Mayúsculas y «Supr» es la tecla Suprimir (en Mac, la tecla de borrar).

---

## Índice

1. [Qué es Mapa de Flujos](#1-qué-es-mapa-de-flujos)
2. [Cómo abrir la aplicación](#2-cómo-abrir-la-aplicación)
3. [Pantalla de inicio](#3-pantalla-de-inicio)
4. [El modo fácil: Pensar y Camino](#4-el-modo-fácil-pensar-y-camino)
5. [Crear y editar elementos](#5-crear-y-editar-elementos)
6. [Uniones (conexiones)](#6-uniones-conexiones)
7. [Organizar el mapa](#7-organizar-el-mapa)
8. [Las cinco vistas](#8-las-cinco-vistas)
9. [Detalles (el panel de la derecha)](#9-detalles-el-panel-de-la-derecha)
10. [Peso, influencia e impacto](#10-peso-influencia-e-impacto)
11. [Comportamientos](#11-comportamientos)
12. [Condiciones](#12-condiciones)
13. [Mitigadores y compensaciones](#13-mitigadores-y-compensaciones)
14. [Dimensiones del flujo](#14-dimensiones-del-flujo)
15. [Bifurcación y convergencia](#15-bifurcación-y-convergencia)
16. [Bucles (circuitos) y retroalimentación](#16-bucles-circuitos-y-retroalimentación)
17. [Simular (Probar)](#17-simular-probar)
18. [«¿Y si…?», comparar, sensibilidad e incertidumbre](#18-y-si-comparar-sensibilidad-e-incertidumbre)
19. [Cuadrícula del tiempo (marco espacial)](#19-cuadrícula-del-tiempo-marco-espacial)
20. [Termómetro de calor](#20-termómetro-de-calor)
21. [Marcador](#21-marcador)
22. [«Dímelo claro»](#22-dímelo-claro)
23. [«Ayúdame a pensar»: preguntas, plan, ACLARATOR y COPYWRITER](#23-ayúdame-a-pensar-preguntas-plan-aclarator-y-copywriter)
24. [Guardar, versiones, exportar e importar](#24-guardar-versiones-exportar-e-importar)
25. [Ajustes del mapa](#25-ajustes-del-mapa)
26. [Buscador de comandos](#26-buscador-de-comandos)
27. [Atajos de teclado](#27-atajos-de-teclado)
28. [Los mapas de ejemplo](#28-los-mapas-de-ejemplo)
29. [Activar la IA real](#29-activar-la-ia-real)
30. [Instalarla en tu ordenador (opcional)](#30-instalarla-en-tu-ordenador-opcional)
31. [Problemas frecuentes](#31-problemas-frecuentes)
32. [Recetas rápidas](#32-recetas-rápidas)
33. [Glosario](#33-glosario)

---

## 1. Qué es Mapa de Flujos

Mapa de Flujos es dos cosas a la vez:

- **Un editor de mapas mentales.** Escribes ideas, las unes, las agrupas y las ordenas con total libertad.
- **Un simulador.** Si quieres, esas ideas cobran vida. Por las uniones circula un **flujo** (por ejemplo: clientes, llamadas, dinero, horas…). Cada idea puede filtrarlo, multiplicarlo, frenarlo, guardarlo o repartirlo. La aplicación calcula, ronda a ronda, cuánto llega a tu meta, dónde se pierde y por qué.

Puedes usarla solo como mapa mental, solo como simulador o combinando ambas cosas. Nada te obliga a rellenar números.

**Ideas clave**

| Concepto | Qué significa |
|---|---|
| **Idea** | Una idea o un paso del proceso. |
| **Inicio** | De donde sale todo: genera flujo («llamadas recibidas», «flyers repartidos»…). |
| **Meta** | Lo que quieres conseguir: donde termina el flujo y se mide el resultado («ventas», «alumnos que pagan»…). |
| **Unión** | Una línea entre dos ideas. Puede mover flujo (**Pasa**) o solo expresar una relación. |
| **Ronda** | Un «paso de tiempo» al probar (una semana, un mes… tú decides qué representa). |
| **«¿Y si…?»** | Una variante del mismo mapa con algunos valores cambiados («¿y si contrato a alguien?»). |

### Nombres sencillos que verás en pantalla

La aplicación usa palabras sencillas. En algunos apartados técnicos de este manual aparece también el nombre clásico entre paréntesis:

| En pantalla | Nombre clásico |
|---|---|
| 🌱 Hoy (modo fácil) · Inicio (nivel 3) | Entrada |
| 🎯 Lo que quiero (modo fácil) · Meta (nivel 3) | Salida |
| 👣 Paso | Burbuja en el camino |
| 🪨 Piedra | Burbuja con influencia negativa (fricción) |
| 🤝 Ayuda | Remedio (mitigador) |
| Empujones | Cantidad de flujo (10 por vuelta) |
| Idea | Burbuja |
| Unir / unión | Conexión |
| Pasa · Influye · Info · Idea (tipos de unión) | Flujo · Causal · Informativa · Conceptual |
| Probar · Ronda | Simular · Iteración |
| ¿Y si…? | Escenario |
| Marcador | Monitor |
| Ayúdame a pensar | Explorador |
| Detalles | Inspector |
| Pistas · Qué ha pasado | Diagnóstico · Eventos |
| Qué hace · Cuándo funciona · Remedios | Comportamientos · Condiciones de activación · Mitigadores |
| Cuánto empuja o frena | Peso e influencia |
| Cómo reparte y cómo junta | Bifurcación y convergencia |
| Zona · Bucle | Contenedor · Circuito |
| Vistas Ideas · Recorrido · Fuerzas · Piezas · Película | Mental · Flujo · Energía · Sistema · Simulación |

---

## 2. Cómo abrir la aplicación

### En internet (recomendado)

Abre **https://mapa-flujos-workflow.vercel.app** en Chrome, Edge, Firefox o Safari, en el ordenador. No hace falta cuenta.

Se abre en **blanco roto** (la paleta cálida de Claude, con detalles de madera clara). Si prefieres el modo oscuro, pulsa el botón del sol en la barra de arriba → **Oscuro** (o **Como mi ordenador**).

> Si al abrir el enlace te pide iniciar sesión en Vercel, el propietario debe desactivar la protección del proyecto: en Vercel, abre **Settings → Deployment Protection → Vercel Authentication** y elige **Desactivado** o **Standard Protection**.

### Dónde se guarda tu trabajo

**Todo se guarda en tu navegador**, en el ordenador que estás usando. No se sube a ningún servidor. Esto implica:

- Si abres la aplicación en otro ordenador o en otro navegador, **no verás tus proyectos**. Para llevarlos, usa **Exportar** o **Copia de seguridad completa** (sección 24).
- Si borras los datos del navegador («borrar datos de sitios», «cookies y datos de sitios»), **perderás los proyectos**. Haz copias de seguridad de vez en cuando.
- En una ventana de incógnito los datos desaparecen al cerrarla.

---

## 3. Pantalla de inicio

Al abrir la aplicación casi no hay nada: una pregunta y un cuadro para escribir.

1. Arriba pone **«¿Qué te ronda la cabeza?»**.
2. Escribe tu idea como te salga, aunque no la tengas clara: un problema, un sueño, algo que quieres. Si no se te ocurre nada, toca uno de los ejemplos de debajo (**Por ejemplo:** «Quiero sacar mejor nota en mates», «Quiero ganar dinero con mis dibujos», «Me cuesta hacer amigos», «Quiero cambiar de trabajo»): se escribe en el cuadro y puedes cambiarlo.
3. Pulsa **Empezar** (o Enter).

Se crea un mapa con tu idea en el centro, en letra grande, y empiezas en el **nivel 1 · Pensar**. Desde ese momento la **Brújula** te va preguntando (sección 4).

Debajo hay cuatro botones:

| Botón | Qué hace |
|---|---|
| **Prefiero que me hagas preguntas** | Abre un mapa vacío y la Brújula empieza preguntando «¿Qué te ronda la cabeza?». |
| **Ver un ejemplo** | Abre el ejemplo sencillo **«Vender mis dibujos»**: un camino con pasos, piedras y ayudas (sección 28). |
| **Pegar un mapa** | Abre un cuadro para pegar el texto JSON de un mapa, por ejemplo uno hecho por una IA con el MANUAL-IA. |
| **Abrir un archivo** | Abre un archivo `.json` guardado antes. |

Si ya tienes mapas guardados, aparece **Tus mapas**: el nombre, cuántas ideas tiene y la fecha. Haz clic para abrir uno. La papelera lo borra después de un segundo clic de confirmación («¿Seguro? No se puede deshacer»).

Abajo están el enlace **Ejemplo para expertos** (el mapa grande de un operador de seguros, para el nivel 3) y los enlaces al **Manual de usuario** y al **Manual para IA**.

Si ya trabajaste antes, la aplicación abre directamente **el último mapa** que usaste. Para volver a tus mapas, haz clic en el **logotipo** (arriba a la izquierda) o usa **Más opciones (···) → Mis mapas…**.

---

## 4. El modo fácil: Pensar y Camino

La aplicación está hecha para que cualquiera, también un niño de 8 años, la use **a la primera, sin que nadie se lo explique**. Para eso tiene tres niveles; los dos primeros son el **modo fácil**:

| Nivel | Qué ves | Para qué sirve |
|---|---|---|
| **1 · Pensar** | Tu idea, la Brújula y una bandeja con 💡 Idea, 🔗 Unir y 🧹 Ordenar. | Soltar lo que tienes en la cabeza, sin orden. |
| **2 · Camino** | Además: el **camino** (🌱 Hoy → 👣 pasos → 🎯 lo que quiero), las 🪨 **piedras**, las 🤝 **ayudas**, el **medidor** de arriba y **Lo que he descubierto**. | Ver cómo llegar de cómo está la cosa hoy a lo que quieres, qué te frena y qué te ayuda. |
| **3 · Experto** | Todas las herramientas (secciones 5 a 27). | Afinar mucho: rondas, comportamientos, condiciones, «¿Y si…?», cuadrícula… |

- El selector de nivel está arriba, en una bandeja de madera. El nivel se **guarda con cada mapa**.
- **No hace falta cambiar de nivel a mano**: cuando le dices a la Brújula lo que quieres conseguir o lo que te preocupa, pasa sola a **2 · Camino** y te avisa («🎯 ¡Ya sabes a dónde quieres llegar! Ahora vamos a ver el camino.»).
- Un mapa pegado o importado con inicio y meta, o el ejemplo, se abre en el nivel 2.
- Bajar de nivel no borra nada: solo esconde herramientas.

> En este manual, las funciones que solo están en el nivel 3 lo indican. Si no ves algo, pulsa **3 · Experto**.

### 4.1 La idea del camino

Todo el modo fácil se basa en una sola imagen:

```
🌱 Hoy ──▶ 👣 paso ──▶ 👣 paso ──▶ 🎯 Lo que quiero
                ▲
            🪨 piedra ◀── 🤝 ayuda
```

- **🌱 Hoy**: cómo está la cosa ahora. De aquí salen tus **10 empujones** (tus ganas, tu fuerza) en cada vuelta.
- **👣 Pasos**: lo que harás para llegar, en orden.
- **🎯 Lo que quiero**: a dónde quieres llegar. Aquí se cuenta **cuántos de cada 10 empujones llegan**.
- **🪨 Piedras**: lo que te frena. Cada piedra se queda con parte de los empujones del paso que frena: una **pequeña** deja pasar 9 de cada 10; una **mediana**, 7; una **grande**, 5. Si hay varias, se notan todas.
- **🤝 Ayudas**: algo o alguien que hace más pequeña una piedra. Una ayuda de **un poco** la reduce un poco; **bastante**, más; **mucho**, casi del todo.
- **💛 Por qué me importa**, **❤️ Cómo me siento**, **❓ Pregunta** y **💡 Idea**: no cambian la cuenta, pero te ayudan a pensar y salen en tu plan.

La cuenta la hace el mismo motor que el nivel experto: no es un adorno.

### 4.2 La Brújula 🧭

Es la tarjeta de abajo. **Te hace una sola pregunta cada vez** y siempre dice **por qué** te la hace (la línea que empieza por 💬). Contestas ahí mismo:

- Si hay un cuadro, escribe y pulsa **Añadir** (o Enter). Lo que escribes aparece en el mapa, **ya colocado y unido** donde toca.
- Si hay botones, toca uno.
- El botón de la derecha (**Saltar**, **Ya está**, **Nada**, **No**, **Todavía no**…) pasa a la siguiente.
- La **×** la esconde; vuelve con el botón **🧭 Brújula** de abajo a la izquierda.

Las preguntas siguen el orden en que pensamos las personas cuando queremos arreglar algo. Solo aparece la que tiene sentido en cada momento:

| Pregunta | Para qué (lo que dice la Brújula) |
|---|---|
| ¿Qué te ronda la cabeza? | Todo empieza por una idea. No tiene que estar clara ni ser perfecta. |
| «…»… ¿qué es para ti? (🎯 Algo que quiero conseguir · 😟 Algo que me preocupa · 💭 Solo quiero pensar en ello) | Así sé por dónde empezar a ayudarte. |
| ¿Qué más se te ocurre sobre «…»? (con 💭) | Soltar ideas sin pensarlo mucho ayuda a ver cosas que no veías. |
| ¿Alguna de estas ideas es algo que te gustaría conseguir? | Cuando sabes lo que quieres, el mapa te ayuda a llegar. |
| Si esto se arreglara, ¿cómo sería? | Si sabes a dónde vas, es más fácil encontrar el camino. |
| ¿Y cómo está la cosa hoy? | Para saber desde dónde sales. |
| ¿Por qué es importante para ti «…»? | Tus razones te darán fuerza cuando cueste. |
| ¿Qué podrías hacer para llegar a «…»? · ¿Y después de «…», qué harías? | Las cosas grandes se hacen con pasos pequeños. |
| ¿Qué te puede frenar o salir mal? | Si sabes qué te puede frenar, puedes prepararte antes. |
| ¿Cómo de grande es la piedra «…»? (Pequeña · Mediana · Grande) | Las piedras grandes frenan más. |
| ¿Qué paso frena «…»? | Así sabes en qué parte del camino tener cuidado. |
| ¿Qué o quién te podría ayudar con «…»? · ¿Cuánto te ayudaría? | Casi todo es más fácil con ayuda. |
| ¿Hay algo más que te pueda frenar? | Mejor verlo ahora que encontrártelo de golpe. |
| ¿Cuál es el paso más pequeñito que podrías hacer ya, mañana mismo? | Empezar por algo pequeño hace que empieces de verdad. |
| ¿Cómo te sientes con todo esto? (😀 Con ganas · 😐 Normal · 😟 Con miedo · 😵 Hecho un lío) | Lo que sientes también cuenta. Si dices «con miedo», te propone ponerlo como piedra para buscarle ayuda. |
| ¿Hay algo que no sepas y te gustaría averiguar? | Saber qué te falta saber también es avanzar. |
| ¡He descubierto cosas en tu mapa! | Abre «Lo que he descubierto» (sección 4.6). |
| ¿Ya has hecho «…»? (✅ ¡Hecho!) | Marcar lo que haces te enseña cuánto has avanzado. |
| ¡Has hecho todos tus pasos! ¿Has conseguido «…»? | Si todavía no, te pregunta qué falta y lo añade como paso. |
| ¿Quieres ver tu plan? | Abre «Mi plan» (sección 4.7). |

Al final te deja seguir a tu aire: «Puedes seguir: añade pasos, piedras o ayudas con los botones de abajo», con **Lo que he descubierto** y **Hazme más preguntas** (vuelve a preguntar lo que saltaste).

### 4.3 La bandeja de madera

Abajo, en el centro. Cada botón crea la cosa **ya colocada y unida**, y lista para escribir (escribe y pulsa Enter):

| Botón | Nivel | Qué hace |
|---|---|---|
| **💡 Idea** (B) | 1 y 2 | Una idea nueva. En el nivel 1, unida a la idea que tengas elegida (o a la del centro). |
| **👣 Paso** | 2 | Un paso más en el camino: detrás del paso que tengas elegido, o al final (antes de lo que quieres). |
| **🪨 Piedra** | 2 | Algo que te frena. Frena el paso que tengas elegido (o el último). |
| **🤝 Ayuda** | 2 | Algo o alguien que te ayuda. Va a la piedra elegida (o a la piedra que más te frena y no tiene ayuda). |
| **🔗 Unir** (C) | 1 y 2 | Arrastra desde el borde de una cosa hasta otra. El significado sale solo: de un paso a otro es camino; de una piedra a un paso, «frena»; de una ayuda a una piedra, «ayuda»; lo demás, «tienen que ver». |
| **🧹 Ordenar** | 1 y 2 | Coloca todo en su sitio: el camino en fila, las piedras encima de lo que frenan y las ayudas encima de sus piedras. Se puede deshacer. |

Más atajos del modo fácil:

- **Tab** con algo elegido añade **lo siguiente con sentido**: después de Hoy o de un paso, otro paso justo detrás; después de lo que quieres, un paso al final; después de una piedra, una ayuda para ella; después de una idea, otra idea unida.
- **Supr** (o **Quitar** en los detalles) borra sin romper el camino: los pasos de alrededor se vuelven a unir y las piedras de un paso borrado pasan a frenar el siguiente.
- **Doble clic** en el lienzo: una idea donde hagas clic.
- **Clic derecho** en el lienzo: 💡 Nueva idea y, en el nivel 2, 👣 Nuevo paso, 🪨 Nueva piedra y 🤝 Nueva ayuda; también Pegar, Deshacer, Verlo todo y Ordenar el mapa.

### 4.4 El medidor (nivel 2)

Arriba, en el centro: **«🎯 Llegan 7 de cada 10»** con diez bolitas (verdes si llegan 8 o más; ámbar de 5 a 7; rojas por debajo de 5).

- Se recalcula solo cada vez que cambias algo. Cuando sube o baja, enseña un momento cuánto («+2 🎉» o «−1»).
- Si todavía no se puede medir, te dice qué falta: «Pon lo que quieres conseguir 🎯», «Pon cómo está la cosa hoy 🌱» o «Une Hoy con lo que quieres, paso a paso 👣».
- **¿Por qué?** (o un clic en el medidor) abre **Lo que he descubierto**.
- En el camino, cada línea lleva un numerito con los empujones que pasan por ella: así ves dónde se pierden.

### 4.5 Los detalles fáciles (derecha)

Aparecen **solo cuando eliges algo** (clic en una idea o en una línea).

**Una idea, en el nivel 1:** **Lo que pone**, dos botones grandes (**🎯 Algo que quiero conseguir** y **😟 Algo que me preocupa (cómo está hoy)**: los dos empiezan el camino), **¿Quieres apuntar algo más?**, **Color** y **Quitar**.

**Una idea, en el nivel 2:**

- **Lo que pone** y, arriba, el dibujo y el nombre de lo que es (por ejemplo, 🪨 Piedra) con **Quitar**.
- **¿Qué es esto?**: nueve botones (👣 Paso, 🪨 Piedra, 🤝 Ayuda, 🎯 Lo que quiero, 🌱 Hoy, 💡 Idea, 💛 Por qué me importa, ❤️ Cómo me siento, ❓ Pregunta), con una frase que dice para qué sirve. Al cambiarlo, el mapa se recoloca solo. Solo hay un «Hoy» y un «Lo que quiero»: si eliges otro, el anterior vuelve a ser una idea.
- Según lo que sea:
  - **🪨 Piedra**: **¿Cómo de grande es?** (Pequeña · Mediana · Grande) y **¿Qué frena?** (los pasos y lo que quieres). Debajo te dice cuánto te quita: «Esta piedra te quita 3 de cada 10 empujones».
  - **🤝 Ayuda**: **¿Con qué piedra te ayuda?** y **¿Cuánto te ayuda?** (Un poco · Bastante · Mucho). Debajo: «Gracias a esta ayuda llegan 2 empujones más de cada 10».
  - **👣 Paso**: **⭐ Es mi primer paso**, **✅ ¡Ya lo he hecho!** y **Orden: Antes / Después** (paso N de M). Debajo: «Aquí llegan N de cada 10 empujones».
  - **🎯 Lo que quiero**: **🎉 ¡Lo he conseguido!** y cuántos llegan.
  - **🌱 Hoy**: «De aquí salen tus 10 empujones en cada vuelta».
- **¿Quieres apuntar algo más?**: tus notas.
- **Color**, solo en las ideas.

**Una línea:** «Une A con B», qué significa («Es parte del camino», «A frena a B», «A ayuda con B» o «Solo dice que tienen que ver»), **¿Quieres escribir algo en la línea?** y **Quitar la línea**.

En el mapa, cada cosa lleva su dibujo delante (🌱 👣 🎯 🪨 🤝 💛 ❤️ ❓ 💡) y, detrás, ⭐ si es tu primer paso, ✅ si ya está hecho y 🎉 si lo has conseguido.

### 4.6 Lo que he descubierto 🔍

Botón **Lo que he descubierto** de la barra superior (niveles 1 y 2), **¿Por qué?** del medidor o la pregunta de la Brújula. Es el análisis del mapa contado fácil:

- Arriba, en grande, cuántos llegan de cada 10 y cuántos se quedan por el camino.
- Debajo, lo que he visto, por ejemplo:
  - «🪨 «…» es tu piedra más grande: te quita 3 de cada 10.» (Si nadie te ayuda con ella, **🧭 Pregúntame** hace que la Brújula te pregunte quién podría ayudarte.)
  - «✨ Si quitaras todas las piedras, llegarían 10 de cada 10.»
  - «🤝 «…» es tu mejor ayuda: sin ella perderías 2 de cada 10.»
  - «⛰️ «…» tiene 2 piedras encima: es la parte más difícil del camino.»
  - «🕳️ En «…» se pierden N de cada 10.» (en mapas hechos en el nivel 3)
  - «🪨 Aún no has pensado qué te puede frenar.» · «⭐ Aún no has elegido tu primer paso.» · «⭐ Tu primer paso: «…».»
  - «✅ Llevas N de M pasos hechos.» · «🎉 ¡Has conseguido «…»!»
  - «🤝 «…» todavía no ayuda con ninguna piedra.» · «🪨 «…» no frena ningún paso.» · «👣 «…» no está en el camino.»
  - «💡 Tienes N ideas sueltas.» · «❓ Te falta averiguar: «…».» · «💛 Lo haces porque: «…».» · «❤️ Te sientes: «…».»
- **Verlo en el mapa** te lleva a esa cosa. **Ver mi plan** abre tu plan.

Se calcula con tu mapa tal como está: si cambias algo, vuelve a mirar.

### 4.7 Mi plan 📋

Tu mapa en pocas líneas, para tenerlo a mano:

- **Contado como a un amigo**: «Quieres «…». Ahora mismo: «…». Para llegar: «…», luego «…». Lo que más te puede frenar: «…». Te puede ayudar: «…». Empieza por «…»: es pequeño y puedes hacerlo pronto. ¡Tú puedes!» (con tus palabras, tal cual las escribiste).
- La lista: 🎯 Quiero, 🌱 Hoy, 💛 Porque, 👣 Mis pasos (con ⭐ y ✅), 🪨 Lo que me puede frenar (con su tamaño y quién te ayuda), ❓ Me falta averiguar, ❤️ cómo te sientes y 📊 cuántos llegan.
- **Copiar** y **Descargar** (archivo de texto).

### 4.8 La barra superior

| Elemento | Nivel | Función |
|---|---|---|
| **Logotipo** | todos | Abre **Mis mapas**. |
| **Nombre del mapa** | todos | Clic para cambiarlo. Enter confirma y Escape cancela. En los ejemplos aparece «Ejemplo». |
| **Punto de guardado** | todos | Verde: guardado. Parpadea: guardando. Rojo: no se ha podido guardar (pasa el ratón para ver el motivo). |
| **Selector de nivel** | todos | 1 · Pensar · 2 · Camino · 3 · Experto. |
| **«¿Y si…?»** | 3 | Pruebas sin estropear el original (sección 18). |
| **Vista** | 3 | Ideas · Recorrido · Fuerzas · Piezas · Película (sección 8). Teclas **1** a **5**. |
| **Ayúdame a pensar** (✦) | todos | Modos de trabajo con más preguntas: entrevista, plan, ACLARATOR y COPYWRITER (sección 23). |
| **Lo que he descubierto** (🔍) | 1 y 2 | Sección 4.6. |
| **Dímelo claro** | 3 | Lo que sale de tu mapa, sin rodeos (sección 22). |
| **Marcador** | 3 | Qué te ayuda, qué te frena y qué arreglaría primero (sección 21). |
| **Manual** (📖) | todos | Abre este manual en otra pestaña. |
| **Cuadrícula del tiempo** (#) | 3 | Sección 19. |
| **Termómetro** | 3 | Qué se agobia y qué va tranquilo. Tecla **H** (sección 20). |
| **Deshacer / Rehacer** | todos | Ctrl+Z / Ctrl+⇧+Z (también Ctrl+Y). |
| **Buscar** | 3 | Ideas y comandos. Ctrl+K (también funciona en los niveles 1 y 2). |
| **Versiones guardadas** | 3 | Sección 24 (en los niveles 1 y 2, en Más opciones). |
| **Guardar o abrir archivos** | 3 | JSON, PNG, SVG, PDF, importar, pegar, copia de seguridad y restaurar (en los niveles 1 y 2, en Más opciones). |
| **Sol / Luna** | todos | Claro, Oscuro o Como mi ordenador. |
| **Panel de abajo · Detalles** | 3 | Muestran u ocultan el panel de abajo y el panel de detalles. |
| **Más opciones (···)** | todos | Mis mapas…, Mapa nuevo, Duplicar este mapa, Ver un ejemplo, Ejemplo para expertos, Guardar o abrir archivos (niveles 1 y 2), Guardar versión ahora (Ctrl+S), Versiones guardadas…, Ajustes del mapa, Ayuda y atajos, Manual de usuario, Manual para IA (prompts). |

> En pantallas estrechas algunos botones muestran solo el icono. Pasa el ratón por encima para ver su nombre y su atajo.

### 4.9 El nivel 3 · Experto

Al pulsar **3 · Experto** desaparecen la Brújula, la bandeja y el medidor, y aparecen:

- la **barra lateral de herramientas** (sección 4.10);
- el **panel de abajo** con seis pestañas: **Probar, Resultados, Pistas, ¿Y si…?, Rondas y Qué ha pasado** (sección 17), cuya altura cambias arrastrando su borde de arriba;
- los **detalles completos** a la derecha, siempre a la vista (sección 9);
- la **Leyenda** abajo a la derecha y todo lo demás de las secciones 5 a 27.

Todo lo que hiciste en el modo fácil sigue ahí: Hoy es un **Inicio** que genera 10 por ronda, los pasos están unidos con uniones **Pasa**, cada piedra es una idea con influencia negativa (−1, −3 o −5) unida con **Influye** al paso que frena, y cada ayuda es un **Remedio** que la compensa (1, 2 o 4 puntos).

### 4.10 Barra lateral de herramientas (nivel 3)

| Herramienta | Tecla | Uso |
|---|---|---|
| **Mover y elegir** | V | Modo normal: seleccionar, mover y editar. |
| **Nueva idea** | B | Haz clic en el lienzo para crear una idea (o doble clic). |
| **Unir ideas** | C | Al hacer clic se abre el selector del tipo de unión: **Pasa** (algo va de una idea a otra), **Influye** (empuja o frena), **Info** o **Idea** (solo dicen que tienen que ver). El punto de color en el icono indica el tipo elegido. |
| **Juntar en un grupo** | Ctrl+G | Agrupa lo elegido. |
| **Inicio** | I | Clic en el lienzo: crea un inicio. |
| **Meta** | O | Clic en el lienzo: crea una meta. |
| **Nota** | N | Clic en el lienzo: crea una nota adhesiva. |
| **Comentario** | — | Añade un comentario a lo elegido (o al lienzo). |
| **Etiquetas** | — | Pone etiquetas y filtra el mapa por etiqueta. |
| **Texto suelto** | — | Clic en el lienzo: crea un texto suelto. |
| **Zona** | — | Agrupa una parte del mapa (sección 7.2). |
| **Bucle** | — | Cierra un círculo con lo elegido (sección 16). |
| **Capas** | — | Abajo del todo (sección 7.5). |

Al pulsar una herramienta activa vuelves a **Mover y elegir**. **Escape** también, y además limpia la selección, el rastreo y el enfoque.

### 4.11 Lienzo

- **Desplazarte**: arrastra sobre una zona vacía del lienzo.
- **Zoom**: rueda del ratón, gesto de pellizco o los botones **− / % / +** de la esquina. El porcentaje vuelve al 100 %.
- **Verlo todo**: tecla **F** o su botón. **Acercarme a lo elegido**: **⇧F**. En el modo fácil, el mapa deja sitio arriba para el medidor y abajo para la Brújula.
- **Leyenda** (nivel 3): abajo a la derecha; cambia según la vista.
- **Clic derecho**: menú con opciones (más en el nivel 3).

---

## 5. Crear y editar elementos

### 5.1 Formas de crear

| Cómo | Resultado |
|---|---|
| Doble clic en una zona vacía del lienzo | Una idea nueva en ese punto. |
| Una herramienta (**Idea** B, **Inicio** I, **Meta** O, **Nota** N, **Texto suelto**) + clic en el lienzo | Una idea, un inicio, una meta, una nota o un texto suelto. |
| Clic derecho en el lienzo | **Nueva idea**; en el nivel 2, también **Nuevo inicio** y **Nueva meta**; **Nota**; en el nivel 3, también **Texto suelto** y **Zona**. |
| **Tab** con una idea elegida | Crea una **idea unida** (hija) a su derecha, con el tipo de unión elegido. |
| **⇧+Enter** con una idea elegida | Crea una **idea hermana** debajo, unida a la misma idea madre. |
| Ctrl+K y escribe «Nueva…» o «Nuevo…» | Nueva idea, Nuevo inicio, Nueva meta, Nueva nota o Nueva zona. |

### 5.2 Tipos de elemento

| Tipo (en pantalla) | Nombre clásico | Para qué sirve | ¿Cuenta al probar? |
|---|---|---|---|
| **Idea** | Burbuja | Una idea o un paso. Puede tener «Qué hace». | Sí, si está unida con uniones **Pasa** o tiene «Qué hace». |
| **Inicio** | Entrada | De aquí sale todo: genera flujo en cada ronda. | Sí: es un origen. |
| **Meta** | Salida | Lo que quieres conseguir: aquí se cuenta el resultado. | Sí: es donde se mide. |
| **Nota** | Nota | Texto adhesivo de apoyo. | No. |
| **Texto suelto** | Etiqueta | Un rótulo suelto. | No. |
| **Grupo** | Grupo | Junta elementos y se puede plegar. | No calcula por sí mismo. |
| **Zona** | Contenedor | Marca una parte del mapa (un área, un equipo…). | No calcula por sí mismo. |

En el nivel 2 cambias el papel en **Detalles → ¿Qué es esto?** (sección 4.5). En el nivel 3, el tipo en **Detalles → Tipo**. Si conviertes una idea en inicio, empieza a generar 100 por ronda; puedes cambiar la cantidad.

### 5.3 Escribir el texto

- **Doble clic** sobre la idea, o **Enter** con ella elegida. Enter termina; Escape cancela.
- O escribe en **Detalles**: **Qué es** y **Notas** (niveles 1 y 2) o **Nombre** y **Descripción** (nivel 3).

### 5.4 Elegir (seleccionar)

| Acción | Cómo |
|---|---|
| Uno | Clic. |
| Varios | Ctrl+clic o ⇧+clic sobre cada uno. |
| Varios con un rectángulo | Mantén **⇧ (Mayúsculas)** y arrastra sobre el lienzo. |
| Todo | Ctrl+A. |
| Nada | Escape o clic en una zona vacía. |

### 5.5 Mover, cambiar el tamaño, copiar y borrar

- **Mover**: arrastra el elemento.
- **Cambiar el tamaño**: elígelo y arrastra los tiradores de las esquinas. En **Detalles → Aspecto → Tamaño automático** vuelve a su tamaño natural (nivel 3).
- **Copiar / Cortar / Pegar**: Ctrl+C / Ctrl+X / Ctrl+V.
- **Duplicar**: Ctrl+D. Crea una copia independiente.
- **Clonar (la misma idea en otro sitio)** (nivel 3, menú del clic derecho o Ctrl+K): el clon es **el mismo elemento** colocado en otro lugar. Comparte propiedades y «Qué hace», y al probar cuenta una sola vez. En los detalles de un clon verás «Clon de «…»», **Ir al original** y **Convertir en elemento independiente**.
- **Borrar**: tecla Supr (o la de borrar). También con la papelera de **Detalles** o con **Borrar** en el menú del clic derecho.

### 5.6 Menú del clic derecho

**Sobre una idea** (lo marcado con ³ solo aparece en el nivel 3):

- **Escribir** (Enter)
- **Añadir idea unida** (Tab)
- **Duplicar** · **Clonar (la misma idea en otro sitio)**³ · **Copiar** · **Cortar**
- **Juntar en un grupo**³ · **Deshacer el grupo**³ (sobre un grupo o una zona)
- **Esconder lo que cuelga** / **Mostrar lo que cuelga**³
- **¿A qué afecta?**³ · **¿De dónde le viene?**³ · **Centrarme en esto**³
- **Añadir comentario**
- **Bloquear** / **Desbloquear**³ · **Ocultar**³
- **Borrar**

**Sobre el lienzo vacío:** Nueva idea, Nuevo inicio y Nueva meta (nivel 2 o más), Nota, Texto suelto y Zona (nivel 3), **Pegar**, **Deshacer**, **Verlo todo**, **Ordenar el mapa** y **Mostrar lo oculto** (nivel 3).

---

## 6. Uniones (conexiones)

### 6.1 Unir dos ideas

1. (Opcional, nivel 3) Elige el tipo de unión: pulsa **Unir ideas** (C) en la barra lateral y elige **Pasa**, **Influye**, **Info** o **Idea**. El punto de color del botón recuerda el tipo elegido. Si no eliges nada, las uniones son de tipo **Pasa**, que es lo que permite probar el mapa después.
2. Pasa el ratón sobre una idea: aparecen **cuatro puntos** en su borde (arriba, derecha, abajo, izquierda).
3. Arrastra desde un punto hasta otra idea y suelta.

Puedes cambiar el tipo después en **Detalles → Tipo de unión** (nivel 3).

### 6.2 Tipos de unión

| En pantalla | Nombre clásico | Qué expresa | ¿Mueve algo? |
|---|---|---|---|
| **Pasa** | Flujo | Algo va de una idea a otra (clientes, dinero, horas…). | **Sí.** |
| **Influye** | Causal | Una idea **empuja**, **frena** o **compensa** a otra. Se dibuja discontinua. | No mueve nada: cambia a la otra. |
| **Info** | Informativa | Solo informa o indica que depende. Se dibuja punteada. | No. |
| **Idea** | Conceptual | Solo dice que tienen que ver, como en un mapa mental. | No. |

### 6.3 Menú del clic derecho sobre una unión

- **Darle la vuelta**
- **Que vaya en los dos sentidos** / **Que vaya en un solo sentido** (nivel 3)
- **Duplicar unión** (nivel 3)
- **Añadir comentario**
- **Borrar unión**

### 6.4 Detalles de una unión

Haz clic sobre la línea para elegirla.

**Niveles 1 y 2.** Arriba pone **🔗 Línea**, con **Quitar la línea** (y **Darle la vuelta** si solo dice que tienen que ver). Debajo: «Une A con B», qué significa y **¿Quieres escribir algo en la línea?** (sección 4.5).

**Nivel 3.** Arriba: origen → destino, **Darle la vuelta** y **Borrar esta unión**. Después:

- **Tipo de unión**: Pasa, Influye, Info o Idea (con una frase que explica cada uno).
- **Etiqueta**: el texto sobre la línea.
- **Dirección**: Un sentido, Ambos o Sin sentido.
- Al probar, en las uniones Pasa: **Asignado**, **Entregado**, **Perdido**, **Generado** y **Llega en la ronda**; y avisos como «bloqueada», «saturada», «vuelta» o «inhibe».

**Qué pasa por esta unión** (solo uniones Pasa):
- **Transporte**:
  - **Transfiere el flujo**: lo mueve del origen al destino. Es lo normal.
  - **Réplica / retroalimentación (genera en destino)**: no mueve el flujo, sino que genera una cantidad proporcional en el destino. Su **Efecto del retorno** puede ser **+ Alimenta (refuerza)** o **− Inhibe (equilibra)**.
- **Rol en el reparto del origen**:
  - **Ruta principal**.
  - **Ruta de rechazo (lo filtrado)**: recibe lo que un filtro no deja pasar.
  - **Desborde (exceso de capacidad)**: recibe lo que no cabe en un restrictor.
  - **Desvío**: recibe lo que manda un desviador.
- **Multiplicador**: multiplica lo que pasa (1 = sin cambio).
- **Pérdida**: porcentaje que se pierde por el camino.
- **Capacidad** (por ronda): lo máximo que puede pasar en cada ronda.
- **Retardo** (rondas): cuántas rondas tarda en llegar.
- **Resistencia**: frena la velocidad del flujo.
- **Velocidad**: multiplica la velocidad (×).
- **Intensidad**: afecta al potencial.
- **Prioridad**, **Peso del reparto** y **Reparto fijo**: cuánto le toca a esta unión cuando el origen reparte (sección 15).
- **Peso en convergencia**: peso de esta llegada cuando el destino combina varias llegadas.
- **Marcar como vuelta (llega en la ronda siguiente)**: convierte la unión en la vuelta de un círculo (sección 16).
- **Dimensiones transportadas**: qué dimensiones viajan por esta unión (por defecto, todas).

**Cómo influye** (solo uniones Influye):
- **Qué hace**:
  - **Modula al destino (refuerza o frena)**: cambia una dimensión del destino. Su fuerza depende de la influencia del origen, de la **Polaridad** (**+ Directa** o **− Inversa**), de la **Sensibilidad** y de la **Dimensión afectada**.
  - **Compensa / mitiga una dificultad**: el origen es una medida que reduce el efecto negativo del destino. Tiene **Tipo** (Parcial, Total, Condicionada, Temporal), **Unidad** (Puntos de escala o Porcentaje), **Cantidad** y, si es temporal, **Desde la ronda / Hasta la ronda**.
- **Intensidad de la relación**.

**Cuándo deja pasar** (uniones Pasa e Influye): la unión solo funciona si se cumplen estas condiciones (sección 12). Sin condiciones: «Siempre deja pasar.»

**Bucle** (uniones Pasa e Influye): si la unión cierra un círculo, aparece **Convertir en bucle** (sección 16).

**Aspecto**
- **Trazado**: Curva, Recta u Ortogonal.
- **Línea**: Continua, Discontinua o Punteada.
- **Grosor**: Por magnitud (automático según la cantidad) o Manual (con un número).
- **Anclaje origen / Anclaje destino**: Arriba, Derecha, Abajo o Izquierda.
- **Color**: un color libre o, con «color semántico», el de su tipo.

**Comentarios**: anotaciones de la unión.

---

## 7. Organizar el mapa

### 7.1 Ordenar, alinear y repartir

- **Ordenar el mapa** (bandeja de madera → **Ordenar**, clic derecho en el lienzo o Ctrl+K) recoloca todo el mapa de forma ordenada. Se deshace con Ctrl+Z.
- Con varias ideas elegidas, en Ctrl+K: Alinear a la izquierda, Centrar horizontalmente, Alinear a la derecha, Alinear arriba, Centrar verticalmente, Alinear abajo, Distribuir horizontalmente y Distribuir verticalmente.
- En el nivel 3, con varias ideas elegidas, **Detalles → Ordenar** tiene **Grupo**, **Zona**, **Bucle**, **Ordenar**, los botones de alinear (⇤ ↔ ⇥ ⤒ ↕ ⤓) y de repartir (⋯ ⋮) y **Borrar lo elegido**.

### 7.2 Grupos y zonas (nivel 3)

- **Juntar en un grupo** (Ctrl+G) y **Deshacer el grupo** (Ctrl+⇧+G).
- Un grupo se **pliega y despliega** con la flecha de su cabecera.
- Una **zona** marca una parte del mapa (un área, un equipo, una fase). Para meter ideas en un grupo o una zona, **elígelas primero** y pulsa **Juntar en un grupo** o **Zona**: el nuevo grupo las envuelve. Sin nada elegido se crea vacío.
- **Deshacer el grupo** saca las ideas del grupo o la zona elegida.

### 7.3 Esconder ramas, ocultar y bloquear (nivel 3)

- **Esconder lo que cuelga**: oculta todo lo que sale de una idea. **Mostrar lo que cuelga** lo vuelve a enseñar.
- **Ocultar**: esconde un elemento. Para recuperarlo: clic derecho en el lienzo → **Mostrar lo oculto**, o búscalo con Ctrl+K (sale en «Ideas ocultas»; al elegirlo se vuelve visible).
- **Bloquear**: evita moverlo o cambiarlo sin querer. Muestra un candado.

### 7.4 ¿A qué afecta? ¿De dónde le viene? (nivel 3)

- **¿A qué afecta?**: resalta todo lo que depende de esta idea.
- **¿De dónde le viene?**: resalta todo lo que alimenta a esta idea.
- **Centrarme en esto**: apaga todo lo que no tiene relación.
- Están en el menú del clic derecho y en **Detalles** (debajo del resumen). **Escape** los quita.

### 7.5 Capas (nivel 3)

El botón **Capas** está abajo del todo en la barra lateral.

- Crea capas con nombre («Nueva capa…» y **Añadir capa**). Cada capa tiene un color (**Cambiar color**) y un nombre que puedes editar.
- **Añadir selección a la capa** / **Quitar selección de la capa**.
- **Ocultar capa** / **Mostrar capa** (ojo) y **Bloquear capa** / **Desbloquear capa** (candado).
- **Subir** / **Bajar** para ordenarlas y **Eliminar capa**.
- Un elemento puede estar en varias capas sin duplicarse. Se ve si **alguna** de sus capas se ve.

### 7.6 Etiquetas (nivel 3)

- Botón **Etiquetas** de la barra lateral: escribe una etiqueta («Nueva etiqueta») para ponérsela a lo elegido.
- **Filtrar por etiqueta**: muestra solo lo que tiene esa etiqueta. **Quitar filtro** lo enseña todo otra vez.
- También puedes poner etiquetas en **Detalles → Etiquetas** («+ etiqueta»).

### 7.7 Comentarios y notas

En **Detalles → Comentarios** → **Añadir comentario**. Cada anotación tiene un tipo: **Comentario**, **Nota**, **Hipótesis**, **Evidencia** o **Pregunta pendiente**. Úsalas para dejar claro qué es dato y qué es suposición.

---

## 8. Las cinco vistas

Las vistas cambian **cómo se ve** el mapa, nunca sus datos. Teclas **1** a **5**. El selector de vistas está en el nivel 3; en el nivel 1 siempre ves **Ideas** y en el nivel 2, **Película**.

| Vista | Qué destaca | Leyenda |
|---|---|---|
| **1 · Ideas** (Mental) | Ideas, jerarquías y relaciones. | Tienen que ver · Influye (discontinua) · Informativa (punteada). |
| **2 · Recorrido** (Flujo) | Dirección, grosor y cantidad. | Más gorda = pasa más · Más clara = peor calidad · Puntitos = velocidad · Brillo = potencial · Cortada (roja discontinua) · No pasa nada. |
| **3 · Fuerzas** (Energía) | Impulsos, pérdidas y fricciones. | Empuja / gana (verde) · Pierde / frena (rojo) · Pasa tal cual (azul). |
| **4 · Piezas** (Sistema) | Dependencias, condiciones y bucles. | + empuja · − frena · ⊕ remedio · ◆ solo si… |
| **5 · Película** (Simulación) | Movimiento ronda a ronda y estados. | Igual que Recorrido, con animación por ronda. |

La **Leyenda** está abajo a la derecha (nivel 3): haz clic en su título para abrirla o cerrarla. Con el termómetro encendido añade: Frío: le falta · A buen ritmo · Caliente · Agobiado (sección 20). Al pasar el ratón, cada línea muestra una × para quitarla de la leyenda (se recupera en **Ajustes del mapa**).

Si pulsas **Probar** (o Reproducir) estando en la vista Ideas, la aplicación cambia sola a la vista Película.

---

## 9. Detalles (el panel de la derecha)

En el nivel 3 el panel **Detalles** está siempre a la vista (botón **Mostrar detalles / Ocultar detalles** de la barra superior). En los niveles 1 y 2 solo aparece cuando eliges algo, y es sencillo (sección 4.5).

### 9.1 Sin nada elegido: el mapa (nivel 3)

- **Nombre del mapa** y **De qué va**.
- **Probar → Rondas (semanas, meses…)**: cuántas rondas se calculan.
- **Bucles**: la lista de bucles del mapa. Sin bucles: «Elige ideas en orden y pulsa «Bucle» para cerrar un círculo (como el boca a boca)».
- **Qué se mide (dimensiones)**: las dimensiones del flujo (sección 14), con **Dimensión personalizada**.
- **Ajustes → Más ajustes: escalas, colores, leyenda y atajos…** (sección 25).

### 9.2 Varias ideas elegidas (nivel 3)

Arriba pone «N elementos seleccionados».

- **Cambiar todas a la vez**: **Color**, **Forma**, **Etiquetas comunes** («+ etiqueta para todos»), **Categoría**, **Asignar comportamiento a todos** e **Influencia (ponderada) para todos**. «Varios» o «varias» indica que ahora mismo tienen valores distintos. Lo que cambies se aplica a todas.
- **Ordenar**: Grupo, Zona, Bucle, Ordenar, alinear, repartir y **Borrar lo elegido** (sección 7.1).

### 9.3 Una idea elegida (nivel 3)

Arriba aparece su tipo (Idea, Inicio, Meta…), un candado si está bloqueada y el botón **Borrar**. Después:

1. **Lo básico**:
   - **Nombre**, **Descripción** y **Tipo** (Idea, Inicio, Meta, Nota, Texto suelto, Grupo o Zona).
   - **Categoría** (por ejemplo «Operativa»).
   - **Etiquetas** («+ etiqueta»).
   - **Grado de confianza**: Hipótesis, Estimación, Observado o Verificado.
2. **Resumen**: lo que hace la idea (o «Aquí no pasa nada especial»), su influencia y si está «condicionado». Al probar, en **Ronda N**: **Entra**, **Sale** (o **Resultado**, si es una meta), **Generado**, **Perdido**, **Consumido**, **Stock**, **En cola**, **Compensado**, **Influencia neta**, el estado del termómetro y los botones **¿A qué afecta?**, **¿De dónde le viene?** y **Centrarme en esto**.
3. **Cuánto empuja o frena** (sección 10).
4. **Qué hace** (sección 11).
5. **Cuándo funciona** (sección 12).
6. **Remedios** (sección 13).
7. **Qué genera (dimensiones)** (sección 14). Se abre sola en los inicios.
8. **Cómo reparte y cómo junta** (sección 15).
9. **Con quién está unida**: las uniones que llegan (←) y las que salen (→), con su tipo (pasa, influye, info, idea). Haz clic en una para elegirla.
10. **Aspecto**:
    - **Forma**: Redondeado, Píldora, Recto, Círculo, Rombo o Hex.
    - **Color**: Papel, Cielo, Oliva, Arcilla, Madera, Lavanda, Agua o Rosa.
    - **Fondo propio**, para usar un color de fondo libre («quitar» lo devuelve al de su color).
    - **Borde**: Continuo, Discontinuo, Punteado o Sin borde.
    - **Tipografía**: Sans, Serif o Mono. **Tamaño / peso**: un número y Normal, Medio o Fuerte.
    - **Icono**: una lista amplia o «Ninguno».
    - **Imagen**: subir una imagen o **Quitar imagen**.
    - **Tamaño automático** (si le cambiaste el tamaño a mano).
11. **Comentarios** (sección 7.7).
12. **Archivos**: **Adjuntar documento** (hasta 20 MB). Cada adjunto se puede **Descargar** o **Eliminar adjunto**.
13. **Más opciones**:
    - **Bloqueado** y **Rama plegada**.
    - **Capas** (clic en una capa para meter o sacar la idea).
    - **Puertos** («entradas y salidas lógicas»), con nombre y capacidad.
    - **Documentación / enlaces** y el **ID** interno con la fecha de creación.

Las notas, los textos sueltos, los grupos y las zonas muestran solo las secciones que les sirven.

**Bloque de descubrimiento.** Las ideas que mete «Ayúdame a pensar» muestran arriba de dónde vienen («Propuesto por IA», «Propuesto por plantilla» o «Descubrimiento») y su estado (sin confirmar, confirmado o descartado), con los botones **Confirmar**, **Dudoso** y **Descartar** (sección 23.6).

**Marca de «¿Y si…?».** Si un valor está cambiado en el «¿Y si…?» activo, aparece una marca junto a su nombre. Con un clic vuelves al valor del original.

---

## 10. Peso, influencia e impacto

Sección **Cuánto empuja o frena** de Detalles (nivel 3). Son tres cosas distintas:

| Campo | Qué es | ¿Lo usa el motor? |
|---|---|---|
| **Importancia** | Cuánto te interesa atender este elemento. | No: es para ti. |
| **Influencia** | Cuánto modifica a otros. Puede ser positiva, negativa o neutra. | **Sí.** |
| **Impacto esperado** | Tu expectativa sobre el resultado. | No. El impacto real lo calcula el Marcador. |

Cada uno se puede expresar en tres modos:

- **Núm.** (numérico): un número libre.
- **Pond.** (ponderado): un valor en la escala ponderada, por defecto de **−5 a +5**.
- **Cual.** (cualitativo): un nivel de una escala con palabras, por ejemplo Muy bajo, Bajo, Medio, Alto, Muy alto. El resultado se marca como **aproximación**.

**La influencia depende de**:
- **Su peso (fijo)**: el valor que pongas.
- **El flujo que recibe**: la influencia crece con el flujo, hasta el **Flujo de referencia** (influencia máxima).
- **Su stock**: la influencia depende de lo acumulado.

**Ejemplo.** «Fricción tecnológica» con influencia −3, unida con una unión **Influye** a «Conversación comercial», frena esa conversación. Si su influencia fuera +3, la reforzaría.

---

## 11. Comportamientos

Un comportamiento es **lo que hace una idea con el flujo**. Sin comportamientos, la idea deja pasar el flujo sin cambios (o solo es una idea suelta).

- **Niveles 1 y 2:** no hace falta: las 🪨 piedras y las 🤝 ayudas hacen ese trabajo de forma sencilla (sección 4.1).
- **Nivel 3:** en **Detalles → Qué hace**, pulsa **Añadir comportamiento** y elige entre los 14, agrupados en Origen, Forma, Impulso, Pérdida / fricción, Ruta, Reserva y Control.

### 11.1 Los 14 comportamientos

| Comportamiento | Qué hace | Parámetros principales |
|---|---|---|
| **Generador** | Produce flujo nuevo en cada ronda. | Cantidad por ronda (se usa si la idea no define la dimensión Cantidad) · Emisión: Continua (cada ronda) o Pulso único · Desde la ronda / Hasta la ronda (0 = sin fin) y Crecimiento por ronda (nivel 3). |
| **Consumidor** | Absorbe parte del flujo. Se registra como **consumido**, no como perdido. | Modo: Proporción o Cantidad fija · Proporción consumida / Cantidad consumida. |
| **Filtro** | Deja pasar una parte. Lo rechazado va a las uniones de **rechazo** o se pierde. | Criterio: Proporción que pasa (**Pasa** %) o Umbral de dimensión (Dimensión evaluada, Operador ≥ > ≤ <, Umbral). |
| **Transformador** | Cambia características del flujo. | Operación: Escalar (×), Desplazar (+), Fijar valor o Convertir dimensión (Desde, Hacia, Proporción convertida) · Factor / Valor. |
| **Multiplicador** | Amplifica. El aumento se registra como **generación**. | Factor (por ejemplo 1,5). |
| **Reductor** | Disminuye. La reducción se registra como **pérdida**. | Modo: Proporción o Cantidad fija · Reducción / Cantidad. |
| **Acelerador** | Cambia la velocidad: más de 1 acelera, menos de 1 frena. | Factor de velocidad. |
| **Restrictor** | Limita lo que puede pasar en cada ronda. | Capacidad por ronda · Exceso: Encolar para la siguiente ronda, Se pierde o Desbordar a las uniones de desborde. |
| **Desviador** | Manda una parte a las uniones marcadas como **Desvío**. | Proporción desviada. |
| **Acumulador** | Guarda flujo (stock) para otro momento. | Stock máximo (0 = sin límite) · Stock inicial y Fuga del stock por ronda (nivel 3). |
| **Liberador** | Devuelve al flujo lo acumulado. | Modo: Proporción del stock, Cantidad fija o Todo · Proporción / Cantidad liberada. |
| **Compensador** | Mitiga el efecto negativo de otras ideas a través de sus uniones de compensación. | Eficacia (100 % = completa). |
| **Detector** | Mide sin modificar y avisa al cruzar un umbral. | Mide: Entrada, Salida o Dimensión · Umbral de aviso (0 = ninguno). |
| **Controlador** | Cuando está activo, cambia un parámetro de **otro** comportamiento («SI condición → ENTONCES ajuste»). | Comportamiento controlado · Parámetro (por ejemplo `capacity`) · Ajuste: Multiplicar, Fijar o Sumar · Valor. |

### 11.2 Opciones de cada comportamiento

- **Nombre propio** (por ejemplo «Tasa de respuesta»), botón de encendido (**Activar / Desactivar**) y **Eliminar comportamiento**.
- **Dimensiones afectadas**: sobre qué dimensiones actúa. Las demás no cambian.
- **Combinación con otros del mismo tipo** (si hay varios iguales en la idea): Encadenada (uno tras otro), Aditiva, Multiplicativa, El mayor o El menor.
- **SI … (condiciones)** → **Añadir SI**: el comportamiento solo actúa si se cumple la condición. Sin condiciones: «Siempre activo.»
- **SI NO**: qué pasa si no se cumple. **No actúa**, o **Actúa con otros valores** (parámetros alternativos).
- **Incertidumbre (escenario favorable / desfavorable)** (nivel 3): un valor favorable y otro desfavorable para cada parámetro numérico. El valor central es el actual.
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
11. Uniones.
12. Retroalimentación.
13. Registro.

Por eso un filtro siempre actúa antes que un restrictor de la misma idea.

---

## 12. Condiciones

Las condiciones encienden o apagan cosas según lo que va pasando al probar. Se ponen en:

- una **idea** (**Cuándo funciona**; sin condiciones: «Siempre activo.»);
- un **comportamiento** (**SI …**);
- una **unión** (**Cuándo deja pasar**; sin condiciones: «Siempre deja pasar.»);
- un **bucle** (**Condición del bucle**).

### 12.1 Construir una condición

**Añadir condición** y elige el **Tipo de cláusula**:

| Tipo | Ejemplo |
|---|---|
| **Comparación** | «Stock de *Almacén* ≥ 50». |
| **Rango** | «Calidad de *Leads* **entre** 0,4 y 0,8» (o **fuera de**). |
| **Umbral** | «Salida de *Ventas* **supera** 30» (o **por debajo de**). |
| **Ronda / tiempo** | «Ronda ≥ 4» (a partir de la semana 4). |
| **Depende de otro activo** | «Solo si *Campaña* está activa». |

En las cláusulas que miden una idea eliges el **Elemento** y la **Métrica**: entrada, salida, resultado, stock, pérdida, influencia o dimensión (con su **Dimensión**). Operadores: > ≥ < ≤ = ≠.

Para combinar, añade **Cláusula** o **Grupo**. Un grupo usa el **Operador lógico** **Y (todas)** u **O (alguna)**. **Negar (NO)** invierte una cláusula.

### 12.2 Resultado y activación

- **Resultado**: «Si se cumple: actúa» o «Si se cumple: no actúa».
- **Activación**:
  - **Cada ronda**: se evalúa siempre.
  - **Una vez cierta, queda**: en cuanto se cumple, se queda activa.
  - **Solo una vez**: actúa solo la primera vez.
- **Debe cumplirse durante N rondas**: tiene que cumplirse N rondas seguidas antes de activar.

### 12.3 Elemento inactivo

En **Cómo reparte y cómo junta → Si el elemento está inactivo** decides qué pasa cuando sus condiciones no se cumplen: **Deja pasar** el flujo sin cambios, o lo **Bloquea**.

---

## 13. Mitigadores y compensaciones

Sirven para modelar **«tengo un problema y una medida que lo suaviza»**.

1. Elige la idea problemática (nivel 3), por ejemplo «Fricción tecnológica», con influencia negativa.
2. Abre **Remedios** (mitigadores y compensaciones):
   - **Medida existente** + **Vincular**: usa una idea que ya existe como medida.
   - **Nueva medida compensatoria**: crea una idea verde «Medida compensatoria» ya unida.
3. Para cada medida ajusta:
   - **Tipo**: Parcial, Total, Condicionada o Temporal (si es condicionada, añade la condición que la activa).
   - **Unidad**: **pt** (puntos de la escala) o **%**.
   - **Cantidad**.
   - **De la ronda … a …** (∞ = sin final), si es temporal.
   - **Quitar medida** la desvincula.
4. **Cómo se combinan varias medidas**:
   - **Se suman**.
   - **Solo cuenta la mayor**.
   - **Rendimientos decrecientes (se solapan)**.

Una medida reduce la **influencia negativa** del problema y también **las pérdidas** de sus filtros, reductores y consumidores.

**Ejemplo.** Problema con influencia −5. Dos medidas de +2 y +1 (que se suman) dejan una influencia neta de **−2**.

Por dentro, una medida es una unión **Influye** con **Qué hace: Compensa / mitiga una dificultad**. También puedes crearla a mano así.

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

**En los inicios** (nivel 3), abre **Qué genera (dimensiones)** y pulsa **Definir** en cada dimensión que quieras dar. Para cada una:

- **Valor** y **Modo** (Núm., Pond. o Cual.).
- **Nivel**, si es cualitativo.
- **Confianza**: Hipótesis, Estimación, Observado o Verificado.
- **Origen del dato**.
- En el nivel 3, un rango **bajo / alto** para la incertidumbre.

Con **Quitar valor** borras una dimensión.

**Dimensiones propias.** Sin nada elegido (nivel 3), en **Detalles → Qué se mide (dimensiones)** → **Dimensión personalizada** puedes añadir las tuyas: confianza, riesgo, coste, motivación… Cada una lleva:

- **Nombre** y **Unidad**.
- **Agregación**: **Suma** para magnitudes como cantidad o coste; **Media** para cualidades como calidad o confianza.
- **Mínimo**, **Máximo** y **Color**. Las tuyas se pueden borrar con **Eliminar dimensión**; las cinco de serie, no.

Una operación sobre una dimensión **nunca** cambia las demás.

---

## 15. Bifurcación y convergencia

Sección **Cómo reparte y cómo junta** de Detalles de una idea (nivel 3).

### 15.1 Convergencia: cuando llegan varios flujos

| Regla | Efecto |
|---|---|
| **Suma** | Se suman todos. |
| **Combinación ponderada** | Se combinan según el **Peso en convergencia** de cada unión. |
| **Prioridad** | Primero el de mayor prioridad. |
| **Máximo / Mínimo** | Solo el mayor o el menor. |
| **Deduplicación (misma entidad)** | Evita contar dos veces lo mismo que llega por dos caminos. **Solapamiento entre rutas**: 100 % = son la misma oportunidad. |
| **Fórmula personalizada** (nivel 3) | Escribe una fórmula con `in1`, `in2`… y `sum`, `max`, `min`, `count`. |

Las retroalimentaciones negativas (inhibición) restan en este paso.

### 15.2 Bifurcación: cómo se reparte entre varias salidas

| Reparto | Efecto |
|---|---|
| **Proporcional al peso** | Según el **Peso del reparto** de cada unión. |
| **Porcentajes fijos** | Según el **Reparto fijo** de cada unión. |
| **Condicionado** | Según lo que diga **Cuándo deja pasar** en cada unión. |
| **Prioritario (llena por orden)** | Llena la primera salida (por **Prioridad**) hasta su capacidad y luego la siguiente. |
| **Competitivo (por capacidad)** | En proporción a la capacidad de cada salida. |
| **Dinámico (según influencia)** | Según la influencia de la idea elegida en **Influencia que reparte**. |

El reparto **conserva** el flujo: lo que entra sale repartido, sin crear ni destruir nada.

---

## 16. Bucles (circuitos) y retroalimentación

Un **bucle** es un círculo: A → B → C → vuelve a A. Ejemplo: «más ventas → más recomendaciones → más llamadas» (el boca a boca). En la versión clásica se llama **circuito**.

### 16.1 Por qué no se cuelga

El motor calcula ronda a ronda. **Lo que vuelve por la unión de vuelta se usa en la ronda siguiente**, así que un círculo nunca se calcula sin fin dentro de la misma ronda. El motor detecta solo qué unión cierra cada círculo. También puedes elegirla tú con **Marcar como vuelta (llega en la ronda siguiente)** en los detalles de la unión.

### 16.2 Crear un bucle (nivel 3)

- Elige las ideas **en orden** y pulsa **Bucle** (barra lateral o **Detalles → Ordenar**), o busca «Bucle con lo elegido» con Ctrl+K.
- O elige la unión que cierra el círculo y, en **Detalles → Bucle**, pulsa **Convertir en bucle**.

### 16.3 Ajustes del bucle

Están en los detalles de la unión de vuelta, sección **Bucle**:

| Ajuste | Qué hace |
|---|---|
| **Nombre** · **Borrar el bucle** | Ponerle nombre o quitarlo (las uniones se quedan). |
| **Tipo de bucle** | Automático (por polaridades), Reforzador, Equilibrador o Mixto. |
| **% de retorno** | Qué parte vuelve. |
| **Intensidad** | Fuerza de la vuelta. |
| **Retardo** (rondas) | Cuántas rondas tarda en volver. |
| **Frecuencia** (cada N rondas) | Actúa cada N rondas. |
| **Persistencia** (rondas) | Cuántas rondas dura su efecto. |
| **Saturación** (suave) | Límite suave: el efecto se aplana al acercarse a ese valor. |
| **Límite máximo / Límite mínimo** | Límites duros. |
| **Activo** | Enciende o apaga el bucle. |
| **Condición del bucle** | Solo actúa si se cumple. Sin condición: «Vuelve en cada ronda.» |

Si quieres que la vuelta **genere** en vez de mover (por ejemplo, cada venta trae 0,2 llamadas nuevas), en la unión pon **Transporte: Réplica / retroalimentación (genera en destino)** y elige su **Efecto del retorno**: **+ Alimenta (refuerza)** o **− Inhibe (equilibra)**.

Los bucles que encuentra el motor aparecen en **Resultados → Bucles detectados**, clasificados como **reforzadores** (todo suma), **equilibradores** (algo frena) o **mixtos**. Haz clic en uno para verlo en el mapa.

---

## 17. Simular (Probar)

Probar es poner el mapa en marcha: en cada **ronda** (una semana, un mes… lo que tú decidas) sale algo del inicio, recorre las uniones **Pasa** y se ve cuánto llega a la meta.

### 17.1 Pestaña Probar (panel de abajo, nivel 3)

En el modo fácil no hace falta: el medidor se calcula solo (sección 4.4). En el nivel 3, el panel completo:

| Control | Función |
|---|---|
| ▶ **Reproducir / Pausa** (Espacio) | Anima ronda a ronda. En pausa, el botón dice **Reanudar**. |
| ■ **Detener** | Para y vuelve al principio. |
| ↺ **Reiniciar** | Recalcula desde el estado inicial. |
| ⏮ / ⏭ **Ronda anterior / Ronda siguiente** | Teclas **,** y **.** |
| 👣 **Paso a paso (elemento a elemento)** | Avanza idea a idea. Muestra «Paso N/M: «…»» y lo que pasó en ella (o «Sin cambios en este elemento.»). |
| 💾 **Guardar esta ejecución** | Guarda el resultado en «Ejecuciones guardadas» (pestaña Rondas). |
| **Velocidad** | Lenta, Normal o Rápida. **Solo cambia la animación**: el resultado es siempre el mismo. |
| **Rondas** | Cuántas rondas se prueban. |
| **En vivo** | Encendido: recalcula al instante cada vez que cambias algo. Apagado: pulsa **Calcular**. |
| **Barra de rondas** | Arrástrala para ir a cualquier ronda. Al lado, un minigráfico del resultado. |
| **Indicadores** | **Ronda** (N/M), **Entra**, **Moviéndose** (por las uniones), **Llega a la meta** (en esta ronda) y **Total en la meta** («aprovechas el …%»). |
| **Las cuentas cuadran** | Confirma que no aparecen ni desaparecen unidades sin explicar. |
| **N cosas supuestas** | Aviso: el resultado usa interpretaciones cualitativas o hipótesis. |

### 17.2 Resultados

- **Resultado por ronda**: gráfico de Resultado, Generado y Perdido.
- **Metas**: el **Total** y la **Última** ronda de cada meta, con sus dimensiones. Sin metas verás «Añade una meta para medir resultados.».
- **Bucles detectados**: los bucles que ha encontrado el motor. Clic para verlos en el mapa.
- **Libro de conservación · ronda N**: Generado, En tránsito (inicio), Resultado / terminal, Perdido, Consumido, Acumulado, Liberado, Deduplicado, En tránsito (fin) y Sin explicar. Es la prueba de que las cuentas cuadran.
- **Supuestos, aproximaciones y avisos**: qué partes del resultado se basan en hipótesis, escalas con palabras o efectos de la cuadrícula del tiempo.

### 17.3 Pistas (diagnóstico)

«Pistas sobre lo que pasa en tu mapa. No son verdades absolutas: dependen de lo que tú has supuesto.» Cada pista lleva un icono según lo importante que es (**Importante**, **Ojo**, **Bien** o **Para saber**) y su nivel de confianza (alta, media o baja). Algunos ejemplos:

- «Pérdida principal en «…»».
- «Pérdida en la unión …» y «Unión saturada: …».
- «Ruta bloqueada: …» o «Ruta intermitente: …».
- ««…» bloquea el flujo».
- «Oportunidad de recuperación en «…»».
- «Bucle reforzador …», «Bucle equilibrador …» o «Bucle mixto …».
- «Compensación sobre «…»» y «Efectos cruzados de «…»».
- «Dependencia crítica: «…»».
- «Alta influencia: …»: lo que más mueve el resultado. Aparece al pulsar **Detectar elementos de mayor influencia**.
- «Unidades sin explicar» y «Resultados basados en hipótesis y aproximaciones».

Haz clic en una pista para ver la **Regla**, los **Datos** y los **Supuestos**, y el botón **Localizar en el mapa**. Si todo va bien: «Nada destacable · El sistema fluye sin pérdidas ni saturaciones relevantes.».

### 17.4 Rondas

Una tabla con una fila por ronda: Ronda, Generado, Resultado, Perdido, En stock/cola y En tránsito. Haz clic en una fila para saltar a esa ronda. Al lado están las **Ejecuciones guardadas** (se guardan con el disquete de la pestaña Probar).

### 17.5 Qué ha pasado (eventos)

El registro de todo lo que ocurrió, agrupado por fase: Entradas, Condiciones, Activación, Filtros, Transformación, Bifurcación, Capacidad, Convergencia, Acumuladores, Retroalimentación, Estado y Registro. Ejemplos: «"Llamadas recibidas" genera 260.00 u.», «"Interés real" filtra: pasan 65.00 de 100.00 (65%)», «"Agenda" encola 12.00 u. para la siguiente ronda». Marca **Solo la selección** para ver solo lo de la idea elegida.

### 17.6 Cómo leer el movimiento en el lienzo

En las vistas Recorrido y Película:

- **Más gorda** = pasa más.
- **Más clara** = peor calidad.
- **Puntitos** que corren = velocidad.
- **Brillo** = potencial.
- Línea **roja discontinua** = cortada.
- **Punteada y tenue** = no pasa nada.
- Cada idea muestra en una pastilla lo que pasa por ella en esta ronda.

---

## 18. «¿Y si…?», comparar, sensibilidad e incertidumbre

### 18.1 Qué es un «¿Y si…?»

Un **«¿Y si…?»** (en la versión clásica, **escenario**) es una prueba sin estropear el original. Todos comparten el **mismo mapa** y cada uno guarda **solo los valores que cambias** en él. El original se llama «Situación inicial». Cambiar de «¿Y si…?» **nunca** modifica el original.

### 18.2 Trabajar con «¿Y si…?» (nivel 3)

- **Selector «¿Y si…?»** (barra superior, al lado del selector de nivel). Muestra el activo y cuántos cambios tiene. Dentro:
  - La lista para elegir el activo.
  - **Nuevo «¿y si…?»** y **Duplicar «…»**.
  - **Quitar todos sus cambios**.
  - **Comparar…**.
- **Pestaña ¿Y si…?** (panel de abajo):
  - **Tus «¿y si…?»**, con **Nuevo** y **Comparar**. Cada fila tiene el punto de color para activarlo, su nombre (editable), cuántos cambios lleva («base» en el original), **Duplicar** y **Borrar este «¿y si…?»**.
  - **Cambios de «…»**: la lista de valores cambiados, cada uno con **Quitar cambio**, y el botón **Quitar todos sus cambios**.
- **Para cambiar un valor solo en un «¿Y si…?»**:
  1. Actívalo. Arriba de Detalles aparece «Editando parámetros en «…». El modelo base no cambia.».
  2. Cambia el valor en Detalles: queda marcado con un punto.
  3. Para volver al valor original, haz clic en esa marca («Restaurar el valor base»).

### 18.3 Comparar

**Comparar «¿y si…?»** (desde el selector, la pestaña o Ctrl+K). Elige **Opción A** y **Opción B**. Verás:

- **Resultado total** de A → B y la diferencia.
- **Mejoran** y **Empeoran**: ideas que suben o bajan.
- **Nuevos cuellos de botella** y **Cuellos resueltos**.
- **Cambios en bucles**.
- **Parámetros que difieren**.
- La etiqueta «Basado en hipótesis: resultados orientativos» cuando toca.

### 18.4 Sensibilidad

En la pestaña **¿Y si…?**, **Sensibilidad: altera un parámetro y observa**:

1. Elige un **Parámetro**.
2. Pulsa **Barrer**.
3. Verás cómo cambia el **Resultado total** al mover ese parámetro. Si no hay números: «No hay parámetros numéricos todavía.».

### 18.5 Incertidumbre

1. Define rangos (favorable / desfavorable) en las dimensiones de los inicios (**bajo / alto**) o en **Incertidumbre** de cada comportamiento.
2. En la pestaña **¿Y si…?**, pulsa **Calcular banda** para ver el intervalo de resultados.
3. Con **Variante** (Desfavorable, Central, Favorable) pruebas el «¿Y si…?» activo con esos extremos.

---

## 19. Cuadrícula del tiempo (marco espacial)

**Es opcional y está en el nivel 3.** Por defecto el lienzo es un **tapiz libre**: la posición no cuenta nada. Con la cuadrícula, **dónde colocas una idea cambia su peso y su momento**.

Pulsa el botón **Cuadrícula del tiempo** (#) de la barra superior. Se abre **Marco espacial**:

1. **Modo del lienzo**: **Tapiz libre** o **Cuadrícula que computa**.
2. **Ancho de columna** y **Alto de fila** (px).
3. **Eje horizontal = tiempo** (interruptor **Tiempo**). Cada **columna** es un periodo y la **Unidad** se puede cambiar (por defecto «Semana»):
   - Un **inicio** empieza a generar en su columna.
   - Entre dos ideas unidas, **cada columna de separación añade una ronda de retardo**.
   - **Penalización por «prisas»** (por columna de inversión): si un efecto está colocado **antes** que su causa, pierde ese porcentaje por cada columna, y se avisa.
   - **Fecha límite (columna)** («sin límite» si está vacía): lo que llega después se trata según **Lo que llega tarde**:
     - **Se penaliza**: conserva el % de **Conserva lo que llega tarde**.
     - **No cuenta**: se descarta.
     - **Quitar fecha límite** la elimina.
4. **Eje vertical = apoyo / fricción** (interruptor **Apoyo y fricción**). La fila del centro es el eje:
   - **Por encima** = **apoyo**: su flujo sube un **Efecto por fila** (por ejemplo, +8 % por fila) y gana **Influencia por fila**.
   - **Por debajo** = **fricción**: su flujo baja ese porcentaje y pierde influencia.

Todos estos efectos se convierten en retardos, pérdidas y comportamientos normales del motor. Se explican en **Resultados → Supuestos, aproximaciones y avisos**, en **Qué ha pasado** y en el **Marcador → Lo que cambia por la cuadrícula del tiempo**.

---

## 20. Termómetro de calor

Pulsa el **Termómetro** de la barra superior o la tecla **H** (nivel 3). Cada idea, y cada zona de la cuadrícula si está activa, se colorea según su «temperatura» en la ronda actual:

| Estado | Qué significa |
|---|---|
| **Frío: le falta** (azul) | Le falta flujo, está infrautilizado, apagado o bloqueado. |
| **A buen ritmo** (verde) | Fluye sin fricción relevante. |
| **Caliente** (ámbar) | Mucho uso, pérdidas o una cola que crece. |
| **Agobiado** (rojo) | Supera su capacidad, está saturado, llega tarde o va con prisas. |

Al pasar el ratón por la franja de color de una idea ves las causas. Por ejemplo:

- «Presión 140% de la capacidad (…)».
- «Infrautilizado: 20% de la capacidad».
- «Cola creciendo (…)».
- «Fricción: pierde 30%».
- «Llega fuera de plazo».
- «Prisas: colocado antes que su causa».
- «Fluye sin fricción relevante».

El **Marcador** incluye el termómetro completo, ronda a ronda (sección 21).

---

## 21. Marcador

Botón **Marcador** de la barra superior (niveles 2 y 3): «Qué te ayuda, qué te frena y qué arreglar primero». Se calcula siempre con el motor, para el «¿Y si…?» activo. Arriba pone «Mirando «…» · N rondas» y, si hay supuestos, «N cosas supuestas: tómalo como orientación».

- **Seis indicadores**:
  - **Llega a la meta**: el total y la última ronda.
  - **Sobrevive**: % de lo que sale del inicio que llega.
  - **Aprovechas**: % de todo lo que se mueve.
  - **Se pierde**: % que se pierde por el camino.
  - **Va a…**: la segunda mitad de las rondas frente a la primera (sube o baja).
  - **Atascos**: puntos saturados y cuántos bucles hay en marcha.
- **Por dónde se va perdiendo**: el embudo del camino principal, con el «% que sigue vivo desde el inicio» en cada paso. Necesita un camino completo del inicio a la meta («Une el inicio con la meta, paso a paso.»).
- **Termómetro: qué se agobia y cuándo**: filas = ideas; columnas = rondas.
- **Lo que más te frena**: «lo que ganarías si lo arreglas».
- **Lo que más te ayuda**: «lo que perderías sin ello».
- **Lo primero que arreglaría**: los puntos que conviene atender antes.
- **Cómo va ronda a ronda**: gráfico de Resultado, Generado y Perdido.
- **Frenos que has encontrado**: cuántos hay (Propias, Externas, Del sistema, Sin clasificar) y cuántos tienen ya **decisión tomada**.
- **Lo que cambia por la cuadrícula del tiempo**, si está activa.

Haz clic en una idea de cualquier lista para ir a ella en el mapa.

> Se calcula probando tu mapa sin cada freno (o sin cada ayuda) y comparando. El símbolo **≈** indica que depende de cosas que has supuesto.

---

## 22. «Dímelo claro»

Botón **Dímelo claro** (niveles 2 y 3): «Lo que sale de tu mapa, sin rodeos». Es una conclusión en **lenguaje coloquial y directo**, como te lo diría alguien que te quiere bien. Se basa **solo en lo que calcula el motor** con tu mapa tal como está ahora. No es adivinar el futuro: es lo que sale de lo que tú has puesto.

Apartados:

- Un titular y **tu punto real**, en pocas frases.
- **Lo que te frena**.
- **Lo que te salva**.
- **Dónde aprieta el zapato**.
- **La rueda**: cómo gira el sistema y sus bucles.
- **Lo que haría yo mañana**.
- Avisos (si hay supuestos) y los datos clave en pastillas.

Botones:

- **Copiar** al portapapeles.
- **Markdown** (.md) y **Texto** (.txt).
- **PDF con el mapa**: el texto más una imagen del mapa.
- **Que la IA lo cuente mejor**: la IA lo vuelve a contar **con los mismos datos y sin inventar números**. Solo funciona si hay IA configurada (sección 29). Si no, avisa: «Ningún proveedor de IA configurado: el veredicto ya está calculado sin IA.». La versión de la IA aparece aparte, marcada «Contado por la IA con los mismos datos (sin inventar números)».

---

## 23. «Ayúdame a pensar»: preguntas, plan, ACLARATOR y COPYWRITER

Botón **Ayúdame a pensar** (✦), en todos los niveles. Es distinto de la Brújula: aquí eliges un modo de trabajo con más preguntas. Te ayuda a **pensar antes de construir** y todo termina en tu mapa.

### 23.1 Modo demostración y modo IA

- **Con IA configurada** (sección 29), el panel indica el proveedor y el **Modelo**.
- **Sin IA**, aparece **«Modo demostración: no hay IA conectada.»** y la etiqueta «demo · guion local». Las preguntas y propuestas salen de un guion y de plantillas locales. **Nunca finge que una IA está respondiendo.**

### 23.2 Elegir el modo de trabajo

1. Si ya habías empezado otra, pulsa **+** (**Nueva exploración**) en la columna de la izquierda. Arriba pone «Vamos a pensarlo juntos · Elige cómo quieres trabajar. Todos los modos terminan en tu mapa.».
2. Elige uno de los cuatro **modos de trabajo**:
   - **Hazme preguntas**: una pregunta cada vez para descubrir qué quieres y qué te frena (sección 23.3).
   - **Te cuento mi plan**: suéltalo con texto, voz o documentos y lo convierte en un mapa (sección 23.4).
   - **Aclarator**: aclara lo esencial en doble capa, bloque a bloque (sección 23.8).
   - **Copywriter**: guion de voz para YouTube, reels y stories (sección 23.9).
3. Rellena lo que pide cada modo. Si tu mapa ya tiene nombre, aparece escrito como tema.
   - En **Hazme preguntas** y **Te cuento mi plan**: **¿Sobre qué quieres pensar?**, **¿Qué quieres conseguir?**, **¿Cómo lo harías?** y **Algo más que deba saber**.
4. (Opcional) Sube tu plan con **Añadir plan (Word, Excel, PDF, texto)** en la columna izquierda (sección 23.5).
5. Pulsa **Empezar** (en **Te cuento mi plan**, **Continuar**).

Vale con muy poquito. Lo demás lo vamos sacando.

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
- **Lo que vamos descubriendo** (panel lateral; **Ocultar** / **Mostrar descubrimientos**) se va llenando con:
  - Naturaleza del sistema.
  - Lo que ya sabemos.
  - Hemos descubierto.
  - Todavía no sabemos.
  - Supuestos por comprobar.
  - Contradicciones.
  - Decisiones pendientes.
  - Fricciones separadas en **Propias**, **Del entorno** y **Del sistema**.
  - Alternativas.
- También detecta el tipo de caso («Parece un caso de …; adaptaré mis preguntas.» y «Área detectada: …»): servicio local, negocio digital, proyecto personal, proceso de equipo, producto, campaña…
- Arriba ves en qué etapa vas. Cuando aparece **«Listo para un primer flujo»**, pulsa **Crear el flujo inicial**. Puedes pulsarlo antes si quieres.

### 23.4 Creador de estrategias

1. Escribe tu plan, **habla sin límite de tiempo** con **Grabar nota de voz** (se transcribe por tramos de 1 minuto; **Parar** termina) o usa **Subir audio**. **Añadir documento al texto** pega el texto de un archivo.
2. Pulsa:
   - **Construir contexto con IA**, que necesita IA configurada; o
   - **Plantilla estándar (sin IA)**, que usa la plantilla del tipo de idea con sus fricciones habituales.
3. **Prefiero que me hagas preguntas primero** cambia a la entrevista.

**Sobre la voz:**
- La **transcripción de archivos de audio** necesita un proveedor con audio (Gemini o compatible con OpenAI).
- Sin él, puedes usar el **dictado del navegador** (Chrome/Edge). Aviso: el navegador puede enviar el audio a su propio servicio de voz.

### 23.5 Plan maestro como base de conocimiento

Sube tu plan en **.docx, .xlsx, .pdf o .txt** («Sube tu plan (Word, Excel, PDF o texto) y lo usaré como guía.»). La app lo trocea y, en cada turno, usa **solo los fragmentos relevantes** como guía y fuente de datos.

- Haz clic en un documento subido para abrir su ficha. Verás el **Resumen como guía**, con los Objetivos, Metas, Plazos, Recursos, Restricciones e Indicadores detectados (con IA si está configurada; si no, con un análisis local por apartados).
- Puedes quitar un documento con **Eliminar documento** (papelera).

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

- En **Meterlo en mi mapa** eliges dónde (**En un mapa nuevo**, **En este mapa** o **Unido a la idea elegida**; para esta última, elige antes una idea en el lienzo) y el botón **Meter N ideas en el mapa** crea **elementos normales**: ideas, uniones, comportamientos y medidas, que puedes cambiar y probar. No se sobrescribe nada y **Ctrl+Z deshace toda la inserción.**
- **Seguir preguntando** vuelve a la entrevista.
- Los datos que faltan se marcan como «sin dato: se usará un índice base 100».
- Las retroalimentaciones sin porcentaje se insertan **desactivadas** (multiplicador 0) con la etiqueta «(define el %)», para que pongas tú el valor.

Cada idea insertada lleva un **bloque de descubrimiento** en **Detalles** (nivel 3):

- **Confirmar / Dudoso / Descartar**.
- **Categoría**: Fricción propia, Fricción externa o Fricción del sistema.
- **Control**: Control directo, Influencia parcial, Dependencia externa o Incontrolable.
- **¿Qué hacemos con ella?**: Pendiente, Eliminar, Convivir, Compensar u Otra ruta. Si eliges **Compensar**, añade abajo una medida compensatoria para que el motor lo tenga en cuenta.
- **Etapa** y **Evidencia**.

### 23.7 Memoria

Cada mapa guarda sus exploraciones: preguntas, respuestas, descubrimientos y documentos. Aparecen en la columna de la izquierda de «Ayúdame a pensar» (marcadas «Preguntas» o «Tu plan»); si no hay ninguna: «Aún no hemos hablado de este mapa.». **Eliminar exploración y sus datos** las borra.

---

### 23.8 ACLARATOR: aclarar lo esencial, bloque a bloque

Sirve para entender lo más abstracto y esencial de **cualquier proyecto o pretensión** antes de hacer nada. Funciona como un diálogo progresivo:

**Regla de oro:** no se pasa a la siguiente cuestión hasta que la presente esté **aclarada y validada**. Por eso nunca te enseña el total del proceso de golpe: solo el bloque en el que estás.

1. Elige **Aclarator**, escribe **¿Qué quieres aclarar?** y, en **Cuéntamelo todo, tal cual te salga**, suelta todo sin orden.
2. Pulsa **Empezar** («Un bloque cada vez: no pasamos al siguiente hasta que esté claro.»). Aparece **un solo bloque** y la barra de progreso (los bloques que vienen no se nombran). Sin IA, la etiqueta dice «Aclarator · sin IA».
3. Cada bloque tiene **dos capas**:
   - **INTERNO**: cómo está hecho o qué se construye.
   - **EXTERNO**: qué tiene que pasar fuera, en la realidad o en quien lo recibe.
4. Escríbelas en sus cuadros, o habla con el Aclarator en el cuadro de abajo: él reformula con tus palabras (tal cual, sin corregirlas) y te pregunta lo que falta.
5. Bajo cada capa verás **✓ Claro** o un aviso ⚠ que dice qué falta: «Todavía está vacío.», «Es muy corto: dilo con una frase completa.» o, si usas palabras vagas como «algo», «mejor», «muchos» o «cosas», ««algo» es difuso: ¿qué es exactamente? Dilo de forma que se pueda ver, contar o comprobar.».
6. Si te atascas: **Dame un ejemplo** o **Ayúdame a concretar** (quién, qué, cuánto y cómo se comprueba). Pedir ayuda **no** te hace avanzar.
7. Cuando las dos capas están claras, pulsa **Está claro: validar y seguir** (en el último bloque, **Está claro: terminar**). Hasta entonces el botón está apagado. **Paso anterior** vuelve atrás.

Los diez bloques, en este orden:

| Bloque | INTERNO | EXTERNO |
|---|---|---|
| **Objetivo** | ¿Qué se está construyendo exactamente? | ¿Qué debe ocurrir en la realidad después? |
| **Prioridad** | ¿Qué pesa más en cómo está hecho? | ¿Qué pesa más en el efecto que debe generar? |
| **Subobjetivos** | Condiciones que debe cumplir el contenido | Condiciones que deben cumplirse en la reacción del receptor |
| **Elementos críticos** | Qué no puede faltar en el contenido | Qué necesita el receptor para actuar o decidir |
| **Tono** | Cómo debe sonar el contenido | Cómo debe sentirse el receptor al recibirlo |
| **Receptor** | Quién es y qué le importa | Qué le genera rechazo y qué le da confianza |
| **Límites** | Qué no debe aparecer en el contenido | Qué efecto negativo no puede provocar |
| **Contexto** | Factores que afectan a la construcción | Factores que afectan a la interpretación |
| **Detalle** | Nivel de desarrollo del contenido | Nivel de información necesario para que el receptor actúe |
| **Éxito** | Cuándo el contenido está perfecto | Qué debe pasar fuera para validar que funciona |

Al terminar los diez, **ahora sí** ves todo lo aclarado y puedes:

- **Crear el mapa** (**Dónde**: En un mapa nuevo o En este mapa): tu proyecto en el centro, los 10 bloques alrededor y, de cada uno, su capa interna y su capa externa (31 ideas). Se puede deshacer.
- **Copiar** o descargar en **.md**.
- **Escribir guiones con el Copywriter**, usando lo aclarado como base.

### 23.9 COPYWRITER: guiones para YouTube, Instagram y TikTok

Convierte un tema en un guion que se escucha hasta el final: que suene humano, que tenga algo nuevo cada 20–30 segundos, que haga entender con ejemplos antes que con teoría y sin sensacionalismo.

1. Elige **Copywriter** y escribe **¿De qué tema es el vídeo?**, **¿Para quién es?** y **¿Qué quieres que se lleven?** (y notas si quieres).
2. Pulsa **Empezar**. Si en este mapa terminaste un Aclarator, puedes marcar **Usar lo aclarado con el Aclarator («…»)**.
3. Pulsa:
   - **Escribir el guion con IA** (necesita IA configurada); o
   - **Esqueleto sin IA**: una estructura con frases de partida y pistas entre corchetes para rellenarla con tus palabras. Está marcada «Esqueleto sin IA: rellénalo con tus palabras» (lo escrito por la IA se marca «Escrito con IA»).

Lo que entrega:

- **Guion de YouTube · solo voz** (unos 5 minutos, entre 700 y 900 palabras; el contador lo indica): **Gancho** (sin saludar ni «En este vídeo…»), **Lo que cree la gente**, **Pero…** (la fricción), **Lo que descubrimos**, **Más a fondo**, **En tu vida**, **Cierre** (una idea que se quede, no un resumen), **Pregunta** e **Invitación** (comentar, compartir o seguir, sin mendigar).
- **Reto tangible**: siempre hay al menos un ejemplo, ejercicio o reto que se pueda practicar.
- **Reel principal** (la idea más potente), **Reel de contraste** (rompe una creencia) y **Reel de reflexión** (genera conversación), de 30–60 s cada uno y con su botón **Copiar**.
- **Stories**: entre 3 y 5, cada una invitando a la siguiente.

Botones: **Copiar guion** (solo la voz, listo para leer ante la cámara), **Copiar todo**, **.md**, **Volver a escribir** y **Crear el mapa del guion**: el título arriba, las partes del guion en orden, el reto, los reels y las stories encadenadas.

---

## 24. Guardar, versiones, exportar e importar

### 24.1 Guardado automático

Cada cambio se guarda solo en el navegador a los ~0,5 segundos. El punto de guardado junto al nombre lo confirma (sección 4.8). Al recargar se abre el último mapa.

### 24.2 Deshacer

Ctrl+Z y Ctrl+⇧+Z (o Ctrl+Y). El historial guarda los últimos ~120 cambios **de la sesión actual**: al recargar la página empieza vacío. Para volver atrás después de recargar, usa las **versiones**.

### 24.3 Versiones guardadas

Se abren con **Versiones guardadas** (el reloj de la barra superior en el nivel 3, o **Más opciones (···) → Versiones guardadas…**): «Vuelve a como estaba antes, sin perder lo de ahora».

- **Automáticas**: cada pocos minutos de trabajo (se llaman «Guardado automático»).
- **Manuales**: Ctrl+S o **Más opciones → Guardar versión ahora**; o, en el panel, escribe un nombre (opcional) y pulsa **Guardar versión**.
- **Restaurar** recupera una versión. Antes guarda una versión de seguridad («Antes de restaurar»), así que también se puede deshacer.
- **Eliminar versión** con su icono.

### 24.4 Guardar una copia (exportar)

En **Guardar o abrir archivos** (el icono de descarga de la barra superior en el nivel 3, o **Más opciones → Guardar o abrir archivos** en los niveles 1 y 2), apartado **Guardar una copia**:

| Opción | Para qué |
|---|---|
| **Proyecto completo (.json)** | Mover o compartir el mapa con todo: ideas, uniones, comportamientos, «¿Y si…?», capas, comentarios, adjuntos, versiones y exploraciones. |
| **Imagen PNG** / **Imagen SVG** | Imagen del mapa (la SVG se puede ampliar sin perder calidad). |
| **Documento PDF** | El mapa en PDF. |

En el apartado **Copias de seguridad**, **Copia de seguridad completa** guarda **todos** tus mapas en un solo archivo.

### 24.5 Abrir e importar

- **Importar proyecto (.json)** (apartado **Abrir** del mismo menú) o **Abrir un archivo** en la pantalla de inicio.
- **Pegar proyecto (JSON)** (mismo menú, **Pegar un mapa** en la pantalla de inicio, o Ctrl+K): pega el texto y pulsa **Importar**. **Pegar del portapapeles** lo trae directamente. Si el texto viene de una IA con marcas ```json o frases alrededor, se limpian solas. Si hay un error, el cuadro no se cierra y un aviso explica el motivo.
- El archivo **se valida y se actualiza** si es de una versión anterior.
- Si ya tienes ese mapa, se importa **como copia** con «(importado)» en el nombre, **sin sobrescribir** nada.
- Si el archivo tenía referencias rotas (por ejemplo, una unión hacia una idea que no existe), se reparan y se avisa.
- **Restaurar copia de seguridad** (apartado **Copias de seguridad**) importa todos los mapas de una copia completa.

### 24.6 Llevar tus mapas a otro ordenador

1. En el ordenador de origen: **Guardar o abrir archivos → Copia de seguridad completa**.
2. Lleva el archivo (correo, USB, nube).
3. En el ordenador de destino: abre la aplicación → **Guardar o abrir archivos → Restaurar copia de seguridad**.

### 24.7 Duplicar un mapa

**Más opciones (···) → Duplicar este mapa** crea «Nombre (copia)» y lo abre.

---

## 25. Ajustes del mapa

**Más opciones (···) → Ajustes del mapa** (o, en el nivel 3, **Detalles → Ajustes → Más ajustes…** con nada elegido):

- **Escala ponderada**: **Mínimo** y **Máximo** (por defecto −5 y +5).
- **Escalas cualitativas (interpretación para simular)**:
  - Vienen dos: «Muy bajo → Muy alto» (0,1 · 0,3 · 0,5 · 0,7 · 0,9) y «Muy bajo → Crítico» (0,1 · 0,3 · 0,5 · 0,75 · 0,95).
  - Puedes cambiar el **Nombre de la escala**, cada **Nivel** y su **Interpretación** (0–1), crear una **Nueva escala** o **Eliminar escala**.
  - Los resultados que usan niveles con palabras se marcan como aproximación.
- **Paleta semántica y leyenda**:
  - Colores de Flujo, Impulso, Pérdida, Condición, Transformación y Concepto.
  - **Mostrar leyenda** y qué líneas aparecen en ella.
  - **Restaurar elementos de la leyenda**.
- **Animación**: **Partículas de flujo** encendidas o apagadas. Si tu sistema tiene activado «reducir movimiento», la aplicación lo respeta.
- **Atajos de teclado**: cambia cualquier atajo escribiendo la combinación en su casilla con el formato `Mod+Shift+Tecla`, donde Mod = Ctrl o ⌘. Ejemplos: `Mod+Shift+K`, `Alt+P`, `H`.

El nivel (1 · Pensar, 2 · Camino, 3 · Experto) no está aquí: se cambia arriba, en el selector de nivel.

---

## 26. Buscador de comandos

**Ctrl+K** (o la lupa **Buscar** en el nivel 3). Escribe para buscar («Buscar ideas, comandos, vistas…»):

- **Ideas del mapa**, por nombre, descripción o etiqueta. Al elegir una se selecciona y se centra. Las escondidas salen en **Ideas ocultas**; al elegirlas se vuelven a ver.
- **Comandos**, agrupados:
  - **Crear**: Nueva idea, Nuevo inicio, Nueva meta, Nueva nota, Nueva zona y Bucle con lo elegido.
  - **Edición**, **Navegación**, **Herramientas**, **Vistas**, **Probar** y **Mapa**: los mismos que los atajos de teclado (sección 27).
  - **Organizar**: Ordenar el mapa, alinear, distribuir, Mostrar lo oculto, Bloquear / desbloquear lo elegido y Clonar (la misma idea en otro sitio).
  - **Vistas**: Vista Ideas, Vista Recorrido, Vista Fuerzas, Vista Piezas y Vista Película.
  - **Paneles**: Marcador, Ayúdame a pensar, Dímelo claro, Comparar «¿y si…?», Versiones guardadas, Ajustes del mapa, Ayuda, Manual de usuario y Manual para IA (prompts).
  - **Archivo**: Guardar copia (.json), Imagen PNG, Imagen SVG, Documento PDF, Abrir un archivo (.json) y Pegar proyecto (JSON).
  - **Tema**: Claro, Oscuro y Como mi ordenador.

Usa ↑ ↓ para moverte, Enter para ejecutar y Escape para cerrar. La búsqueda no distingue tildes.

---

## 27. Atajos de teclado

(En Mac, Ctrl = ⌘.) Puedes cambiarlos en **Ajustes del mapa**. Algunos solo funcionan desde cierto nivel: lo indica la última columna.

| Acción | Atajo | Nivel |
|---|---|---|
| **Edición** | | |
| Deshacer | Ctrl+Z | todos |
| Rehacer | Ctrl+⇧+Z · Ctrl+Y | todos |
| Copiar · Cortar · Pegar | Ctrl+C · Ctrl+X · Ctrl+V | todos |
| Duplicar | Ctrl+D | todos |
| Seleccionar todo | Ctrl+A | todos |
| Borrar | Supr (o la tecla de borrar) | todos |
| Juntar en un grupo · Deshacer el grupo | Ctrl+G · Ctrl+⇧+G | 3 |
| Escribir | Enter | todos |
| Idea unida | Tab | todos |
| Idea hermana | ⇧+Enter | todos |
| **Navegación** | | |
| Buscar | Ctrl+K | todos |
| Verlo todo | F | todos |
| Acercarme a lo elegido | ⇧+F | todos |
| **Herramientas** | | |
| Mover y elegir · Nueva idea · Unir ideas | V · B · C | todos |
| Nota | N | todos |
| Inicio · Meta | I · O | 2 y 3 |
| **Vistas** | | |
| Vista Ideas | 1 | todos |
| Vista Recorrido · Fuerzas · Piezas | 2 · 3 · 4 | 3 |
| Vista Película | 5 | 2 y 3 |
| Termómetro | H | 3 |
| **Probar** | | |
| Probar / pausar | Espacio | 2 y 3 |
| Ronda siguiente · Ronda anterior | . · , | 2 y 3 |
| **Mapa** | | |
| Guardar versión ahora | Ctrl+S | todos |
| **General** | | |
| Quitar la herramienta, la selección, el rastreo y el enfoque | Escape | todos |

Los atajos no actúan mientras escribes en un cuadro de texto.

---

## 28. Los mapas de ejemplo

### 28.1 «Vender mis dibujos» (modo fácil)

**Ver un ejemplo** (pantalla de inicio o **Más opciones (···)**) abre un camino hecho para aprender. Lleva la etiqueta «Ejemplo» y se abre en **2 · Camino**:

- 🌱 **Hoy**: «Dibujo mucho, pero nadie ve mis dibujos».
- 👣 **Pasos**: «Hacer 10 dibujos bonitos» ⭐ (primer paso) → «Enseñarlos en internet» → «Ponerles un precio».
- 🎯 **Lo que quiero**: «Vender mis dibujos».
- 🪨 **Piedras**: «Me da vergüenza enseñarlos» (grande, frena «Enseñarlos en internet») y «No sé cuánto cobrar» (mediana, frena «Ponerles un precio»).
- 🤝 **Ayudas**: «Mi prima sabe de redes» (bastante) y «Mirar lo que cobran otros» (mucho).
- 💛 «Quiero comprarme una tableta para dibujar» · ❤️ «Me hace ilusión y me da un poco de miedo» · ❓ «¿Dónde se venden dibujos?».

El medidor dice **«Llegan 7 de cada 10»**. **Prueba esto:**
1. Elige «Mi prima sabe de redes» y cambia **¿Cuánto te ayuda?** a **Mucho**: mira cómo sube el medidor.
2. Elige una piedra y hazla **Pequeña** o **Grande**.
3. Pulsa **¿Por qué?** y luego **Ver mi plan**.

### 28.2 Ejemplo para expertos (nivel 3)

**Ejemplo para expertos** (abajo en la pantalla de inicio o en **Más opciones (···)**) abre **«SISTEMA DE ÉXITO COMERCIAL — OPERADOR DE SEGUROS DE HOGAR»**. Todos sus valores son **inventados**. Se abre en el nivel 2; pásalo a **3 · Experto** para verlo todo.

- **Camino principal**: Llamadas recibidas → Clasificación de llamadas → Llamadas útiles / no útiles → Capacidad del operador → Conversación comercial → Objeciones → Cierre → Ventas.
- **Factores**: Calidad de oportunidad, Tiempo disponible, Formación, Motivación, Fricción tecnológica, Argumentario.
- **Bucles**: Recuperación de oportunidades, Aprendizaje, Mejora del sistema y el bucle «Referidos».
- **«¿Y si…?»** (nivel 3):
  - **Situación inicial** (el original).
  - **B · Mejorar la clasificación** (el filtro deja pasar un 75 %).
  - **C · Aumentar la formación** (más influencia y más remedio contra la fricción).
  - **D · Reducir la fricción tecnológica**.
  - **E · Combinar mejoras** (B + C + D).

**Prueba esto:**
1. En el nivel 2, mira el medidor y **Lo que he descubierto**.
2. Pasa a **3 · Experto**, pulsa **Reproducir** en el panel de abajo y abre el **Marcador** y **Dímelo claro**.
3. Cambia de «¿Y si…?» en el selector de arriba y observa el resultado.
4. Abre **Comparar «¿y si…?»** entre la Situación inicial y E.

---

## 29. Activar la IA real

Sin IA todo funciona («Ayúdame a pensar» en modo demostración). Para usar una IA de verdad:

### En la versión publicada en Vercel

1. Consigue una clave de API, por ejemplo de **Google Gemini** en Google AI Studio.
2. En **vercel.com** abre el proyecto `mapa-flujos-workflow` → **Settings → Environment Variables**.
3. Añade `GEMINI_API_KEY` con tu clave (entornos: Production y, si quieres, Preview).
4. **Deployments** → en la última publicación → **Redeploy**.
5. Abre «Ayúdame a pensar»: debe mostrar el **Modelo** en lugar de «Modo demostración».

### Otros proveedores

| Proveedor | Variables |
|---|---|
| Google Gemini | `GEMINI_API_KEY` (opcional `GEMINI_MODEL`; si no lo indicas, se elige solo el modelo «flash» vigente). |
| OpenAI o cualquier API compatible (Mistral, Groq, OpenRouter, DeepSeek, Ollama, LM Studio…) | `EXPLORER_PROVIDER=openai`, `OPENAI_API_KEY`, `EXPLORER_BASE_URL` (por ejemplo `https://api.openai.com/v1`) y opcionalmente `OPENAI_MODEL` y `EXPLORER_TRANSCRIBE_MODEL` (por ejemplo `whisper-1`). |
| Anthropic Claude | `EXPLORER_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` (opcional `ANTHROPIC_MODEL`). |
| Genéricas | `EXPLORER_API_KEY` y `EXPLORER_MODEL` se aplican al proveedor elegido. |
| Límite | `EXPLORER_RATE_LIMIT` (peticiones por minuto y por IP; por defecto 40). |

Con IA funcionan de verdad: la entrevista, el creador de estrategias, el resumen de documentos, la transcripción de audios (con Gemini o compatible con OpenAI), el **ACLARATOR**, el **COPYWRITER** y «Que la IA lo cuente mejor» en «Dímelo claro».

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
| **El enlace pide iniciar sesión en Vercel.** | El propietario debe quitar la protección: Vercel → Settings → Deployment Protection → Vercel Authentication → Desactivado o Standard Protection. |
| **No veo mis mapas.** | Están en el navegador y el ordenador donde los creaste. Usa ese navegador, o importa una copia de seguridad (sección 24.6). |
| **No encuentro un botón de este manual.** | Seguramente es del nivel 3. Pulsa **3 · Experto** en el selector de nivel (sección 4). |
| **Al probar no llega nada a la meta (sale 0).** | Revisa que haya un **Inicio** con cantidad, que esté unido a una **Meta** con uniones **Pasa** (no Influye ni Idea) y que ningún filtro o condición lo corte. Mira **Pistas** y **Qué ha pasado** (nivel 3). |
| **No aparecen los comportamientos o las condiciones.** | En el modo fácil no hacen falta: las piedras y las ayudas hacen ese papel. Para todo, pulsa **3 · Experto**. |
| **Las uniones Influye no mueven nada.** | Es correcto: cambian a la otra idea, no transportan. Usa uniones **Pasa** para mover algo. |
| **Ha desaparecido una idea.** | Puede estar oculta, escondida en una rama, en una capa oculta o fuera del filtro de etiqueta. Prueba **Mostrar lo oculto**, **Quitar filtro** o búscala con Ctrl+K. |
| **No puedo mover una idea.** | Está **bloqueada** o en una **capa bloqueada**. |
| **«Ayúdame a pensar» dice «Modo demostración».** | No hay clave de IA configurada en el servidor (sección 29). |
| **«Que la IA lo cuente mejor» no hace nada.** | Igual: necesita IA configurada. |
| **No transcribe mis audios.** | Hace falta un proveedor con audio (Gemini o compatible con OpenAI). Alternativa: el dictado del navegador (Chrome/Edge). |
| **El botón «Está claro: validar y seguir» del Aclarator está apagado.** | Las dos capas tienen que estar claras: concreta lo que marque el aviso ⚠ (sección 23.8). |
| **«No se pudo importar» al pegar el JSON de una IA.** | El aviso dice qué campo falla. Pide a la IA que lo corrija con el prompt **P4 · Reparar un JSON que no se importa** del MANUAL-IA, pegándole el aviso. |
| **«Error al guardar» o el punto de guardado está rojo.** | El navegador puede estar sin espacio o en modo privado. Guarda una copia del mapa en JSON por seguridad y libera espacio. |
| **Ctrl+Z no recupera lo de ayer.** | El deshacer no sobrevive a recargar la página. Usa **Versiones guardadas → Restaurar**. |
| **El resultado tiene «≈» o «cosas supuestas».** | Usa niveles con palabras o hipótesis. Es orientativo, no un dato exacto. |
| **La posición cambia mis resultados.** | La **cuadrícula que computa** está activa. Vuelve a **Tapiz libre** si no lo quieres. |

---

## 32. Recetas rápidas

### A. Soltar ideas (sin números)

1. En la pantalla de inicio, escribe tu idea y pulsa **Empezar** (nivel 1 · Pensar).
2. A la pregunta de la Brújula, contesta **💭 Solo quiero pensar en ello**.
3. Escribe en la Brújula todo lo que se te ocurra, de una en una: cada cosa aparece unida a tu idea. También puedes elegir una idea y pulsar **Tab**.
4. Une las que tengan que ver con **🔗 Unir** y dales color en los detalles.
5. Cuando veas algo que quieres conseguir, elígelo en la pregunta «¿Alguna de estas ideas es algo que te gustaría conseguir?».

### B. De un problema a un plan (modo fácil)

1. Escribe tu problema («Me cuesta concentrarme») y pulsa **Empezar**.
2. Contesta **😟 Algo que me preocupa**: pasas solo a **2 · Camino**.
3. Contesta a la Brújula: cómo te gustaría que fuera, por qué te importa, dos o tres pasos, qué te puede frenar (y lo grande que es), quién te puede ayudar y cuál es tu primer pasito.
4. Mira el medidor: **«Llegan N de cada 10»**. Si es bajo, busca una ayuda más fuerte para tu piedra más grande.
5. Pulsa **¿Por qué?** → **Ver mi plan** → **Copiar** o **Descargar**.
6. Cuando hagas un paso, elígelo y pulsa **✅ ¡Ya lo he hecho!**.

### C. Un freno y su remedio (nivel 3)

1. Crea «Falta de tiempo» con **Influencia** −3 (Pond.) en **Cuánto empuja o frena**.
2. Únela con una unión **Influye** (Qué hace: Modula al destino) a «Citas».
3. En «Falta de tiempo» → **Remedios → Nueva medida compensatoria** → llámala «Agenda fija», con Cantidad 2 pt.
4. Compara el resultado con y sin la medida usando un **«¿Y si…?»**.

### D. Probar una idea sin estropear el original (nivel 3)

1. Selector «¿Y si…?» → **Nuevo «¿y si…?»**.
2. Cambia los valores que quieras en Detalles.
3. **Comparar…** con la Situación inicial.

### E. Planificar en el tiempo con fecha límite (nivel 3)

1. Abre la **Cuadrícula del tiempo** y elige **Cuadrícula que computa**, con Unidad «Semana».
2. Coloca cada paso en su columna.
3. Pon la **Fecha límite (columna)** en 8 con «Se penaliza» (conserva 50 %).
4. Enciende el **Termómetro (H)** para ver qué se agobia.

### F. Que una IA te construya el mapa

1. Abre el **Manual para IA** (`/manual-ia/` o `docs/MANUAL-IA.md`) y copia en tu IA el **Prompt maestro** y el prompt **P2 · Generar un proyecto importable**, rellenando tu idea.
2. Copia la respuesta de la IA, aunque traiga texto alrededor.
3. En la aplicación: **Pegar un mapa** (pantalla de inicio) o **Guardar o abrir archivos → Pegar proyecto (JSON)** → pega → **Importar**.
4. Pulsa **Probar** y revisa el resultado.

### G. De un plan escrito a un mapa

1. **Ayúdame a pensar** → **Te cuento mi plan**.
2. Escríbelo, díctalo o sube tu plan (.docx, .pdf…), y pulsa **Continuar**.
3. Pulsa **Construir contexto con IA** o **Plantilla estándar (sin IA)**.
4. Revisa los frenos, decide qué harás con cada uno y pulsa **Meter N ideas en el mapa**.

### H. Aclarar un proyecto y sacar el guion

1. **Ayúdame a pensar** → **Aclarator**. Escribe qué quieres aclarar y suéltalo todo.
2. Ve bloque a bloque hasta el final (sección 23.8) y pulsa **Crear el mapa**.
3. Pulsa **Escribir guiones con el Copywriter** y, con **Usar lo aclarado con el Aclarator** marcado, genera el guion (sección 23.9).
4. Pulsa **Crear el mapa del guion**.

---

## 33. Glosario

| Término | Definición |
|---|---|
| **Idea (burbuja)** | Un elemento del mapa: una idea o un paso. |
| **Inicio (entrada)** | De donde sale todo: genera flujo en cada ronda. |
| **Meta (salida)** | Lo que quieres conseguir: donde se cuenta el resultado. |
| **Unión (conexión)** | Línea entre dos ideas. **Pasa** (flujo), **Influye** (causal), **Info** (informativa) o **Idea** (conceptual). |
| **Ronda (iteración)** | Un paso de tiempo al probar (una semana, un mes…). |
| **Nivel** | Cuántas herramientas ves: 1 · Pensar, 2 · Camino, 3 · Experto. |
| **Brújula** | La guía del modo fácil: una pregunta cada vez, con su porqué. |
| **Empujones** | Las 10 «fuerzas» que salen de Hoy en cada vuelta. El medidor cuenta cuántas llegan a lo que quieres. |
| **Piedra** | Algo que te frena: se queda con parte de los empujones de un paso. |
| **Ayuda** | Algo o alguien que hace más pequeña una piedra. |
| **Acumulador / stock (hucha)** | Lo que se guarda en una idea para más adelante. |
| **Bifurcación** | Reparto de un flujo entre varias salidas. |
| **Bucle (circuito)** | Círculo de ideas. **Reforzador** si se amplifica, **equilibrador** si se frena, **mixto** si tiene de las dos cosas. |
| **Remedio (compensación / mitigador)** | Medida que reduce el efecto negativo de un freno. |
| **Conservación** | Comprobación de que todo lo que entra se explica: o sale, o se pierde, o se consume, o queda guardado o en camino («Las cuentas cuadran»). |
| **Convergencia** | Cómo se combinan varios flujos que llegan a la misma idea. |
| **Dimensión** | Cada característica independiente del flujo (cantidad, calidad…). |
| **«¿Y si…?» (escenario)** | Variante del mapa que guarda solo sus cambios. |
| **Extensiva / intensiva** | Dimensión que se suma (cantidad) o que se promedia (calidad). |
| **Freno (fricción)** | Algo que frena o hace perder flujo. Puede ser **propio**, **externo (del entorno)** o **del sistema**. |
| **Influencia** | Cuánto empuja o frena una idea a otras, de −5 a +5 por defecto. |
| **Cuadrícula del tiempo (marco espacial)** | Cuadrícula opcional donde la posición significa tiempo (columnas) y apoyo o fricción (filas). |
| **Vuelta (retorno)** | Unión que cierra un círculo. Entrega en la ronda siguiente. |
| **Termómetro** | Colorea cada idea por su «temperatura»: frío (le falta), a buen ritmo, caliente o agobiado. |
| **Marcador (monitor)** | Panel con lo que te ayuda, lo que te frena y qué arreglar primero. |
| **ACLARATOR** | Modo que aclara un proyecto bloque a bloque, en doble capa (interno y externo). |
| **COPYWRITER** | Modo que escribe guiones de voz para YouTube, reels y stories, con un reto práctico. |
