# Modo infinito — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modo de juego con casos encadenados al azar, racha de aciertos, acceso por `#infinito` y persistencia en localStorage, sin alterar el reto diario.

**Architecture:** Lógica pura en `src/game/infinite.ts`; persistencia en `src/game/storage.ts`; tablero común `GameBoard` extraído de `TodayPage`; nueva `InfinitePage`; `App` elige modo por hash.

**Tech Stack:** el existente (React 19, TypeScript 7, Vitest 5, Zod 4). Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-09-18-modo-infinito-design.md`. Rama: `feat/modo-infinito`.

**Modelos:** todas las tareas `sonnet` (lógica con tests y componentes); la verificación en navegador también `sonnet`.

---

### Task 1: Lógica del modo infinito

**Modelo:** `sonnet`

**Files:**
- Create: `src/game/infinite.ts`, `src/game/infinite.test.ts`

- [x] **Step 1: Tests**

```ts
import { describe, expect, it } from 'vitest'
import { infiniteGuess, nextInfiniteCase, pickNextCase, startInfinite } from './infinite'

const available = ['a', 'b', 'c']
const first = () => 0
const last = () => 0.999

describe('pickNextCase', () => {
  it('elige entre los no jugados', () => {
    const r = pickNextCase(available, ['a'], first)
    expect(r.caseId).toBe('b')
    expect(r.played).toEqual(['a', 'b'])
    expect(r.wrapped).toBe(false)
  })
  it('no repite hasta agotar', () => {
    let played: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = pickNextCase(available, played, last)
      seen.push(r.caseId)
      played = r.played
    }
    expect(seen.sort()).toEqual(['a', 'b', 'c'])
  })
  it('reinicia la lista al agotarse y lo señala', () => {
    const r = pickNextCase(available, ['a', 'b', 'c'], first)
    expect(r.caseId).toBe('a')
    expect(r.played).toEqual(['a'])
    expect(r.wrapped).toBe(true)
  })
})

describe('startInfinite', () => {
  it('empieza con un caso, sin intentos y racha 0', () => {
    const s = startInfinite(available, first)
    expect(s).toEqual({ caseId: 'a', guesses: [], status: 'playing', played: ['a'], streak: 0, wrapped: false })
  })
})

describe('infiniteGuess', () => {
  it('acertar sube la racha', () => {
    const s = infiniteGuess(startInfinite(available, first), 'a')
    expect(s.status).toBe('won')
    expect(s.streak).toBe(1)
  })
  it('perder reinicia la racha', () => {
    let s = { ...startInfinite(available, first), streak: 4 }
    for (const g of ['x', 'y', 'z', 'w']) s = infiniteGuess(s, g)
    expect(s.status).toBe('lost')
    expect(s.streak).toBe(0)
  })
  it('un fallo intermedio no cambia la racha', () => {
    const s = infiniteGuess({ ...startInfinite(available, first), streak: 2 }, 'x')
    expect(s.status).toBe('playing')
    expect(s.streak).toBe(2)
  })
})

describe('nextInfiniteCase', () => {
  it('carga otro caso conservando racha y jugados', () => {
    const won = infiniteGuess(startInfinite(available, first), 'a')
    const s = nextInfiniteCase(won, available, first)
    expect(s.caseId).toBe('b')
    expect(s.guesses).toEqual([])
    expect(s.status).toBe('playing')
    expect(s.streak).toBe(1)
    expect(s.played).toEqual(['a', 'b'])
  })
  it('no hace nada si la partida sigue en curso', () => {
    const s = startInfinite(available, first)
    expect(nextInfiniteCase(s, available, first)).toBe(s)
  })
})
```

- [x] **Step 2: Run → FAIL** (`npm test -- src/game/infinite.test.ts`)

- [x] **Step 3: Implementar `src/game/infinite.ts`**

```ts
import { createGame, submitGuess, type GameState, type GameStatus } from './engine'

export interface InfiniteState {
  caseId: string
  guesses: string[]
  status: GameStatus
  played: string[]
  streak: number
  wrapped: boolean
}

export interface Pick {
  caseId: string
  played: string[]
  wrapped: boolean
}

/** Elige un caso no jugado; si no queda ninguno, reinicia la vuelta. `random` devuelve [0, 1). */
export function pickNextCase(available: string[], played: string[], random: () => number): Pick {
  let candidates = available.filter((id) => !played.includes(id))
  let wrapped = false
  let basePlayed = played
  if (candidates.length === 0) {
    candidates = available
    basePlayed = []
    wrapped = true
  }
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  const caseId = candidates[index]
  return { caseId, played: [...basePlayed, caseId], wrapped }
}

