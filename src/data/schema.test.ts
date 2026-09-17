import { describe, expect, it } from 'vitest'
import { caseSchema, killersSchema, scheduleSchema } from './schema'
import { sampleCase } from '../game/__fixtures__/sample-case'

describe('caseSchema', () => {
  it('acepta el fixture', () => {
    expect(caseSchema.safeParse(sampleCase).success).toBe(true)
  })

  it('rechaza menos de 3 asesinatos', () => {
    const c = { ...sampleCase, murders: sampleCase.murders.slice(0, 2) }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza más de 8 asesinatos', () => {
    const c = { ...sampleCase, murders: Array(9).fill(sampleCase.murders[0]) }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza fecha con precisión incoherente', () => {
    const m = { ...sampleCase.murders[0], date: '1980', datePrecision: 'day' as const }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('acepta fecha null con precisión null', () => {
    const m = { ...sampleCase.murders[0], date: null, datePrecision: null }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(true)
  })

  it('rechaza si no hay ninguna URL de Wikipedia', () => {
    const c = { ...sampleCase, wikipedia: { es: null, en: null } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza id con mayúsculas o espacios', () => {
    expect(caseSchema.safeParse({ ...sampleCase, id: 'Caso Prueba' }).success).toBe(false)
  })

  it('rechaza status distinto de approved', () => {
    const c = { ...sampleCase, validation: { ...sampleCase.validation, status: 'pending' } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza una URL de Wikipedia mal formada', () => {
    const c = { ...sampleCase, wikipedia: { es: 'no es una url', en: null } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza latitud o longitud fuera de rango', () => {
    const m = { ...sampleCase.murders[0], lat: 91 }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('rechaza una fecha con formato no ISO', () => {
    const m = { ...sampleCase.murders[0], date: '1980/05/01', datePrecision: 'day' as const }
    const c = { ...sampleCase, murders: [m, ...sampleCase.murders.slice(1)] }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('devuelve mensajes de error en español', () => {
    const result = caseSchema.safeParse({ ...sampleCase, name: '' })
    expect(result.success).toBe(false)
    const message = result.error!.issues[0].message
    expect(message).not.toMatch(/Too small|Invalid/)
    expect(message.length).toBeGreaterThan(0)
  })
})

describe('killersSchema', () => {
  it('acepta una lista válida', () => {
    const list = [{ id: 'a-b', name: 'A B', aliases: ['El A'] }]
    expect(killersSchema.safeParse(list).success).toBe(true)
  })
  it('rechaza ids duplicados', () => {
    const list = [
      { id: 'a-b', name: 'A B', aliases: [] },
      { id: 'a-b', name: 'A B 2', aliases: [] },
    ]
    expect(killersSchema.safeParse(list).success).toBe(false)
  })
})

describe('scheduleSchema', () => {
  it('acepta launchDate ISO y orden no vacío', () => {
    expect(scheduleSchema.safeParse({ launchDate: '2026-10-01', order: ['x'] }).success).toBe(true)
  })
  it('rechaza orden vacío', () => {
    expect(scheduleSchema.safeParse({ launchDate: '2026-10-01', order: [] }).success).toBe(false)
  })
})
