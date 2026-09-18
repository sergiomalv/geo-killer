import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { tollSchema, tollsSchema } from '../src/data/schema.ts'

const verdictSchema = z.object({
  id: z.string(),
  verdict: z.enum(['approved', 'rejected']),
  validator: z.string().min(1).optional(),
  errors: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote-tolls.ts <id>')
  process.exit(1)
}

function read(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    console.error(`No se encuentra ${path}`)
    process.exit(1)
  }
  throw new Error('unreachable')
}

const candidate = JSON.parse(read(`pipeline/toll-candidates/${id}.json`))
const verdictParsed = verdictSchema.safeParse(JSON.parse(read(`pipeline/toll-verdicts/${id}.json`)))
if (!verdictParsed.success) {
  console.error(`El veredicto de ${id} no tiene la forma esperada:\n${z.prettifyError(verdictParsed.error)}`)
  process.exit(1)
}
const verdict = verdictParsed.data

if (verdict.id !== id) {
  console.error(`El veredicto dice id "${verdict.id}" pero se pidió "${id}"`)
  process.exit(1)
}
if (verdict.verdict !== 'approved') {
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve: ${(verdict.errors ?? []).join('; ')}`)
  process.exit(1)
}
if ((verdict.errors ?? []).length > 0) {
  console.error(`El veredicto de ${id} dice "approved" pero trae errores: ${(verdict.errors ?? []).join('; ')}`)
  process.exit(1)
}

const today = new Date()
const validatedAt = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-')

const promoted = tollSchema.safeParse({
  ...candidate,
  validation: {
    status: 'approved',
    validatedAt,
    validator: verdict.validator ?? 'claude-sonnet-5',
    notes: verdict.notes ?? '',
  },
})
if (!promoted.success) {
  console.error(`La cifra promovida no cumple el esquema:\n${z.prettifyError(promoted.error)}`)
  process.exit(1)
}

const current = tollsSchema.parse(JSON.parse(readFileSync('src/data/tolls.json', 'utf8')))
const next = [...current.filter((t) => t.id !== id), promoted.data].sort((a, b) => a.id.localeCompare(b.id))
writeFileSync('src/data/tolls.json', JSON.stringify(next, null, 2) + '\n')
console.log(`Promovido ${id}: ${promoted.data.confirmed} confirmadas (${next.length} en total)`)
