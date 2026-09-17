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
