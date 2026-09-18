/** Milisegundos que la carta revelada se queda a la vista antes de encadenar la ronda siguiente. */
export const REVEAL_MS = 1400

export type Choice = 'higher' | 'lower'
export type DuelStatus = 'playing' | 'revealed' | 'lost'

/**
 * Elige un asesino que no se haya usado en esta partida. Al agotarse la lista, la recicla desde
 * cero, igual que `pickNextCase` en el modo infinito. `onBoard` son las cartas que siguen en la
 * mesa: nunca se reparten, porque darían un duelo de alguien contra sí mismo o repetirían la
 * pareja anterior al revés con las dos cifras ya a la vista; y al reciclar cuentan como vistas
 * en el ciclo nuevo, para que `seen` nunca deje fuera lo que hay en pantalla.
 * `random` devuelve [0, 1).
 */
export function pickNextKiller(
  available: string[],
  seen: string[],
  random: () => number,
  onBoard: string[] = [],
): { id: string; seen: string[] } {
  let candidates = available.filter((id) => !seen.includes(id) && !onBoard.includes(id))
  let base = seen
  if (candidates.length === 0) {
    candidates = available.filter((id) => !onBoard.includes(id))
    base = onBoard
  }
  if (candidates.length === 0 && onBoard.length > 0) {
    // Catálogo mínimo de dos asesinos: lo único evitable es repartir la carta que se queda en
    // pantalla, así que la pareja se alterna.
    const stays = onBoard[onBoard.length - 1]
    candidates = available.filter((id) => id !== stays)
    base = [stays]
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

// La invariante "todo id de `seen` (y de la partida en general) tiene cifra en `counts`" la
// garantiza `buildIndex`: `ids` y `counts` salen de la misma lista, así que nunca deberían
// desincronizarse salvo que se pase un `counts` recortado a mano (como en los tests de error).
function countOf(counts: Record<string, number>, id: string): number {
  const n = counts[id]
  if (n === undefined) throw new Error(`Sin cifra para "${id}"`)
  return n
}

export function startDuel(available: string[], random: () => number, best = 0): DuelState {
  if (available.length < 2) throw new Error('Hacen falta al menos dos asesinos')
  const left = pickNextKiller(available, [], random)
  const right = pickNextKiller(available, left.seen, random, [left.id])
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
  const next = pickNextKiller(available, state.seen, random, [state.left, state.right])
  return { ...state, left: state.right, right: next.id, seen: next.seen, status: 'playing', tie: false }
}

export function restart(state: DuelState, available: string[], random: () => number): DuelState {
  return startDuel(available, random, state.best)
}
