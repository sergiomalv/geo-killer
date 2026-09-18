import { describe, expect, it } from 'vitest'
import { groupByCoordinates } from './markerGroups'

describe('groupByCoordinates', () => {
  it('agrupa los puntos con coordenadas idénticas conservando el orden', () => {
    const groups = groupByCoordinates([
      { lat: 40, lng: -3 },
      { lat: 41, lng: -2 },
      { lat: 40, lng: -3 },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({ lat: 40, lng: -3, indexes: [0, 2] })
    expect(groups[1]).toEqual({ lat: 41, lng: -2, indexes: [1] })
  })

  it('con coordenadas todas distintas devuelve un grupo por punto', () => {
    const groups = groupByCoordinates([
      { lat: 40, lng: -3 },
      { lat: 41, lng: -2 },
      { lat: 42, lng: -1 },
    ])
    expect(groups).toHaveLength(3)
    expect(groups.map((g) => g.indexes)).toEqual([[0], [1], [2]])
  })

  it('con una lista vacía devuelve []', () => {
    expect(groupByCoordinates([])).toEqual([])
  })
})
