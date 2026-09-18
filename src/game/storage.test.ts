import { beforeEach, describe, expect, it } from 'vitest'
import { loadDuel, loadInfinite, loadProgress, saveDuel, saveInfinite, saveProgress } from './storage'
import type { GameState } from './engine'
import type { InfiniteState } from './infinite'
import type { DuelState } from './duel'

const state: GameState = { caseId: 'x', guesses: ['a'], status: 'playing' }
const infinite: InfiniteState = { caseId: 'a', guesses: ['x'], status: 'playing', played: ['a'], streak: 2, wrapped: false }

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

  it('descarta un valor con guesses de tipo incorrecto', () => {
    localStorage.setItem('geokiller.progress.3', JSON.stringify({ caseId: 'x', guesses: 'x', status: 'playing' }))
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

describe('duelo', () => {
  beforeEach(() => localStorage.clear())

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