export function startInfinite(available: string[], random: () => number): InfiniteState {
  const pick = pickNextCase(available, [], random)
  return { ...createGame(pick.caseId), played: pick.played, streak: 0, wrapped: pick.wrapped }
}

function gameOf(state: InfiniteState): GameState {
  return { caseId: state.caseId, guesses: state.guesses, status: state.status }
}

export function infiniteGuess(state: InfiniteState, killerId: string): InfiniteState {
  const before = gameOf(state)
  const after = submitGuess(before, killerId)
  if (after === before) return state
  const streak = after.status === 'won' ? state.streak + 1 : after.status === 'lost' ? 0 : state.streak
  return { ...state, guesses: after.guesses, status: after.status, streak }
}

export function nextInfiniteCase(state: InfiniteState, available: string[], random: () => number): InfiniteState {
  if (state.status === 'playing') return state
  const pick = pickNextCase(available, state.played, random)
  return { ...state, ...createGame(pick.caseId), played: pick.played, wrapped: pick.wrapped }
}
```

- [x] **Step 4: Run → PASS** (`9 passed`), `npx tsc -p tsconfig.app.json --noEmit`.
- [x] **Step 5: Commit** `feat(game): lógica del modo infinito`

---

### Task 2: Persistencia del modo infinito

**Modelo:** `sonnet`

**Files:**
- Modify: `src/game/storage.ts`, `src/game/storage.test.ts`

- [x] **Step 1: Tests** (añadir a `storage.test.ts`)

```ts
import { loadInfinite, saveInfinite } from './storage'
import type { InfiniteState } from './infinite'

const infinite: InfiniteState = { caseId: 'a', guesses: ['x'], status: 'playing', played: ['a'], streak: 2, wrapped: false }

describe('storage infinito', () => {
  beforeEach(() => localStorage.clear())
  it('guarda y recupera', () => {
    saveInfinite(infinite)
    expect(loadInfinite()).toEqual(infinite)
  })
  it('devuelve null si no hay nada', () => {
    expect(loadInfinite()).toBeNull()
  })
  it('descarta y limpia un valor corrupto', () => {
    localStorage.setItem('geokiller.infinite', '{no')
    expect(loadInfinite()).toBeNull()
    expect(localStorage.getItem('geokiller.infinite')).toBeNull()
  })
  it('descarta una forma incorrecta', () => {
    localStorage.setItem('geokiller.infinite', JSON.stringify({ ...infinite, streak: 'dos' }))
    expect(loadInfinite()).toBeNull()
  })
  it('no lanza si localStorage falla', () => {
    const broken = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    } as unknown as Storage
    expect(loadInfinite(broken)).toBeNull()
    expect(() => saveInfinite(infinite, broken)).not.toThrow()
  })
})
```

- [x] **Step 2: Run → FAIL**

- [x] **Step 3: Reescribir `src/game/storage.ts`**

```ts
import { z } from 'zod'
import type { GameState } from './engine'
import type { InfiniteState } from './infinite'

const PROGRESS_PREFIX = 'geokiller.progress.'
const INFINITE_KEY = 'geokiller.infinite'

const progressSchema = z.object({
  caseId: z.string(),
  guesses: z.array(z.string()),
  status: z.enum(['playing', 'won', 'lost']),
}) satisfies z.ZodType<GameState>

const infiniteSchema = z.object({
  caseId: z.string(),
  guesses: z.array(z.string()),
  status: z.enum(['playing', 'won', 'lost']),
  played: z.array(z.string()),
  streak: z.number().int().min(0),
  wrapped: z.boolean(),
}) satisfies z.ZodType<InfiniteState>

function loadJson<T>(key: string, schema: z.ZodType<T>, storage: Storage): T | null {
  try {
    const raw = storage.getItem(key)
    if (raw === null) return null
    const parsed = schema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
    storage.removeItem(key)
    return null
  } catch {
    try { storage.removeItem(key) } catch { /* sin acceso a storage */ }
    return null
  }
}

function saveJson(key: string, value: unknown, storage: Storage): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* sin acceso a storage: se juega sin persistencia */
  }
}

export function loadProgress(day: number, storage: Storage = localStorage): GameState | null {
  return loadJson(`${PROGRESS_PREFIX}${day}`, progressSchema, storage)
}

