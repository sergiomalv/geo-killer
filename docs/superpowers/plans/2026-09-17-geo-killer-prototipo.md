# Geo Killer — Plan de implementación (hito 1: prototipo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototipo jugable de Geo Killer: reto diario con mapa de lugares, cuatro intentos con pistas progresivas, pantalla de resultado, y un pipeline de generación de casos con subagentes que produce 8 casos verificados contra Wikipedia.

**Architecture:** SPA estática (Vite + React + TypeScript) sin backend. La lógica de juego vive en `src/game/*` como funciones puras testeadas con Vitest; los componentes React solo renderizan y emiten eventos. Los datos son JSON en `src/data/` validados por un esquema Zod. El pipeline de contenido vive en `pipeline/` y `.claude/agents/`: un generador (Haiku) escribe candidatos a partir del texto plano de Wikipedia, un validador (Sonnet) comprueba cada dato contra ese mismo texto de forma literal y un script promueve los aprobados a `src/data/cases/`.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Vitest 5 + jsdom + Testing Library, Zod 4, Leaflet 1.9 + react-leaflet 5 (tiles CartoDB dark), Node 25 (ejecuta `.ts` sin transpilar), MediaWiki API (texto plano de Wikipedia), Nominatim (geocodificación puntual).

**Spec:** `docs/superpowers/specs/2026-09-17-geo-killer-design.md`. Este plan cubre el hito "prototipo". Compartir, estadísticas, archivo, pulido visual y ampliación a 30-50 casos van en un segundo plan.

**Desviaciones respecto al spec, decididas al planificar:**
- Los agentes leen Wikipedia mediante la API de MediaWiki (`prop=extracts&explaintext=1`), que devuelve el texto plano literal del artículo, en lugar de WebFetch, que resume el contenido con un modelo y rompería la comprobación literal de `sourceQuote`. La fuente sigue siendo Wikipedia.
- Cada asesinato lleva un campo extra `sourceLang` (`"es"` o `"en"`) para saber en qué texto buscar la cita literal.
- `wikipedia.es` y `wikipedia.en` pueden ser `null` individualmente (debe existir al menos uno).
- `killers.json` tendrá 50 entradas en el prototipo (150-200 en el lanzamiento).

**Modelos por tarea.** Cada tarea indica el modelo de Claude que debe ejecutarla al despachar el subagente (`model` del Agent tool):
- `haiku`: scaffolding, configuración, ficheros mecánicos, generación de contenido barato.
- `sonnet`: lógica con tests, componentes, esquema, scripts del pipeline, validación de casos, revisión de código.
- `opus`: revisión adversarial de los prompts de los agentes (pieza crítica antialucinación).

---

## Estructura de ficheros

```
.claude/agents/case-generator.md    subagente Haiku: candidato JSON desde texto de Wikipedia
.claude/agents/case-validator.md    subagente Sonnet: veredicto campo a campo
pipeline/fetch-wiki.sh              descarga texto plano de un artículo a pipeline/sources/
pipeline/geocode.sh                 consulta Nominatim para una ciudad
pipeline/distance.sh                distancia haversine en km entre dos puntos
pipeline/promote.ts                 candidato aprobado -> src/data/cases/<id>.json
pipeline/check-killers.ts           verifica títulos y alias de killers.json contra Wikipedia
pipeline/seed-cases.json            lista semilla de asesinos con títulos de Wikipedia
pipeline/candidates/<id>.json       salida del generador (versionado)
pipeline/verdicts/<id>.json         salida del validador (versionado)
pipeline/rejected/<id>.json         candidatos descartados (versionado)
pipeline/sources/<id>.<lang>.txt    texto de Wikipedia (ignorado por git)
scripts/validate-data.ts            valida src/data/** con el esquema y la coherencia entre ficheros
src/data/schema.ts                  esquemas Zod y tipos
src/data/cases.ts                   carga perezosa de un caso por id (import.meta.glob)
src/data/cases/<id>.json            casos aprobados
src/data/killers.json               lista de autocompletado
src/data/schedule.json              calendario de retos
src/game/matching.ts                normalización y búsqueda de nombres/alias
src/game/engine.ts                  estado de partida, intentos, nivel de pista
src/game/schedule.ts                número de día y caso del día
src/game/storage.ts                 progreso en localStorage
src/game/__fixtures__/sample-case.ts  caso de prueba para tests
src/components/AttemptsBar.tsx      cuatro casillas de intento
src/components/ClueList.tsx         lista de asesinatos con las pistas desbloqueadas
src/components/GuessInput.tsx       buscador con autocompletado
src/components/CaseMap.tsx          mapa Leaflet con marcadores
src/components/ResultCard.tsx       revelación final
src/pages/TodayPage.tsx             orquesta la partida del día
src/App.tsx                         raíz
src/styles.css                      estética noir
src/test/setup.ts                   jest-dom para Vitest
```

---

### Task 1: Scaffold del proyecto

**Modelo:** `haiku`

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx` (generados por create-vite)
- Modify: `.gitignore`, `tsconfig.app.json`

- [ ] **Step 1: Generar la plantilla en un directorio temporal y moverla a la raíz**

```bash
cd /Users/sergio/Desktop/projects/geo-killer
npx -y create-vite@latest .vite-tmp --template react-ts
rsync -a .vite-tmp/ ./
rm -rf .vite-tmp
```

Expected: existen `package.json`, `vite.config.ts`, `src/main.tsx`, `index.html`, `.gitignore`.

- [ ] **Step 2: Instalar dependencias**

```bash
npm install
npm install leaflet react-leaflet zod
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @types/leaflet
```

Expected: `package.json` lista `leaflet`, `react-leaflet`, `zod` en dependencies y `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/leaflet` en devDependencies.

- [ ] **Step 3: Activar JSON modules en TypeScript**

En `tsconfig.app.json`, dentro de `compilerOptions`, añadir tras la línea `"moduleResolution": "bundler",`:

```json
    "resolveJsonModule": true,
```

- [ ] **Step 4: Añadir a `.gitignore`**

```
pipeline/sources/
```

- [ ] **Step 5: Limpiar la plantilla**

Borrar `src/App.css`, `src/index.css`, `src/assets/react.svg`, `public/vite.svg`. Reemplazar `src/App.tsx`:

```tsx
export default function App() {
  return <h1>Geo Killer</h1>
}
```

Reemplazar `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Crear `src/styles.css` con:

```css
:root {
  color-scheme: dark;
  --bg: #0b0b0d;
  --panel: #15151a;
  --line: #2a2a33;
  --text: #e8e4d9;
  --muted: #8d8878;
  --accent: #d9a441;
  --danger: #b3382c;
  --ok: #4f9d69;
  font-family: 'Courier New', Courier, monospace;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}
```

En `index.html` cambiar el `<title>` a `Geo Killer` y `lang="en"` a `lang="es"`.

- [ ] **Step 6: Comprobar que arranca y compila**

```bash
npm run build
```

Expected: termina con `✓ built in ...` y crea `dist/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript"
```

---

### Task 2: Configuración de Vitest

**Modelo:** `haiku`

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `src/test/setup.ts`, `src/test/smoke.test.ts`

- [ ] **Step 1: Configurar Vitest en `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    dir: './src',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
```

- [ ] **Step 2: Crear `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Añadir scripts a `package.json`**

Dentro de `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "validate:data": "node scripts/validate-data.ts"
```

- [ ] **Step 4: Escribir un test de humo `src/test/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

describe('vitest', () => {
  it('runs with jsdom', () => {
    const el = document.createElement('div')
    el.textContent = 'ok'
    expect(el).toHaveTextContent('ok')
  })
})
```

- [ ] **Step 5: Ejecutar**

```bash
npm test
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts package.json src/test
git commit -m "chore: configurar Vitest con jsdom y Testing Library"
```

---

### Task 3: Esquema Zod de los datos

**Modelo:** `sonnet`

**Files:**
- Create: `src/data/schema.ts`, `src/data/schema.test.ts`, `src/game/__fixtures__/sample-case.ts`

- [ ] **Step 1: Crear el fixture `src/game/__fixtures__/sample-case.ts`**

Es un caso de prueba para tests. No se juega ni se promueve; las coordenadas y fechas son plausibles pero no se usan como contenido real.

```ts
import type { Case } from '../../data/schema'

export const sampleCase: Case = {
  id: 'caso-prueba',
  name: 'Asesino de Prueba',
  aliases: ['El Fantasma', 'The Ghost'],
  country: 'Pruebalandia',
  activeYears: '1980-1983',
  wikipedia: { es: 'https://es.wikipedia.org/wiki/Prueba', en: null },
  summary: 'Caso ficticio usado solo en tests.',
  murders: [
    {
      city: 'Ciudad Uno', region: null, country: 'Pruebalandia',
      lat: 40.0, lng: -3.0, date: '1980-05-01', datePrecision: 'day',
      victim: 'Víctima Uno', method: 'Método uno.',
      sourceQuote: 'cita uno', sourceLang: 'es',
    },
    {
      city: 'Ciudad Dos', region: 'Barrio Dos', country: 'Pruebalandia',
      lat: 41.0, lng: -2.0, date: '1981-06', datePrecision: 'month',
      victim: 'Víctima no identificada', method: 'Método dos.',
      sourceQuote: 'cita dos', sourceLang: 'es',
    },
    {
      city: 'Ciudad Tres', region: null, country: 'Pruebalandia',
      lat: 42.0, lng: -1.0, date: '1983', datePrecision: 'year',
      victim: 'Víctima Tres', method: 'Método tres.',
      sourceQuote: 'cita tres', sourceLang: 'es',
    },
  ],
  validation: { status: 'approved', validatedAt: '2026-09-17', validator: 'test', notes: '' },
}
```

- [ ] **Step 2: Escribir los tests `src/data/schema.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { caseSchema, killersSchema, scheduleSchema } from './schema'
import { sampleCase } from '../game/__fixtures__/sample-case'

