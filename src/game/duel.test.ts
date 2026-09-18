import { describe, expect, it } from 'vitest'
import { answer, pickNextKiller, startDuel } from './duel'

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

const counts = { uno: 3, dos: 10, tres: 10, cuatro: 52 }
const ids = ['uno', 'dos', 'tres', 'cuatro']

describe('startDuel', () => {
  it('reparte dos asesinos distintos y empieza a cero', () => {
    const s = startDuel(ids, first)
    expect(s.left).toBe('uno')
    expect(s.right).toBe('dos')
    expect(s.seen).toEqual(['uno', 'dos'])
    expect(s).toMatchObject({ streak: 0, best: 0, status: 'playing', tie: false })
  })

  it('conserva el récord que se le pasa', () => {
    expect(startDuel(ids, first, 7).best).toBe(7)
  })

  it('exige al menos dos asesinos', () => {
    expect(() => startDuel(['uno'], first)).toThrow('Hacen falta al menos dos asesinos')
  })
})

describe('answer', () => {
  // left = 'uno' (3), right = 'dos' (10)
  const start = () => startDuel(ids, first)

  it('acertar "más" revela la carta y sube la racha', () => {
    const s = answer(start(), 'higher', counts)
    expect(s.status).toBe('revealed')
    expect(s.streak).toBe(1)
    expect(s.best).toBe(1)
    expect(s.tie).toBe(false)
  })

  it('fallar termina la partida sin tocar el récord', () => {
    const s = answer({ ...start(), best: 5 }, 'lower', counts)
    expect(s.status).toBe('lost')
    expect(s.streak).toBe(0)
    expect(s.best).toBe(5)
  })

  it('el récord solo sube si la racha lo supera', () => {
    const s = answer({ ...start(), streak: 2, best: 9 }, 'higher', counts)
    expect(s.streak).toBe(3)
    expect(s.best).toBe(9)
  })

  it('el empate cuenta como acierto con cualquiera de los dos botones', () => {
    const empate = { ...start(), left: 'dos', right: 'tres' }
    for (const choice of ['higher', 'lower'] as const) {
      const s = answer(empate, choice, counts)
      expect(s.status, choice).toBe('revealed')
      expect(s.streak, choice).toBe(1)
      expect(s.tie, choice).toBe(true)
    }
  })

  it('no hace nada si la partida no está en juego', () => {
    const perdida = answer(start(), 'lower', counts)
    expect(answer(perdida, 'higher', counts)).toBe(perdida)
  })

  it('lanza un error si falta la cifra de un asesino', () => {
    expect(() => answer(start(), 'higher', { uno: 3 })).toThrow('Sin cifra para "dos"')
  })
})
