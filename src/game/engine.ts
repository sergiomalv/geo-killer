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