export function saveProgress(day: number, state: GameState, storage: Storage = localStorage): void {
  saveJson(`${PROGRESS_PREFIX}${day}`, state, storage)
}

export function loadInfinite(storage: Storage = localStorage): InfiniteState | null {
  return loadJson(INFINITE_KEY, infiniteSchema, storage)
}

export function saveInfinite(state: InfiniteState, storage: Storage = localStorage): void {
  saveJson(INFINITE_KEY, state, storage)
}
```

Si `z.ZodType<T>` da problemas de tipos con Zod 4 en `loadJson`, usar `z.ZodType<T, unknown>` o el tipo `z.core.$ZodType`; comprobar en `node_modules/zod`.

- [x] **Step 4: Run** `npm test -- src/game/storage.test.ts` → `11 passed`; tsc limpio.
- [x] **Step 5: Commit** `feat(game): persistencia del modo infinito y refactor de storage`

---

### Task 3: Extraer `GameBoard` de `TodayPage`

**Modelo:** `sonnet`

**Files:**
- Create: `src/components/GameBoard.tsx`
- Modify: `src/pages/TodayPage.tsx`, `src/pages/TodayPage.test.tsx`

- [x] **Step 1: `src/components/GameBoard.tsx`**

```tsx
import type { ReactNode } from 'react'
import type { Case, KillerEntry } from '../data/schema'
import { clueLevel, type GameState } from '../game/engine'
import { AttemptsBar } from './AttemptsBar'
import { CaseMap } from './CaseMap'
import { ClueList } from './ClueList'
import { GuessInput } from './GuessInput'
import { ResultCard } from './ResultCard'

interface Props {
  caseData: Case
  killers: KillerEntry[]
  state: GameState
  onGuess: (killerId: string) => void
  /** Se muestra bajo la tarjeta de resultado cuando la partida ha terminado. */
  afterResult?: ReactNode
}

export function GameBoard({ caseData, killers, state, onGuess, afterResult }: Props) {
  const level = clueLevel(state)
  const outcome = state.status === 'playing' ? null : state.status
  return (
    <>
      <CaseMap murders={caseData.murders} level={level} />
      <div className="page-controls">
        <AttemptsBar guesses={state.guesses} status={state.status} />
        <GuessInput killers={killers} disabled={outcome !== null} onGuess={onGuess} />
      </div>
      {outcome ? (
        <>
          <ResultCard caseData={caseData} status={outcome} attempts={state.guesses.length} />
          {afterResult}
        </>
      ) : null}
      <ClueList murders={caseData.murders} level={level} />
    </>
  )
}
```

- [x] **Step 2: `src/pages/TodayPage.tsx`** — misma lógica de estado; el JSX pasa a:

```tsx
  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <nav className="page-nav">
          <span className="page-day">Caso #{day + 1}</span>
          <a href="#infinito">Modo infinito</a>
        </nav>
      </header>
      <GameBoard caseData={caseData} killers={killers} state={state} onGuess={handleGuess} />
    </main>
  )
```

Eliminar los imports de componentes que ya no se usan y `clueLevel`. Añadir a `styles.css`: `.page-nav { display: flex; gap: 16px; align-items: baseline; } .page-nav a { color: var(--accent); }`.

- [x] **Step 3: Test nuevo en `TodayPage.test.tsx`**: `it('enlaza al modo infinito', ...)` → `screen.getByRole('link', { name: 'Modo infinito' })` con `href` `#infinito`. El `vi.mock('../components/CaseMap', ...)` existente sigue funcionando porque `GameBoard` importa `./CaseMap` (misma ruta resuelta).

- [x] **Step 4: `npm test`** → todos pasan (75); tsc; lint.
- [x] **Step 5: Commit** `refactor(ui): GameBoard común y enlace al modo infinito`

---

### Task 4: `InfinitePage`

**Modelo:** `sonnet`

**Files:**
- Create: `src/pages/InfinitePage.tsx`, `src/pages/InfinitePage.test.tsx`
- Modify: `src/styles.css`

- [x] **Step 1: Tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InfinitePage } from './InfinitePage'
import { sampleCase } from '../game/__fixtures__/sample-case'

