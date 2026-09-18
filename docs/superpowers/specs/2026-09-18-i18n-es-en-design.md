# Geo Killer en español e inglés

Fecha: 2026-09-18

## 1. Objetivo

El juego se juega entero en español o en inglés: interfaz y contenido de los casos. El jugador
arranca en el idioma de su navegador y puede cambiarlo cuando quiera sin perder la partida.

El español es el idioma canónico. El pipeline de contenido sigue produciendo casos en español; el
inglés es una capa de traducción que se añade después y se valida aparte.

## 2. Alcance

Se traduce:

- La interfaz completa: títulos, mensajes de carga y error, enlaces de navegación, placeholder del
  buscador, etiquetas accesibles, formato de fecha y las etiquetas del mapa.
- De cada caso: `country`, `summary`, `aliases`, y por cada asesinato `city`, `region`, `country` y
  `method`.

No se traduce:

- `victim`, `lat`, `lng`, `date`, `datePrecision`, `activeYears`, `sourceQuote`, `sourceLang`,
  `wikipedia`, `sources`, `toll`, `validation`. Son nombres de personas reales, coordenadas, fechas,
  citas literales o metadatos internos.
- `killers.json`. Sus alias ya mezclan los dos idiomas y conviene seguir aceptando tanto
  "Son of Sam" como "El hijo de Sam" se juegue en el idioma que se juegue.

## 3. Módulo i18n de la interfaz

Solución propia, sin dependencias nuevas. El proyecto solo depende de react, leaflet y zod, y el
catálogo son unas veinte cadenas: una librería de i18n no se paga a ese tamaño.

```
src/i18n/es.json      catálogo canónico: define el juego de claves
src/i18n/en.json      mismas claves, traducidas
src/i18n/index.tsx    Lang, LanguageProvider, useLang(), useT()
```

`t(key, params?)` interpola `{n}` y `{max}`. Los plurales son dos claves hermanas, `key.one` y
`key.other`; con español e inglés no hace falta `Intl.PluralRules`. Las claves se tipan como
`keyof typeof es`, así que una clave inexistente no compila.

Claves, extraídas del código actual:

| Clave | Español |
|---|---|
| `app.loading` | Abriendo expediente… |
| `app.noCase` | Hoy no hay reto. Vuelve mañana. |
| `app.loadError` | No se ha podido cargar el caso. Comprueba la conexión y recarga. |
| `daily.caseNumber` | Caso #{n} |
| `daily.infiniteLink` | Modo infinito |
| `infinite.streak` | Racha: {n} |
| `infinite.dailyLink` | Reto diario |
| `infinite.wrapped` | Vuelta completa: los casos se repiten. |
| `infinite.loadError` | No se ha podido cargar el caso. |
| `infinite.next` | Siguiente caso |
| `guess.placeholder` | ¿Quién es el asesino? |
| `attempts.label` | {n} de {max} intentos |
| `clues.none` | Sin más pistas todavía |
| `result.won.one` | Caso resuelto en {n} intento |
| `result.won.other` | Caso resuelto en {n} intentos |
| `result.lost` | Caso sin resolver |
| `result.wikipedia` | Leer en Wikipedia |
| `date.unknown` | Fecha desconocida |
| `map.murders.one` | {n} asesinato |
| `map.murders.other` | {n} asesinatos |
| `lang.toggle` | Cambiar idioma |

`app.title` no entra en el catálogo: "Geo Killer" es el nombre del juego y no se traduce.

Las dos funciones que hoy devuelven texto cambian de firma en vez de leer el contexto, y siguen
siendo puras:

- `formatDate(m, lang)`: `d/m/aaaa` en español, `m/d/aaaa` en inglés; `date.unknown` cuando no hay
  fecha. Las precisiones `year` y `month` mantienen su forma actual (`aaaa`, `mm/aaaa` en español;
  `aaaa`, `mm/aaaa` en inglés).
- `collapsedLabel(count, toll, t)`: la regla de `toll` no cambia, solo la cadena.

## 4. Elección de idioma

`detectLang()` resuelve en este orden:

