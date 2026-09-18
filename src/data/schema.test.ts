import { describe, expect, it } from 'vitest'
import { caseSchema, caseTranslationSchema, killersSchema, scheduleSchema, tollSchema } from './schema'
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

  it('rechaza si no hay ni Wikipedia ni sources', () => {
    const c = { ...sampleCase, wikipedia: { es: null, en: null } }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('acepta un caso sin Wikipedia respaldado por sources', () => {
    const c = { ...sampleCase, wikipedia: { es: null, en: null }, sources: ['https://ejemplo.org/caso'] }
    expect(caseSchema.safeParse(c).success).toBe(true)
  })

  it('rechaza una URL mal formada en sources', () => {
    const c = { ...sampleCase, wikipedia: { es: null, en: null }, sources: ['no es una url'] }
    expect(caseSchema.safeParse(c).success).toBe(false)
  })

  it('deja sources vacio cuando no se indica', () => {
    const result = caseSchema.safeParse(sampleCase)
    expect(result.success).toBe(true)
    expect(result.data!.sources).toEqual([])
  })

  it('deja toll a null cuando no se indica', () => {
    const result = caseSchema.safeParse(sampleCase)
    expect(result.success).toBe(true)
    expect(result.data!.toll).toBeNull()
  })

  it('acepta un toll entero positivo', () => {
    expect(caseSchema.safeParse({ ...sampleCase, toll: 100 }).success).toBe(true)
  })

  it('rechaza un toll de cero o negativo', () => {
    expect(caseSchema.safeParse({ ...sampleCase, toll: 0 }).success).toBe(false)
    expect(caseSchema.safeParse({ ...sampleCase, toll: -3 }).success).toBe(false)
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
  it('rechaza ids duplicados en order', () => {
    expect(scheduleSchema.safeParse({ launchDate: '2026-10-01', order: ['x', 'x'] }).success).toBe(false)
  })
})

describe('caseTranslationSchema', () => {
  const traduccion = {
    id: 'caso-prueba',
    lang: 'en',
    country: 'Testland',
    summary: 'Fictional case used only in tests.',
    aliases: ['The Ghost', 'The Ghost'],
    murders: [
      { city: 'City One', region: null, country: 'Testland', method: 'Method one.' },
      { city: 'City Two', region: 'District Two', country: 'Testland', method: 'Method two.' },
      { city: 'City Three', region: null, country: 'Testland', method: 'Method three.' },
    ],
  }

  it('acepta una traducción bien formada', () => {
    expect(caseTranslationSchema.safeParse(traduccion).success).toBe(true)
  })

  it('acepta una traducción sin aliases', () => {
    const { aliases: _aliases, ...sinAlias } = traduccion
    expect(caseTranslationSchema.safeParse(sinAlias).success).toBe(true)
  })

  it('rechaza un idioma que no es en', () => {
    expect(caseTranslationSchema.safeParse({ ...traduccion, lang: 'fr' }).success).toBe(false)
  })

  it('rechaza menos de 3 asesinatos', () => {
    const t = { ...traduccion, murders: traduccion.murders.slice(0, 2) }
    expect(caseTranslationSchema.safeParse(t).success).toBe(false)
  })

  it('rechaza una region vacía', () => {
    const m = { ...traduccion.murders[0], region: '' }
    expect(caseTranslationSchema.safeParse({ ...traduccion, murders: [m, ...traduccion.murders.slice(1)] }).success).toBe(false)
  })

  it('acepta region null', () => {
    expect(caseTranslationSchema.safeParse(traduccion).success).toBe(true)
  })

  it('rechaza campos que no se traducen', () => {
    const conVictima = {
      ...traduccion,
      murders: [{ ...traduccion.murders[0], victim: 'Otro Nombre' }, ...traduccion.murders.slice(1)],
    }
    expect(caseTranslationSchema.safeParse(conVictima).success).toBe(false)
  })

  it('rechaza un id con mayúsculas', () => {
    expect(caseTranslationSchema.safeParse({ ...traduccion, id: 'Caso Prueba' }).success).toBe(false)
  })
})

describe('tollSchema', () => {
  const base = {
    id: 'gary-ridgway',
    confirmed: 49,
    attributed: { min: 71, max: 71 },
    countries: ['US'],
    activeYears: '1982-1998',
    nickname: { es: 'el asesino de Green River', en: 'the Green River Killer' },
    wikipedia: { es: 'https://es.wikipedia.org/wiki/Gary_Ridgway', en: null },
    confirmedQuote: 'Ridgway was convicted of 49 murders',
    attributedQuote: 'he confessed to 71 killings',
    sourceLang: 'en',
    validation: { status: 'approved', validatedAt: '2026-09-18', validator: 'claude-sonnet-5', notes: '' },
  }

  it('acepta una entrada completa', () => {
    expect(tollSchema.safeParse(base).success).toBe(true)
  })

  it('acepta attributed nulo si tampoco hay attributedQuote', () => {
    const { attributedQuote: _q, ...rest } = base
    expect(tollSchema.safeParse({ ...rest, attributed: null }).success).toBe(true)
  })

  it('rechaza attributed nulo con attributedQuote presente', () => {
    expect(tollSchema.safeParse({ ...base, attributed: null }).success).toBe(false)
  })

  it('rechaza attributed presente sin attributedQuote', () => {
    const { attributedQuote: _q, ...rest } = base
    expect(tollSchema.safeParse(rest).success).toBe(false)
  })

  it('rechaza un rango atribuido menor que lo confirmado', () => {
    expect(tollSchema.safeParse({ ...base, attributed: { min: 10, max: 20 } }).success).toBe(false)
  })

  it('rechaza un rango con min mayor que max', () => {
    expect(tollSchema.safeParse({ ...base, attributed: { min: 80, max: 71 } }).success).toBe(false)
  })

  it('rechaza confirmed cero o negativo', () => {
    expect(tollSchema.safeParse({ ...base, confirmed: 0 }).success).toBe(false)
  })

  it('rechaza los códigos de países que ya no existen', () => {
    for (const code of ['SU', 'YU', 'CS']) {
      expect(tollSchema.safeParse({ ...base, countries: [code] }).success, code).toBe(false)
    }
  })

  it('rechaza un código de país inventado', () => {
    expect(tollSchema.safeParse({ ...base, countries: ['ZZ'] }).success).toBe(false)
  })

  it('acepta hasta tres países y rechaza cuatro', () => {
    expect(tollSchema.safeParse({ ...base, countries: ['UA', 'RU', 'UZ'] }).success).toBe(true)
    expect(tollSchema.safeParse({ ...base, countries: ['UA', 'RU', 'UZ', 'US'] }).success).toBe(false)
    expect(tollSchema.safeParse({ ...base, countries: [] }).success).toBe(false)
  })

  it('acepta un apodo solo en un idioma', () => {
    expect(tollSchema.safeParse({ ...base, nickname: { es: null, en: 'the Ripper' } }).success).toBe(true)
    expect(tollSchema.safeParse({ ...base, nickname: null }).success).toBe(true)
  })

  it('rechaza wikipedia con los dos idiomas a null', () => {
    expect(tollSchema.safeParse({ ...base, wikipedia: { es: null, en: null } }).success).toBe(false)
  })
})