vi.mock('../components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))

const secondCase = { ...sampleCase, id: 'segundo', name: 'Segundo Asesino', aliases: ['El Segundo'] }
const cases: Record<string, typeof sampleCase> = { 'caso-prueba': sampleCase, segundo: secondCase }

vi.mock('../data/cases', () => ({
  loadCase: (id: string) => Promise.resolve(cases[id] ?? null),
}))

const killers = [
  { id: 'caso-prueba', name: 'Asesino de Prueba', aliases: ['El Fantasma'] },
  { id: 'segundo', name: 'Segundo Asesino', aliases: ['El Segundo'] },
  { id: 'otro', name: 'Otro Asesino', aliases: [] },
]
const available = ['caso-prueba', 'segundo']
const firstRandom = () => 0

function renderPage() {
  return render(<InfinitePage killers={killers} availableIds={available} random={firstRandom} />)
}

async function guess(text: string) {
  const input = await screen.findByRole('combobox')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.submit(input.closest('form')!)
}

describe('InfinitePage', () => {
  beforeEach(() => localStorage.clear())

  it('carga un caso y muestra racha 0', async () => {
    renderPage()
    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reto diario' })).toHaveAttribute('href', '#')
  })

  it('acertar sube la racha y ofrece el siguiente caso', async () => {
    renderPage()
    await guess('el fantasma')
    expect(await screen.findByText('Racha: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente caso' }))
    expect(await screen.findByText(/Segundo Asesino/)).toBeInTheDocument()
    await guess('el segundo')
    expect(await screen.findByText('Racha: 2')).toBeInTheDocument()
  })

  it('perder reinicia la racha', async () => {
    renderPage()
    await guess('el fantasma')
    await screen.findByText('Racha: 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente caso' }))
    await screen.findByText(/Segundo Asesino/)
    for (const g of ['otro', 'fantasma', 'otro', 'fantasma']) await guess(g)
    expect(await screen.findByText('Racha: 0')).toBeInTheDocument()
    expect(screen.getByText('Caso sin resolver')).toBeInTheDocument()
  })

  it('avisa al completar la vuelta', async () => {
    renderPage()
    await guess('el fantasma')
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente caso' }))
    await guess('el segundo')
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente caso' }))
    expect(await screen.findByText(/Vuelta completa/)).toBeInTheDocument()
  })

  it('persiste entre montajes', async () => {
    const { unmount } = renderPage()
    await guess('el fantasma')
    await screen.findByText('Racha: 1')
    unmount()
    renderPage()
    expect(await screen.findByText('Racha: 1')).toBeInTheDocument()
    expect(screen.getByText(/Caso resuelto/)).toBeInTheDocument()
  })
})
```

Nota sobre el test "perder": con `random = () => 0` tras ganar `caso-prueba`, el siguiente es `segundo` (único no jugado). Los cuatro fallos deben ser ids válidos distintos de `segundo`: "otro" y "fantasma" alternan porque el motor ignora intentos repetidos; usar cuatro nombres distintos si hace falta añadiendo killers `k3`, `k4` a la lista.

- [x] **Step 2: Run → FAIL**

- [x] **Step 3: `src/pages/InfinitePage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { loadCase } from '../data/cases'
import type { Case, KillerEntry } from '../data/schema'
import { infiniteGuess, nextInfiniteCase, startInfinite, type InfiniteState } from '../game/infinite'
import { loadInfinite, saveInfinite } from '../game/storage'
import { GameBoard } from '../components/GameBoard'

interface Props {
  killers: KillerEntry[]
  availableIds: string[]
  random?: () => number
}

type Loaded = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; caseData: Case }

function initialState(available: string[], random: () => number): InfiniteState {
  const saved = loadInfinite()
  return saved && available.includes(saved.caseId) ? saved : startInfinite(available, random)
}

