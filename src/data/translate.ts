import type { Case, CaseTranslation } from './schema'

/** Una traducción vacía o en blanco no sustituye: se cae al texto español. */
function pick(traducido: string | null | undefined, original: string): string {
  return typeof traducido === 'string' && traducido.trim() !== '' ? traducido : original
}

/**
 * Fusiona un caso español con su traducción, campo a campo. Es la red de seguridad en
 * ejecución: si algo no cuadra devuelve español en vez de romper la partida. El filtro
 * de verdad es `npm run validate:data`, que falla el build.
 */
export function applyTranslation(base: Case, tr: CaseTranslation): Case {
  if (tr.murders.length !== base.murders.length) return base

  const aliases = tr.aliases !== undefined && tr.aliases.length === base.aliases.length
    ? base.aliases.map((alias, i) => pick(tr.aliases![i], alias))
    : base.aliases

  return {
    ...base,
    aliases,
    country: pick(tr.country, base.country),
    summary: pick(tr.summary, base.summary),
    murders: base.murders.map((m, i) => {
      const t = tr.murders[i]
      return {
        ...m,
        city: pick(t.city, m.city),
        region: t.region !== null && t.region.trim() !== '' ? t.region : m.region,
        country: pick(t.country, m.country),
        method: pick(t.method, m.method),
      }
    }),
  }
}
