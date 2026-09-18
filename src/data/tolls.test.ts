import { describe, expect, it } from 'vitest'
import { buildIndex } from './tolls'
import { sampleTolls } from '../game/__fixtures__/sample-tolls'

describe('buildIndex', () => {
  const index = buildIndex(sampleTolls)

  it('encuentra por id', () => {
    expect(index.byId('a')?.confirmed).toBe(3)
  })

  it('devuelve undefined para un id desconocido', () => {
    expect(index.byId('no-existe')).toBeUndefined()
  })

  it('lista los ids ordenados', () => {
    expect(index.ids).toEqual(['a', 'b', 'c', 'd'])
  })

  it('expone las cifras confirmadas como diccionario', () => {
    expect(index.counts).toEqual({ a: 3, b: 10, c: 10, d: 52 })
  })
})