describe('caseSchema', () => {
  it('acepta el fixture', () => {
    expect(caseSchema.safeParse(sampleCase).success).toBe(true)
  })

  it('rechaza menos de 3 asesinatos', () => {
    const c = { ...sampleCase, murders: sampleCase.murders.slice(0, 2) }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza más de 8 asesinatos', () => {
    const c = { ...sampleCase, murders: Array(9).fill(sampleCase.murders[0]) }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza fecha con precisión incoherente', () => {
    const m = { ...sampleCase.murders[0], date: '1980', datePrecision: 'day' as const }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('acepta fecha null con precisión null', () => {
    const m = { ...sampleCase.murders[0], date: null, datePrecision: null }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(true)
  })

  it('rechaza si no hay ninguna URL de Wikipedia', () => {
    const c = { ...sampleCase, wikipedia: { es: null, en: null } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza id con mayúsculas o espacios', () => {
    expect(caseSchema.safeParse({ ...sampleCase, id: 'Caso Prueba' }).success).toBe(false)
  })

  it('rechaza status distinto de approved', () => {
    const c = { ...sampleCase, validation: { ...sampleCase.validation, status: 'pending' } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })
})

describe('killersSchema', () => {
  it('acepta una lista válida', () => {
    const list = [{ id: 'a-b', name: 'A B', aliases: ['El A'] }]
    expect(killersSchema.safeParse(list).success).toBe(true)
  })
  it('rechaza ids duplicados', () => {
    const list = [
      { id: 'a-b', name: 'A B', aliases: [] },
      { id: 'a-b', name: 'A B 2', aliases: [] },
    ]
    expect(killersSchema.safeParse(list).success).toBe(false)
  })
})

describe('scheduleSchema', () => {
  it('acepta launchDate ISO y orden no vacío', () => {
    expect(scheduleSchema.safeParse({ launchDate: '2026-10-01', order: ['x'] }).success).toBe(true)
  })
  it('rechaza orden vacío', () => {
    expect(scheduleSchema.safeParse({ launchDate: '2026-10-01', order: [] }).success).toBe(false)
  })
})
```

- [ ] **Step 3: Ejecutar y ver fallar**

```bash
npm test -- src/data/schema.test.ts
```

Expected: FAIL, `Cannot find module './schema'`.

- [ ] **Step 4: Implementar `src/data/schema.ts`**

```ts
import { z } from 'zod'

export const DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const precisionLength = { year: 4, month: 7, day: 10 } as const

export const murderSchema = z
  .object({
    city: z.string().min(1),
    region: z.string().min(1).nullable(),
    country: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    date: z.string().regex(DATE_PATTERN).nullable(),
    datePrecision: z.enum(['year', 'month', 'day']).nullable(),
    victim: z.string().min(1),
    method: z.string().min(1),
    sourceQuote: z.string().min(10),
    sourceLang: z.enum(['es', 'en']),
  })
  .refine((m) => (m.date === null) === (m.datePrecision === null), {
    message: 'date y datePrecision deben ser ambos null o ambos definidos',
  })
  .refine(
    (m) => m.date === null || m.datePrecision === null || m.date.length === precisionLength[m.datePrecision],
    { message: 'la longitud de date no coincide con datePrecision' },
  )

export const validationSchema = z.object({
  status: z.literal('approved'),
  validatedAt: z.iso.date(),
  validator: z.string().min(1),
  notes: z.string(),
})

export const caseSchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  country: z.string().min(1),
  activeYears: z.string().min(1),
  wikipedia: z
    .object({ es: z.url().nullable(), en: z.url().nullable() })
    .refine((w) => w.es !== null || w.en !== null, { message: 'hace falta al menos una URL de Wikipedia' }),
  summary: z.string().min(1),
  murders: z.array(murderSchema).min(3).max(8),
  validation: validationSchema,
})

export const killerEntrySchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
})

export const killersSchema = z
  .array(killerEntrySchema)
  .refine((list) => new Set(list.map((k) => k.id)).size === list.length, { message: 'ids duplicados' })

export const scheduleSchema = z.object({
  launchDate: z.iso.date(),
  order: z.array(z.string().regex(SLUG_PATTERN)).min(1),
})

export type Murder = z.infer<typeof murderSchema>
export type Case = z.infer<typeof caseSchema>
export type KillerEntry = z.infer<typeof killerEntrySchema>
export type Schedule = z.infer<typeof scheduleSchema>
```

- [ ] **Step 5: Ejecutar y ver pasar**

```bash
npm test -- src/data/schema.test.ts
```

Expected: `12 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/data/schema.ts src/data/schema.test.ts src/game/__fixtures__
git commit -m "feat(data): esquema Zod de casos, killers y schedule"
```

---

### Task 4: Script de validación de datos

**Modelo:** `sonnet`

**Files:**
- Create: `scripts/validate-data.ts`, `src/data/killers.json`, `src/data/schedule.json`, `src/data/cases/.gitkeep`

- [ ] **Step 1: Crear datos mínimos para que el script tenga algo que validar**

`src/data/killers.json`:

```json
[]
```

`src/data/schedule.json`:

```json
{
  "launchDate": "2026-10-01",
  "order": []
}
```

Nota: `order` vacío viola el esquema a propósito; el script debe fallar hasta que la Task 15 lo rellene. Crear también `src/data/cases/.gitkeep` vacío.

- [ ] **Step 2: Escribir `scripts/validate-data.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { caseSchema, killersSchema, scheduleSchema } from '../src/data/schema.ts'

const DATA_DIR = join(process.cwd(), 'src', 'data')
const errors: string[] = []

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function report(label: string, result: { success: boolean; error?: z.ZodError }) {
  if (!result.success && result.error) {
    errors.push(`${label}:\n${z.prettifyError(result.error)}`)
  }
}

const killersResult = killersSchema.safeParse(readJson(join(DATA_DIR, 'killers.json')))
report('killers.json', killersResult)
const killerIds = new Set(killersResult.success ? killersResult.data.map((k) => k.id) : [])

const scheduleResult = scheduleSchema.safeParse(readJson(join(DATA_DIR, 'schedule.json')))
report('schedule.json', scheduleResult)

const caseIds = new Set<string>()
const casesDir = join(DATA_DIR, 'cases')
for (const file of readdirSync(casesDir).filter((f) => f.endsWith('.json')).sort()) {
  const result = caseSchema.safeParse(readJson(join(casesDir, file)))
  report(`cases/${file}`, result)
  if (!result.success) continue
  const c = result.data
  caseIds.add(c.id)
  if (file !== `${c.id}.json`) errors.push(`cases/${file}: el nombre del fichero no coincide con id "${c.id}"`)
  if (!killerIds.has(c.id)) errors.push(`cases/${file}: id "${c.id}" no está en killers.json`)
}

