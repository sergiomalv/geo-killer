# Modo "Más o menos" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a Geo Killer un tercer modo, "Más o menos": una cadena de duelos entre asesinos en la que el jugador dice si el de la derecha mató más o menos que el de la izquierda, a una vida.

**Architecture:** Fichero de datos nuevo e independiente (`src/data/tolls.json`) con la cifra de víctimas confirmadas de cada asesino, generado y validado por dos subagentes contra los textos de Wikipedia que ya están descargados en `pipeline/sources/`. La lógica de la partida vive en un módulo puro (`src/game/duel.ts`) sin React y con el generador aleatorio inyectado, igual que `infinite.ts`. La interfaz reutiliza el patrón de páginas por hash que ya existe.

**Tech Stack:** React 19, TypeScript, Vite, Zod 4, Vitest + Testing Library, `Intl.DisplayNames` para los nombres de país.

**Spec:** `docs/superpowers/specs/2026-09-18-mas-o-menos-design.md`

---

## Estructura de ficheros

**Se crean:**

| Fichero | Responsabilidad |
|---|---|
| `src/data/tolls.json` | Los datos. Nace vacío (`[]`) y lo llena el pipeline en la fase B. |
| `src/data/tolls.ts` | Carga y parsea `tolls.json`. Expone `tollById`, `availableTollIds`, `confirmedCounts`. |
| `src/game/duel.ts` | Lógica pura de la partida. Sin React, sin `Math.random` dentro. |
| `src/game/duel.test.ts` | Tests de la lógica. |
| `src/components/KillerCard.tsx` | Una carta. No sabe nada de la partida. |
| `src/components/KillerCard.test.tsx` | Tests de la carta. |
| `src/components/ModeTabs.tsx` | La barra de tres pestañas, compartida por las tres páginas. |
| `src/components/ModeTabs.test.tsx` | Tests de las pestañas. |
| `src/pages/DuelPage.tsx` | Estado de la partida, persistencia y las dos cartas. |
| `src/pages/DuelPage.test.tsx` | Tests de la página. |
| `src/game/__fixtures__/sample-tolls.ts` | Datos de prueba, para no depender del contenido real. |
| `.claude/agents/toll-generator.md` | Subagente que extrae las cifras de la fuente. |
| `.claude/agents/toll-validator.md` | Subagente que las verifica campo a campo. |
| `pipeline/promote-tolls.ts` | Mete los candidatos aprobados en `src/data/tolls.json`. |
| `pipeline/toll-candidates/.gitkeep` | Directorio de candidatos. |
| `pipeline/toll-verdicts/.gitkeep` | Directorio de veredictos. |

**Se modifican:**

| Fichero | Cambio |
|---|---|
| `src/data/schema.ts` | `tollSchema` y `tollsSchema`. |
| `src/game/storage.ts` | `loadDuel` / `saveDuel`. |
| `src/game/storage.test.ts` | Tests de las claves nuevas. |
| `src/components/format.ts` | `formatCountries`. |
| `src/components/format.test.ts` | Tests de `formatCountries`. |
| `src/pages/TodayPage.tsx` | Sustituye el enlace suelto por `ModeTabs`. |
| `src/pages/TodayPage.test.tsx` | Actualiza la aserción del enlace. |
| `src/pages/InfinitePage.tsx` | Sustituye el enlace suelto por `ModeTabs`. |
| `src/pages/InfinitePage.test.tsx` | Actualiza la aserción del enlace. |
| `src/App.tsx` | Tercer modo en `useHashMode`. |
| `src/App.test.tsx` | Test del hash nuevo. |
| `src/i18n/es.json`, `src/i18n/en.json` | Claves nuevas. |
| `src/styles.css` | Estilos del modo y de las pestañas. |
| `scripts/validate-data.ts` | Valida `tolls.json` y cruza ids con `killers.json`. |

**Nota sobre la spec:** la sección 2 pide un enlace a Wikipedia al revelar, pero la sección 3 no incluyó el campo. El plan añade `wikipedia: { es, en }` a `tollSchema`. La spec se corrige en la Tarea 0.

---

## Fase A — Código (Tareas 0-14)

Toda la fase A se desarrolla contra fixtures. `tolls.json` está vacío hasta la fase B, y con el fichero vacío la pestaña aparece deshabilitada, que es justo el comportamiento degradado que pide la spec.

---

### Tarea 0: Rama y corrección de la spec

**Files:**
- Modify: `docs/superpowers/specs/2026-09-18-mas-o-menos-design.md`

- [ ] **Step 1: Crear la rama**

```bash
cd /Users/sergio/Desktop/projects/geo-killer
git checkout main
git pull --ff-only
git checkout -b feat/mas-o-menos
```

- [ ] **Step 2: Añadir el campo que falta en la spec**

En la sección 3, dentro del bloque JSON de ejemplo, añade la línea `"wikipedia"` justo después de `"nickname"`:

```json
  "nickname": { "es": "el asesino de Green River", "en": "the Green River Killer" },
  "wikipedia": { "es": "https://es.wikipedia.org/wiki/Gary_Ridgway", "en": "https://en.wikipedia.org/wiki/Gary_Ridgway" },
```

Y en la lista de reglas de `tollSchema`, después de la viñeta de `nickname`, añade:

```markdown
- `wikipedia`: objeto con `es` y `en`, cada uno una URL o `null`. Al menos uno de los dos no es
  `null`. Es el enlace que muestra la carta al revelar.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-18-mas-o-menos-design.md
git commit -m "docs(spec): añadir el campo wikipedia a tollSchema"
```

---

### Tarea 1: `tollSchema`

**Files:**
- Modify: `src/data/schema.ts`
- Test: `src/data/schema.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade al final de `src/data/schema.test.ts`, y cambia la segunda línea del fichero por:

```typescript
import { caseSchema, caseTranslationSchema, killersSchema, scheduleSchema, tollSchema } from './schema'
```

```typescript
describe('tollSchema', () => {
  const base = {
    id: 'gary-ridgway',
    confirmed: 49,
    attributed: { min: 71, max: 71 },
    countries: ['US'],
    activeYears: '1982-1998',
    nickname: { es: 'el asesino de Green River', en: 'the Green River Killer' },
    wikipedia: { es: 'https://es.wikipedia.org/wiki/Gary_Ridgway', en: null },
    confirmedQuote: 'Ridgway was convicted of 49 murders',
    attributedQuote: 'he confessed to 71 killings',
    sourceLang: 'en',
    validation: { status: 'approved', validatedAt: '2026-09-18', validator: 'claude-sonnet-5', notes: '' },
  }

  it('acepta una entrada completa', () => {
    expect(tollSchema.safeParse(base).success).toBe(true)
  })

  it('acepta attributed nulo si tampoco hay attributedQuote', () => {
    const { attributedQuote: _q, ...rest } = base
    expect(tollSchema.safeParse({ ...rest, attributed: null }).success).toBe(true)
  })

  it('rechaza attributed nulo con attributedQuote presente', () => {
    expect(tollSchema.safeParse({ ...base, attributed: null }).success).toBe(false)
  })

  it('rechaza attributed presente sin attributedQuote', () => {
    const { attributedQuote: _q, ...rest } = base
    expect(tollSchema.safeParse(rest).success).toBe(false)
  })

  it('rechaza un rango atribuido menor que lo confirmado', () => {
    expect(tollSchema.safeParse({ ...base, attributed: { min: 10, max: 20 } }).success).toBe(false)
  })

  it('rechaza un rango con min mayor que max', () => {
    expect(tollSchema.safeParse({ ...base, attributed: { min: 80, max: 71 } }).success).toBe(false)
  })

  it('rechaza confirmed cero o negativo', () => {
    expect(tollSchema.safeParse({ ...base, confirmed: 0 }).success).toBe(false)
  })

  it('rechaza los códigos de países que ya no existen', () => {
    for (const code of ['SU', 'YU', 'CS']) {
      expect(tollSchema.safeParse({ ...base, countries: [code] }).success, code).toBe(false)
    }
  })

  it('rechaza un código de país inventado', () => {
    expect(tollSchema.safeParse({ ...base, countries: ['ZZ'] }).success).toBe(false)
  })

  it('acepta hasta tres países y rechaza cuatro', () => {
    expect(tollSchema.safeParse({ ...base, countries: ['UA', 'RU', 'UZ'] }).success).toBe(true)
    expect(tollSchema.safeParse({ ...base, countries: ['UA', 'RU', 'UZ', 'US'] }).success).toBe(false)
    expect(tollSchema.safeParse({ ...base, countries: [] }).success).toBe(false)
  })

  it('acepta un apodo solo en un idioma', () => {
    expect(tollSchema.safeParse({ ...base, nickname: { es: null, en: 'the Ripper' } }).success).toBe(true)
    expect(tollSchema.safeParse({ ...base, nickname: null }).success).toBe(true)
  })

  it('rechaza wikipedia con los dos idiomas a null', () => {
    expect(tollSchema.safeParse({ ...base, wikipedia: { es: null, en: null } }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/data/schema.test.ts`
Expected: FAIL, "tollSchema is not defined" o error de import.

- [ ] **Step 3: Implementar el schema**

Añade a `src/data/schema.ts`, después de `caseSchema` y antes de `killerEntrySchema`:

```typescript
/**
 * Códigos que `Intl.DisplayNames` resuelve a un país actual sin dar error: `SU` devuelve
 * "Rusia" y `YU`/`CS` devuelven "Serbia". Aceptarlos convertiría un dato histórico en un
 * dato falso presentado con confianza, así que se prohíben y se exige el país actual del
 * territorio donde ocurrieron los crímenes.
 */
export const FORBIDDEN_COUNTRY_CODES = ['SU', 'YU', 'CS']

function isRealCountryCode(code: string): boolean {
  if (FORBIDDEN_COUNTRY_CODES.includes(code)) return false
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) !== code
  } catch {
    return false
  }
}

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, 'código ISO-3166 alpha-2 en mayúsculas')
  .refine(isRealCountryCode, 'código de país inexistente o histórico (SU, YU y CS no valen)')

export const tollSchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN),
    confirmed: z.number().int().positive(),
    attributed: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).nullable(),
    countries: z.array(countryCodeSchema).min(1).max(3),
    activeYears: z.string().min(1),
    nickname: z.object({ es: z.string().min(1).nullable(), en: z.string().min(1).nullable() }).nullable(),
    wikipedia: z.object({ es: z.url().nullable(), en: z.url().nullable() }),
    confirmedQuote: z.string().min(10),
    attributedQuote: z.string().min(10).optional(),
    sourceLang: z.enum(['es', 'en']),
    validation: validationSchema,
  })
  .refine((t) => t.attributed === null || t.attributed.min <= t.attributed.max, {
    message: 'el rango atribuido tiene min mayor que max',
    path: ['attributed'],
  })
  // Lo atribuido nunca puede ser menor que lo probado: si lo es, las dos cifras están cambiadas.
  .refine((t) => t.attributed === null || t.attributed.min >= t.confirmed, {
    message: 'el rango atribuido es menor que las víctimas confirmadas',
    path: ['attributed'],
  })
  .refine((t) => (t.attributed === null) === (t.attributedQuote === undefined), {
    message: 'attributedQuote hace falta si y solo si hay attributed',
    path: ['attributedQuote'],
  })
  .refine((t) => t.wikipedia.es !== null || t.wikipedia.en !== null, {
    message: 'hace falta al menos una URL de Wikipedia',
    path: ['wikipedia'],
  })

