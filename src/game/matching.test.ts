import { describe, expect, it } from 'vitest'
import { matchesKiller, normalize, searchKillers } from './matching'

const killers = [
  { id: 'david-berkowitz', name: 'David Berkowitz', aliases: ['El hijo de Sam', 'Son of Sam'] },
  { id: 'ted-bundy', name: 'Ted Bundy', aliases: [] },
  { id: 'jack-el-destripador', name: 'Jack el Destripador', aliases: ['Jack the Ripper'] },
]

describe('normalize', () => {
  it('quita acentos, mayúsculas y espacios sobrantes', () => {
    expect(normalize('  El  HIJO de Sám ')).toBe('el hijo de sam')
  })
  it('convierte puntuación en espacios', () => {
    expect(normalize('Jack, el-Destripador!')).toBe('jack el destripador')
  })
})

describe('matchesKiller', () => {
  it('acepta el nombre canónico', () => {
    expect(matchesKiller('david berkowitz', killers[0])).toBe(true)
  })
  it('acepta un alias con acentos distintos', () => {
    expect(matchesKiller('el hijo de sám', killers[0])).toBe(true)
  })
  it('rechaza coincidencia parcial', () => {
    expect(matchesKiller('berkowitz', killers[0])).toBe(false)
  })
  it('rechaza cadena vacía', () => {
    expect(matchesKiller('   ', killers[0])).toBe(false)
  })
})

describe('searchKillers', () => {
  it('devuelve vacío para consulta vacía', () => {
    expect(searchKillers('', killers)).toEqual([])
  })
  it('busca por fragmento de nombre o alias', () => {
    expect(searchKillers('sam', killers).map((k) => k.id)).toEqual(['david-berkowitz'])
    expect(searchKillers('ripper', killers).map((k) => k.id)).toEqual(['jack-el-destripador'])
  })
  it('respeta el límite', () => {
    expect(searchKillers('a', killers, 2)).toHaveLength(2)
  })
})
