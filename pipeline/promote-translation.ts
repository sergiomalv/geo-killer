import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { caseSchema, caseTranslationSchema } from '../src/data/schema.ts'

const verdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(['approved', 'rejected']),
  validator: z.string().min(1).optional(),
  caseErrors: z.array(z.string()).optional(),
  fieldVerdicts: z.array(
    z.object({ path: z.string().min(1), ok: z.boolean(), errors: z.array(z.string()).optional() }),
  ),
  notes: z.string().optional(),
})

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote-translation.ts <id>')
  process.exit(1)
}

function readJsonOrDie(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`No se puede leer ${path}: ${(e as Error).message}`)
    process.exit(1)
  }
}

const baseParsed = caseSchema.safeParse(readJsonOrDie(`src/data/cases/${id}.json`))
if (!baseParsed.success) {
  console.error(`El caso original de ${id} no cumple el esquema:\n${z.prettifyError(baseParsed.error)}`)
  process.exit(1)
}
const base = baseParsed.data

const translationParsed = caseTranslationSchema.safeParse(
  readJsonOrDie(`pipeline/translations/${id}.en.json`),
)
if (!translationParsed.success) {
  console.error(`La traducción de ${id} no cumple el esquema:\n${z.prettifyError(translationParsed.error)}`)
  process.exit(1)
}
const translation = translationParsed.data

const verdictParsed = verdictSchema.safeParse(
  readJsonOrDie(`pipeline/translations/verdicts/${id}.json`),
)
if (!verdictParsed.success) {
  console.error(`El veredicto de ${id} no tiene la forma esperada:\n${z.prettifyError(verdictParsed.error)}`)
  process.exit(1)
}
const verdict = verdictParsed.data

if (translation.id !== id || verdict.id !== id) {
  console.error(`Los ids no coinciden: argumento "${id}", traducción "${translation.id}", veredicto "${verdict.id}"`)
  process.exit(1)
}

if (translation.murders.length !== base.murders.length) {
  console.error(
    `La traducción de ${id} tiene ${translation.murders.length} asesinatos y el original ${base.murders.length}`,
  )
  process.exit(1)
}

const baseAliases = base.aliases.length
const trAliases = translation.aliases?.length ?? 0
if (trAliases !== baseAliases) {
  console.error(
    `La traducción de ${id} tiene ${trAliases} alias y el original ${baseAliases}`,
  )
  process.exit(1)
}

// El veredicto tiene que cubrir exactamente los campos traducidos: ni de más ni de menos.
const expected = new Set<string>(['country', 'summary'])
if (translation.aliases !== undefined) {
  translation.aliases.forEach((_, i) => expected.add(`aliases[${i}]`))
}
translation.murders.forEach((_, i) => {
  for (const field of ['city', 'region', 'country', 'method']) {
    expected.add(`murders[${i}].${field}`)
  }
})

const seen = new Set<string>()
for (const fv of verdict.fieldVerdicts) {
  if (seen.has(fv.path)) {
    console.error(`El veredicto de ${id} repite el campo "${fv.path}"`)
    process.exit(1)
  }
  seen.add(fv.path)
}

const missing = [...expected].filter((p) => !seen.has(p))
const extra = [...seen].filter((p) => !expected.has(p))
if (missing.length > 0 || extra.length > 0) {
  const detalles = [
    ...missing.map((p) => `falta ${p}`),
    ...extra.map((p) => `sobra ${p}`),
  ]
  console.error(`El veredicto de ${id} no cubre los campos traducidos (${detalles.join(', ')})`)
  process.exit(1)
}

const caseErrors = verdict.caseErrors ?? []
const failed = verdict.fieldVerdicts.filter((fv) => !fv.ok)
if (verdict.verdict !== 'approved' || caseErrors.length > 0 || failed.length > 0) {
  const motivos = [
    ...caseErrors,
    ...failed.map((fv) => `${fv.path}: ${(fv.errors ?? []).join('; ')}`),
  ]
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve`)
  if (motivos.length > 0) console.error(motivos.join('\n'))
  process.exit(1)
}

mkdirSync('src/data/cases/en', { recursive: true })
writeFileSync(`src/data/cases/en/${id}.json`, JSON.stringify(translation, null, 2) + '\n')
console.log(`Promovido src/data/cases/en/${id}.json con ${translation.murders.length} asesinatos`)
