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