export const tollsSchema = z
  .array(tollSchema)
  .refine((list) => new Set(list.map((t) => t.id)).size === list.length, { message: 'ids duplicados' })
```

Y añade al bloque de tipos del final:

```typescript
export type Toll = z.infer<typeof tollSchema>
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/data/schema.test.ts`
Expected: PASS, todos los tests de `tollSchema` en verde.

- [ ] **Step 5: Commit**

```bash
git add src/data/schema.ts src/data/schema.test.ts
git commit -m "feat(datos): tollSchema para el número de víctimas"
```

---

### Tarea 2: Cargador de `tolls.json`

**Files:**
- Create: `src/data/tolls.json`, `src/data/tolls.ts`, `src/data/tolls.test.ts`

- [ ] **Step 1: Crear el fichero de datos vacío**

```bash
printf '[]\n' > src/data/tolls.json
```

- [ ] **Step 2: Escribir los tests que fallan**

Crea `src/data/tolls.test.ts`. Los tests no usan el fichero real (que está vacío): prueban las funciones puras sobre una lista dada.

```typescript
import { describe, expect, it } from 'vitest'
import { buildIndex } from './tolls'
import { sampleTolls } from '../game/__fixtures__/sample-tolls'

describe('buildIndex', () => {
  const index = buildIndex(sampleTolls)

  it('encuentra por id', () => {
    expect(index.byId('a')?.confirmed).toBe(3)
  })

  it('devuelve undefined para un id desconocido', () => {
    expect(index.byId('no-existe')).toBeUndefined()
  })

  it('lista los ids ordenados', () => {
    expect(index.ids).toEqual(['a', 'b', 'c', 'd'])
  })

  it('expone las cifras confirmadas como diccionario', () => {
    expect(index.counts).toEqual({ a: 3, b: 10, c: 10, d: 52 })
  })
})
```

- [ ] **Step 3: Crear el fixture**

Crea `src/game/__fixtures__/sample-tolls.ts`. Se usa en los tests de `tolls.ts`, `duel.ts` y `DuelPage.tsx`. `dos` y `tres` comparten cifra a propósito: es el caso del empate.

```typescript
import type { Toll } from '../../data/schema'

function toll(id: string, confirmed: number, extra: Partial<Toll> = {}): Toll {
  return {
    id,
    confirmed,
    attributed: null,
    countries: ['ES'],
    activeYears: '1980-1983',
    nickname: null,
    wikipedia: { es: `https://es.wikipedia.org/wiki/${id}`, en: null },
    confirmedQuote: `cita de prueba para ${id}`,
    sourceLang: 'es',
    validation: { status: 'approved', validatedAt: '2026-09-18', validator: 'test', notes: '' },
    ...extra,
  }
}

/**
 * Los ids son letras a propósito: `buildIndex` ordena alfabéticamente, así que el orden de
 * esta lista es también el orden en que los reparte la partida. `b` y `c` comparten cifra
 * para poder ejercitar la regla del empate.
 */
export const sampleTolls: Toll[] = [
  toll('a', 3, { nickname: { es: 'el Uno', en: 'the One' } }),
  toll('b', 10),
  toll('c', 10, { countries: ['UA', 'RU'] }),
  toll('d', 52, { attributed: { min: 56, max: 60 }, attributedQuote: 'cita atribuida de prueba' }),
]
```

- [ ] **Step 4: Ejecutar y comprobar que falla**

Run: `npm test -- src/data/tolls.test.ts`
Expected: FAIL, no existe `./tolls`.

- [ ] **Step 5: Implementar el cargador**

Crea `src/data/tolls.ts`:

```typescript
import tollsJson from './tolls.json'
import { tollsSchema, type Toll } from './schema'

export interface TollIndex {
  /** Ids con cifra, ordenados alfabéticamente. */
  ids: string[]
  byId: (id: string) => Toll | undefined
  /** Cifras confirmadas por id, que es lo único que usa la lógica de la partida. */
  counts: Record<string, number>
}

export function buildIndex(list: Toll[]): TollIndex {
  const map = new Map(list.map((t) => [t.id, t]))
  const counts: Record<string, number> = {}
  for (const t of list) counts[t.id] = t.confirmed
  return {
    ids: list.map((t) => t.id).sort(),
    byId: (id: string) => map.get(id),
    counts,
  }
}

