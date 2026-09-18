import { describe, expect, it } from 'vitest'
import { applyTranslation } from './translate'
import { sampleCase } from '../game/__fixtures__/sample-case'
import type { CaseTranslation } from './schema'

const traduccion: CaseTranslation = {
  id: 'caso-prueba',
  lang: 'en',
  country: 'Testland',
  summary: 'Fictional case used only in tests.',
  aliases: ['The Ghost', 'The Phantom'],
  murders: [
    { city: 'City One', region: null, country: 'Testland', method: 'Method one.' },
    { city: 'City Two', region: 'District Two', country: 'Testland', method: 'Method two.' },
    { city: 'City Three', region: null, country: 'Testland', method: 'Method three.' },
  ],
}

describe('applyTranslation', () => {
  it('sustituye los campos traducibles', () => {
    const c = applyTranslation(sampleCase, traduccion)
    expect(c.country).toBe('Testland')
    expect(c.summary).toBe('Fictional case used only in tests.')
    expect(c.aliases).toEqual(['The Ghost', 'The Phantom'])
    expect(c.murders[0].city).toBe('City One')
    expect(c.murders[1].region).toBe('District Two')
    expect(c.murders[2].method).toBe('Method three.')
  })

  it('no toca los campos que no se traducen', () => {
    const c = applyTranslation(sampleCase, traduccion)
    expect(c.id).toBe(sampleCase.id)
    expect(c.name).toBe(sampleCase.name)
    expect(c.activeYears).toBe(sampleCase.activeYears)
    expect(c.murders[0].victim).toBe('Víctima Uno')
    expect(c.murders[0].lat).toBe(sampleCase.murders[0].lat)
    expect(c.murders[0].date).toBe('1980-05-01')
    expect(c.murders[0].sourceQuote).toBe('cita literal uno')
    expect(c.validation).toEqual(sampleCase.validation)
  })

  it('no muta el caso original', () => {
    applyTranslation(sampleCase, traduccion)
    expect(sampleCase.country).toBe('Pruebalandia')
    expect(sampleCase.murders[0].city).toBe('Ciudad Uno')
  })

  it('devuelve el original si el número de asesinatos no coincide', () => {
    const corta = { ...traduccion, murders: traduccion.murders.slice(0, 2) }
    expect(applyTranslation(sampleCase, corta as CaseTranslation)).toEqual(sampleCase)
  })

  it('ignora solo los alias si su número no coincide', () => {
    const c = applyTranslation(sampleCase, { ...traduccion, aliases: ['The Ghost'] })
    expect(c.aliases).toEqual(sampleCase.aliases)
    expect(c.country).toBe('Testland')
  })

  it('sin alias en la traducción conserva los del original', () => {
    const { aliases: _aliases, ...sinAlias } = traduccion
    const c = applyTranslation(sampleCase, sinAlias as CaseTranslation)
    expect(c.aliases).toEqual(sampleCase.aliases)
  })

  it('un campo vacío cae al español', () => {
    const conHueco = {
      ...traduccion,
      summary: '   ',
      murders: [{ ...traduccion.murders[0], method: '' }, ...traduccion.murders.slice(1)],
    }
    const c = applyTranslation(sampleCase, conHueco as CaseTranslation)
    expect(c.summary).toBe(sampleCase.summary)
    expect(c.murders[0].method).toBe('Método uno.')
    expect(c.murders[0].city).toBe('City One')
  })

  it('una region null en la traducción conserva la del original', () => {
    const conNull = {
      ...traduccion,
      murders: [
        traduccion.murders[0],
        { ...traduccion.murders[1], region: null },
        traduccion.murders[2],
      ],
    }
    const c = applyTranslation(sampleCase, conNull as CaseTranslation)
    expect(c.murders[1].region).toBe('Barrio Dos')
  })
})
