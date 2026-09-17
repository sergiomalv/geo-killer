import type { KillerEntry } from '../data/schema'

export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function namesOf(killer: KillerEntry): string[] {
  return [killer.name, ...killer.aliases].map(normalize)
}

export function matchesKiller(guess: string, killer: KillerEntry): boolean {
  const g = normalize(guess)
  return g.length > 0 && namesOf(killer).includes(g)
}

export function searchKillers(query: string, killers: KillerEntry[], limit = 8): KillerEntry[] {
  const q = normalize(query)
  if (q.length === 0) return []
  const results: KillerEntry[] = []
  for (const killer of killers) {
    if (namesOf(killer).some((n) => n.includes(q))) {
      results.push(killer)
      if (results.length >= limit) break
    }
  }
  return results
}
