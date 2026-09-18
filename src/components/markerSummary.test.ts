import { describe, expect, it } from 'vitest'
import { collapsedLabel, shouldCollapse } from './markerSummary'
import { translate, type Key, type Params } from '../i18n'
import type { Lang } from '../i18n/lang'

const t = (lang: Lang) => (key: Key, params?: Params) => translate(lang, key, params)
const es = t('es')
const en = t('en')

describe('shouldCollapse', () => {
  it('enumera los grupos pequeños', () => {
    expect(shouldCollapse(1)).toBe(false)
    expect(shouldCollapse(3)).toBe(false)
  })

  it('colapsa a partir de cuatro asesinatos en el mismo punto', () => {
    expect(shouldCollapse(4)).toBe(true)
    expect(shouldCollapse(8)).toBe(true)
  })
})

describe('collapsedLabel', () => {
  it('sin cifra total usa los asesinatos del grupo', () => {
    expect(collapsedLabel(5, null, es)).toBe('5 asesinatos')
  })

  it('con cifra total mayor la usa a ella', () => {
    expect(collapsedLabel(8, 100, es)).toBe('100 asesinatos')
  })

  it('ignora una cifra total que no supera al grupo', () => {
    expect(collapsedLabel(6, 4, es)).toBe('6 asesinatos')
  })

  it('concuerda en singular', () => {
    expect(collapsedLabel(1, null, es)).toBe('1 asesinato')
  })

  it('en inglés usa el catálogo inglés', () => {
    const plural = collapsedLabel(5, null, en)
    const singular = collapsedLabel(1, null, en)
    expect(plural).toContain('5')
    expect(plural).not.toBe('5 asesinatos')
    expect(singular).toContain('1')
    expect(singular).not.toBe(plural.replace('5', '1'))
  })

  it('la regla de toll no depende del idioma', () => {
    expect(collapsedLabel(8, 100, en)).toContain('100')
  })
})