if (scheduleResult.success) {
  for (const id of scheduleResult.data.order) {
    if (!caseIds.has(id)) errors.push(`schedule.json: "${id}" no tiene fichero en cases/`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n\n'))
  console.error(`\n${errors.length} problema(s) encontrado(s)`)
  process.exit(1)
}
console.log(`OK: ${caseIds.size} casos, ${killerIds.size} killers, ${scheduleResult.success ? scheduleResult.data.order.length : 0} días programados`)
```

- [ ] **Step 3: Ejecutar y comprobar que detecta el schedule vacío**

```bash
npm run validate:data
```

Expected: exit 1 con un mensaje que menciona `schedule.json` y `order`.

- [ ] **Step 4: Comprobar que pasa con datos válidos temporales**

Poner `"order": ["caso-prueba"]` en `schedule.json`, añadir `{ "id": "caso-prueba", "name": "Asesino de Prueba", "aliases": [] }` a `killers.json` y copiar el fixture como JSON en `src/data/cases/caso-prueba.json` (el objeto `sampleCase` serializado). Ejecutar `npm run validate:data`. Expected: `OK: 1 casos, 1 killers, 1 días programados`. Después revertir los tres ficheros al estado del Step 1 y borrar `caso-prueba.json`.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-data.ts src/data/killers.json src/data/schedule.json src/data/cases/.gitkeep
git commit -m "feat(data): script validate:data con esquema y coherencia entre ficheros"
```

---

### Task 5: Normalización y búsqueda de nombres

**Modelo:** `sonnet`

**Files:**
- Create: `src/game/matching.ts`, `src/game/matching.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, expect, it } from 'vitest'
import { matchesKiller, normalize, searchKillers } from './matching'

const killers = [
  { id: 'david-berkowitz', name: 'David Berkowitz', aliases: ['El hijo de Sam', 'Son of Sam'] },
  { id: 'ted-bundy', name: 'Ted Bundy', aliases: [] },
  { id: 'jack-el-destripador', name: 'Jack el Destripador', aliases: ['Jack the Ripper'] },
]

describe('normalize', () => {
  it('quita acentos, mayúsculas y espacios sobrantes', () => {
    expect(normalize('  El  HIJO de Sám ')).toBe('el hijo de sam')
  })
  it('convierte puntuación en espacios', () => {
    expect(normalize('Jack, el-Destripador!')).toBe('jack el destripador')
  })
})

describe('matchesKiller', () => {
  it('acepta el nombre canónico', () => {
    expect(matchesKiller('david berkowitz', killers[0])).toBe(true)
  })
  it('acepta un alias con acentos distintos', () => {
    expect(matchesKiller('el hijo de sám', killers[0])).toBe(true)
  })
  it('rechaza coincidencia parcial', () => {
    expect(matchesKiller('berkowitz', killers[0])).toBe(false)
  })
  it('rechaza cadena vacía', () => {
    expect(matchesKiller('   ', killers[0])).toBe(false)
  })
})

describe('searchKillers', () => {
  it('devuelve vacío para consulta vacía', () => {
    expect(searchKillers('', killers)).toEqual([])
  })
  it('busca por fragmento de nombre o alias', () => {
    expect(searchKillers('sam', killers).map((k) => k.id)).toEqual(['david-berkowitz'])
    expect(searchKillers('ripper', killers).map((k) => k.id)).toEqual(['jack-el-destripador'])
  })
  it('respeta el límite', () => {
    expect(searchKillers('a', killers, 2)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/game/matching.test.ts
```

Expected: FAIL, `Cannot find module './matching'`.

- [ ] **Step 3: Implementar `src/game/matching.ts`**

```ts
import type { KillerEntry } from '../data/schema'

export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function namesOf(killer: KillerEntry): string[] {
  return [killer.name, ...killer.aliases].map(normalize)
}

export function matchesKiller(guess: string, killer: KillerEntry): boolean {
  const g = normalize(guess)
  return g.length > 0 && namesOf(killer).includes(g)
}

export function searchKillers(query: string, killers: KillerEntry[], limit = 8): KillerEntry[] {
  const q = normalize(query)
  if (q.length === 0) return []
  const results: KillerEntry[] = []
  for (const killer of killers) {
    if (namesOf(killer).some((n) => n.includes(q))) {
      results.push(killer)
      if (results.length >= limit) break
    }
  }
  return results
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

```bash
npm test -- src/game/matching.test.ts
```

Expected: `9 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/game/matching.ts src/game/matching.test.ts
git commit -m "feat(game): normalización y búsqueda de nombres y alias"
```

---

### Task 6: Motor de juego

**Modelo:** `sonnet`

**Files:**
- Create: `src/game/engine.ts`, `src/game/engine.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, expect, it } from 'vitest'
import { clueLevel, createGame, MAX_ATTEMPTS, submitGuess } from './engine'

const ANSWER = 'david-berkowitz'

describe('createGame', () => {
  it('empieza jugando sin intentos', () => {
    expect(createGame(ANSWER)).toEqual({ caseId: ANSWER, guesses: [], status: 'playing' })
  })
})

describe('submitGuess', () => {
  it('gana al acertar', () => {
    const s = submitGuess(createGame(ANSWER), ANSWER)
    expect(s.status).toBe('won')
    expect(s.guesses).toEqual([ANSWER])
  })

  it('sigue jugando tras un fallo', () => {
    const s = submitGuess(createGame(ANSWER), 'ted-bundy')
    expect(s.status).toBe('playing')
    expect(s.guesses).toEqual(['ted-bundy'])
  })

  it('pierde al cuarto fallo', () => {
    let s = createGame(ANSWER)
    for (const g of ['a', 'b', 'c', 'd']) s = submitGuess(s, g)
    expect(s.status).toBe('lost')
    expect(s.guesses).toHaveLength(MAX_ATTEMPTS)
  })

  it('gana en el cuarto intento si acierta', () => {
    let s = createGame(ANSWER)
    for (const g of ['a', 'b', 'c']) s = submitGuess(s, g)
    s = submitGuess(s, ANSWER)
    expect(s.status).toBe('won')
  })

  it('ignora intentos cuando la partida terminó', () => {
    const won = submitGuess(createGame(ANSWER), ANSWER)
    expect(submitGuess(won, 'x')).toBe(won)
  })

  it('ignora un intento repetido', () => {
    const s1 = submitGuess(createGame(ANSWER), 'a')
    expect(submitGuess(s1, 'a')).toBe(s1)
  })

  it('no muta el estado anterior', () => {
    const s0 = createGame(ANSWER)
    submitGuess(s0, 'a')
    expect(s0.guesses).toEqual([])
  })
})

describe('clueLevel', () => {
  it('sube con cada fallo hasta 3', () => {
    let s = createGame(ANSWER)
    expect(clueLevel(s)).toBe(0)
    s = submitGuess(s, 'a')
    expect(clueLevel(s)).toBe(1)
    s = submitGuess(s, 'b')
    expect(clueLevel(s)).toBe(2)
    s = submitGuess(s, 'c')
    expect(clueLevel(s)).toBe(3)
    s = submitGuess(s, 'd')
    expect(clueLevel(s)).toBe(3)
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/game/engine.test.ts
```

Expected: FAIL, `Cannot find module './engine'`.

- [ ] **Step 3: Implementar `src/game/engine.ts`**

```ts
export const MAX_ATTEMPTS = 4

/** 0 = solo lugares, 1 = + fechas, 2 = + víctimas, 3 = + método */
export type ClueLevel = 0 | 1 | 2 | 3
export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  caseId: string
  guesses: string[]
  status: GameStatus
}

export function createGame(caseId: string): GameState {
  return { caseId, guesses: [], status: 'playing' }
}

export function submitGuess(state: GameState, killerId: string): GameState {
  if (state.status !== 'playing') return state
  if (state.guesses.includes(killerId)) return state
  const guesses = [...state.guesses, killerId]
  if (killerId === state.caseId) return { ...state, guesses, status: 'won' }
  if (guesses.length >= MAX_ATTEMPTS) return { ...state, guesses, status: 'lost' }
  return { ...state, guesses, status: 'playing' }
}

export function clueLevel(state: GameState): ClueLevel {
  const failures = state.status === 'won' ? state.guesses.length - 1 : state.guesses.length
  return Math.min(failures, 3) as ClueLevel
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

```bash
npm test -- src/game/engine.test.ts
```

Expected: `8 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts src/game/engine.test.ts
git commit -m "feat(game): motor de partida con intentos y nivel de pista"
```

---

### Task 7: Calendario del reto diario

**Modelo:** `sonnet`

**Files:**
- Create: `src/game/schedule.ts`, `src/game/schedule.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, expect, it } from 'vitest'
import { caseIdForDay, dayNumber } from './schedule'

describe('dayNumber', () => {
  it('es 0 el día de lanzamiento', () => {
    expect(dayNumber(new Date(2026, 9, 1, 15, 30), '2026-10-01')).toBe(0)
  })
  it('es 0 antes del lanzamiento', () => {
    expect(dayNumber(new Date(2026, 8, 20), '2026-10-01')).toBe(0)
  })
  it('cuenta días completos en hora local', () => {
    expect(dayNumber(new Date(2026, 9, 3, 0, 5), '2026-10-01')).toBe(2)
    expect(dayNumber(new Date(2026, 9, 2, 23, 59), '2026-10-01')).toBe(1)
  })
  it('no se ve afectado por el cambio de hora', () => {
    expect(dayNumber(new Date(2026, 10, 1), '2026-10-01')).toBe(31)
  })
})

describe('caseIdForDay', () => {
  const order = ['a', 'b', 'c']
  it('recorre el orden', () => {
    expect(caseIdForDay(0, order)).toBe('a')
    expect(caseIdForDay(2, order)).toBe('c')
  })
  it('repite ciclo al acabarse', () => {
    expect(caseIdForDay(3, order)).toBe('a')
    expect(caseIdForDay(7, order)).toBe('b')
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/game/schedule.test.ts
```

Expected: FAIL, `Cannot find module './schedule'`.

- [ ] **Step 3: Implementar `src/game/schedule.ts`**

```ts
const MS_PER_DAY = 86_400_000

/** Días completos entre launchDate (YYYY-MM-DD) y la fecha local de `today`, nunca negativo. */
export function dayNumber(today: Date, launchDate: string): number {
  const [y, m, d] = launchDate.split('-').map(Number)
  const launchUtc = Date.UTC(y, m - 1, d)
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.floor((todayUtc - launchUtc) / MS_PER_DAY))
}

export function caseIdForDay(day: number, order: string[]): string {
  return order[day % order.length]
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

```bash
npm test -- src/game/schedule.test.ts
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/game/schedule.ts src/game/schedule.test.ts
git commit -m "feat(game): número de día y caso del día"
```

---

### Task 8: Persistencia del progreso

**Modelo:** `sonnet`

**Files:**
- Create: `src/game/storage.ts`, `src/game/storage.test.ts`

- [ ] **Step 1: Escribir los tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { loadProgress, saveProgress } from './storage'
import type { GameState } from './engine'

const state: GameState = { caseId: 'x', guesses: ['a'], status: 'playing' }

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('devuelve null si no hay nada', () => {
    expect(loadProgress(3)).toBeNull()
  })

  it('guarda y recupera por día', () => {
    saveProgress(3, state)
    expect(loadProgress(3)).toEqual(state)
    expect(loadProgress(4)).toBeNull()
  })

  it('descarta y limpia un valor corrupto', () => {
    localStorage.setItem('geokiller.progress.3', '{not json')
    expect(loadProgress(3)).toBeNull()
    expect(localStorage.getItem('geokiller.progress.3')).toBeNull()
  })

  it('descarta un valor con forma incorrecta', () => {
    localStorage.setItem('geokiller.progress.3', JSON.stringify({ caseId: 'x', status: 'flying' }))
    expect(loadProgress(3)).toBeNull()
  })

  it('no lanza si localStorage falla', () => {
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    } as unknown as Storage
    expect(loadProgress(3, broken)).toBeNull()
    expect(() => saveProgress(3, state, broken)).not.toThrow()
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/game/storage.test.ts
```

Expected: FAIL, `Cannot find module './storage'`.

- [ ] **Step 3: Implementar `src/game/storage.ts`**

```ts
import { z } from 'zod'
import type { GameState } from './engine'

const PREFIX = 'geokiller.progress.'

const progressSchema = z.object({
  caseId: z.string(),
  guesses: z.array(z.string()),
  status: z.enum(['playing', 'won', 'lost']),
})

function key(day: number): string {
  return `${PREFIX}${day}`
}

export function loadProgress(day: number, storage: Storage = localStorage): GameState | null {
  try {
    const raw = storage.getItem(key(day))
    if (raw === null) return null
    const parsed = progressSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
    storage.removeItem(key(day))
    return null
  } catch {
    try { storage.removeItem(key(day)) } catch { /* sin acceso a storage */ }
    return null
  }
}

export function saveProgress(day: number, state: GameState, storage: Storage = localStorage): void {
  try {
    storage.setItem(key(day), JSON.stringify(state))
  } catch {
    /* sin acceso a storage: se juega sin persistencia */
  }
}
```

- [ ] **Step 4: Ejecutar y ver pasar**

```bash
npm test -- src/game/storage.test.ts
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/game/storage.ts src/game/storage.test.ts
git commit -m "feat(game): progreso de la partida en localStorage"
```

---

### Task 9: Cargador de casos

**Modelo:** `haiku`

**Files:**
- Create: `src/data/cases.ts`

- [ ] **Step 1: Implementar `src/data/cases.ts`**

Usa `import.meta.glob` sin `eager` para que cada caso sea un chunk separado y solo se descargue el del día.

```ts
import type { Case } from './schema'

const loaders = import.meta.glob<Case>('./cases/*.json', { import: 'default' })

export async function loadCase(id: string): Promise<Case | null> {
  const loader = loaders[`./cases/${id}.json`]
  if (!loader) return null
  return loader()
}

export function availableCaseIds(): string[] {
  return Object.keys(loaders)
    .map((path) => path.replace('./cases/', '').replace('.json', ''))
    .sort()
}
```

- [ ] **Step 2: Comprobar que compila**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/data/cases.ts
git commit -m "feat(data): carga perezosa de casos por id"
```

---

### Task 10: Scripts auxiliares del pipeline

**Modelo:** `sonnet`

**Files:**
- Create: `pipeline/fetch-wiki.sh`, `pipeline/geocode.sh`, `pipeline/distance.sh`, `pipeline/promote.ts`, `pipeline/candidates/.gitkeep`, `pipeline/verdicts/.gitkeep`, `pipeline/rejected/.gitkeep`

- [ ] **Step 1: Crear `pipeline/fetch-wiki.sh`**

Descarga el texto plano de un artículo mediante la API de MediaWiki y lo guarda en `pipeline/sources/<slug>.<lang>.txt`. Falla con código 2 si la página no existe.

```bash
#!/usr/bin/env bash
# Uso: pipeline/fetch-wiki.sh <lang> <título_de_wikipedia> <slug>
set -euo pipefail
lang="$1"; title="$2"; slug="$3"
out="pipeline/sources/${slug}.${lang}.txt"
mkdir -p pipeline/sources
curl -sS -G "https://${lang}.wikipedia.org/w/api.php" \
  --data-urlencode "action=query" \
  --data-urlencode "prop=extracts" \
  --data-urlencode "explaintext=1" \
  --data-urlencode "redirects=1" \
  --data-urlencode "format=json" \
  --data-urlencode "formatversion=2" \
  --data-urlencode "titles=${title}" \
  -H "User-Agent: geo-killer-pipeline/0.1 (desarrollo local)" \
| node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const page = JSON.parse(s).query.pages[0];
    if (page.missing || !page.extract) { console.error("MISSING: " + page.title); process.exit(2); }
    process.stdout.write(page.extract);
  });' > "$out"
echo "$out ($(wc -c < "$out") bytes)"
```

- [ ] **Step 2: Crear `pipeline/geocode.sh`**

```bash
#!/usr/bin/env bash
# Uso: pipeline/geocode.sh "<ciudad>, <país>"  -> imprime "lat lng nombre"
set -euo pipefail
sleep 1  # política de uso de Nominatim: máximo 1 petición por segundo
curl -sS -G "https://nominatim.openstreetmap.org/search" \
  --data-urlencode "q=$1" \
  --data-urlencode "format=json" \
  --data-urlencode "limit=1" \
  -H "User-Agent: geo-killer-pipeline/0.1 (desarrollo local)" \
| node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const r = JSON.parse(s)[0];
    if (!r) { console.error("NOT FOUND"); process.exit(2); }
    console.log(`${Number(r.lat).toFixed(4)} ${Number(r.lon).toFixed(4)} ${r.display_name}`);
  });'
```

- [ ] **Step 3: Crear `pipeline/distance.sh`**

```bash
#!/usr/bin/env bash
# Uso: pipeline/distance.sh lat1 lng1 lat2 lng2  -> km
set -euo pipefail
node -e '
  const [a, b, c, d] = process.argv.slice(1).map(Number);
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  console.log((2 * 6371 * Math.asin(Math.sqrt(h))).toFixed(1));' "$@"
```

- [ ] **Step 4: Crear `pipeline/promote.ts`**

Toma el candidato y su veredicto, elimina los asesinatos marcados `ok: false`, añade el bloque `validation` y escribe en `src/data/cases/`. Falla si el veredicto no es `approved` o si quedan menos de 3 asesinatos.

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { caseSchema } from '../src/data/schema.ts'

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote.ts <id>')
  process.exit(1)
}

const candidate = JSON.parse(readFileSync(`pipeline/candidates/${id}.json`, 'utf8'))
const verdict = JSON.parse(readFileSync(`pipeline/verdicts/${id}.json`, 'utf8'))

if (verdict.verdict !== 'approved') {
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve`)
  process.exit(1)
}

