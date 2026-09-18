import { describe, expect, it } from 'vitest'
import { pickNextKiller } from './duel'

const available = ['a', 'b', 'c']
const first = () => 0
const last = () => 0.999

describe('pickNextKiller', () => {
  it('elige entre los no vistos', () => {
    const r = pickNextKiller(available, ['a'], first)
    expect(r.id).toBe('b')
    expect(r.seen).toEqual(['a', 'b'])
  })

  it('no repite hasta agotar la lista', () => {
    let seen: string[] = []
    const salidas: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = pickNextKiller(available, seen, last)
      salidas.push(r.id)
      seen = r.seen
    }
    expect([...salidas].sort()).toEqual(['a', 'b', 'c'])
  })

  it('recicla la lista al agotarse', () => {
    const r = pickNextKiller(available, ['a', 'b', 'c'], first)
    expect(r.id).toBe('a')
    expect(r.seen).toEqual(['a'])
  })

  it('al reciclar no devuelve el asesino excluido', () => {
    const r = pickNextKiller(available, ['a', 'b', 'c'], first, 'a')
    expect(r.id).toBe('b')
    expect(r.seen).toEqual(['b'])
  })

  it('lanza un error claro si no hay de dónde elegir', () => {
    expect(() => pickNextKiller([], [], first)).toThrow('No hay asesinos disponibles')
    expect(() => pickNextKiller(['a'], ['a'], first, 'a')).toThrow('No hay asesinos disponibles')
  })
})
