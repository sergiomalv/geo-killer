import type { Murder } from '../data/schema'
import { translate } from '../i18n'
import type { Lang } from '../i18n/lang'

export function formatDate(m: Pick<Murder, 'date' | 'datePrecision'>, lang: Lang): string {
  if (m.date === null || m.datePrecision === null) return translate(lang, 'date.unknown')
  const [y, mo, d] = m.date.split('-')
  if (m.datePrecision === 'year') return y
  if (m.datePrecision === 'month') return `${mo}/${y}`
  return lang === 'en' ? `${mo}/${d}/${y}` : `${d}/${mo}/${y}`
}