export function InfinitePage({ killers, availableIds, random = Math.random }: Props) {
  const [state, setState] = useState(() => initialState(availableIds, random))
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' })

  useEffect(() => {
    saveInfinite(state)
  }, [state])

  useEffect(() => {
    let cancelled = false
    setLoaded({ kind: 'loading' })
    loadCase(state.caseId)
      .then((caseData) => {
        if (cancelled) return
        setLoaded(caseData ? { kind: 'ready', caseData } : { kind: 'error' })
      })
      .catch(() => { if (!cancelled) setLoaded({ kind: 'error' }) })
    return () => { cancelled = true }
  }, [state.caseId])

  function handleGuess(killerId: string) {
    setState((prev) => infiniteGuess(prev, killerId))
  }

  function handleNext() {
    setState((prev) => nextInfiniteCase({ ...prev, status: prev.status === 'playing' ? 'lost' : prev.status }, availableIds, random))
  }

  const nextButton = (
    <button type="button" className="next-case" onClick={handleNext}>Siguiente caso</button>
  )

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <nav className="page-nav">
          <span className="page-day">Racha: {state.streak}</span>
          <a href="#">Reto diario</a>
        </nav>
      </header>
      {state.wrapped ? <p className="page-notice">Vuelta completa: los casos se repiten.</p> : null}
      {loaded.kind === 'loading' ? <p>Abriendo expediente…</p> : null}
      {loaded.kind === 'error' ? (
        <>
          <p>No se ha podido cargar el caso.</p>
          {nextButton}
        </>
      ) : null}
      {loaded.kind === 'ready' ? (
        <GameBoard
          caseData={loaded.caseData}
          killers={killers}
          state={state}
          onGuess={handleGuess}
          afterResult={nextButton}
        />
      ) : null}
    </main>
  )
}
```

Nota: en `handleNext` desde el estado de error (caso que no carga) la partida sigue `playing`; se fuerza `lost` para poder saltar (la racha vuelve a 0, que es lo conservador). Cuando `handleNext` se pulsa tras un resultado, el estado ya es `won`/`lost` y no cambia.

CSS a añadir: `.next-case { padding: 12px 16px; font: inherit; background: var(--accent); color: #000; border: 0; cursor: pointer; justify-self: start; } .page-notice { margin: 0; color: var(--accent); }`.

- [x] **Step 4: Run** → `5 passed`; `npm test` completo; tsc; lint.
- [x] **Step 5: Commit** `feat(ui): página del modo infinito`

---

### Task 5: Selección de modo en `App` y verificación en navegador

**Modelo:** `sonnet`

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

- [x] **Step 1: Test `src/App.test.tsx`**

```tsx
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { sampleCase } from './game/__fixtures__/sample-case'

vi.mock('./components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))
vi.mock('./data/cases', () => ({
  loadCase: () => Promise.resolve(sampleCase),
  availableCaseIds: () => ['caso-prueba'],
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('muestra el reto diario por defecto', async () => {
    render(<App />)
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })

  it('muestra el modo infinito con #infinito y vuelve al cambiar el hash', async () => {
    window.location.hash = '#infinito'
    render(<App />)
    expect(await screen.findByText(/Racha:/)).toBeInTheDocument()
    await act(async () => {
      window.location.hash = ''
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })
})
```

- [x] **Step 2: Run → FAIL** (no hay modo infinito en `App`).

- [x] **Step 3: `src/App.tsx`**

Añadir:

```tsx
import { availableCaseIds, loadCase } from './data/cases'
import { InfinitePage } from './pages/InfinitePage'

type Mode = 'daily' | 'infinite'

function readMode(): Mode {
  return window.location.hash === '#infinito' ? 'infinite' : 'daily'
}

function useHashMode(): Mode {
  const [mode, setMode] = useState<Mode>(readMode)
  useEffect(() => {
    const onChange = () => setMode(readMode())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return mode
}
```

Separar el flujo diario existente en un componente `DailyApp` (el cuerpo actual de `App`) y dejar:

```tsx
export default function App() {
  const mode = useHashMode()
  if (mode === 'infinite') return <InfinitePage killers={killers} availableIds={availableCaseIds()} />
  return <DailyApp />
}
```

- [x] **Step 4: Run** → `npm test` completo en verde; tsc; build; lint.

- [x] **Step 5: Verificación en navegador** con Playwright (script en el scratchpad, como en la Task 20 del plan anterior): abrir `http://localhost:5173/#infinito`, comprobar "Racha: 0" y un mapa con marcadores; adivinar el caso con un alias del catálogo (leer el nombre en la tarjeta tras fallar cuatro veces si hace falta, o bien perder a propósito y comprobar "Racha: 0" y "Siguiente caso"); pulsar "Siguiente caso" y comprobar que cambia el número de marcadores o el nombre revelado; recargar y comprobar que la racha se mantiene; pulsar "Reto diario" y comprobar "Caso #1". Capturas en `docs/superpowers/screenshots/infinito-*.png`. Sin errores de consola.

- [x] **Step 6: Commit** `feat(ui): selección de modo por hash y verificación del modo infinito`

---

## Cobertura del spec

| Requisito | Tarea |
|---|---|
| Casos al azar sin repetir, vuelta completa | 1 |
| Racha sube/baja | 1 |
| Persistencia `geokiller.infinite` con Zod | 2 |
| Tablero común sin duplicar | 3 |
| Enlaces de cabecera y `#infinito` | 3, 5 |
| Página del modo infinito con errores de carga | 4 |
| Verificación en navegador | 5 |
