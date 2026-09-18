import type { Case } from './schema'
import type { Lang } from '../i18n/lang'

const loaders = import.meta.glob<Case>('./cases/*.json', { import: 'default' })

export async function loadCase(id: string, _lang: Lang = 'es'): Promise<Case | null> {
  const loader = loaders[`./cases/${id}.json`]
  if (!loader) return null
  return loader()
}

export function availableCaseIds(): string[] {
  return Object.keys(loaders)
    .map((path) => path.replace('./cases/', '').replace('.json', ''))
    .sort()
}
