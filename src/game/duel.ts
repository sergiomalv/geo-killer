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

export function advance(state: DuelState, available: string[], random: () => number): DuelState {
  if (state.status !== 'revealed') return state
  const next = pickNextKiller(available, state.seen, random, state.right)
  return { ...state, left: state.right, right: next.id, seen: next.seen, status: 'playing', tie: false }
}

export function restart(state: DuelState, available: string[], random: () => number): DuelState {
  return startDuel(available, random, state.best)
}
