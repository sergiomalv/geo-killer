# Geo Killer — Modo "Más o menos"

Fecha: 2026-09-18
Estado: aprobado en brainstorming
Base: rama nueva sobre `main`

## 1. Qué es

Un tercer modo de juego, al estilo del Higher Lower Game: se muestran dos asesinos, el de la
izquierda con su número de víctimas confirmadas a la vista y el de la derecha tapado, y el
jugador responde si el de la derecha mató **más** o **menos**.

Cadena clásica a una vida:

- **Acierto** → la carta derecha pasa a la izquierda con su cifra ya revelada y entra un asesino
  nuevo por la derecha. La racha sube en uno.
- **Empate** (misma cifra confirmada) → cuenta como acierto, sea cual sea el botón pulsado, con
  un aviso corto ("Empate: sigues").
- **Fallo** → fin de la partida. Se muestran la racha alcanzada, el récord y un botón para
  empezar otra.

Dentro de una misma partida no se repite ningún asesino. Cuando se agotan todos, la partida
sigue reciclando la lista desde cero, igual que hace `pickNextCase` en el modo infinito.

Nombre del modo: "Más o menos" en español, "Higher or Lower" en inglés.

## 2. La cifra que se compara

Se compara por **víctimas confirmadas**: el número por el que el asesino fue condenado o que las
fuentes dan como confirmado. Es un dato duro, citable literalmente, que el pipeline de validación
puede anclar a una frase de la fuente.

Al revelar, la carta enseña la cifra confirmada en grande y, debajo y en pequeño, el **rango
atribuido** cuando existe: "49 confirmadas · 71 atribuidas". El rango es solo presentación; la
mecánica nunca lo usa.

**Presentación sobria**: sin animación de contador ni celebración del número. El número son
personas muertas y se muestra como un dato, no como una puntuación de arcade.

## 3. El dato

Fichero nuevo `src/data/tolls.json`: un array con una entrada por asesino.

```json
{
  "id": "gary-ridgway",
  "confirmed": 49,
  "attributed": { "min": 71, "max": 71 },
  "countries": ["US"],
  "activeYears": "1982-1998",
  "nickname": { "es": "el asesino de Green River", "en": "the Green River Killer" },
  "wikipedia": { "es": "https://es.wikipedia.org/wiki/Gary_Ridgway", "en": "https://en.wikipedia.org/wiki/Gary_Ridgway" },
  "confirmedQuote": "Ridgway was convicted of 49 murders...",
  "attributedQuote": "he confessed to 71 killings",
  "sourceLang": "en",
  "validation": { "status": "approved", "validatedAt": "2026-09-18", "validator": "...", "notes": "..." }
}
```

`tollSchema` (en `src/data/schema.ts`, junto al resto) impone:

- `id`: slug con `SLUG_PATTERN`. Único dentro del fichero.
- `confirmed`: entero ≥ 1. Es la única cifra que interviene en la comparación.
- `attributed`: `{ min, max }` o `null`. Si existe, `min ≤ max` y **`min ≥ confirmed`**: lo
  atribuido nunca puede ser menor que lo probado. Esta invariante caza el error de confundir las
  dos cifras, que es el fallo más probable del generador.
- `countries`: de 1 a 3 códigos ISO-3166 alpha-2 **actuales**, en orden de importancia.
- `activeYears`: cadena no vacía, mismo formato que en los casos ("1982-1998").
- `nickname`: `null`, o un objeto con `es` y `en` **independientemente nullables** (un asesino
  puede tener apodo en inglés y no en español).
- `wikipedia`: objeto con `es` y `en`, cada uno una URL o `null`. Al menos uno de los dos no es
  `null`. Es el enlace que muestra la carta al revelar.
- `confirmedQuote`: cita literal de la fuente, mínimo 10 caracteres. `attributedQuote` es
  obligatoria si y solo si `attributed` no es `null`.
- `sourceLang`: `'es'` o `'en'`.
- `validation`: el `validationSchema` que ya existe.

### Países: prohibidos los códigos históricos

El país se guarda como código y se muestra con `Intl.DisplayNames`, que da "Estados Unidos" o
"United States" según el idioma activo. Así no hay que traducir países a mano ni exponerlos al
traductor automático, que es donde ya han aparecido invenciones.

El schema **rechaza explícitamente `SU`, `YU` y `CS`**. `Intl.DisplayNames` resuelve `SU` como
"Rusia" sin lanzar error, lo que convertiría a Chikatilo —que mató sobre todo en la RSS de
Ucrania— en un dato falso presentado con confianza. Se usa siempre el país actual del territorio:
Chikatilo va como `["UA", "RU"]`.

### Relación con los datos existentes

`tolls.json` es independiente. Los 10 ficheros de `src/data/cases/` no se tocan: su `country` en
español y su campo `toll` se quedan como están, y el modo diario no se entera del fichero nuevo.
`killers.json` tampoco cambia: sigue siendo solo la lista del autocompletado.

`validate:data` comprueba que todo `id` de `tolls.json` existe en `killers.json` (si no, falla y
con ello el build) y lista como aviso los asesinos de `killers.json` que aún no tienen cifra.

## 4. Contenido: los 52 asesinos

Mismo patrón que el pipeline de casos, pero mucho más corto: solo hay que extraer dos números y
sus citas, sin coordenadas, sin geocodificación y sin `murders`.

1. `.claude/agents/toll-generator.md` lee `pipeline/sources/<id>.<lang>.txt` y escribe
   `pipeline/toll-candidates/<id>.json`.