1. `localStorage['geo-killer:lang']`, si contiene `es` o `en`.
2. `navigator.language.startsWith('en') ? 'en' : 'es'`.
3. `es`.

`LanguageProvider` persiste cada cambio en esa clave y sincroniza `document.documentElement.lang`,
que hoy está fijo a `es` en `index.html`. El valor de `index.html` se queda como está: es el idioma
inicial hasta que monta el provider.

`LanguageToggle` es un botón ES/EN que entra en el `page-nav` de las dos páginas, junto a
"Caso #N" y "Racha: N". El progreso guardado no se toca: el idioma es una clave aparte de
`storage.ts`, así que cambiar de idioma no reinicia la partida ni la racha.

## 5. Traducción de los casos

Cada caso conserva su fichero actual intacto. La traducción vive en un subdirectorio:

```
src/data/cases/ted-bundy.json      original en español
src/data/cases/en/ted-bundy.json   traducción
```

El subdirectorio importa: ni el `import.meta.glob('./cases/*.json')` de `cases.ts` ni el
`readdirSync` de `validate-data.ts` descienden a `en/`, así que `availableCaseIds()` y la validación
de casos siguen viendo solo casos reales sin ningún cambio defensivo.

Esquema nuevo en `src/data/schema.ts`:

```ts
export const murderTranslationSchema = z.object({
  city: z.string().min(1),
  region: z.string().min(1).nullable(),
  country: z.string().min(1),
  method: z.string().min(1),
})

export const caseTranslationSchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  lang: z.literal('en'),
  country: z.string().min(1),
  summary: z.string().min(1),
  aliases: z.array(z.string().min(1)).optional(),
  murders: z.array(murderTranslationSchema).min(3).max(8),
})
```

Los campos que no se traducen no aparecen en el esquema. Así el traductor no tiene forma de tocar un
nombre de víctima o una coordenada, ni por error ni por iniciativa propia.

`src/data/translate.ts` expone `applyTranslation(base: Case, tr: CaseTranslation): Case`, pura:

- Si `tr.murders.length !== base.murders.length`, devuelve `base` sin tocar.
- Si `tr.aliases` está y su longitud no coincide con `base.aliases`, ignora solo los alias.
- Cualquier campo ausente o vacío cae al valor español, campo a campo.

Es red de seguridad en ejecución. El filtro de verdad es `validate:data`.

`loadCase(id, lang)` devuelve el original cuando `lang === 'es'`, y original fusionado con
traducción cuando es `en`. Sin traducción, devuelve el original.

`ResultCard` elige el enlace de Wikipedia según idioma: `wikipedia.en ?? wikipedia.es` jugando en
inglés, `wikipedia.es ?? wikipedia.en` en español.

## 6. Pipeline de traducción

Calca el flujo que ya existe para el contenido: candidato, veredicto, promoción.

| Paso | Quién | Salida |
|---|---|---|
| Traducir | subagente `case-translator`, modelo haiku | `pipeline/translations/<id>.en.json` |
| Validar | subagente `translation-validator`, modelo sonnet | `pipeline/translations/verdicts/<id>.json` |
| Promover | `pipeline/promote-translation.ts` | `src/data/cases/en/<id>.json` |

### case-translator (haiku)

`tools: Bash, Read, Write, Grep`, `disallowedTools: Edit, WebFetch, WebSearch`. Su única entrada es
`src/data/cases/<id>.json`. Sin acceso a la web no puede añadir nada que no esté ya en el español.
Reglas:

- Mismo número de asesinatos y mismo orden.
- `region: null` se mantiene `null`.
- Cifras, fechas y nombres propios se copian literalmente.
- Topónimos: exónimo inglés solo cuando es el uso establecido (Estados Unidos → United States,
  Londres → London). Si no lo hay, se copia el nombre tal cual (Issaquah, Snowmass Village).
- Prohibido añadir información ausente del original y prohibido omitir información presente.
- Responde `DONE <id>` o `BLOCKED <id> <motivo>`.

### translation-validator (sonnet)

