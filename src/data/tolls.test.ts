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

  // `duel.ts` confía en que todo id de `ids` tiene cifra en `counts` (lo comprueba `countOf`,
  // que lanza `Sin cifra para "<id>"` si no). Esa confianza depende de que `ids` y `counts`
  // salgan siempre de la misma lista, lo que fija esta prueba.
  it('ids y counts describen el mismo catálogo', () => {
    expect(Object.keys(index.counts).sort()).toEqual(index.ids)
  })

  // `tollsSchema` ya rechaza ids duplicados en los datos reales (`tolls.json`), pero
  // `buildIndex` es pública y los tests la llaman directamente con fixtures sin pasar por
  // esa validación. Fija aquí la regla "la última gana" para que `ids`, `byId` y `counts`
  // no puedan volver a contradecirse entre sí ante una entrada sin deduplicar.
  it('deduplica ids repetidos: la última entrada gana', () => {
    const dup = buildIndex([
      { ...sampleTolls[0], id: 'a', confirmed: 3 },
      { ...sampleTolls[0], id: 'a', confirmed: 99 },
    ])
    expect(dup.ids).toEqual(['a'])
    expect(dup.byId('a')?.confirmed).toBe(99)
    expect(dup.counts).toEqual({ a: 99 })
  })
})
