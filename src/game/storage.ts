import { z } from 'zod'
import type { GameState } from './engine'
import type { InfiniteState } from './infinite'
import type { DuelState } from './duel'

const PROGRESS_PREFIX = 'geokiller.progress.'
const INFINITE_KEY = 'geokiller.infinite'
const DUEL_KEY = 'geokiller.duel'

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

const duelSchema = z.object({
  left: z.string(),
  right: z.string(),
  seen: z.array(z.string()),
  streak: z.number().int().min(0),
  best: z.number().int().min(0),
  status: z.enum(['playing', 'revealed', 'lost']),
  tie: z.boolean(),
}) satisfies z.ZodType<DuelState>

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

export function loadDuel(storage: Storage = localStorage): DuelState | null {
  return loadJson(DUEL_KEY, duelSchema, storage)
}

export function saveDuel(state: DuelState, storage: Storage = localStorage): void {
  saveJson(DUEL_KEY, state, storage)
}
