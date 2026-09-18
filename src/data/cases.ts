import type { Case, CaseTranslation } from './schema'
import type { Lang } from '../i18n/lang'
import { applyTranslation } from './translate'

// El patrón `./cases/*.json` no desciende a subdirectorios, así que `en/` queda fuera
// y `availableCaseIds()` sigue listando solo casos reales.
const loaders = import.meta.glob<Case>('./cases/*.json', { import: 'default' })
const translationLoaders = import.meta.glob<CaseTranslation>('./cases/en/*.json', { import: 'default' })

export async function loadCase(id: string, lang: Lang = 'es'): Promise<Case | null> {
  const loader = loaders[`./cases/${id}.json`]
  if (!loader) return null
  const base = await loader()
  if (lang === 'es') return base
  const translationLoader = translationLoaders[`./cases/${lang}/${id}.json`]
  if (!translationLoader) return base
  return applyTranslation(base, await translationLoader())
}

export function availableCaseIds(): string[] {
  return Object.keys(loaders)
    .map((path) => path.replace('./cases/', '').replace('.json', ''))
    .sort()
}
