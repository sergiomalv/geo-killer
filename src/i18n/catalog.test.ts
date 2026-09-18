import { describe, expect, it } from 'vitest'
import es from './es.json'
import en from './en.json'

const esCatalog = es as Record<string, string>
const enCatalog = en as Record<string, string>

/** Devuelve los marcadores `{n}`, `{max}`… de una cadena, ordenados. */
function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/g) ?? []).sort()
}

describe('catálogos de la interfaz', () => {
  it('en.json tiene exactamente las mismas claves que es.json', () => {
    expect(Object.keys(enCatalog).sort()).toEqual(Object.keys(esCatalog).sort())
  })

  it('no hay cadenas vacías en español', () => {
    for (const [key, value] of Object.entries(esCatalog)) {
      expect(value.trim(), `clave ${key}`).not.toBe('')
    }
  })

  it('no hay cadenas vacías en inglés', () => {
    for (const [key, value] of Object.entries(enCatalog)) {
      expect(value.trim(), `clave ${key}`).not.toBe('')
    }
  })

  it('los marcadores coinciden clave a clave', () => {
    for (const [key, value] of Object.entries(esCatalog)) {
      expect(placeholders(enCatalog[key] ?? ''), `clave ${key}`).toEqual(placeholders(value))
    }
  })

  it('el inglés no se ha dejado sin traducir', () => {
    // Las claves con plural comparten forma en los dos idiomas solo por accidente;
    // que TODAS sean idénticas significaría que en.json es una copia de es.json.
    const iguales = Object.entries(esCatalog).filter(([key, value]) => enCatalog[key] === value)
    expect(iguales.length).toBeLessThan(Object.keys(esCatalog).length / 2)
  })
})
