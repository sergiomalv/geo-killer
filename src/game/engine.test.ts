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

  it('no cuenta el acierto como fallo', () => {
    expect(clueLevel(submitGuess(createGame(ANSWER), ANSWER))).toBe(0)
    let s = createGame(ANSWER)
    for (const g of ['a', 'b', 'c']) s = submitGuess(s, g)
    expect(clueLevel(submitGuess(s, ANSWER))).toBe(3)
  })
})
