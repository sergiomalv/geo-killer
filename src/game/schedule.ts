const MS_PER_DAY = 86_400_000

/** Días completos entre launchDate (YYYY-MM-DD) y la fecha local de `today`, nunca negativo. */
export function dayNumber(today: Date, launchDate: string): number {
  const [y, m, d] = launchDate.split('-').map(Number)
  const launchUtc = Date.UTC(y, m - 1, d)
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.floor((todayUtc - launchUtc) / MS_PER_DAY))
}

export function caseIdForDay(day: number, order: string[]): string {
  return order[day % order.length]
}
