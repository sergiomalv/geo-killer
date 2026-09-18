import type { Case, CaseTranslation } from './schema'

/** Una traducción vacía o en blanco no sustituye: se cae al texto español. */
function pick(traducido: string | null | undefined, original: string): string {
  return typeof traducido === 'string' && traducido.trim() !== '' ? traducido : original
}

/**
 * Quita alias que coinciden ignorando mayúsculas y espacios sobrantes, conservando la
 * primera aparición (con su grafía original) y el orden. Varios casos listan el mismo
 * apodo en español y en inglés para que el buscador acepte las dos formas; al traducir
 * elemento a elemento esas dos formas colapsan en la misma cadena inglesa.
 */
function dedupeAliases(aliases: string[]): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []
  for (const alias of aliases) {
    const clave = alias.trim().toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    resultado.push(alias)
  }
  return resultado
}

/**
 * Fusiona un caso español con su traducción, campo a campo. Es la red de seguridad en
 * ejecución: si algo no cuadra devuelve español en vez de romper la partida. El filtro
 * de verdad es `npm run validate:data`, que falla el build.
 */
export function applyTranslation(base: Case, tr: CaseTranslation): Case {
  if (tr.murders.length !== base.murders.length) return base

  const aliases = tr.aliases !== undefined && tr.aliases.length === base.aliases.length
    ? dedupeAliases(base.aliases.map((alias, i) => pick(tr.aliases![i], alias)))
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