`tools: Bash, Read, Write, Grep`, `disallowedTools: Edit, WebFetch, WebSearch`. Compara tres
fuentes: el original español, la traducción y `pipeline/sources/<id>.en.txt` cuando existe. Emite un
veredicto campo a campo con rutas del tipo `murders[3].method`:

```json
{
  "id": "ted-bundy",
  "verdict": "approved",
  "validator": "claude-sonnet-5",
  "fieldVerdicts": [{ "path": "murders[0].method", "ok": true, "errors": [] }],
  "notes": "..."
}
```

Rechaza si: se añade un dato ausente del español, se pierde un dato presente, cambia una cifra, una
fecha o un nombre propio, el número de asesinatos no coincide, o el inglés contradice el texto
fuente inglés.

El motivo de separar traductor y validador es el de siempre en este proyecto: el contenido habla de
personas reales y un modelo pequeño ya ha inventado datos aquí antes. El traductor es barato y
rápido; el validador es el que responde por lo que se publica.

### promote-translation.ts

Mismo patrón que `promote.ts`: exige `verdict: "approved"`, cobertura de todos los campos sin
índices repetidos ni fuera de rango, valida contra `caseTranslationSchema`, comprueba que
`murders.length` coincide con el caso base y escribe `src/data/cases/en/<id>.json`. A diferencia de
`promote.ts`, no promueve parcialmente: una traducción no puede quedarse con la mitad de los
asesinatos, porque los índices tienen que alinearse con el original.

## 7. Validación en el build

`scripts/validate-data.ts` añade un bloque para `src/data/cases/en/`:

- Cada fichero valida contra `caseTranslationSchema`.
- El nombre del fichero coincide con su `id`.
- Existe el caso base correspondiente.
- `murders.length` coincide con el del caso base.
- Todo id de `schedule.order` tiene traducción.

Falta de traducción para un caso programado es error, no aviso: el respaldo al español está para
que un despiste no rompa una partida, no para publicar casos a medias.

## 8. Tests

Nuevos:

- `src/i18n/catalog.test.ts`: `en.json` tiene exactamente las mismas claves que `es.json`, ninguna
  cadena vacía, y los marcadores `{n}` / `{max}` de cada clave coinciden con los de su gemela.
- `src/i18n/i18n.test.ts`: interpolación, plurales `one`/`other`, `detectLang` en sus tres ramas y
  persistencia en localStorage.
- `src/components/format.test.ts`: `d/m/aaaa` frente a `m/d/aaaa`, precisiones `year` y `month`, y
  fecha desconocida en los dos idiomas.
- `src/data/translate.test.ts`: fusión completa, respaldo campo a campo, alias de longitud
  distinta ignorados, longitudes de `murders` distintas devuelven el original.
- `src/data/schema.test.ts`: casos válidos e inválidos de `caseTranslationSchema`.

Modificados:

- `src/components/markerSummary.test.ts`: nueva firma con `t`, singular y plural en los dos idiomas.
- Tests de componentes y páginas: helper `renderWithLang(ui, lang)` en `src/test/`, y aserción en
  inglés al menos en `GuessInput` (placeholder) y `ResultCard`.

La regla "todo caso programado tiene traducción" vive solo en `validate:data`, que ya corre en
`prebuild`. No se duplica como test.

## 9. Orden de trabajo

1. Módulo i18n y catálogos `es.json` / `en.json`.
2. Cablear componentes y páginas, `LanguageToggle`, `formatDate` y `collapsedLabel`.
3. `caseTranslationSchema`, `applyTranslation`, `loadCase(id, lang)` y `validate:data`.
4. Subagentes `case-translator` y `translation-validator`, y `promote-translation.ts`.
5. Traducir los diez casos existentes y promoverlos.

Los pasos 1 a 4 dejan el juego jugable en inglés con respaldo al español aunque no haya todavía
ningún caso traducido, así que se puede parar en cualquier punto sin dejar nada a medias.

Una precisión sobre la validación de la sección 7: el paso 3 implementa las cuatro primeras
comprobaciones, que solo miran los ficheros que existan. La quinta, "todo id de `schedule.order`
tiene traducción", rompería el build mientras no haya traducciones, así que entra en el paso 5,
junto con los diez casos traducidos.
