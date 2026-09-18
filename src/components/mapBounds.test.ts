import { describe, expect, it } from 'vitest'
import { boundsFor } from './mapBounds'

describe('boundsFor', () => {
  it('devuelve el rectángulo que contiene todos los puntos', () => {
    const b = boundsFor([
      { lat: 40, lng: -3 },
      { lat: 42, lng: -1 },
      { lat: 41, lng: -2 },
    ])
    expect(b).toEqual([[40, -3], [42, -1]])
  })

  it('con un solo punto devuelve un rectángulo degenerado', () => {
    expect(boundsFor([{ lat: 40, lng: -3 }])).toEqual([[40, -3], [40, -3]])
  })
})
