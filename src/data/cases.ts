import type { Case } from './schema'

const loaders = import.meta.glob<Case>('./cases/*.json', { import: 'default' })

export async function loadCase(id: string): Promise<Case | null> {
  const loader = loaders[`./cases/${id}.json`]
  if (!loader) return null
  return loader()
}

export function availableCaseIds(): string[] {
  return Object.keys(loaders)
    .map((path) => path.replace('./cases/', '').replace('.json', ''))
    .sort()
}
