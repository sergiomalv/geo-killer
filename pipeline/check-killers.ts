import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { normalize } from '../src/game/matching.ts'

interface Entry { id: string; name: string; aliases: string[]; wiki: { es: string | null; en: string | null } }

type FetchResult =
  | { kind: 'ok'; text: string }
  | { kind: 'missing' }
  | { kind: 'network-error' }

const entries: Entry[] = JSON.parse(readFileSync('pipeline/killers-source.json', 'utf8'))
const failures: string[] = []
const seenIds = new Set<string>()

function sleep(ms: number) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    // busy-wait
  }
}

function fetchText(lang: 'es' | 'en', title: string, id: string): FetchResult {
  const path = `pipeline/sources/${id}.${lang}.txt`
  if (!existsSync(path)) {
    const MAX_ATTEMPTS = 3
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        execFileSync('bash', ['pipeline/fetch-wiki.sh', lang, title, id], { stdio: 'pipe' })
        break
      } catch (err) {
        const status = (err as { status?: number }).status
        if (status === 2) {
          // MISSING: el artículo no existe, no tiene sentido reintentar
          return { kind: 'missing' }
        }
        // status === 3 (u otro): error de red/HTTP, reintentar tras una pausa
        if (attempt === MAX_ATTEMPTS) {
          return { kind: 'network-error' }
        }
        sleep(5000)
      }
    }
  }
  return { kind: 'ok', text: readFileSync(path, 'utf8').toLowerCase() }
}

for (const e of entries) {
  // Check for duplicate IDs
  if (seenIds.has(e.id)) {
    failures.push(`${e.id}: ID duplicado`)
    continue
  }
  seenIds.add(e.id)

  const results = (['es', 'en'] as const)
    .filter((lang) => e.wiki[lang])
    .map((lang) => {
      sleep(300)
      return fetchText(lang, e.wiki[lang]!, e.id)
    })

  const texts = results
    .filter((r): r is Extract<FetchResult, { kind: 'ok' }> => r.kind === 'ok')
    .map((r) => r.text)

  if (texts.length === 0) {
    if (results.some((r) => r.kind === 'network-error')) {
      failures.push(`${e.id}: error de red tras 3 intentos`)
    } else {
      failures.push(`${e.id}: ningún artículo de Wikipedia encontrado`)
    }
    continue
  }

  if (!texts.some((t) => t.includes(e.name.toLowerCase()))) {
    failures.push(`${e.id}: el nombre "${e.name}" no aparece en el artículo`)
  }

  if ([e.name, ...e.aliases].every((n) => normalize(n) === '')) {
    failures.push(`${e.id}: ningún nombre sobrevive a normalize() (usar transliteración latina)`)
  }

  for (const alias of e.aliases) {
    if (!texts.some((t) => t.includes(alias.toLowerCase()))) {
      failures.push(`${e.id}: el alias "${alias}" no aparece en ningún artículo`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  console.error(`\n${failures.length} fallo(s)`)
  process.exit(1)
}
console.log(`OK: ${entries.length} entradas verificadas`)