const okIndexes = new Set(
  (verdict.murderVerdicts as { index: number; ok: boolean }[]).filter((m) => m.ok).map((m) => m.index),
)
const murders = (candidate.murders as unknown[]).filter((_, i) => okIndexes.has(i))

const promoted = {
  ...candidate,
  murders,
  validation: {
    status: 'approved',
    validatedAt: new Date().toISOString().slice(0, 10),
    validator: verdict.validator ?? 'claude-sonnet-5',
    notes: verdict.notes ?? '',
  },
}

const parsed = caseSchema.safeParse(promoted)
if (!parsed.success) {
  console.error(`El caso promovido no cumple el esquema:\n${parsed.error.message}`)
  process.exit(1)
}

writeFileSync(`src/data/cases/${id}.json`, JSON.stringify(parsed.data, null, 2) + '\n')
console.log(`Promovido src/data/cases/${id}.json con ${murders.length} asesinatos`)
```

- [ ] **Step 5: Dar permisos y probar los scripts de red con un artículo conocido**

```bash
chmod +x pipeline/*.sh
mkdir -p pipeline/candidates pipeline/verdicts pipeline/rejected
touch pipeline/candidates/.gitkeep pipeline/verdicts/.gitkeep pipeline/rejected/.gitkeep
pipeline/fetch-wiki.sh es Jack_el_Destripador jack-el-destripador
grep -c "Whitechapel" pipeline/sources/jack-el-destripador.es.txt
pipeline/geocode.sh "Whitechapel, Londres"
pipeline/distance.sh 51.5170 -0.0620 51.5074 -0.1278
```

Expected: el fetch imprime la ruta y un tamaño mayor de 20000 bytes; el grep imprime un número mayor que 0; geocode imprime coordenadas cercanas a `51.51 -0.06`; distance imprime aproximadamente `4.7`.

- [ ] **Step 6: Comprobar que un título inexistente falla**

```bash
pipeline/fetch-wiki.sh es Pagina_Que_No_Existe_XYZ prueba; echo "exit=$?"
rm -f pipeline/sources/prueba.es.txt
```

Expected: `MISSING: ...` y `exit=2`.

- [ ] **Step 7: Commit**

```bash
git add pipeline
git commit -m "feat(pipeline): scripts de descarga de Wikipedia, geocodificación, distancia y promoción"
```

---

### Task 11: Subagente generador de casos

**Modelo:** `sonnet` (crea el fichero; el agente en sí corre con Haiku)

**Files:**
- Create: `.claude/agents/case-generator.md`

- [ ] **Step 1: Crear `.claude/agents/case-generator.md`**

````markdown
---
name: case-generator
description: Genera el candidato JSON de un caso de Geo Killer a partir del texto plano de Wikipedia. Solo para el pipeline de contenido, nunca para código.
tools: Bash, Read, Write, Grep
disallowedTools: Edit, WebFetch, WebSearch
model: haiku
maxTurns: 30
---

Eres el generador de casos del juego Geo Killer. Tu única fuente de verdad es el texto de Wikipedia que descargas con los scripts del proyecto. No usas tu memoria para ningún dato factual.

## Entrada

El mensaje que recibes contiene: `id`, `name`, `wiki.es` y `wiki.en` (títulos de artículo, alguno puede ser `null`) y, opcionalmente, un informe de errores de un intento anterior bajo `## Errores del intento anterior`.

## Procedimiento

1. Descarga las fuentes. Para cada idioma con título no nulo:
   `bash pipeline/fetch-wiki.sh <lang> "<título>" <id>`
   Si un script devuelve `MISSING`, responde `REJECTED <id> página no encontrada en <lang>` y termina.
2. Lee completos los ficheros `pipeline/sources/<id>.es.txt` y `pipeline/sources/<id>.en.txt` que existan.
3. Comprueba que el caso está cerrado: la fuente debe afirmar que la persona fue condenada, confesó, murió identificada como autor, o fue identificada oficialmente. Si el artículo dice que el autor no fue identificado, responde `REJECTED <id> caso abierto` y termina.
4. Construye el JSON con las reglas de abajo.
5. Escribe el resultado en `pipeline/candidates/<id>.json` (JSON con dos espacios de indentación).
6. Responde con una única línea: `CANDIDATE <id> murders=<número>`.

Si recibes un informe de errores, corrige exactamente los puntos señalados y elimina los asesinatos que no puedas respaldar con la fuente.

## Esquema del candidato

```json
{
  "id": "slug-en-minusculas",
  "name": "Nombre canónico",
  "aliases": ["Apodo en español", "Apodo original"],
  "country": "País en español",
  "activeYears": "1976-1977",
  "wikipedia": {
    "es": "https://es.wikipedia.org/wiki/T%C3%ADtulo o null",
    "en": "https://en.wikipedia.org/wiki/Title o null"
  },
  "summary": "Dos o tres frases documentales en español.",
  "murders": [
    {
      "city": "Ciudad en español",
      "region": "Barrio o región tal como aparece en la fuente, o null",
      "country": "País en español",
      "lat": 40.8448,
      "lng": -73.8648,
      "date": "1976-07-29",
      "datePrecision": "day",
      "victim": "Nombre de la víctima o \"Víctima no identificada\"",
      "method": "Una frase documental sin detalle gráfico.",
      "sourceQuote": "fragmento literal y contiguo del texto descargado",
      "sourceLang": "es"
    }
  ]
}
```

`date` admite `"1976"`, `"1976-07"` o `"1976-07-29"` y `datePrecision` debe ser `"year"`, `"month"` o `"day"` en consecuencia; si la fuente no da fecha, ambos son `null`.

## Reglas antialucinación (obligatorias)

1. Solo incluyes asesinatos que aparezcan en el texto descargado. Si recuerdas un asesinato pero no está en el texto, no existe para ti.
2. Si un dato no está en la fuente, escribes `null` (fecha, región) o `"Víctima no identificada"` (víctima). Nunca completas, estimas ni redondeas.
3. `lat` y `lng` son las coordenadas del centro de la ciudad o barrio nombrado en la fuente, nunca de una dirección. Si no conoces con seguridad las coordenadas de esa ciudad, ejecuta `bash pipeline/geocode.sh "<ciudad>, <país>"` y usa su resultado.
4. `date` lleva solo la precisión que da la fuente. Si el texto dice "en el verano de 1977", la fecha es `"1977"` con precisión `"year"`.
5. `sourceQuote` es un fragmento de entre 10 y 40 palabras copiado carácter por carácter del fichero de `sourceLang`, dentro de un mismo párrafo, que mencione a la víctima o el hecho. Antes de escribir el JSON, comprueba cada cita con `grep -F -c -- "<cita>" pipeline/sources/<id>.<lang>.txt`; si devuelve 0, corrige la cita o elimina el asesinato.
6. Entre 3 y 8 asesinatos. Si hay más de 8 documentados, elige los 8 con fecha y lugar más claros.
7. Si el caso no está cerrado, `REJECTED`.
8. `method` es una frase, tono de expediente policial, sin descripciones explícitas de heridas ni sufrimiento.
9. Ciudades, países y textos en español. Los nombres propios de víctimas se dejan como en la fuente.
10. Los alias incluyen el apodo en español si el artículo en español lo da y el apodo original si el artículo en inglés lo da. Sin inventar traducciones.

No expliques tu trabajo. No escribas nada fuera de `pipeline/candidates/`. No modifiques ningún otro fichero.
````

- [ ] **Step 2: Comprobar que Claude Code lo reconoce**

Ejecutar en la sesión principal: `/agents` y comprobar que aparece `case-generator` con modelo haiku. Alternativa sin UI: comprobar que el frontmatter parsea con

```bash
head -8 .claude/agents/case-generator.md
```

Expected: las líneas `name: case-generator`, `model: haiku`.

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/case-generator.md
git commit -m "feat(pipeline): subagente case-generator (Haiku)"
```

---

### Task 12: Subagente validador de casos

**Modelo:** `sonnet`

**Files:**
- Create: `.claude/agents/case-validator.md`

- [ ] **Step 1: Crear `.claude/agents/case-validator.md`**

````markdown
---
name: case-validator
description: Valida un candidato de caso de Geo Killer contra el texto plano de Wikipedia y escribe un veredicto JSON campo a campo. Solo para el pipeline de contenido.
tools: Bash, Read, Write, Grep
disallowedTools: Edit, WebFetch, WebSearch
model: sonnet
maxTurns: 40
---

Eres el validador de casos del juego Geo Killer. Tu trabajo es rechazar todo dato que no puedas verificar en el texto de Wikipedia. No corriges datos, solo informas. Un caso con datos inventados es peor que ningún caso.

## Entrada

El mensaje contiene el `id` del candidato. El candidato está en `pipeline/candidates/<id>.json`. Los textos fuente están en `pipeline/sources/<id>.es.txt` y `pipeline/sources/<id>.en.txt`; si falta alguno que el candidato referencia en `wikipedia`, descárgalo con `bash pipeline/fetch-wiki.sh <lang> "<título>" <id>` (el título es el último segmento de la URL, decodificado).

## Procedimiento

1. Lee el candidato y los ficheros fuente completos.
2. Comprobaciones del caso:
   - El artículo confirma que la persona fue condenada, confesó, murió identificada como autor o fue identificada oficialmente. Si no, error de caso `caso abierto`.
   - `name` aparece en la fuente. Cada alias aparece en alguna de las fuentes (búsqueda sin distinguir mayúsculas). Un alias que no aparece es error de caso.
   - `summary` no afirma nada que contradiga la fuente.
3. Para cada elemento de `murders`, en orden, con su `index`:
   - **Cita literal**: `grep -F -c -- "<sourceQuote>" pipeline/sources/<id>.<sourceLang>.txt` debe devolver un número mayor que 0. Si devuelve 0, `ok: false` con error `cita no literal`.
   - **Víctima**: si no es `"Víctima no identificada"`, el nombre (o su apellido) debe aparecer en la fuente. Si no, `ok: false`.
   - **Fecha**: el año debe aparecer en la fuente asociado a ese hecho (en el mismo párrafo de la cita o en una tabla/lista de víctimas). Si `datePrecision` es `day` o `month`, el día o mes deben estar en la fuente. Si la fuente solo da el año y el candidato da día, `ok: false` con error `precisión de fecha no respaldada`.
   - **Ciudad**: `city` (o su nombre en el idioma de la fuente) debe aparecer en la fuente en relación con ese hecho.
   - **Coordenadas**: decide las coordenadas del centro de `city` con tu conocimiento; si tienes dudas, ejecuta `bash pipeline/geocode.sh "<city>, <country>"`. Calcula `bash pipeline/distance.sh <lat> <lng> <latRef> <lngRef>`. Si supera 30 km, `ok: false` con error `coordenadas a X km de la ciudad`.
   - **Método**: no contradice la fuente y no contiene descripciones gráficas. Si contiene detalle explícito, `ok: false` con error `método gráfico`.
4. Cuenta los asesinatos con `ok: true`. Si son menos de 3, el veredicto es `rejected` con error de caso `menos de 3 asesinatos verificados`. Si hay algún error de caso, `rejected`. En otro caso, `approved`.
5. Escribe `pipeline/verdicts/<id>.json` con exactamente esta forma:

```json
{
  "id": "<id>",
  "verdict": "approved",
  "validator": "claude-sonnet-5",
  "caseErrors": [],
  "murderVerdicts": [
    { "index": 0, "ok": true, "errors": [] },
    { "index": 1, "ok": false, "errors": ["cita no literal"] }
  ],
  "notes": "observaciones breves para revisión humana"
}
```

6. Responde con una única línea: `VERDICT <id> <approved|rejected> ok=<n>/<total>` seguida, si es `rejected`, de los errores separados por `;`.

## Reglas

- Nunca modifiques `pipeline/candidates/` ni `src/`. Solo escribes en `pipeline/verdicts/`.
- No des por bueno un dato porque "lo sabes". Si no está en el texto, no está verificado.
- Si una comprobación te obliga a interpretar (por ejemplo, la fuente dice "a finales de julio" y el candidato pone `"1976-07"`), acepta solo si la precisión del candidato no supera la de la fuente.
- Los textos en español e inglés pueden discrepar; si discrepan en un dato, marca `ok: false` y explícalo en `errors`.
````

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/case-validator.md
git commit -m "feat(pipeline): subagente case-validator (Sonnet)"
```

---

### Task 13: Revisión adversarial de los prompts de los agentes

**Modelo:** `opus`

**Files:**
- Modify: `.claude/agents/case-generator.md`, `.claude/agents/case-validator.md`

- [ ] **Step 1: Leer ambos agentes, el spec (sección 5) y los scripts de `pipeline/`**

- [ ] **Step 2: Buscar huecos por los que un dato inventado pasaría la validación**

Preguntas mínimas a responder por escrito antes de tocar nada:
- ¿Puede una `sourceQuote` literal respaldar un asesinato cuyo `victim`, `date` o `city` no aparecen en el mismo contexto? ¿Exige el validador proximidad entre cita y datos?
- ¿Qué pasa si el generador copia una cita del texto en inglés pero pone `sourceLang: "es"`?
- ¿Qué pasa con nombres de ciudad traducidos (Nueva York / New York, Londres / London) en el grep del validador?
- ¿Puede el generador "inflar" a 3 asesinatos con entradas duplicadas de la misma víctima?
- ¿Detecta el validador un `method` inventado pero verosímil?
- ¿Detecta el validador coordenadas de una ciudad homónima en otro país?

- [ ] **Step 3: Endurecer los prompts**

Añadir a cada agente las reglas o comprobaciones que cierren los huecos encontrados. Como mínimo, el validador debe comprobar que no hay dos asesinatos con la misma víctima nombrada y que `sourceLang` coincide con el fichero donde la cita existe. Mantener el formato de veredicto sin cambios para no romper `promote.ts`.

- [ ] **Step 4: Ejecutar una prueba real con un caso**

Desde la sesión principal, despachar `case-generator` (Agent tool, `subagent_type: "case-generator"`) con:

```
id: jack-el-destripador
name: Jack el Destripador
wiki.es: Jack_el_Destripador
wiki.en: Jack_the_Ripper
```

Expected: `REJECTED jack-el-destripador caso abierto` (el autor nunca fue identificado). Es la prueba de que la regla de caso cerrado funciona. Borrar `pipeline/sources/jack-el-destripador.*` si quedaron.

- [ ] **Step 5: Commit**

```bash
git add .claude/agents
git commit -m "feat(pipeline): endurecer reglas antialucinación tras revisión adversarial"
```

---

### Task 14: Lista de autocompletado `killers.json`

**Modelo:** `haiku` (generación); si el script de comprobación deja fallos que Haiku no resuelve en dos pasadas, terminar con `sonnet`.

**Files:**
- Create: `pipeline/check-killers.ts`
- Modify: `src/data/killers.json`

- [ ] **Step 1: Escribir `pipeline/check-killers.ts`**

Comprueba, para cada entrada, que el artículo de Wikipedia existe (en español o inglés según `wiki`) y que cada alias aparece en alguno de los textos. Es una comprobación determinista, sin modelo.

```ts
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

interface Entry { id: string; name: string; aliases: string[]; wiki: { es: string | null; en: string | null } }

const entries: Entry[] = JSON.parse(readFileSync('pipeline/killers-source.json', 'utf8'))
const failures: string[] = []

function fetchText(lang: 'es' | 'en', title: string, id: string): string | null {
  const path = `pipeline/sources/${id}.${lang}.txt`
  if (!existsSync(path)) {
    try {
      execFileSync('bash', ['pipeline/fetch-wiki.sh', lang, title, id], { stdio: 'pipe' })
    } catch {
      return null
    }
  }
  return readFileSync(path, 'utf8').toLowerCase()
}

for (const e of entries) {
  const texts = (['es', 'en'] as const)
    .filter((lang) => e.wiki[lang])
    .map((lang) => fetchText(lang, e.wiki[lang]!, e.id))
    .filter((t): t is string => t !== null)
  if (texts.length === 0) {
    failures.push(`${e.id}: ningún artículo de Wikipedia encontrado`)
    continue
  }
  if (!texts.some((t) => t.includes(e.name.toLowerCase()))) {
    failures.push(`${e.id}: el nombre "${e.name}" no aparece en el artículo`)
  }
  for (const alias of e.aliases) {
    if (!texts.some((t) => t.includes(alias.toLowerCase()))) {
      failures.push(`${e.id}: el alias "${alias}" no aparece en ningún artículo`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  console.error(`\n${failures.length} fallo(s)`)
  process.exit(1)
}
console.log(`OK: ${entries.length} entradas verificadas`)
```

- [ ] **Step 2: Generar `pipeline/killers-source.json`**

Escribir a mano (el modelo ejecutor lo redacta) una lista de 50 asesinos seriales muy conocidos, ya condenados, fallecidos o identificados oficialmente, de varios países (incluir al menos 10 de España o Latinoamérica). Cada entrada:

```json
{ "id": "david-berkowitz", "name": "David Berkowitz", "aliases": ["El hijo de Sam", "Son of Sam"], "wiki": { "es": "David_Berkowitz", "en": "David_Berkowitz" } }
```

Reglas: `id` es el nombre en minúsculas con guiones y sin acentos; `aliases` solo si el apodo es conocido, puede ser lista vacía; los títulos de `wiki` son los de la URL del artículo, con guiones bajos. Incluir obligatoriamente los ocho ids de la lista semilla de la Task 15.

- [ ] **Step 3: Ejecutar la comprobación y corregir hasta que pase**

```bash
node pipeline/check-killers.ts
```

Expected al final: `OK: 50 entradas verificadas`. Cada fallo se resuelve corrigiendo el título, quitando el alias no respaldado o quitando la entrada.

- [ ] **Step 4: Generar `src/data/killers.json` sin el campo `wiki`**

```bash
node -e '
  const src = JSON.parse(require("fs").readFileSync("pipeline/killers-source.json", "utf8"));
  const out = src.map(({ id, name, aliases }) => ({ id, name, aliases }));
  require("fs").writeFileSync("src/data/killers.json", JSON.stringify(out, null, 2) + "\n");'
```

- [ ] **Step 5: Commit**

```bash
git add pipeline/check-killers.ts pipeline/killers-source.json src/data/killers.json
git commit -m "feat(data): lista de autocompletado con 50 asesinos verificados"
```

---

### Task 15: Generar los 8 casos del prototipo

**Modelo:** orquestación desde la sesión principal. Generador: `case-generator` (Haiku). Validador: `case-validator` (Sonnet).

**Files:**
- Create: `pipeline/seed-cases.json`, `src/data/cases/*.json`, `pipeline/candidates/*.json`, `pipeline/verdicts/*.json`
- Modify: `src/data/schedule.json`

- [ ] **Step 1: Crear `pipeline/seed-cases.json`**

```json
[
  { "id": "david-berkowitz", "name": "David Berkowitz", "wiki": { "es": "David_Berkowitz", "en": "David_Berkowitz" } },
  { "id": "ted-bundy", "name": "Ted Bundy", "wiki": { "es": "Ted_Bundy", "en": "Ted_Bundy" } },
  { "id": "jeffrey-dahmer", "name": "Jeffrey Dahmer", "wiki": { "es": "Jeffrey_Dahmer", "en": "Jeffrey_Dahmer" } },
  { "id": "andrei-chikatilo", "name": "Andréi Chikatilo", "wiki": { "es": "Andréi_Chikatilo", "en": "Andrei_Chikatilo" } },
  { "id": "gary-ridgway", "name": "Gary Ridgway", "wiki": { "es": "Gary_Ridgway", "en": "Gary_Ridgway" } },
  { "id": "manuel-delgado-villegas", "name": "Manuel Delgado Villegas", "wiki": { "es": "Manuel_Delgado_Villegas", "en": "Manuel_Delgado_Villegas" } },
  { "id": "pedro-alonso-lopez", "name": "Pedro Alonso López", "wiki": { "es": "Pedro_Alonso_López", "en": "Pedro_López_(serial_killer)" } },
  { "id": "harold-shipman", "name": "Harold Shipman", "wiki": { "es": "Harold_Shipman", "en": "Harold_Shipman" } }
]
```

Si algún título no existe (el fetch devuelve `MISSING`), buscar el título correcto en Wikipedia y corregirlo antes de continuar.

- [ ] **Step 2: Ejecutar el ciclo por cada entrada, en orden**

Para cada entrada de la semilla, desde la sesión principal:

1. Agent tool con `subagent_type: "case-generator"` y el prompt:
   ```
   id: <id>
   name: <name>
   wiki.es: <wiki.es>
   wiki.en: <wiki.en>
   ```
2. Si responde `REJECTED`, mover a `pipeline/rejected/<id>.json` con `{ "id": "<id>", "reason": "<motivo>" }` y pasar al siguiente.
3. Agent tool con `subagent_type: "case-validator"` y el prompt `id: <id>`.
4. Si `VERDICT ... rejected`: volver a despachar `case-generator` con el mismo prompt más `## Errores del intento anterior` y el contenido de `pipeline/verdicts/<id>.json`. Máximo 2 reintentos. Si sigue rechazado, copiar el último veredicto a `pipeline/rejected/<id>.json` y pasar al siguiente.
5. Si `approved`: `node pipeline/promote.ts <id>`.

- [ ] **Step 3: Revisión humana rápida**

Imprimir una tabla con id, veredicto, número de asesinatos promovidos y `notes` de cada veredicto. Abrir dos casos promovidos al azar y leer sus `murders` contrastando dos citas con el texto fuente.

- [ ] **Step 4: Rellenar `schedule.json`**

`order` con los ids promovidos, en el orden de la semilla. `launchDate` se mantiene en `2026-10-01`.

- [ ] **Step 5: Validar**

```bash
npm run validate:data
```

Expected: `OK: N casos, 50 killers, N días programados` con N ≥ 5. Si N < 5, añadir entradas a la semilla (también a `killers-source.json` y `killers.json`) y repetir el ciclo hasta llegar a 5-10.

- [ ] **Step 6: Commit**

```bash
git add pipeline src/data
git commit -m "feat(data): primeros casos verificados y calendario del prototipo"
```

---

### Task 16: Componentes AttemptsBar y ClueList

**Modelo:** `sonnet`

**Files:**
- Create: `src/components/AttemptsBar.tsx`, `src/components/ClueList.tsx`, `src/components/ClueList.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir el test de ClueList**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClueList } from './ClueList'
import { sampleCase } from '../game/__fixtures__/sample-case'

describe('ClueList', () => {
  it('a nivel 0 solo numera los lugares', () => {
    render(<ClueList murders={sampleCase.murders} level={0} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText(/1980/)).toBeNull()
    expect(screen.queryByText(/Víctima Uno/)).toBeNull()
  })

  it('a nivel 1 muestra fechas con su precisión', () => {
    render(<ClueList murders={sampleCase.murders} level={1} />)
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
    expect(screen.getByText('06/1981')).toBeInTheDocument()
    expect(screen.getByText('1983')).toBeInTheDocument()
  })

  it('a nivel 2 muestra víctimas', () => {
    render(<ClueList murders={sampleCase.murders} level={2} />)
    expect(screen.getByText('Víctima Uno')).toBeInTheDocument()
    expect(screen.getByText('Víctima no identificada')).toBeInTheDocument()
  })

  it('a nivel 3 muestra el método', () => {
    render(<ClueList murders={sampleCase.murders} level={3} />)
    expect(screen.getByText('Método uno.')).toBeInTheDocument()
  })

  it('muestra "fecha desconocida" si date es null', () => {
    const m = { ...sampleCase.murders[0], date: null, datePrecision: null }
    render(<ClueList murders={[m]} level={1} />)
    expect(screen.getByText('Fecha desconocida')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/components/ClueList.test.tsx
```

Expected: FAIL, `Cannot find module './ClueList'`.

- [ ] **Step 3: Implementar `src/components/ClueList.tsx`**

```tsx
import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'

export function formatDate(m: Pick<Murder, 'date' | 'datePrecision'>): string {
  if (m.date === null || m.datePrecision === null) return 'Fecha desconocida'
  const [y, mo, d] = m.date.split('-')
  if (m.datePrecision === 'year') return y
  if (m.datePrecision === 'month') return `${mo}/${y}`
  return `${d}/${mo}/${y}`
}

interface Props {
  murders: Murder[]
  level: ClueLevel
}

export function ClueList({ murders, level }: Props) {
  return (
    <ol className="clue-list">
      {murders.map((m, i) => (
        <li key={i} className="clue-item">
          <span className="clue-index">{i + 1}</span>
          <div className="clue-body">
            {level >= 1 ? <div className="clue-date">{formatDate(m)}</div> : null}
            {level >= 2 ? <div className="clue-victim">{m.victim}</div> : null}
            {level >= 3 ? <div className="clue-method">{m.method}</div> : null}
            {level === 0 ? <div className="clue-muted">Lugar sin identificar</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 4: Implementar `src/components/AttemptsBar.tsx`**

```tsx
import { MAX_ATTEMPTS } from '../game/engine'

interface Props {
  guesses: string[]
  status: 'playing' | 'won' | 'lost'
}

export function AttemptsBar({ guesses, status }: Props) {
  const cells = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i >= guesses.length) return 'empty'
    const isLast = i === guesses.length - 1
    return status === 'won' && isLast ? 'hit' : 'miss'
  })
  return (
    <div className="attempts" aria-label={`${guesses.length} de ${MAX_ATTEMPTS} intentos`}>
      {cells.map((c, i) => (
        <span key={i} className={`attempt attempt-${c}`} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Añadir estilos a `src/styles.css`**

```css
.attempts { display: flex; gap: 8px; }
.attempt { width: 28px; height: 28px; border: 1px solid var(--line); background: var(--panel); }
.attempt-miss { background: var(--danger); }
.attempt-hit { background: var(--ok); }

.clue-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.clue-item { display: flex; gap: 12px; padding: 10px; background: var(--panel); border: 1px solid var(--line); }
.clue-index { width: 24px; height: 24px; display: grid; place-items: center; background: var(--accent); color: #000; font-weight: bold; flex: none; }
.clue-body { display: grid; gap: 2px; font-size: 0.9rem; }
.clue-date { color: var(--accent); }
.clue-victim { font-weight: bold; }
.clue-method, .clue-muted { color: var(--muted); }
```

- [ ] **Step 6: Ejecutar y ver pasar**

```bash
npm test -- src/components/ClueList.test.tsx
```

Expected: `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/components/AttemptsBar.tsx src/components/ClueList.tsx src/components/ClueList.test.tsx src/styles.css
git commit -m "feat(ui): barra de intentos y lista de pistas"
```

---

### Task 17: Buscador con autocompletado

**Modelo:** `sonnet`

**Files:**
- Create: `src/components/GuessInput.tsx`, `src/components/GuessInput.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuessInput } from './GuessInput'

const killers = [
  { id: 'david-berkowitz', name: 'David Berkowitz', aliases: ['El hijo de Sam'] },
  { id: 'ted-bundy', name: 'Ted Bundy', aliases: [] },
]

describe('GuessInput', () => {
  it('muestra sugerencias al escribir', () => {
    render(<GuessInput killers={killers} disabled={false} onGuess={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sam' } })
    expect(screen.getByRole('option', { name: /David Berkowitz/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Ted Bundy/ })).toBeNull()
  })

  it('al pulsar una sugerencia envía el id y limpia', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'bundy' } })
    fireEvent.click(screen.getByRole('option', { name: /Ted Bundy/ }))
    expect(onGuess).toHaveBeenCalledWith('ted-bundy')
    expect(input).toHaveValue('')
  })

  it('con Enter envía si el texto coincide exactamente con nombre o alias', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'el hijo de sám' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).toHaveBeenCalledWith('david-berkowitz')
  })

  it('con Enter y texto parcial envía la primera sugerencia', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'bund' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).toHaveBeenCalledWith('ted-bundy')
  })

  it('con Enter y sin coincidencias no envía nada', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).not.toHaveBeenCalled()
  })

  it('se deshabilita', () => {
    render(<GuessInput killers={killers} disabled={true} onGuess={() => {}} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/components/GuessInput.test.tsx
```

Expected: FAIL, `Cannot find module './GuessInput'`.

- [ ] **Step 3: Implementar `src/components/GuessInput.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import type { KillerEntry } from '../data/schema'
import { matchesKiller, searchKillers } from '../game/matching'

interface Props {
  killers: KillerEntry[]
  disabled: boolean
  onGuess: (killerId: string) => void
}

export function GuessInput({ killers, disabled, onGuess }: Props) {
  const [text, setText] = useState('')
  const suggestions = searchKillers(text, killers)

  function choose(id: string) {
    onGuess(id)
    setText('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const exact = killers.find((k) => matchesKiller(text, k))
    const chosen = exact ?? suggestions[0]
    if (chosen) choose(chosen.id)
  }

  return (
    <form className="guess" onSubmit={handleSubmit} autoComplete="off">
      <input
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls="guess-options"
        aria-autocomplete="list"
        className="guess-input"
        placeholder="¿Quién es el asesino?"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      {suggestions.length > 0 ? (
        <ul id="guess-options" role="listbox" className="guess-options">
          {suggestions.map((k) => (
            <li key={k.id} role="option" aria-selected={false} className="guess-option" onClick={() => choose(k.id)}>
              <span>{k.name}</span>
              {k.aliases.length > 0 ? <span className="guess-alias">{k.aliases.join(' · ')}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
```

- [ ] **Step 4: Añadir estilos a `src/styles.css`**

```css
.guess { position: relative; }
.guess-input { width: 100%; box-sizing: border-box; padding: 12px; font: inherit; font-size: 1rem; background: var(--panel); color: var(--text); border: 1px solid var(--accent); }
.guess-input:disabled { opacity: 0.5; }
.guess-options { position: absolute; left: 0; right: 0; top: 100%; z-index: 1000; margin: 0; padding: 0; list-style: none; background: var(--panel); border: 1px solid var(--line); max-height: 260px; overflow-y: auto; }
.guess-option { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; cursor: pointer; }
.guess-option:hover { background: var(--line); }
.guess-alias { color: var(--muted); font-size: 0.85rem; }
```

- [ ] **Step 5: Ejecutar y ver pasar**

```bash
npm test -- src/components/GuessInput.test.tsx
```

Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/GuessInput.tsx src/components/GuessInput.test.tsx src/styles.css
git commit -m "feat(ui): buscador con autocompletado por nombre y alias"
```

---

### Task 18: Mapa del caso

**Modelo:** `sonnet`

**Files:**
- Create: `src/components/CaseMap.tsx`, `src/components/mapBounds.ts`, `src/components/mapBounds.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir el test del cálculo de encuadre**

```ts
import { describe, expect, it } from 'vitest'
import { boundsFor } from './mapBounds'

describe('boundsFor', () => {
  it('devuelve el rectángulo que contiene todos los puntos', () => {
    const b = boundsFor([
      { lat: 40, lng: -3 },
      { lat: 42, lng: -1 },
      { lat: 41, lng: -2 },
    ])
    expect(b).toEqual([[40, -3], [42, -1]])
  })

  it('con un solo punto devuelve un rectángulo degenerado', () => {
    expect(boundsFor([{ lat: 40, lng: -3 }])).toEqual([[40, -3], [40, -3]])
  })
})
```

- [ ] **Step 2: Ejecutar y ver fallar**

```bash
npm test -- src/components/mapBounds.test.ts
```

Expected: FAIL, `Cannot find module './mapBounds'`.

- [ ] **Step 3: Implementar `src/components/mapBounds.ts`**

```ts
export type LatLng = { lat: number; lng: number }
export type Bounds = [[number, number], [number, number]]

export function boundsFor(points: LatLng[]): Bounds {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [[minLat, minLng], [maxLat, maxLng]]
}
```

- [ ] **Step 4: Implementar `src/components/CaseMap.tsx`**

```tsx
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'
import { boundsFor } from './mapBounds'
import { formatDate } from './ClueList'

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function FitBounds({ murders }: { murders: Murder[] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(boundsFor(murders), { padding: [40, 40], maxZoom: 11 })
  }, [map, murders])
  return null
}

interface Props {
  murders: Murder[]
  level: ClueLevel
}

export function CaseMap({ murders, level }: Props) {
  return (
    <MapContainer className="case-map" center={[20, 0]} zoom={2} scrollWheelZoom={true}>
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <FitBounds murders={murders} />
      {murders.map((m, i) => (
        <CircleMarker
          key={i}
          center={[m.lat, m.lng]}
          radius={9}
          pathOptions={{ color: '#d9a441', fillColor: '#b3382c', fillOpacity: 0.85, weight: 2 }}
        >
          <Tooltip permanent={true} direction="top" offset={[0, -8]} className="marker-tip">
            <strong>{i + 1}</strong>
            {level >= 1 ? <span> · {formatDate(m)}</span> : null}
            {level >= 2 ? <span> · {m.victim}</span> : null}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
```

- [ ] **Step 5: Añadir estilos a `src/styles.css`**

```css
.case-map { width: 100%; height: 420px; border: 1px solid var(--line); background: #000; }
.marker-tip { background: var(--panel) !important; color: var(--text) !important; border: 1px solid var(--accent) !important; font-family: inherit; }
.marker-tip::before { display: none; }
```

- [ ] **Step 6: Ejecutar tests y comprobar tipos**

```bash
npm test -- src/components/mapBounds.test.ts
npx tsc -p tsconfig.app.json --noEmit
```

Expected: `2 passed` y sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add src/components/CaseMap.tsx src/components/mapBounds.ts src/components/mapBounds.test.ts src/styles.css
git commit -m "feat(ui): mapa Leaflet con marcadores y encuadre automático"
```

---

### Task 19: Tarjeta de resultado, página del día y App

**Modelo:** `sonnet`

**Files:**
- Create: `src/components/ResultCard.tsx`, `src/pages/TodayPage.tsx`, `src/pages/TodayPage.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

- [ ] **Step 1: Implementar `src/components/ResultCard.tsx`**

```tsx
import type { Case } from '../data/schema'

interface Props {
  caseData: Case
  status: 'won' | 'lost'
  attempts: number
}

export function ResultCard({ caseData, status, attempts }: Props) {
  const url = caseData.wikipedia.es ?? caseData.wikipedia.en
  return (
    <section className="result" aria-live="polite">
      <h2>{status === 'won' ? `Caso resuelto en ${attempts} intento${attempts === 1 ? '' : 's'}` : 'Caso sin resolver'}</h2>
      <p className="result-name">
        {caseData.name}
        {caseData.aliases.length > 0 ? <span className="result-alias"> · {caseData.aliases.join(' · ')}</span> : null}
      </p>
      <p className="result-meta">{caseData.country} · {caseData.activeYears}</p>
      <p>{caseData.summary}</p>
      {url ? <a href={url} target="_blank" rel="noreferrer">Leer en Wikipedia</a> : null}
    </section>
  )
}
```

- [ ] **Step 2: Escribir el test de `TodayPage`**

Se inyectan las dependencias de datos y fecha por props para no depender de `schedule.json` ni de `localStorage` real.

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayPage } from './TodayPage'
import { sampleCase } from '../game/__fixtures__/sample-case'

vi.mock('../components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))

const killers = [
  { id: 'caso-prueba', name: 'Asesino de Prueba', aliases: ['El Fantasma'] },
  { id: 'otro', name: 'Otro Asesino', aliases: [] },
]

function renderPage() {
  return render(
    <TodayPage
      day={0}
      caseData={sampleCase}
      killers={killers}
    />,
  )
}

describe('TodayPage', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el mapa y el número de día', () => {
    renderPage()
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByText(/Caso #1/)).toBeInTheDocument()
  })

  it('un fallo desbloquea las fechas', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'otro' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
  })

  it('acertar muestra la tarjeta de resultado', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'el fantasma' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    expect(screen.getByText(/Caso resuelto en 1 intento/)).toBeInTheDocument()
    expect(screen.getByText(/Leer en Wikipedia/)).toBeInTheDocument()
  })

  it('persiste el progreso entre montajes', () => {
    const { unmount } = renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'otro' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    unmount()
    renderPage()
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Ejecutar y ver fallar**

```bash
npm test -- src/pages/TodayPage.test.tsx
```

Expected: FAIL, `Cannot find module './TodayPage'`.

- [ ] **Step 4: Implementar `src/pages/TodayPage.tsx`**

```tsx
import { useState } from 'react'
import type { Case, KillerEntry } from '../data/schema'
import { clueLevel, createGame, submitGuess, type GameState } from '../game/engine'
import { loadProgress, saveProgress } from '../game/storage'
import { AttemptsBar } from '../components/AttemptsBar'
import { CaseMap } from '../components/CaseMap'
import { ClueList } from '../components/ClueList'
import { GuessInput } from '../components/GuessInput'
import { ResultCard } from '../components/ResultCard'

interface Props {
  day: number
  caseData: Case
  killers: KillerEntry[]
}

function initialState(day: number, caseId: string): GameState {
  const saved = loadProgress(day)
  return saved && saved.caseId === caseId ? saved : createGame(caseId)
}

export function TodayPage({ day, caseData, killers }: Props) {
  const [state, setState] = useState(() => initialState(day, caseData.id))
  const level = clueLevel(state)
  const finished = state.status !== 'playing'

  function handleGuess(killerId: string) {
    setState((prev) => {
      const next = submitGuess(prev, killerId)
      if (next !== prev) saveProgress(day, next)
      return next
    })
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <span className="page-day">Caso #{day + 1}</span>
      </header>
      <CaseMap murders={caseData.murders} level={level} />
      <div className="page-controls">
        <AttemptsBar guesses={state.guesses} status={state.status} />
        <GuessInput killers={killers} disabled={finished} onGuess={handleGuess} />
      </div>
      {finished ? (
        <ResultCard caseData={caseData} status={state.status as 'won' | 'lost'} attempts={state.guesses.length} />
      ) : null}
      <ClueList murders={caseData.murders} level={level} />
    </main>
  )
}
```

- [ ] **Step 5: Implementar `src/App.tsx`**

Resuelve el día y carga el caso; muestra los estados de carga y de error.

```tsx
import { useEffect, useState } from 'react'
import killers from './data/killers.json'
import schedule from './data/schedule.json'
import { loadCase } from './data/cases'
import type { Case } from './data/schema'
import { caseIdForDay, dayNumber } from './game/schedule'
import { TodayPage } from './pages/TodayPage'

type Loaded = { kind: 'loading' } | { kind: 'missing' } | { kind: 'ready'; caseData: Case }

export default function App() {
  const day = dayNumber(new Date(), schedule.launchDate)
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadCase(caseIdForDay(day, schedule.order)).then((caseData) => {
      if (cancelled) return
      if (caseData === null) {
        console.error(`No hay fichero de caso para el día ${day}`)
        setLoaded({ kind: 'missing' })
      } else {
        setLoaded({ kind: 'ready', caseData })
      }
    })
    return () => { cancelled = true }
  }, [day])

  if (loaded.kind === 'loading') return <main className="page"><p>Abriendo expediente…</p></main>
  if (loaded.kind === 'missing') return <main className="page"><p>Hoy no hay reto. Vuelve mañana.</p></main>
  return <TodayPage day={day} caseData={loaded.caseData} killers={killers} />
}
```

- [ ] **Step 6: Añadir estilos a `src/styles.css`**

```css
.page { max-width: 760px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid var(--accent); padding-bottom: 8px; }
.page-header h1 { margin: 0; font-size: 1.6rem; letter-spacing: 0.12em; text-transform: uppercase; }
.page-day { color: var(--muted); }
.page-controls { display: grid; gap: 12px; }
.result { padding: 16px; border: 1px solid var(--accent); background: var(--panel); }
.result h2 { margin: 0 0 8px; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.08em; }
.result-name { font-size: 1.2rem; font-weight: bold; margin: 0; }
.result-alias { color: var(--accent); font-weight: normal; }
.result-meta { color: var(--muted); margin: 4px 0 12px; }
.result a { color: var(--accent); }
```

- [ ] **Step 7: Ejecutar toda la suite y comprobar tipos**

```bash
npm test
npx tsc -p tsconfig.app.json --noEmit
```

Expected: todos los tests pasan (58) y sin errores de tipos. Si `killers.json` o `schedule.json` dan error de tipos por `resolveJsonModule`, revisar el Step 3 de la Task 1.

- [ ] **Step 8: Commit**

```bash
git add src/components/ResultCard.tsx src/pages src/App.tsx src/styles.css
git commit -m "feat(ui): página del reto diario con resultado y persistencia"
```

---

### Task 20: Verificación end-to-end del prototipo

**Modelo:** `sonnet`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Validar datos, tests y build**

```bash
npm run validate:data && npm test && npm run build
```

Expected: `OK: ...`, todos los tests en verde, `✓ built`.

- [ ] **Step 2: Arrancar y probar en el navegador**

```bash
npm run dev
```

Con la skill `run` o el plugin de Playwright, abrir la URL local y comprobar:
1. El mapa carga con tiles oscuros y los marcadores numerados están encuadrados.
2. Escribir un nombre erróneo y enviarlo pinta una casilla roja y las fechas aparecen en la lista y en los tooltips.
3. Tres fallos más muestran "Caso sin resolver" con el nombre y el enlace a Wikipedia.
4. Recargar la página conserva el estado terminado.
5. `localStorage.clear()` en consola y recargar reinicia la partida; acertar a la primera muestra "Caso resuelto en 1 intento".

Hacer una captura de pantalla del estado inicial y otra del resultado y guardarlas en `docs/superpowers/screenshots/prototipo-inicio.png` y `prototipo-resultado.png`.

- [ ] **Step 3: Escribir `README.md`**

```markdown
# Geo Killer

Minijuego diario: adivina al asesino serial a partir de los lugares de sus crímenes.

## Desarrollo

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # tests unitarios
npm run validate:data
npm run build
```

## Contenido

Los casos se generan con el pipeline de `pipeline/` y los subagentes de `.claude/agents/` desde Claude Code. Ver `docs/superpowers/specs/2026-09-17-geo-killer-design.md`, sección 5.
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/screenshots
git commit -m "docs: README y capturas del prototipo"
```

---

## Cobertura del spec (autorevisión)

| Requisito del spec | Tarea |
|---|---|
| Reto diario por fecha local, calendario fijo | 7, 19 (App) |
| Marcadores sin etiqueta, encuadre automático | 18 |
| Autocompletado con nombre y alias, sin acentos | 5, 17 |
| Cuatro intentos, pistas fechas → víctimas → método | 6, 16, 18 |
| Revelación con alias, país, periodo, resumen, Wikipedia | 19 |
| Esquema de caso, killers, schedule; validación Zod en CI | 3, 4 |
| Casos cerrados, sin detalle gráfico, 3-8 asesinatos | 11, 12, 13 |
| Progreso en localStorage con reinicio si está corrupto | 8 |
| Errores: caso ausente, storage inaccesible | 8, 19 |
| Generador Haiku con reglas antialucinación | 11 |
| Validador Sonnet contra Wikipedia, veredicto por campo | 12 |
| Ciclo generar-validar-reparar, 2 reintentos, rechazados aparte | 15 |
| killers.json independiente del catálogo | 14 |
| Prototipo 5-10 casos | 15 |
| Compartir, estadísticas, racha, archivo, Playwright | Plan 2 (hito de lanzamiento) |
