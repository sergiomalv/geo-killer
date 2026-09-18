import { describe, expect, it } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('en español el día va primero', () => {
    expect(formatDate({ date: '1980-05-01', datePrecision: 'day' }, 'es')).toBe('01/05/1980')
  })

  it('en inglés el mes va primero', () => {
    expect(formatDate({ date: '1980-05-01', datePrecision: 'day' }, 'en')).toBe('05/01/1980')
  })

  it('con precisión de mes el orden es el mismo en los dos idiomas', () => {
    expect(formatDate({ date: '1981-06', datePrecision: 'month' }, 'es')).toBe('06/1981')
    expect(formatDate({ date: '1981-06', datePrecision: 'month' }, 'en')).toBe('06/1981')
  })

  it('con precisión de año devuelve el año', () => {
    expect(formatDate({ date: '1983', datePrecision: 'year' }, 'es')).toBe('1983')
    expect(formatDate({ date: '1983', datePrecision: 'year' }, 'en')).toBe('1983')
  })

  it('sin fecha lo dice en el idioma pedido', () => {
    expect(formatDate({ date: null, datePrecision: null }, 'es')).toBe('Fecha desconocida')
    expect(formatDate({ date: null, datePrecision: null }, 'en')).not.toBe('Fecha desconocida')
    expect(formatDate({ date: null, datePrecision: null }, 'en')).not.toBe('')
  })
})
