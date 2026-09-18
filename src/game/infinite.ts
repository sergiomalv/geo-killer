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