2. `.claude/agents/toll-validator.md` verifica campo a campo contra la misma fuente y escribe
   `pipeline/toll-verdicts/<id>.json`.
3. `pipeline/promote-tolls.ts` mete los aprobados en `src/data/tolls.json`.

Se trabaja en tandas de unos 8 asesinos. Los 52 entran en una sola pasada de trabajo de contenido,
antes de dar el modo por publicable.

**Ambos subagentes usan Sonnet, nunca Haiku.** Esto es una lista de personas reales con cifras
asociadas, exactamente el terreno donde Haiku ya inventó datos en este proyecto.

Reglas de contenido:

- **Si la fuente no da una cifra confirmada citable, el asesino se queda fuera de `tolls.json`.**
  No se estima, no se redondea, no se deduce de un rango. `validate:data` lo lista como pendiente
  y el modo juega con los que sí tienen dato.
- `amarjeet-sada` es el único de los 52 sin texto de Wikipedia descargado. Va por el estándar
  forzado ya establecido: dos fuentes independientes, precisión rebajada donde discrepen, y
  marcado como tal en `validation.validator` y `validation.notes`.

## 5. Arquitectura

| Fichero | Responsabilidad |
|---|---|
| `src/game/duel.ts` *(nuevo)* | Lógica pura: `DuelState`, `startDuel(ids, random)`, `answer(state, choice, tolls)`, `advance(state, ids, random)`. El generador aleatorio se inyecta, como en `infinite.ts`. |
| `src/data/tolls.ts` *(nuevo)* | Carga y parsea `tolls.json`; expone `tollById` y `availableTollIds`. |
| `src/components/KillerCard.tsx` *(nuevo)* | Una carta: nombre, apodo, países, años, y la cifra o el interrogante. No sabe nada de la partida. |
| `src/components/ModeTabs.tsx` *(nuevo)* | La barra de tres pestañas, compartida por las tres páginas. |
| `src/pages/DuelPage.tsx` *(nuevo)* | Estado de la partida, persistencia y las dos cartas. |
| `src/game/storage.ts` | Añade `loadDuel` / `saveDuel` sobre el par interno `loadJson`/`saveJson` que ya existe. |
| `src/App.tsx` | `useHashMode()` pasa a devolver `'daily'`, `'infinite'` o `'duel'`; `#mas-o-menos` abre el modo nuevo. |
| `src/data/schema.ts` | `tollSchema` con las reglas de la sección 3. |
| `src/i18n/{es,en}.json` | Textos nuevos. |
| `scripts/validate-data.ts` | Valida `tolls.json` y cruza los ids con `killers.json`. |

`KillerCard` y `ModeTabs` viven fuera de la página a propósito: la carta se renderiza dos veces
con el mismo componente en estados distintos (tapada y revelada), y las pestañas las necesitan las
tres páginas.

`DuelState`: `{ left, right, streak, best, seen, status }`, donde `left` y `right` son ids,
`seen` es la lista de ids ya usados en esta partida y `status` es `'playing' | 'lost'`.

## 6. Navegación

Barra de pestañas en la cabecera, siempre visible, con la activa marcada: **Diario · Infinito ·
Más o menos**. Sustituye los enlaces sueltos que hoy tienen las cabeceras de `TodayPage` e
`InfinitePage`. Sigue funcionando por hash, sin router: `#` (diario), `#infinito`,
`#mas-o-menos`.

Si `tolls.json` tiene menos de 2 entradas, la pestaña se muestra deshabilitada con un aviso en vez
de abrir una partida imposible.

## 7. Persistencia

Clave `geokiller.duel` en localStorage con el `DuelState` y el récord, validada con Zod como el
resto. Si está corrupta se descarta y se empieza una partida nueva, sin pantalla en blanco. Si un
id guardado ya no existe en `tolls.json`, también se empieza de cero. No toca ninguna clave
existente.

Se guarda la partida en curso, no solo el récord: el juego se juega en el móvil y cerrar la
pestaña no debe costar la racha.

## 8. Errores

- Menos de 2 entradas en `tolls.json` → pestaña deshabilitada con aviso.
- `localStorage` corrupto o inaccesible → partida nueva, o se juega sin persistencia.
- `id` en `tolls.json` que no existe en `killers.json` → `validate:data` falla, y con él el build.

## 9. Tests

- Unitarios de `duel.ts`: la racha sube al acertar, el empate cuenta como acierto, el fallo
  termina la partida, no se repite un asesino dentro de la partida, la lista se recicla al
  agotarse, el récord se conserva.
- Unitarios de `tollSchema`: la invariante `attributed.min ≥ confirmed`, el rechazo de `SU`, `YU`
  y `CS`, `attributedQuote` obligatoria si y solo si hay `attributed`, `nickname` parcialmente
  nulo.
- Unitarios de `storage.ts`: las claves nuevas y el descarte de estado corrupto.
- De componente: `KillerCard` (tapada, revelada, sin apodo, varios países), `ModeTabs` (pestaña
  activa según el hash), `DuelPage` (ronda completa y persistencia tras recargar).
- `validate:data` sobre `tolls.json`, incluida la comprobación cruzada con `killers.json`.
- Verificación en navegador con Playwright en viewport de móvil y de escritorio: jugar tres
  rondas, fallar, comprobar récord y persistencia tras recargar.

## 10. Fuera de alcance

- Compartir el resultado, estadísticas globales y archivo: van en el plan de lanzamiento.
- Cualquier cambio en el modo diario o el infinito más allá de la barra de pestañas.
- Fotografías de los asesinos.
- Cambios en el pipeline de casos existente.
