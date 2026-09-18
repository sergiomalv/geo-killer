import { describe, expect, it } from 'vitest'
import { collapsedLabel, shouldCollapse } from './markerSummary'

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
    expect(collapsedLabel(5, null)).toBe('5 asesinatos')
  })

  it('con cifra total mayor la usa a ella', () => {
    expect(collapsedLabel(8, 100)).toBe('100 asesinatos')
  })

  it('ignora una cifra total que no supera al grupo', () => {
    expect(collapsedLabel(6, 4)).toBe('6 asesinatos')
  })

  it('concuerda en singular', () => {
    expect(collapsedLabel(1, null)).toBe('1 asesinato')
  })
})
