/** Idiomas del juego. Vive en su propio módulo para que `src/data/` lo importe sin arrastrar React. */
export type Lang = 'es' | 'en'

export const LANGS: Lang[] = ['es', 'en']

export function isLang(value: unknown): value is Lang {
  return value === 'es' || value === 'en'
}
