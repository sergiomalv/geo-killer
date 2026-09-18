import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { caseSchema } from '../src/data/schema.ts'

const verdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(['approved', 'rejected']),
  validator: z.string().min(1).optional(),
  caseErrors: z.array(z.string()).optional(),
  murderVerdicts: z.array(
    z.object({ index: z.number().int().min(0), ok: z.boolean(), errors: z.array(z.string()).optional() }),
  ),
  notes: z.string().optional(),
})

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote.ts <id>')
  process.exit(1)
}

let candidateRaw: string
try {
  candidateRaw = readFileSync(`pipeline/candidates/${id}.json`, 'utf8')
} catch {
  console.error(`No se encuentra pipeline/candidates/${id}.json`)
  process.exit(1)
}

let verdictRaw: string
try {
  verdictRaw = readFileSync(`pipeline/verdicts/${id}.json`, 'utf8')
} catch {
  console.error(`No se encuentra pipeline/verdicts/${id}.json`)
  process.exit(1)
}

const candidate = JSON.parse(candidateRaw)
const verdictJson = JSON.parse(verdictRaw)

const verdictParsed = verdictSchema.safeParse(verdictJson)
if (!verdictParsed.success) {
  console.error(`El veredicto de ${id} no tiene la forma esperada:\n${z.prettifyError(verdictParsed.error)}`)
  process.exit(1)
}
const verdict = verdictParsed.data

const seenIndexes = new Set<number>()
for (const m of verdict.murderVerdicts) {
  if (seenIndexes.has(m.index)) {
    console.error(`El veredicto de ${id} tiene el índice ${m.index} repetido en murderVerdicts`)
    process.exit(1)
  }
  seenIndexes.add(m.index)
}

const expectedCount = Array.isArray(candidate.murders) ? candidate.murders.length : 0
const missing: number[] = []
for (let i = 0; i < expectedCount; i++) {
  if (!seenIndexes.has(i)) missing.push(i)
}
const outOfRange = [...seenIndexes].filter((i) => i < 0 || i >= expectedCount)
if (missing.length > 0 || outOfRange.length > 0) {
  const detalles = [
    ...missing.map((i) => `falta ${i}`),
    ...outOfRange.map((i) => `${i} fuera de rango`),
  ]
  console.error(`El veredicto de ${id} no cubre todos los asesinatos (faltan: ${detalles.join(', ')})`)
  process.exit(1)
}

if (verdict.verdict !== 'approved') {
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve`)
  process.exit(1)
}

const okIndexes = new Set(verdict.murderVerdicts.filter((m) => m.ok).map((m) => m.index))
const murders = (candidate.murders as unknown[]).filter((_, i) => okIndexes.has(i))

const today = new Date()
const validatedAt = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-')

const promoted = {
  ...candidate,
  murders,
  validation: {
    status: 'approved',
    validatedAt,
    validator: verdict.validator ?? 'claude-sonnet-5',
    notes: verdict.notes ?? '',
  },
}

const parsed = caseSchema.safeParse(promoted)
if (!parsed.success) {
  console.error(`El caso promovido no cumple el esquema:\n${z.prettifyError(parsed.error)}`)
  process.exit(1)
}

writeFileSync(`src/data/cases/${id}.json`, JSON.stringify(parsed.data, null, 2) + '\n')
console.log(`Promovido src/data/cases/${id}.json con ${murders.length} asesinatos`)
