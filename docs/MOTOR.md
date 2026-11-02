# Reglas de ejecución del motor de flujos

El motor (`src/engine/`) es independiente de React. Se ejecuta en un Web Worker
(`src/workers/engine.worker.ts`) y es **determinista**: con la misma configuración
siempre produce el mismo resultado. La velocidad de la animación nunca interviene
en el cálculo.

## 1. Qué circula

Un **paquete de flujo** tiene dimensiones independientes:

| Tipo | Ejemplos | Al fusionar | Al dividir |
|---|---|---|---|
| Extensivas (se suman) | Cantidad, Carga, dimensiones personalizadas «Suma» | se suman | se reparten en proporción |
| Intensivas (se promedian) | Calidad, Velocidad, Potencial, personalizadas «Media» | media ponderada por cantidad | se conservan |

Además, cada paquete lleva la **composición por origen** de la cantidad. Indica qué entrada, qué multiplicador o qué retroalimentación la produjo. El rastreador hacia atrás la usa para explicar cualquier resultado.

Una operación sobre una dimensión nunca altera las demás.

## 2. Orden de procesamiento (determinista)

1. Se construye un grafo de dependencias con:
   - las conexiones de flujo;
   - las réplicas y retroalimentaciones;
   - las conexiones causales y de compensación;
   - las referencias de las condiciones;
   - los controladores y los repartos dinámicos.
2. Un recorrido en profundidad, en orden estable, marca como **dependencias de retorno** las que cierran ciclos. Primero van las entradas y después el orden de creación; la posición en el lienzo nunca cuenta. Las conexiones marcadas como «retorno» y los retornos de circuitos configurados lo son siempre.
3. Los nodos se procesan en orden topológico. Lo que llega por una dependencia de retorno se usa en la **iteración siguiente**. Por eso un circuito nunca se procesa de forma infinita dentro de una misma iteración.

## 3. Pipeline por elemento

| # | Fase | Qué ocurre |
|---|---|---|
| 1 | Recoger entradas | Llegadas inmediatas y retardadas. Capacidad y dimensiones admitidas por puerto. |
| 8 | Convergencia | Suma, ponderada, prioridad, máximo, mínimo, deduplicación (solapamiento) o fórmula. Las inhibiciones (retroalimentación negativa) restan aquí. |
| 2 | Condiciones | Activación del elemento (Y/O/NO, comparaciones, rangos, umbrales, iteración, dependencia de otro elemento). Reglas de activación: cada iteración, enclavada, única y sostenida N iteraciones. |
| 3 | Activación | Comportamientos con su SI / SI NO, controladores, compensaciones e influencia neta. |
| — | Generadores | Producen flujo nuevo (se registra como **generado**). |
| 4 | Filtros | Por proporción o por umbral de una dimensión. Lo rechazado va a las conexiones de **rechazo** o se pierde. |
| 5 | Transformaciones | Transformador, multiplicador, reductor, consumidor, acelerador e influencias causales. |
| 7 | Capacidades | El restrictor limita el paso. El exceso se pierde, se encola para la siguiente iteración o se desborda. |
| 9 | Acumuladores | Almacenar (con máximo y fuga) y liberar. |
| 6 | Bifurcación | Reparto fijo, proporcional, condicionado, prioritario, competitivo o dinámico. El reparto conserva el flujo. |
| 7b | Conexiones | Condiciones de paso, multiplicador, pérdida, capacidad, resistencia (velocidad), intensidad (potencial) y dimensiones transportadas. |
| 10 | Retroalimentación | Réplicas (+ alimenta, − inhibe), circuitos (porcentaje de retorno, intensidad, frecuencia, condición, persistencia, saturación suave, límites) y retardos. |
| 11 | Estado siguiente | Stocks, colas y flujo en tránsito. |
| 12 | Registro | Eventos con su mecanismo y libro de conservación. |

## 4. Conservación

En cada iteración y para cada dimensión extensiva se cumple:

```
stock inicial + en tránsito inicial + generado
  = stock final + en tránsito final + consumido + perdido + terminal + deduplicado
```

Cualquier diferencia aparece como **«sin explicar»**. Las pruebas verifican que siempre es 0.

Un multiplicador o una retroalimentación que aumentan la cantidad aparecen como *generación* con su mecanismo, así que nunca hay creación de flujo sin identificar. Los crecimientos explosivos se limitan y se avisan.

## 5. Influencias y compensaciones

- **Influencia** de un elemento: su peso en escala ponderada (por defecto −5…+5). También puede derivarse de su flujo o de su stock.
  - Los valores cualitativos se interpretan con la escala configurable y se marcan como **aproximación**.
- **Conexión causal (modula):**

  ```
  factor = 1 + polaridad × sensibilidad × influencia_origen / máximo_escala
  ```

  Se aplica a la dimensión elegida del destino. Si el destino no transporta flujo, la influencia se suma a la del destino.
- **Compensación** sobre una dificultad:
  - Tipos: parcial, total, condicionada o temporal.
  - Unidad: puntos de escala o porcentaje.
  - Regla de combinación del destino: aditiva, solo la mayor o rendimientos decrecientes.
  - Efecto: reduce la influencia negativa y también las pérdidas de sus filtros, reductores y consumidores.
  - Ejemplo: −5 con medidas de +2 y +1 deja una influencia neta de −2.

## 6. Marco espacial (opcional)

Con el lienzo en modo cuadrícula, la posición se traduce, antes de simular, en parámetros normales del motor:

- **Columnas = tiempo:**
  - cada columna de separación añade una iteración de retardo;
  - una entrada empieza a generar en su columna;
  - la inversión temporal se penaliza;
  - lo que llega después de la fecha límite se penaliza o se corta.
- **Filas = apoyo / fricción:** multiplicador o reductor e influencia según la distancia al eje.

Todos esos efectos se muestran en «Supuestos y avisos» y en el monitor.

## 7. Escenarios

El modelo base es compartido. Cada escenario guarda solo sus **sustituciones** (ruta → valor), sus condiciones iniciales y su variante de incertidumbre (central, favorable o desfavorable). Aplicar un escenario nunca modifica el modelo base.
