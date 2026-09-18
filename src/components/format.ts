import type { Murder } from '../data/schema'

export function formatDate(m: Pick<Murder, 'date' | 'datePrecision'>): string {
  if (m.date === null || m.datePrecision === null) return 'Fecha desconocida'
  const [y, mo, d] = m.date.split('-')
  if (m.datePrecision === 'year') return y
  if (m.datePrecision === 'month') return `${mo}/${y}`
  return `${d}/${mo}/${y}`
}
