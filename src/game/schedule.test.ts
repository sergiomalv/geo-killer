import { describe, expect, it } from 'vitest'
import { caseIdForDay, dayNumber } from './schedule'

describe('dayNumber', () => {
  it('es 0 el día de lanzamiento', () => {
    expect(dayNumber(new Date(2026, 9, 1, 15, 30), '2026-10-01')).toBe(0)
  })
  it('es 0 antes del lanzamiento', () => {
    expect(dayNumber(new Date(2026, 8, 20), '2026-10-01')).toBe(0)
  })
  it('cuenta días completos en hora local', () => {
    expect(dayNumber(new Date(2026, 9, 3, 0, 5), '2026-10-01')).toBe(2)
    expect(dayNumber(new Date(2026, 9, 2, 23, 59), '2026-10-01')).toBe(1)
  })
  it('no se ve afectado por el cambio de hora', () => {
    expect(dayNumber(new Date(2026, 10, 1), '2026-10-01')).toBe(31)
  })
})

describe('caseIdForDay', () => {
  const order = ['a', 'b', 'c']
  it('recorre el orden', () => {
    expect(caseIdForDay(0, order)).toBe('a')
    expect(caseIdForDay(2, order)).toBe('c')
  })
  it('repite ciclo al acabarse', () => {
    expect(caseIdForDay(3, order)).toBe('a')
    expect(caseIdForDay(7, order)).toBe('b')
  })
})
