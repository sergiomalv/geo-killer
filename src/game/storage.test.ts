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
