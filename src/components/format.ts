import type { Murder } from '../data/schema'
import { FORBIDDEN_COUNTRY_CODES } from '../data/schema'
import { translate } from '../i18n'
import type { Lang } from '../i18n/lang'

export function formatDate(m: Pick<Murder, 'date' | 'datePrecision'>, lang: Lang): string {
  if (m.date === null || m.datePrecision === null) return translate(lang, 'date.unknown')
  const [y, mo, d] = m.date.split('-')
  if (m.datePrecision === 'year') return y
  if (m.datePrecision === 'month') return `${mo}/${y}`
  return lang === 'en' ? `${mo}/${d}/${y}` : `${d}/${mo}/${y}`
}

/**
 * Nombres de país a partir de códigos ISO. Se usa `Intl.DisplayNames` en vez de guardar los
 * nombres traducidos para no pasar nombres de país por el traductor automático.
 * Los códigos que `tollSchema` prohíbe se muestran tal cual en vez de traducirse: `SU` daría
 * "Rusia" y `ZZ` daría "Región desconocida", que son datos falsos con aspecto de buenos.
 * `fallback: 'none'` cubre además cualquier otro código que la API no reconozca.
 */
export function formatCountries(codes: string[], lang: Lang): string {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' })
  } catch {
    names = null
  }
  return codes
    .map((code) => {
      if (FORBIDDEN_COUNTRY_CODES.includes(code)) return code
      try {
        return names?.of(code) ?? code
      } catch {
        return code
      }
    })
    .join(' · ')
}