// El fichero se valida al cargar el módulo: un dato mal formado debe romper en el arranque,
// no a mitad de una partida.
export const tolls: TollIndex = buildIndex(tollsSchema.parse(tollsJson))
```

- [ ] **Step 6: Ejecutar y comprobar que pasa**

Run: `npm test -- src/data/tolls.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/data/tolls.json src/data/tolls.ts src/data/tolls.test.ts src/game/__fixtures__/sample-tolls.ts
git commit -m "feat(datos): cargador de tolls.json"
```

---

### Tarea 3: `validate:data` valida `tolls.json`

**Files:**
- Modify: `scripts/validate-data.ts`

- [ ] **Step 1: Añadir la validación**

En `scripts/validate-data.ts`, cambia la línea del import para incluir `tollsSchema`:

```typescript
import { caseSchema, caseTranslationSchema, killersSchema, scheduleSchema, tollsSchema } from '../src/data/schema.ts'
```

Y añade este bloque justo antes del `if (errors.length > 0) {` final:

```typescript
const tollsJson = readJson(join(DATA_DIR, 'tolls.json'), 'tolls.json')
const tollsResult = tollsJson === undefined ? { success: false as const } : tollsSchema.safeParse(tollsJson)
report('tolls.json', tollsResult)
const tollIds = new Set(tollsResult.success ? tollsResult.data.map((t) => t.id) : [])
if (tollsResult.success) {
  for (const t of tollsResult.data) {
    if (!killerIds.has(t.id)) errors.push(`tolls.json: id "${t.id}" no está en killers.json`)
  }
  // No es un error: el modo "Más o menos" juega con los asesinatos que tengan cifra.
  const sinCifra = [...killerIds].filter((id) => !tollIds.has(id)).sort()
  if (sinCifra.length > 0) {
    console.log(`Aviso: ${sinCifra.length} asesino(s) sin cifra en tolls.json: ${sinCifra.join(', ')}`)
  }
}
```

Y cambia la línea final de `console.log` para que informe también de las cifras:

```typescript
console.log(`OK: ${caseIds.size} casos, ${translationIds.size} traducciones, ${killerIds.size} killers, ${tollIds.size} cifras, ${scheduleResult.success ? scheduleResult.data.order.length : 0} días programados`)
```

- [ ] **Step 2: Ejecutar y comprobar la salida**

Run: `npm run validate:data`
Expected: sale con código 0, imprime el aviso de 52 asesinos sin cifra y la línea `OK: ... 0 cifras, ...`.

- [ ] **Step 3: Comprobar que detecta un id inventado**

```bash
printf '[{"id":"no-existe","confirmed":1,"attributed":null,"countries":["ES"],"activeYears":"1980","nickname":null,"wikipedia":{"es":"https://es.wikipedia.org/wiki/X","en":null},"confirmedQuote":"cita de prueba larga","sourceLang":"es","validation":{"status":"approved","validatedAt":"2026-09-18","validator":"test","notes":""}}]\n' > src/data/tolls.json
npm run validate:data; echo "código de salida: $?"
printf '[]\n' > src/data/tolls.json
```

Expected: la primera ejecución falla con `tolls.json: id "no-existe" no está en killers.json` y código de salida 1. Tras restaurar el fichero vacío, `npm run validate:data` vuelve a pasar.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-data.ts
git commit -m "feat(datos): validate:data comprueba tolls.json"
```

---

### Tarea 4: `duel.ts` — elegir el siguiente asesino

**Files:**
- Create: `src/game/duel.ts`, `src/game/duel.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Crea `src/game/duel.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { pickNextKiller } from './duel'

const available = ['a', 'b', 'c']
const first = () => 0
const last = () => 0.999

describe('pickNextKiller', () => {
  it('elige entre los no vistos', () => {
    const r = pickNextKiller(available, ['a'], first)
    expect(r.id).toBe('b')
    expect(r.seen).toEqual(['a', 'b'])
  })

  it('no repite hasta agotar la lista', () => {
    let seen: string[] = []
    const salidas: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = pickNextKiller(available, seen, last)
      salidas.push(r.id)
      seen = r.seen
    }
    expect([...salidas].sort()).toEqual(['a', 'b', 'c'])
  })

  it('recicla la lista al agotarse', () => {
    const r = pickNextKiller(available, ['a', 'b', 'c'], first)
    expect(r.id).toBe('a')
    expect(r.seen).toEqual(['a'])
  })

  it('al reciclar no devuelve el asesino excluido', () => {
    const r = pickNextKiller(available, ['a', 'b', 'c'], first, 'a')
    expect(r.id).toBe('b')
    expect(r.seen).toEqual(['b'])
  })

  it('lanza un error claro si no hay de dónde elegir', () => {
    expect(() => pickNextKiller([], [], first)).toThrow('No hay asesinos disponibles')
    expect(() => pickNextKiller(['a'], ['a'], first, 'a')).toThrow('No hay asesinos disponibles')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/game/duel.test.ts`
Expected: FAIL, no existe `./duel`.

- [ ] **Step 3: Implementar**

Crea `src/game/duel.ts`:

```typescript
/** Milisegundos que la carta revelada se queda a la vista antes de encadenar la ronda siguiente. */
export const REVEAL_MS = 1400

export type Choice = 'higher' | 'lower'
export type DuelStatus = 'playing' | 'revealed' | 'lost'

/**
 * Elige un asesino que no se haya usado en esta partida. Al agotarse la lista, la recicla desde
 * cero, igual que `pickNextCase` en el modo infinito. `exclude` evita que el reciclado devuelva
 * al asesino que ya está en la carta izquierda, que daría un duelo de alguien contra sí mismo.
 * `random` devuelve [0, 1).
 */
export function pickNextKiller(
  available: string[],
  seen: string[],
  random: () => number,
  exclude?: string,
): { id: string; seen: string[] } {
  let candidates = available.filter((id) => !seen.includes(id) && id !== exclude)
  let base = seen
  if (candidates.length === 0) {
    candidates = available.filter((id) => id !== exclude)
    base = []
  }
  if (candidates.length === 0) throw new Error('No hay asesinos disponibles')
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  const id = candidates[index]
  return { id, seen: [...base, id] }
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/game/duel.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/duel.ts src/game/duel.test.ts
git commit -m "feat(juego): elección del siguiente asesino del duelo"
```

---

### Tarea 5: `duel.ts` — empezar la partida y responder

**Files:**
- Modify: `src/game/duel.ts`, `src/game/duel.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade a `src/game/duel.test.ts`. Amplía el import de la primera línea a `import { answer, pickNextKiller, startDuel } from './duel'`.

```typescript
const counts = { uno: 3, dos: 10, tres: 10, cuatro: 52 }
const ids = ['uno', 'dos', 'tres', 'cuatro']

describe('startDuel', () => {
  it('reparte dos asesinos distintos y empieza a cero', () => {
    const s = startDuel(ids, first)
    expect(s.left).toBe('uno')
    expect(s.right).toBe('dos')
    expect(s.seen).toEqual(['uno', 'dos'])
    expect(s).toMatchObject({ streak: 0, best: 0, status: 'playing', tie: false })
  })

  it('conserva el récord que se le pasa', () => {
    expect(startDuel(ids, first, 7).best).toBe(7)
  })

  it('exige al menos dos asesinos', () => {
    expect(() => startDuel(['uno'], first)).toThrow('Hacen falta al menos dos asesinos')
  })
})

describe('answer', () => {
  // left = 'uno' (3), right = 'dos' (10)
  const start = () => startDuel(ids, first)

  it('acertar "más" revela la carta y sube la racha', () => {
    const s = answer(start(), 'higher', counts)
    expect(s.status).toBe('revealed')
    expect(s.streak).toBe(1)
    expect(s.best).toBe(1)
    expect(s.tie).toBe(false)
  })

  it('fallar termina la partida sin tocar el récord', () => {
    const s = answer({ ...start(), best: 5 }, 'lower', counts)
    expect(s.status).toBe('lost')
    expect(s.streak).toBe(0)
    expect(s.best).toBe(5)
  })

  it('el récord solo sube si la racha lo supera', () => {
    const s = answer({ ...start(), streak: 2, best: 9 }, 'higher', counts)
    expect(s.streak).toBe(3)
    expect(s.best).toBe(9)
  })

  it('el empate cuenta como acierto con cualquiera de los dos botones', () => {
    const empate = { ...start(), left: 'dos', right: 'tres' }
    for (const choice of ['higher', 'lower'] as const) {
      const s = answer(empate, choice, counts)
      expect(s.status, choice).toBe('revealed')
      expect(s.streak, choice).toBe(1)
      expect(s.tie, choice).toBe(true)
    }
  })

  it('no hace nada si la partida no está en juego', () => {
    const perdida = answer(start(), 'lower', counts)
    expect(answer(perdida, 'higher', counts)).toBe(perdida)
  })

  it('lanza un error si falta la cifra de un asesino', () => {
    expect(() => answer(start(), 'higher', { uno: 3 })).toThrow('Sin cifra para "dos"')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/game/duel.test.ts`
Expected: FAIL, `startDuel is not a function`.

- [ ] **Step 3: Implementar**

Añade a `src/game/duel.ts`:

```typescript
export interface DuelState {
  /** Id del asesino con la cifra a la vista. */
  left: string
  /** Id del asesino tapado mientras `status` es 'playing'. */
  right: string
  /** Ids usados en esta partida, para no repetirlos. */
  seen: string[]
  streak: number
  best: number
  status: DuelStatus
  /** La última respuesta fue un empate. Solo sirve para el aviso de la interfaz. */
  tie: boolean
}

function countOf(counts: Record<string, number>, id: string): number {
  const n = counts[id]
  if (n === undefined) throw new Error(`Sin cifra para "${id}"`)
  return n
}

export function startDuel(available: string[], random: () => number, best = 0): DuelState {
  if (available.length < 2) throw new Error('Hacen falta al menos dos asesinos')
  const left = pickNextKiller(available, [], random)
  const right = pickNextKiller(available, left.seen, random)
  return { left: left.id, right: right.id, seen: right.seen, streak: 0, best, status: 'playing', tie: false }
}

export function answer(state: DuelState, choice: Choice, counts: Record<string, number>): DuelState {
  if (state.status !== 'playing') return state
  const left = countOf(counts, state.left)
  const right = countOf(counts, state.right)
  const tie = right === left
  // El empate cuenta como acierto: no se puede pedir al jugador que acierte algo imposible.
  const correct = tie || (choice === 'higher' ? right > left : right < left)
  if (!correct) return { ...state, status: 'lost', tie: false }
  const streak = state.streak + 1
  return { ...state, status: 'revealed', streak, best: Math.max(state.best, streak), tie }
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/game/duel.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/duel.ts src/game/duel.test.ts
git commit -m "feat(juego): reparto y respuesta del duelo"
```

---

### Tarea 6: `duel.ts` — encadenar y reiniciar

**Files:**
- Modify: `src/game/duel.ts`, `src/game/duel.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade a `src/game/duel.test.ts`. Amplía el import a `import { advance, answer, pickNextKiller, restart, startDuel } from './duel'`.

```typescript
describe('advance', () => {
  it('pasa la carta derecha a la izquierda y trae una nueva', () => {
    const revelada = answer(startDuel(ids, first), 'higher', counts)
    const s = advance(revelada, ids, first)
    expect(s.left).toBe('dos')
    expect(s.right).toBe('tres')
    expect(s.status).toBe('playing')
    expect(s.tie).toBe(false)
    expect(s.streak).toBe(1)
  })

  it('no hace nada si la carta no está revelada', () => {
    const jugando = startDuel(ids, first)
    expect(advance(jugando, ids, first)).toBe(jugando)
    const perdida = answer(jugando, 'lower', counts)
    expect(advance(perdida, ids, first)).toBe(perdida)
  })

  it('recicla al agotar la lista sin repetir la carta izquierda', () => {
    const revelada = {
      ...startDuel(ids, first),
      left: 'tres',
      right: 'cuatro',
      seen: ids,
      status: 'revealed' as const,
      streak: 3,
      best: 3,
    }
    const s = advance(revelada, ids, first)
    expect(s.left).toBe('cuatro')
    expect(s.right).not.toBe('cuatro')
    expect(s.seen).toEqual([s.right])
    expect(s.streak).toBe(3)
  })
})

describe('restart', () => {
  it('empieza de cero conservando el récord', () => {
    const perdida = answer({ ...startDuel(ids, first), streak: 4, best: 9 }, 'lower', counts)
    const s = restart(perdida, ids, first)
    expect(s.streak).toBe(0)
    expect(s.best).toBe(9)
    expect(s.status).toBe('playing')
    expect(s.seen).toEqual([s.left, s.right])
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/game/duel.test.ts`
Expected: FAIL, `advance is not a function`.

- [ ] **Step 3: Implementar**

Añade a `src/game/duel.ts`:

```typescript
export function advance(state: DuelState, available: string[], random: () => number): DuelState {
  if (state.status !== 'revealed') return state
  const next = pickNextKiller(available, state.seen, random, state.right)
  return { ...state, left: state.right, right: next.id, seen: next.seen, status: 'playing', tie: false }
}

export function restart(state: DuelState, available: string[], random: () => number): DuelState {
  return startDuel(available, random, state.best)
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/game/duel.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/duel.ts src/game/duel.test.ts
git commit -m "feat(juego): encadenar rondas y reiniciar el duelo"
```

---

### Tarea 7: Persistencia del duelo

**Files:**
- Modify: `src/game/storage.ts`, `src/game/storage.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade al final de `src/game/storage.test.ts`. Amplía el import de `./storage` con `loadDuel` y `saveDuel`.

Los tests de este fichero usan el `localStorage` de jsdom directamente, que es como están escritos los que ya hay. Amplía el import de `./storage` con `loadDuel` y `saveDuel`, y añade el bloque:

```typescript
describe('duelo', () => {
  const duel: DuelState = {
    left: 'a', right: 'b', seen: ['a', 'b'],
    streak: 3, best: 9, status: 'playing', tie: false,
  }

  it('guarda y recupera la partida', () => {
    saveDuel(duel)
    expect(loadDuel()).toEqual(duel)
  })

  it('devuelve null si no hay nada guardado', () => {
    expect(loadDuel()).toBeNull()
  })

  it('descarta y limpia un estado corrupto', () => {
    localStorage.setItem('geokiller.duel', '{no')
    expect(loadDuel()).toBeNull()
    expect(localStorage.getItem('geokiller.duel')).toBeNull()
  })

  it('descarta una forma incorrecta', () => {
    localStorage.setItem('geokiller.duel', JSON.stringify({ ...duel, best: 'nueve' }))
    expect(loadDuel()).toBeNull()
  })

  it('no toca las claves de los otros modos', () => {
    saveProgress(0, { caseId: 'x', guesses: [], status: 'playing' })
    saveDuel(duel)
    expect(loadProgress(0)).not.toBeNull()
  })

  it('no lanza si localStorage falla', () => {
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    } as unknown as Storage
    expect(loadDuel(broken)).toBeNull()
    expect(() => saveDuel(duel, broken)).not.toThrow()
  })
})
```

El `describe` de arriba necesita el tipo: añade `import type { DuelState } from './duel'` junto a los otros imports de tipo del fichero.

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/game/storage.test.ts`
Expected: FAIL, `saveDuel is not a function`.

- [ ] **Step 3: Implementar**

En `src/game/storage.ts`, añade el import del tipo y la constante de la clave junto a las que ya hay:

```typescript
import type { DuelState } from './duel'
```

```typescript
const DUEL_KEY = 'geokiller.duel'
```

Añade el schema junto a los otros:

```typescript
const duelSchema = z.object({
  left: z.string(),
  right: z.string(),
  seen: z.array(z.string()),
  streak: z.number().int().min(0),
  best: z.number().int().min(0),
  status: z.enum(['playing', 'revealed', 'lost']),
  tie: z.boolean(),
}) satisfies z.ZodType<DuelState>
```

Y las dos funciones al final del fichero:

```typescript
export function loadDuel(storage: Storage = localStorage): DuelState | null {
  return loadJson(DUEL_KEY, duelSchema, storage)
}

export function saveDuel(state: DuelState, storage: Storage = localStorage): void {
  saveJson(DUEL_KEY, state, storage)
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/game/storage.test.ts`
Expected: PASS, incluidos los 4 tests nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/game/storage.ts src/game/storage.test.ts
git commit -m "feat(juego): persistencia del modo más o menos"
```

---

### Tarea 8: Textos de la interfaz

**Files:**
- Modify: `src/i18n/es.json`, `src/i18n/en.json`

- [ ] **Step 1: Añadir las claves en español**

En `src/i18n/es.json`, **borra** las líneas `"daily.infiniteLink"` e `"infinite.dailyLink"` (las sustituyen las pestañas) y añade, después de `"infinite.next"`:

```json
  "tabs.daily": "Diario",
  "tabs.infinite": "Infinito",
  "tabs.duel": "Más o menos",
  "duel.question": "¿Mató más o menos que {name}?",
  "duel.higher": "Más",
  "duel.lower": "Menos",
  "duel.streak": "Racha: {n}",
  "duel.best": "Récord: {n}",
  "duel.tie": "Empate: sigues.",
  "duel.hidden": "Cifra por descubrir",
  "duel.confirmed.one": "{n} víctima confirmada",
  "duel.confirmed.other": "{n} víctimas confirmadas",
  "duel.attributed.one": "{n} atribuida",
  "duel.attributed.other": "{n} atribuidas",
  "duel.attributed.range": "{min}-{max} atribuidas",
  "duel.lost": "Fin de la partida",
  "duel.restart": "Jugar otra vez",
  "duel.unavailable": "Este modo todavía no tiene datos suficientes.",
```

- [ ] **Step 2: Añadir las claves en inglés**

En `src/i18n/en.json`, borra las mismas dos claves y añade en la misma posición:

```json
  "tabs.daily": "Daily",
  "tabs.infinite": "Infinite",
  "tabs.duel": "Higher or Lower",
  "duel.question": "Did they kill more or fewer than {name}?",
  "duel.higher": "Higher",
  "duel.lower": "Lower",
  "duel.streak": "Streak: {n}",
  "duel.best": "Best: {n}",
  "duel.tie": "A tie: you carry on.",
  "duel.hidden": "Count hidden",
  "duel.confirmed.one": "{n} confirmed victim",
  "duel.confirmed.other": "{n} confirmed victims",
  "duel.attributed.one": "{n} attributed",
  "duel.attributed.other": "{n} attributed",
  "duel.attributed.range": "{min}-{max} attributed",
  "duel.lost": "Game over",
  "duel.restart": "Play again",
  "duel.unavailable": "This mode does not have enough data yet.",
```

- [ ] **Step 3: Comprobar que los catálogos siguen cuadrando**

Run: `npm test -- src/i18n/catalog.test.ts`
Expected: PASS. Este test comprueba que los dos ficheros tienen las mismas claves y los mismos marcadores `{n}`, `{min}`, `{max}`, `{name}`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/es.json src/i18n/en.json
git commit -m "feat(i18n): textos del modo más o menos"
```

Nota: en este punto `npm test` completo falla, porque `TodayPage` e `InfinitePage` siguen usando las dos claves borradas. Lo arregla la Tarea 11.

---

### Tarea 9: `formatCountries`

**Files:**
- Modify: `src/components/format.ts`, `src/components/format.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade a `src/components/format.test.ts`. Amplía el import de `./format` con `formatCountries`.

```typescript
describe('formatCountries', () => {
  it('traduce los códigos al idioma activo', () => {
    expect(formatCountries(['US'], 'es')).toBe('Estados Unidos')
    expect(formatCountries(['US'], 'en')).toBe('United States')
  })

  it('une varios países con el separador del juego', () => {
    expect(formatCountries(['UA', 'RU'], 'es')).toBe('Ucrania · Rusia')
  })

  it('devuelve el código tal cual si no se puede resolver', () => {
    expect(formatCountries(['ZZ'], 'es')).toBe('ZZ')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/components/format.test.ts`
Expected: FAIL, `formatCountries is not a function`.

- [ ] **Step 3: Implementar**

Añade a `src/components/format.ts`:

```typescript
/**
 * Nombres de país a partir de códigos ISO. Se usa `Intl.DisplayNames` en vez de guardar los
 * nombres traducidos para no pasar nombres de país por el traductor automático.
 * `tollSchema` ya rechaza los códigos históricos, que aquí se resolverían a un país que no es.
 */
export function formatCountries(codes: string[], lang: Lang): string {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([lang], { type: 'region' })
  } catch {
    names = null
  }
  return codes
    .map((code) => {
      try {
        return names?.of(code) ?? code
      } catch {
        return code
      }
    })
    .join(' · ')
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/components/format.test.ts`
Expected: PASS, 3 tests nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/components/format.ts src/components/format.test.ts
git commit -m "feat(ui): nombres de país a partir de códigos ISO"
```

---

### Tarea 10: `KillerCard`

**Files:**
- Create: `src/components/KillerCard.tsx`, `src/components/KillerCard.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

Crea `src/components/KillerCard.test.tsx`:

```typescript
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KillerCard } from './KillerCard'
import { renderWithLang } from '../test/renderWithLang'

const base = {
  name: 'Gary Ridgway',
  nickname: 'el asesino de Green River',
  countries: ['US'],
  activeYears: '1982-1998',
  wikipedia: 'https://es.wikipedia.org/wiki/Gary_Ridgway',
}

describe('KillerCard', () => {
  it('muestra nombre, apodo, país y años', () => {
    renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.getByText('Gary Ridgway')).toBeInTheDocument()
    expect(screen.getByText(/el asesino de Green River/)).toBeInTheDocument()
    expect(screen.getByText(/Estados Unidos/)).toBeInTheDocument()
    expect(screen.getByText(/1982-1998/)).toBeInTheDocument()
  })

  it('tapada no enseña ninguna cifra', () => {
    renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
    expect(screen.queryByText(/confirmadas/)).not.toBeInTheDocument()
  })

  it('revelada enseña la cifra confirmada', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />)
    expect(screen.getByText('49')).toBeInTheDocument()
    expect(screen.getByText('49 víctimas confirmadas')).toBeInTheDocument()
  })

  it('usa el singular con una sola víctima', () => {
    renderWithLang(<KillerCard {...base} confirmed={1} attributed={null} />)
    expect(screen.getByText('1 víctima confirmada')).toBeInTheDocument()
  })

  it('enseña una cifra atribuida única sin rango', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={{ min: 71, max: 71 }} />)
    expect(screen.getByText('71 atribuidas')).toBeInTheDocument()
  })

  it('enseña el rango atribuido cuando min y max difieren', () => {
    renderWithLang(<KillerCard {...base} confirmed={52} attributed={{ min: 56, max: 60 }} />)
    expect(screen.getByText('56-60 atribuidas')).toBeInTheDocument()
  })

  it('solo enlaza a Wikipedia al revelar', () => {
    const { unmount } = renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    unmount()
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', base.wikipedia)
  })

  it('aguanta sin apodo y con varios países', () => {
    renderWithLang(
      <KillerCard name="Andréi Chikatilo" nickname={null} countries={['UA', 'RU']}
        activeYears="1978-1990" wikipedia={null} confirmed={52} attributed={null} />,
    )
    expect(screen.getByText(/Ucrania · Rusia/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('traduce al inglés', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />, 'en')
    expect(screen.getByText('49 confirmed victims')).toBeInTheDocument()
    expect(screen.getByText(/United States/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/components/KillerCard.test.tsx`
Expected: FAIL, no existe `./KillerCard`.

- [ ] **Step 3: Implementar**

Crea `src/components/KillerCard.tsx`:

```tsx
import { useLang, useT } from '../i18n'
import { formatCountries } from './format'

interface Props {
  name: string
  nickname: string | null
  countries: string[]
  activeYears: string
  wikipedia: string | null
  /** `null` mientras la carta está tapada. */
  confirmed: number | null
  attributed: { min: number; max: number } | null
}

export function KillerCard({ name, nickname, countries, activeYears, wikipedia, confirmed, attributed }: Props) {
  const lang = useLang()
  const t = useT()
  const revealed = confirmed !== null

  function attributedText(): string | null {
    if (attributed === null) return null
    if (attributed.min !== attributed.max) {
      return t('duel.attributed.range', { min: attributed.min, max: attributed.max })
    }
    return t(attributed.min === 1 ? 'duel.attributed.one' : 'duel.attributed.other', { n: attributed.min })
  }

  const attributedLabel = revealed ? attributedText() : null

  return (
    <article className="killer-card">
      <h2 className="killer-name">{name}</h2>
      {nickname ? <p className="killer-nickname">{nickname}</p> : null}
      <p className="killer-meta">{formatCountries(countries, lang)} · {activeYears}</p>
      {revealed ? (
        <div className="killer-count" aria-live="polite">
          <strong className="killer-number">{confirmed}</strong>
          <span className="killer-confirmed">
            {t(confirmed === 1 ? 'duel.confirmed.one' : 'duel.confirmed.other', { n: confirmed })}
          </span>
          {attributedLabel ? <span className="killer-attributed">{attributedLabel}</span> : null}
          {wikipedia ? (
            <a href={wikipedia} target="_blank" rel="noreferrer">{t('result.wikipedia')}</a>
          ) : null}
        </div>
      ) : (
        <p className="killer-hidden">{t('duel.hidden')}</p>
      )}
    </article>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/components/KillerCard.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/KillerCard.tsx src/components/KillerCard.test.tsx
git commit -m "feat(ui): carta de asesino del modo más o menos"
```

---

### Tarea 11: `ModeTabs` y su integración

**Files:**
- Create: `src/components/ModeTabs.tsx`, `src/components/ModeTabs.test.tsx`
- Modify: `src/pages/TodayPage.tsx`, `src/pages/TodayPage.test.tsx`, `src/pages/InfinitePage.tsx`, `src/pages/InfinitePage.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

Crea `src/components/ModeTabs.test.tsx`:

```typescript
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModeTabs } from './ModeTabs'
import { renderWithLang } from '../test/renderWithLang'

describe('ModeTabs', () => {
  it('enlaza los tres modos a su hash', () => {
    renderWithLang(<ModeTabs active="daily" />)
    expect(screen.getByRole('link', { name: 'Infinito' })).toHaveAttribute('href', '#infinito')
    expect(screen.getByRole('link', { name: 'Más o menos' })).toHaveAttribute('href', '#mas-o-menos')
  })

  it('marca la pestaña activa y no la enlaza', () => {
    renderWithLang(<ModeTabs active="daily" />)
    const activa = screen.getByText('Diario')
    expect(activa).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Diario' })).not.toBeInTheDocument()
  })

  it('marca la pestaña activa del modo infinito', () => {
    renderWithLang(<ModeTabs active="infinite" />)
    expect(screen.getByText('Infinito')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Diario' })).toHaveAttribute('href', '#')
  })

  it('deshabilita el duelo cuando no hay datos', () => {
    renderWithLang(<ModeTabs active="daily" duelEnabled={false} />)
    expect(screen.queryByRole('link', { name: 'Más o menos' })).not.toBeInTheDocument()
    expect(screen.getByText('Más o menos')).toHaveAttribute('aria-disabled', 'true')
  })

  it('traduce al inglés', () => {
    renderWithLang(<ModeTabs active="daily" />, 'en')
    expect(screen.getByRole('link', { name: 'Higher or Lower' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/components/ModeTabs.test.tsx`
Expected: FAIL, no existe `./ModeTabs`.

- [ ] **Step 3: Implementar**

Crea `src/components/ModeTabs.tsx`:

```tsx
import { useT } from '../i18n'
import type { Key } from '../i18n'

export type Mode = 'daily' | 'infinite' | 'duel'

const TABS: { mode: Mode; hash: string; key: Key }[] = [
  { mode: 'daily', hash: '#', key: 'tabs.daily' },
  { mode: 'infinite', hash: '#infinito', key: 'tabs.infinite' },
  { mode: 'duel', hash: '#mas-o-menos', key: 'tabs.duel' },
]

interface Props {
  active: Mode
  /** Con `tolls.json` vacío no hay partida posible: la pestaña se ve, pero no lleva a ningún sitio. */
  duelEnabled?: boolean
}

export function ModeTabs({ active, duelEnabled = true }: Props) {
  const t = useT()
  return (
    <nav className="mode-tabs" aria-label="Modos de juego">
      {TABS.map(({ mode, hash, key }) => {
        const label = t(key)
        if (mode === active) {
          return <span key={mode} className="mode-tab mode-tab-active" aria-current="page">{label}</span>
        }
        if (mode === 'duel' && !duelEnabled) {
          return <span key={mode} className="mode-tab mode-tab-disabled" aria-disabled="true">{label}</span>
        }
        return <a key={mode} className="mode-tab" href={hash}>{label}</a>
      })}
    </nav>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/components/ModeTabs.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Meter las pestañas en la página diaria**

En `src/pages/TodayPage.tsx`, añade el import:

```tsx
import { ModeTabs } from '../components/ModeTabs'
```

y sustituye el bloque `<header>` entero por:

```tsx
      <header className="page-header">
        <h1>Geo Killer</h1>
        <ModeTabs active="daily" duelEnabled={tolls.ids.length >= 2} />
        <nav className="page-nav">
          <span className="page-day">{t('daily.caseNumber', { n: day + 1 })}</span>
          <LanguageToggle />
        </nav>
      </header>
```

Añade también el import de los datos:

```tsx
import { tolls } from '../data/tolls'
```

- [ ] **Step 6: Meter las pestañas en la página infinita**

En `src/pages/InfinitePage.tsx`, añade los mismos dos imports (`ModeTabs` y `tolls`) y sustituye el bloque `<header>` por:

```tsx
      <header className="page-header">
        <h1>Geo Killer</h1>
        <ModeTabs active="infinite" duelEnabled={tolls.ids.length >= 2} />
        <nav className="page-nav">
          <span className="page-day">{t('infinite.streak', { n: state.streak })}</span>
          <LanguageToggle />
        </nav>
      </header>
```

- [ ] **Step 7: Actualizar los tests de las dos páginas**

En `src/pages/TodayPage.test.tsx:79`, sustituye la línea por:

```typescript
    expect(screen.getByRole('link', { name: 'Infinito' })).toHaveAttribute('href', '#infinito')
```

En `src/pages/InfinitePage.test.tsx:44`, sustituye la línea por:

```typescript
    expect(screen.getByRole('link', { name: 'Diario' })).toHaveAttribute('href', '#')
```

- [ ] **Step 8: Ejecutar toda la batería**

Run: `npm test`
Expected: PASS. Si algún test se queja de las claves `daily.infiniteLink` o `infinite.dailyLink`, es que quedó un uso sin sustituir: búscalo con `grep -rn "infiniteLink\|dailyLink" src/`.

- [ ] **Step 9: Commit**

```bash
git add src/components/ModeTabs.tsx src/components/ModeTabs.test.tsx src/pages/TodayPage.tsx src/pages/TodayPage.test.tsx src/pages/InfinitePage.tsx src/pages/InfinitePage.test.tsx
git commit -m "feat(ui): barra de pestañas con los tres modos"
```

---

### Tarea 12: `DuelPage`

**Files:**
- Create: `src/pages/DuelPage.tsx`, `src/pages/DuelPage.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

Crea `src/pages/DuelPage.test.tsx`. Los tests inyectan los datos y el generador aleatorio por props, así que no dependen del contenido real ni del azar. Usan `fireEvent`, que es lo que usa el resto del proyecto, y relojes falsos para el encadenado automático.

Con el fixture y `random = () => 0`, las rondas salen en este orden: `a`(3) contra `b`(10), luego `b`(10) contra `c`(10) — que es el empate —, luego `c`(10) contra `d`(52).

```typescript
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelPage } from './DuelPage'
import { buildIndex } from '../data/tolls'
import { sampleTolls } from '../game/__fixtures__/sample-tolls'
import { REVEAL_MS } from '../game/duel'
import { renderWithLang } from '../test/renderWithLang'

const index = buildIndex(sampleTolls)
const killers = [
  { id: 'a', name: 'Asesino Uno', aliases: [] },
  { id: 'b', name: 'Asesino Dos', aliases: [] },
  { id: 'c', name: 'Asesino Tres', aliases: [] },
  { id: 'd', name: 'Asesino Cuatro', aliases: [] },
]
const first = () => 0

function renderPage() {
  return renderWithLang(<DuelPage tolls={index} killers={killers} random={first} />)
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

/** Deja pasar la pausa en la que la carta revelada se queda a la vista. */
function encadenar() {
  act(() => { vi.advanceTimersByTime(REVEAL_MS) })
}

describe('DuelPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reparte dos asesinos y solo enseña la cifra de la izquierda', () => {
    renderPage()
    expect(screen.getByText('Asesino Uno')).toBeInTheDocument()
    expect(screen.getByText('Asesino Dos')).toBeInTheDocument()
    expect(screen.getByText('3 víctimas confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
  })

  it('acertar revela la cifra, sube la racha y encadena la ronda siguiente', () => {
    renderPage()
    click('Más')
    expect(screen.getByText('10 víctimas confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Racha: 1')).toBeInTheDocument()
    encadenar()
    expect(screen.getByText('Asesino Tres')).toBeInTheDocument()
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
  })

  it('fallar termina la partida y ofrece volver a empezar', () => {
    renderPage()
    click('Menos')
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    expect(screen.getByText('10 víctimas confirmadas')).toBeInTheDocument()
    // Perder no encadena: la partida se queda quieta hasta que el jugador reinicia.
    encadenar()
    encadenar()
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    click('Jugar otra vez')
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
    expect(screen.queryByText('Fin de la partida')).not.toBeInTheDocument()
  })

  it('el empate cuenta como acierto y se avisa', () => {
    renderPage()
    click('Más')
    encadenar()
    // Ahora izquierda = b (10) y derecha = c (10).
    click('Menos')
    expect(screen.getByText('Empate: sigues.')).toBeInTheDocument()
    expect(screen.getByText('Racha: 2')).toBeInTheDocument()
  })

  it('conserva el récord al perder y reiniciar', () => {
    renderPage()
    click('Más')
    encadenar()
    click('Menos')
    encadenar()
    expect(screen.getByText('Récord: 2')).toBeInTheDocument()
    // Ahora izquierda = c (10) y derecha = d (52): decir "menos" es fallar.
    click('Menos')
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    click('Jugar otra vez')
    expect(screen.getByText('Récord: 2')).toBeInTheDocument()
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
  })

  it('recupera la partida guardada al volver a montar', () => {
    const { unmount } = renderPage()
    click('Más')
    encadenar()
    unmount()
    renderPage()
    expect(screen.getByText('Racha: 1')).toBeInTheDocument()
    expect(screen.getByText('Asesino Dos')).toBeInTheDocument()
  })

  it('avisa en vez de romper si no hay datos suficientes', () => {
    renderWithLang(<DuelPage tolls={buildIndex([])} killers={killers} random={first} />)
    expect(screen.getByText('Este modo todavía no tiene datos suficientes.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/pages/DuelPage.test.tsx`
Expected: FAIL, no existe `./DuelPage`.

- [ ] **Step 3: Implementar**

Crea `src/pages/DuelPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { TollIndex } from '../data/tolls'
import type { KillerEntry } from '../data/schema'
import { advance, answer, restart, startDuel, REVEAL_MS, type Choice, type DuelState } from '../game/duel'
import { loadDuel, saveDuel } from '../game/storage'
import { KillerCard } from '../components/KillerCard'
import { LanguageToggle } from '../components/LanguageToggle'
import { ModeTabs } from '../components/ModeTabs'
import { useLang, useT } from '../i18n'

interface Props {
  tolls: TollIndex
  killers: KillerEntry[]
  random?: () => number
}

function initialState(tolls: TollIndex, random: () => number): DuelState {
  const saved = loadDuel()
  // Un id guardado que ya no existe (porque cambió el catálogo) invalida la partida entera.
  if (saved && tolls.ids.includes(saved.left) && tolls.ids.includes(saved.right)) return saved
  return startDuel(tolls.ids, random, saved?.best ?? 0)
}

export function DuelPage({ tolls, killers, random = Math.random }: Props) {
  const playable = tolls.ids.length >= 2
  const lang = useLang()
  const t = useT()
  const [state, setState] = useState<DuelState | null>(() => (playable ? initialState(tolls, random) : null))

  useEffect(() => {
    if (state) saveDuel(state)
  }, [state])

  // Tras un acierto la carta revelada se queda a la vista un momento y luego encadena sola.
  useEffect(() => {
    if (state?.status !== 'revealed') return
    const id = setTimeout(() => setState((prev) => (prev ? advance(prev, tolls.ids, random) : prev)), REVEAL_MS)
    return () => clearTimeout(id)
  }, [state, tolls.ids, random])

  if (!playable || state === null) {
    return (
      <main className="page">
        <header className="page-header">
          <h1>Geo Killer</h1>
          <ModeTabs active="duel" duelEnabled={false} />
          <nav className="page-nav"><LanguageToggle /></nav>
        </header>
        <p className="page-notice">{t('duel.unavailable')}</p>
      </main>
    )
  }

  function card(id: string, revealed: boolean) {
    const toll = tolls.byId(id)
    const killer = killers.find((k) => k.id === id)
    if (!toll) return null
    return (
      <KillerCard
        name={killer?.name ?? id}
        nickname={toll.nickname?.[lang] ?? null}
        countries={toll.countries}
        activeYears={toll.activeYears}
        wikipedia={lang === 'en' ? toll.wikipedia.en ?? toll.wikipedia.es : toll.wikipedia.es ?? toll.wikipedia.en}
        confirmed={revealed ? toll.confirmed : null}
        attributed={revealed ? toll.attributed : null}
      />
    )
  }

  function choose(choice: Choice) {
    setState((prev) => (prev ? answer(prev, choice, tolls.counts) : prev))
  }

  const leftName = killers.find((k) => k.id === state.left)?.name ?? state.left

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <ModeTabs active="duel" />
        <nav className="page-nav">
          <span className="page-day">{t('duel.streak', { n: state.streak })}</span>
          <span className="page-day">{t('duel.best', { n: state.best })}</span>
          <LanguageToggle />
        </nav>
      </header>
      <section className="duel">
        <p className="duel-question">{t('duel.question', { name: leftName })}</p>
        <div className="duel-cards">
          {card(state.left, true)}
          {card(state.right, state.status !== 'playing')}
        </div>
        {state.status === 'playing' ? (
          <div className="duel-buttons">
            <button type="button" className="duel-choice" onClick={() => choose('higher')}>{t('duel.higher')}</button>
            <button type="button" className="duel-choice" onClick={() => choose('lower')}>{t('duel.lower')}</button>
          </div>
        ) : null}
        {state.tie ? <p className="page-notice" aria-live="polite">{t('duel.tie')}</p> : null}
        {state.status === 'lost' ? (
          <div className="duel-over" aria-live="polite">
            <p className="duel-over-title">{t('duel.lost')}</p>
            <button
              type="button"
              className="next-case"
              onClick={() => setState((prev) => (prev ? restart(prev, tolls.ids, random) : prev))}
            >
              {t('duel.restart')}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npm test -- src/pages/DuelPage.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DuelPage.tsx src/pages/DuelPage.test.tsx
git commit -m "feat(ui): página del modo más o menos"
```

---

### Tarea 13: Ruta `#mas-o-menos`

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Añade a `src/App.test.tsx`, dentro del `describe('App')`:

```typescript
  it('muestra el modo más o menos con #mas-o-menos', async () => {
    window.location.hash = '#mas-o-menos'
    renderWithLang(<App />)
    // Con tolls.json vacío el modo avisa en vez de romper; con datos, reparte la primera pareja.
    expect(await screen.findByText(/Este modo todavía no tiene datos suficientes\.|Racha: 0/)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL, con `#mas-o-menos` se sigue renderizando el reto diario.

- [ ] **Step 3: Implementar**

En `src/App.tsx`, añade los imports:

```tsx
import { DuelPage } from './pages/DuelPage'
import { tolls } from './data/tolls'
import type { Mode } from './components/ModeTabs'
```

Borra la línea `type Mode = 'daily' | 'infinite'` (ahora el tipo vive en `ModeTabs`), y cambia `readMode` y el componente `App`:

```tsx
function readMode(): Mode {
  if (window.location.hash === '#infinito') return 'infinite'
  if (window.location.hash === '#mas-o-menos') return 'duel'
  return 'daily'
}
```

```tsx
export default function App() {
  const mode = useHashMode()
  if (mode === 'duel') return <DuelPage tolls={tolls} killers={killers} />
  if (mode === 'infinite') return <InfinitePage killers={killers} availableIds={availableCaseIds()} />
  return <DailyApp />
}
```

- [ ] **Step 4: Ejecutar toda la batería**

Run: `npm test`
Expected: PASS, todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat(ui): ruta #mas-o-menos"
```

---

### Tarea 14: Estilos

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Añadir los estilos**

Añade al final de `src/styles.css`, antes del bloque `@media (min-width: 900px)`:

```css
/* La cabecera lleva tres cosas (título, pestañas, controles): en móvil se envuelven. */
.page-header { flex-wrap: wrap; gap: 8px 16px; }

.mode-tabs { display: flex; gap: 12px; align-items: baseline; }
.mode-tab { color: var(--muted); text-decoration: none; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid transparent; padding-bottom: 2px; }
.mode-tab:hover { color: var(--text); }
.mode-tab-active { color: var(--accent); border-bottom-color: var(--accent); }
.mode-tab-disabled { opacity: 0.4; cursor: not-allowed; }

.duel { display: grid; gap: 16px; align-content: start; }
.duel-question { margin: 0; color: var(--muted); }
.duel-cards { display: grid; gap: 12px; }
.killer-card { background: var(--panel); border: 1px solid var(--line); padding: 16px; display: grid; gap: 4px; align-content: start; }
.killer-name { margin: 0; font-size: 1.2rem; }
.killer-nickname { margin: 0; color: var(--accent); font-size: 0.9rem; }
.killer-meta { margin: 0 0 8px; color: var(--muted); font-size: 0.9rem; }
.killer-count { display: grid; gap: 2px; }
/* Sobria a propósito: el número es un dato, no una puntuación. Sin animación ni color de premio. */
.killer-number { font-size: 2.4rem; line-height: 1; font-weight: bold; }
.killer-confirmed { color: var(--muted); font-size: 0.9rem; }
.killer-attributed { color: var(--muted); font-size: 0.85rem; }
.killer-count a { color: var(--accent); font-size: 0.85rem; margin-top: 8px; }
.killer-hidden { margin: 0; color: var(--muted); font-size: 0.9rem; min-height: 2.4rem; display: flex; align-items: center; }

.duel-buttons { display: flex; gap: 12px; }
.duel-choice { flex: 1; padding: 16px; font: inherit; font-size: 1rem; letter-spacing: 0.08em; text-transform: uppercase; background: transparent; color: var(--accent); border: 1px solid var(--accent); cursor: pointer; }
.duel-choice:hover { background: var(--accent); color: #000; }
.duel-over { display: grid; gap: 12px; justify-items: start; }
.duel-over-title { margin: 0; font-size: 1.2rem; color: var(--danger); }

@media (min-width: 700px) {
  .duel-cards { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Mirarlo en el navegador**

```bash
npm run dev
```

Abre `http://localhost:5173/#mas-o-menos`. Con `tolls.json` vacío debe verse la cabecera con las tres pestañas, la de "Más o menos" marcada como activa y atenuada en las otras páginas, y el aviso de que no hay datos. Comprueba también `#` y `#infinito`: las pestañas deben verse bien y no romper la cabecera en móvil (usa las herramientas de desarrollo a 390px de ancho). Para el modo en sí no hay nada que ver todavía; se revisa en la Tarea 19.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(ui): estilos del modo más o menos y las pestañas"
```

---

## Fase B — Contenido (Tareas 15-18)

A partir de aquí el trabajo es de datos. Los subagentes de esta fase **usan Sonnet, nunca Haiku**: son listas de personas reales con cifras, que es exactamente donde Haiku ya inventó datos en este proyecto.

---

### Tarea 15: Subagente `toll-generator`

**Files:**
- Create: `.claude/agents/toll-generator.md`, `pipeline/toll-candidates/.gitkeep`

- [ ] **Step 1: Crear los directorios**

```bash
mkdir -p pipeline/toll-candidates pipeline/toll-verdicts
touch pipeline/toll-candidates/.gitkeep pipeline/toll-verdicts/.gitkeep
```

- [ ] **Step 2: Escribir el agente**

Crea `.claude/agents/toll-generator.md` con este contenido exacto:

````markdown
---
name: toll-generator
description: Extrae del texto de Wikipedia el número de víctimas confirmadas y atribuidas de un asesino de Geo Killer y escribe el candidato JSON. Solo para el pipeline de contenido, nunca para código.
tools: Bash, Read, Write, Grep
disallowedTools: Edit, WebFetch, WebSearch
model: sonnet
maxTurns: 40
---

Eres el generador de cifras del juego Geo Killer. Tu única fuente de verdad es el texto de Wikipedia que está en `pipeline/sources/`. No usas tu memoria para ningún dato. Una cifra inventada es peor que ninguna cifra: si no puedes citarla literalmente, el asesino se queda fuera.

## Entrada

El mensaje contiene `id`, `name` y los títulos `wiki.es` y `wiki.en` (alguno puede ser `null`), tal como aparecen en `pipeline/killers-source.json`.

Los textos están en `pipeline/sources/<id>.es.txt` y `pipeline/sources/<id>.en.txt`. Si falta alguno que la entrada referencia, descárgalo con `bash pipeline/fetch-wiki.sh <lang> "<título>" <id>`. Si el script devuelve `ERROR:` (fallo de red), detente y responde `BLOCKED <id> error de red`.

## Cómo es el texto fuente

- Cada párrafo ocupa una sola línea: "mismo párrafo" es "misma línea". `grep -n` te da la línea y `sed -n '<N>p'` te devuelve la línea entera.
- Los encabezados empiezan por `=`. El encabezado vigente de una línea es el último `^=` anterior: `awk -v n=<N> 'NR<=n && /^=/{h=$0} END{print h}' <fichero>`.
- Las tablas del artículo no están en el extracto. Una cifra que solo vive en una tabla no está verificada.
- El extracto en español lleva caracteres invisibles (U+200B) donde había marcadores de referencia; pueden impedir que `grep -F` encuentre una cita correcta. Elige otra cita en ese caso.

## Procedimiento

1. Lee los dos ficheros fuente enteros.
2. **Cifra confirmada** (`confirmed`): el número de asesinatos por los que fue condenado, se declaró culpable o que la fuente da como confirmados. Búscala con:

   ```bash
   grep -n -i -E "convicted of [a-z0-9-]+ (murder|count|killing)|found guilty of|pleaded guilty to|sentenced for|condenad[oa] por|declarad[oa] culpable de|confirmad" pipeline/sources/<id>.en.txt pipeline/sources/<id>.es.txt
   ```

   Orden de preferencia si hay varias: condena firme > declaración de culpabilidad > "confirmadas" por la policía. Si el artículo da cifras distintas en español y en inglés, quédate con la menor y dilo en las evidencias.
3. **Cifra atribuida** (`attributed`): el total que la fuente le atribuye contando confesiones, sospechas o estimaciones. Búscala con:

   ```bash
   grep -n -i -E "confessed to|suspected of|attributed to|estimated|believed to have (killed|murdered)|confes[óo]|se le atribuy|estim|sospech" pipeline/sources/<id>.en.txt pipeline/sources/<id>.es.txt
   ```

   Si la fuente da un rango ("between 52 and 56"), `min` y `max` son los dos extremos. Si da un número único, `min` y `max` son iguales. Si la fuente no atribuye más de lo confirmado, `attributed` es `null` y no escribes `attributedQuote`.
4. **Regla que no puedes romper**: `attributed.min` nunca es menor que `confirmed`. Si te sale menor, has confundido las dos cifras: vuelve al paso 2.
5. **Países** (`countries`): de 1 a 3 códigos ISO-3166 alpha-2 **actuales**, en orden de importancia, de los países donde cometió los asesinatos. Usa siempre el país actual del territorio: la Unión Soviética se escribe `UA`, `RU`, `UZ`… según dónde ocurrieran, nunca `SU`; Yugoslavia nunca es `YU`. Anota la línea que respalda cada país.
6. **Años** (`activeYears`): `"<primer año>-<último año>"`, o un solo año si todo ocurrió en uno. Ambos años tienen que estar en la fuente.
7. **Apodo** (`nickname`): el apodo por el que se le conoce, en español y en inglés, tal como aparezcan en cada fuente. Cada idioma puede ser `null`. Si no tiene apodo en ninguno, `nickname` es `null`. No traduzcas un apodo tú: si no está en la fuente de ese idioma, es `null`.
8. **Wikipedia**: `https://es.wikipedia.org/wiki/<título es>` y `https://en.wikipedia.org/wiki/<título en>`, con `null` donde no haya título. Al menos uno no puede ser `null`.
9. **Si no encuentras una cifra confirmada citable**, no inventes ni deduzcas. Escribe `pipeline/toll-candidates/<id>.skip.json` con `{"id": "<id>", "reason": "<qué buscaste y qué no encontraste>"}` y responde `SKIP <id> <motivo>`. Esto es un resultado correcto, no un fallo.

## Salida

Escribe `pipeline/toll-candidates/<id>.json`:

```json
{
  "id": "gary-ridgway",
  "confirmed": 49,
  "attributed": { "min": 71, "max": 71 },
  "countries": ["US"],
  "activeYears": "1982-1998",
  "nickname": { "es": "el asesino de Green River", "en": "the Green River Killer" },
  "wikipedia": { "es": "https://es.wikipedia.org/wiki/Gary_Ridgway", "en": "https://en.wikipedia.org/wiki/Gary_Ridgway" },
  "confirmedQuote": "Ridgway was convicted of 49 murders",
  "attributedQuote": "he confessed to 71 killings",
  "sourceLang": "en"
}
```

`confirmedQuote` y `attributedQuote` son **citas literales** del fichero de `sourceLang`, de al menos 10 caracteres, y cada una **contiene el número** que respalda (en cifra o en letra). No las escribas de memoria: cópialas de la salida de `sed -n '<N>p'`. Si la frase contiene `"`, `'`, `` ` ``, `$` o `\`, elige otra: el validador no puede comprobarla.

Y escribe `pipeline/toll-candidates/<id>.meta.json` con las líneas que has usado:

```json
{
  "id": "gary-ridgway",
  "confirmedLine": 12,
  "attributedLine": 12,
  "countryLines": { "US": 3 },
  "yearsLine": 1,
  "nicknameLines": { "es": 1, "en": 1 },
  "notes": "el artículo en español da 48 condenas y el inglés 49; se toma la menor"
}
```

## Respuesta

Una única línea: `CANDIDATE <id> confirmed=<n> attributed=<min>-<max|null>`, o `SKIP <id> <motivo>`, o `BLOCKED <id> <motivo>`.

## Reglas

- Nunca escribas en `src/`, en `pipeline/sources/` ni en `pipeline/toll-verdicts/`.
- Nunca des por buena una cifra porque la sepas. Si no está en el texto, no está.
- Un número escrito en letra ("forty-nine") vale, pero la cita tiene que traerlo tal cual.
- Ante la duda entre dos cifras, la menor.
````

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/toll-generator.md pipeline/toll-candidates/.gitkeep pipeline/toll-verdicts/.gitkeep
git commit -m "feat(pipeline): subagente generador de cifras"
```

---

### Tarea 16: Subagente `toll-validator`

**Files:**
- Create: `.claude/agents/toll-validator.md`

- [ ] **Step 1: Escribir el agente**

Crea `.claude/agents/toll-validator.md` con este contenido exacto:

````markdown
---
name: toll-validator
description: Valida el candidato de cifras de un asesino de Geo Killer contra el texto de Wikipedia y escribe un veredicto JSON. Solo para el pipeline de contenido, nunca para código.
tools: Bash, Read, Write, Grep
disallowedTools: Edit, WebFetch, WebSearch
model: sonnet
maxTurns: 40
---

Eres el validador de cifras del juego Geo Killer. Tu trabajo es rechazar toda cifra que no puedas verificar en el texto de Wikipedia. No corriges datos, solo informas.

No das por bueno nada porque "lo sabes" y no das por bueno nada porque lo diga el fichero de evidencias: ese fichero solo te dice dónde mirar; la comprobación la haces tú con `grep` y `sed`. Si una comprobación no la has ejecutado, no la has hecho.

## Entrada

El mensaje contiene el `id`. El candidato está en `pipeline/toll-candidates/<id>.json` y sus evidencias en `pipeline/toll-candidates/<id>.meta.json`. Las fuentes están en `pipeline/sources/<id>.es.txt` y `pipeline/sources/<id>.en.txt`.

Si falta el fichero de evidencias, el veredicto es `rejected` con el error `falta el fichero de evidencias`.

## Comprobaciones

Ejecuta todas, en orden, y anota en `notes` la línea que has usado en cada una.

1. **Cita de la confirmada, literal**: `grep -n -F -- '<confirmedQuote>' pipeline/sources/<id>.<sourceLang>.txt`. Sin resultado → error `cita confirmada no literal`. Llama `N` a la línea.
2. **La cita trae el número**: la cita tiene que contener `confirmed` en cifra o en letra. Si la cita no menciona ese número, error `la cita no respalda la cifra`.
3. **La línea dice que es una condena o una confirmación**: lee la línea `N` entera con `sed -n '<N>p'`. Tiene que decir que fue condenado, se declaró culpable, o que esos asesinatos están confirmados. Si solo dice que se sospecha, se cree o se le atribuyen, error `la cifra confirmada es en realidad atribuida`.
4. **Sección documental**: `awk -v n=<N> 'NR<=n && /^=/{h=$0} END{print h}'`. Si el encabezado vigente es de ficción o de aparato (`En la cultura popular`, `In media`, `Cine`, `Film`, `Literatura`, `Books`, `Televisión`, `Television`, `Teatro`, `Theater`, `Véase también`, `See also`, `Notas`, `Referencias`, `References`, `Bibliografía`, `Enlaces externos`, `External links`), error `cita fuera de sección documental`.
5. **Cita de la atribuida**, si `attributed` no es `null`: repite los pasos 1, 2 y 4 con `attributedQuote`, comprobando que la cita contiene `min` (y `max`, si son distintos). Errores: `cita atribuida no literal`, `la cita no respalda el rango atribuido`, `cita fuera de sección documental`.
6. **Coherencia de las dos cifras**: si `attributed` no es `null` y `attributed.min < confirmed`, error `el rango atribuido es menor que lo confirmado`. Si `attributed.min > attributed.max`, error `rango invertido`.
7. **`attributedQuote` sobrante o ausente**: si `attributed` es `null` y hay `attributedQuote`, o al revés, error `attributedQuote no cuadra con attributed`.
8. **Países**: para cada código, comprueba que el país (en el idioma de la fuente, o el territorio que le corresponde) aparece en la fuente asociado a los asesinatos, usando la línea que dan las evidencias. Un país que no aparezca es error `país sin respaldo: <código>`. Si el candidato usa `SU`, `YU` o `CS`, error `código de país histórico: <código>`, sin excepciones. Si usa un código de un país que no existe, error `código de país inexistente: <código>`.
9. **Años**: los dos años de `activeYears` tienen que aparecer en la fuente. Si no, error `activeYears sin respaldo`.
10. **Apodo**: cada apodo no nulo tiene que aparecer en la fuente de su idioma (búsqueda sin distinguir mayúsculas). Un apodo que no aparezca es error `apodo sin respaldo: <idioma>`. Un apodo en español que solo aparece en el texto inglés, o al revés, también es error: no se traducen apodos.
11. **Wikipedia**: al menos una de las dos URLs no es `null`, y cada URL no nula apunta al dominio del idioma que dice (`es.wikipedia.org` para `es`). Si no, error `URL de Wikipedia mal formada`.

## Salida

Escribe `pipeline/toll-verdicts/<id>.json` con exactamente esta forma:

```json
{
  "id": "gary-ridgway",
  "verdict": "approved",
  "validator": "claude-sonnet-5",
  "errors": [],
  "notes": "confirmed 49: cita L12, la línea dice 'convicted of 49 murders'; attributed 71: cita L12; US en L3; años 1982 y 1998 en L1; apodos es L1 / en L1"
}
```

`verdict` es `approved` solo si `errors` está vacío. `notes` lleva la línea que has usado en cada comprobación: es lo que permite a un humano repetirlas.

## Respuesta

Una única línea: `VERDICT <id> <approved|rejected>`, seguida, si es `rejected`, de los errores separados por `;`.

## Reglas

- Nunca modifiques `pipeline/toll-candidates/` ni `src/`. Solo escribes en `pipeline/toll-verdicts/`.
- Si la fuente en español y la inglesa discrepan en una cifra, el candidato tiene que traer la menor; si trae la mayor, error `discrepancia entre fuentes: es dice X, en dice Y`.
- Si el fichero de evidencias apunta a una línea que no respalda lo que dice respaldar, dilo en `notes`: significa que el generador está inventando referencias.
````

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/toll-validator.md
git commit -m "feat(pipeline): subagente validador de cifras"
```

---

### Tarea 17: `promote-tolls.ts`

**Files:**
- Create: `pipeline/promote-tolls.ts`

- [ ] **Step 1: Escribir el script**

Crea `pipeline/promote-tolls.ts`:

```typescript
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { tollSchema, tollsSchema } from '../src/data/schema.ts'

const verdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(['approved', 'rejected']),
  validator: z.string().min(1).optional(),
  errors: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote-tolls.ts <id>')
  process.exit(1)
}

function read(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    console.error(`No se encuentra ${path}`)
    process.exit(1)
  }
}

const candidate = JSON.parse(read(`pipeline/toll-candidates/${id}.json`))
const verdictParsed = verdictSchema.safeParse(JSON.parse(read(`pipeline/toll-verdicts/${id}.json`)))
if (!verdictParsed.success) {
  console.error(`El veredicto de ${id} no tiene la forma esperada:\n${z.prettifyError(verdictParsed.error)}`)
  process.exit(1)
}
const verdict = verdictParsed.data

if (verdict.id !== id) {
  console.error(`El veredicto dice id "${verdict.id}" pero se pidió "${id}"`)
  process.exit(1)
}
if (verdict.verdict !== 'approved') {
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve: ${(verdict.errors ?? []).join('; ')}`)
  process.exit(1)
}
if ((verdict.errors ?? []).length > 0) {
  console.error(`El veredicto de ${id} dice "approved" pero trae errores: ${(verdict.errors ?? []).join('; ')}`)
  process.exit(1)
}

const today = new Date()
const validatedAt = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-')

const promoted = tollSchema.safeParse({
  ...candidate,
  validation: {
    status: 'approved',
    validatedAt,
    validator: verdict.validator ?? 'claude-sonnet-5',
    notes: verdict.notes ?? '',
  },
})
if (!promoted.success) {
  console.error(`La cifra promovida no cumple el esquema:\n${z.prettifyError(promoted.error)}`)
  process.exit(1)
}

const current = tollsSchema.parse(JSON.parse(readFileSync('src/data/tolls.json', 'utf8')))
const next = [...current.filter((t) => t.id !== id), promoted.data].sort((a, b) => a.id.localeCompare(b.id))
writeFileSync('src/data/tolls.json', JSON.stringify(next, null, 2) + '\n')
console.log(`Promovido ${id}: ${promoted.data.confirmed} confirmadas (${next.length} en total)`)
```

- [ ] **Step 2: Probarlo con un candidato de mentira**

```bash
cat > pipeline/toll-candidates/prueba-borrar.json <<'JSON'
{
  "id": "ted-bundy",
  "confirmed": 30,
  "attributed": null,
  "countries": ["US"],
  "activeYears": "1974-1978",
  "nickname": null,
  "wikipedia": { "es": "https://es.wikipedia.org/wiki/Ted_Bundy", "en": null },
  "confirmedQuote": "cita de prueba para el script",
  "sourceLang": "es"
}
JSON
mv pipeline/toll-candidates/prueba-borrar.json pipeline/toll-candidates/ted-bundy.json
cat > pipeline/toll-verdicts/ted-bundy.json <<'JSON'
{ "id": "ted-bundy", "verdict": "approved", "validator": "prueba", "errors": [], "notes": "prueba del script" }
JSON
node pipeline/promote-tolls.ts ted-bundy
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('src/data/tolls.json','utf8')),null,1))"
npm run validate:data
```

Expected: imprime `Promovido ted-bundy: 30 confirmadas (1 en total)`, el JSON tiene una entrada, y `validate:data` pasa con `1 cifras` y el aviso de 51 sin cifra.

- [ ] **Step 3: Comprobar que un veredicto rechazado no promueve**

```bash
node -e "
const fs=require('fs');
const v=JSON.parse(fs.readFileSync('pipeline/toll-verdicts/ted-bundy.json','utf8'));
v.verdict='rejected'; v.errors=['cita no literal'];
fs.writeFileSync('pipeline/toll-verdicts/ted-bundy.json', JSON.stringify(v,null,2));
"
node pipeline/promote-tolls.ts ted-bundy; echo "código de salida: $?"
```

Expected: `El veredicto de ted-bundy es "rejected", no se promueve: cita no literal` y código de salida 1.

- [ ] **Step 4: Limpiar los ficheros de prueba**

```bash
rm pipeline/toll-candidates/ted-bundy.json pipeline/toll-verdicts/ted-bundy.json
printf '[]\n' > src/data/tolls.json
npm run validate:data
```

Expected: vuelve a decir `0 cifras`.

- [ ] **Step 5: Commit**

```bash
git add pipeline/promote-tolls.ts
git commit -m "feat(pipeline): promoción de cifras a tolls.json"
```

---

### Tarea 18: Generar las cifras de los 52

**Files:**
- Create: `pipeline/toll-candidates/*.json`, `pipeline/toll-verdicts/*.json`
- Modify: `src/data/tolls.json`

Esta tarea se repite en tandas de 8 asesinos hasta cubrir los 52 de `killers.json`. Los subagentes personalizados solo se cargan al arrancar la sesión: si `toll-generator` y `toll-validator` no están disponibles, lanza un subagente `general-purpose` diciéndole que lea el fichero del agente y siga su cuerpo al pie de la letra.

- [ ] **Step 1: Sacar la lista de tandas**

```bash
node -e "
const k=require('./pipeline/killers-source.json');
const hechos=new Set(require('./src/data/tolls.json').map(t=>t.id));
const pend=k.filter(x=>!hechos.has(x.id));
for (let i=0;i<pend.length;i+=8) {
  console.log('Tanda', i/8+1+':', pend.slice(i,i+8).map(x=>x.id).join(' '));
}
console.log('Pendientes:', pend.length);
"
```

- [ ] **Step 2: Generar una tanda**

Lanza los 8 `toll-generator` de la tanda **en un solo mensaje**, para que corran en paralelo. A cada uno le pasas el `id`, el `name` y los títulos `wiki.es` / `wiki.en` tal como están en `pipeline/killers-source.json`.

Expected: cada uno responde `CANDIDATE <id> ...`, `SKIP <id> ...` o `BLOCKED <id> ...`. Los `SKIP` son resultados correctos: ese asesino no tiene cifra citable y se queda fuera del modo. Los `BLOCKED` se reintentan en la tanda siguiente.

- [ ] **Step 3: Validar la tanda**

Lanza un `toll-validator` por cada candidato generado (no por los `SKIP`), otra vez todos en un solo mensaje.

Expected: cada uno responde `VERDICT <id> approved` o `VERDICT <id> rejected` con sus errores.

- [ ] **Step 4: Promover los aprobados**

```bash
for id in <los ids aprobados de esta tanda>; do node pipeline/promote-tolls.ts "$id"; done
npm run validate:data
```

Expected: una línea `Promovido <id>: N confirmadas` por cada uno, y `validate:data` pasa.

- [ ] **Step 5: Decidir qué hacer con los rechazados**

Un rechazo por `cita no literal` o `la cita no respalda la cifra` se reintenta una vez, pasando al generador los errores del veredicto bajo un encabezado `## Errores del intento anterior`. Un rechazo por `la cifra confirmada es en realidad atribuida`, `país sin respaldo` o `código de país histórico` también se reintenta. Si el segundo intento vuelve a fallar, ese asesino se queda fuera: no lo fuerces.

- [ ] **Step 6: Commit de la tanda**

```bash
git add pipeline/toll-candidates pipeline/toll-verdicts src/data/tolls.json
git commit -m "feat(datos): cifras de víctimas (tanda N)"
```

- [ ] **Step 7: Repetir hasta agotar la lista**

Vuelve al Step 1. Cuando `Pendientes: 0`, o cuando lo que queda sean solo asesinos con `SKIP` o dos rechazos, pasa a la Tarea 19.

- [ ] **Step 8: El caso forzado**

`amarjeet-sada` es el único sin texto de Wikipedia, así que el generador lo dará `BLOCKED`. Va por el estándar forzado que ya se usó para su caso: corrobora la cifra en dos fuentes independientes, baja la precisión donde discrepen, y escribe el candidato a mano con `validation.validator` puesto a `"forzado-prensa"` y `validation.notes` empezando por `ESTANDAR FORZADO:` seguido de las dos fuentes. Si no hay dos fuentes que coincidan en una cifra, déjalo fuera de `tolls.json`: el modo funciona sin él.

---

## Fase C — Cierre (Tarea 19)

---

### Tarea 19: Verificación completa

**Files:** ninguno nuevo

- [ ] **Step 1: La batería entera**

```bash
npm run lint
npm test
npx tsc -b
npm run validate:data
```

Expected: los cuatro en verde. `validate:data` dice cuántas cifras hay y lista los asesinos sin cifra, que es un aviso, no un error.

- [ ] **Step 2: Comprobar que el modo tiene datos de verdad**

```bash
node -e "
const t=require('./src/data/tolls.json');
console.log('asesinos con cifra:', t.length);
const empates = {};
for (const x of t) { empates[x.confirmed] = (empates[x.confirmed]||0)+1 }
console.log('cifras repetidas:', Object.entries(empates).filter(([,n])=>n>1));
console.log('rango:', Math.min(...t.map(x=>x.confirmed)), '-', Math.max(...t.map(x=>x.confirmed)));
"
```

Expected: al menos 2 asesinos (si no, la pestaña sale deshabilitada). Anota cuántos empates hay: son los que ejercitan la regla del empate en el navegador.

- [ ] **Step 3: Jugar en el navegador, en escritorio**

```bash
npm run dev
```

Con Playwright, en un viewport de 1280x800, abre `http://localhost:5173/#mas-o-menos` y comprueba:
- Las tres pestañas se ven y la de "Más o menos" está marcada como activa.
- Las dos cartas salen una al lado de la otra, con la cifra solo en la izquierda.
- Al acertar, la carta derecha revela su número, la racha sube y en algo más de un segundo entra un asesino nuevo.
- Al fallar, aparece "Fin de la partida" y el botón de volver a empezar, y el récord se conserva.
- Al recargar a media partida, la racha y la pareja siguen donde estaban.
- Cambiando a inglés con el botón de idioma, los países y los textos cambian y los apodos son los ingleses.

Guarda una captura en `docs/superpowers/screenshots/mas-o-menos-escritorio.png`.

- [ ] **Step 4: Jugar en el navegador, en móvil**

Repite con un viewport de 390x844. Comprueba además que la cabecera con las tres pestañas no se desborda ni se sale del ancho, y que las cartas se apilan. Guarda la captura en `docs/superpowers/screenshots/mas-o-menos-movil.png`.

- [ ] **Step 5: Actualizar el README**

En `README.md`, en la sección de la cabecera, añade una línea sobre el modo nuevo después de la descripción del juego:

```markdown
Además del reto diario hay un **modo infinito** (`#infinito`) y **"Más o menos"** (`#mas-o-menos`), una cadena de duelos en la que se acierta si un asesino mató más o menos que el anterior. Las cifras de `src/data/tolls.json` se generan con `pipeline/promote-tolls.ts` y los subagentes `toll-generator` y `toll-validator`, y se verifican contra el texto de Wikipedia.
```

- [ ] **Step 6: Commit y cierre**

```bash
git add README.md docs/superpowers/screenshots/
git commit -m "docs: documentar el modo más o menos"
```

Luego usa la skill `superpowers:finishing-a-development-branch` para decidir cómo integrar la rama.

---

## Notas para quien ejecute el plan

- **El orden importa**: la Tarea 8 (textos) deja `npm test` en rojo a propósito hasta la Tarea 11. Es el único punto del plan donde eso pasa, y está señalado.
- **Los fixtures no son los datos reales**: toda la fase A se prueba con `sample-tolls.ts`. Si un test empieza a depender de `src/data/tolls.json`, está mal escrito.
- **El azar se inyecta siempre**: ni `duel.ts` ni los tests llaman a `Math.random`. Solo `App.tsx` deja que `DuelPage` use el valor por defecto.
- **Cifra que no se puede citar, cifra que no entra.** Es la regla que sostiene todo el pipeline de este proyecto; en la fase B se aplica sin excepciones salvo el caso forzado del Step 8 de la Tarea 18, que se marca en los datos.
