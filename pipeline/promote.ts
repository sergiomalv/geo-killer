import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { caseSchema } from '../src/data/schema.ts'

const id = process.argv[2]
if (!id) {
  console.error('Uso: node pipeline/promote.ts <id>')
  process.exit(1)
}

const candidate = JSON.parse(readFileSync(`pipeline/candidates/${id}.json`, 'utf8'))
const verdict = JSON.parse(readFileSync(`pipeline/verdicts/${id}.json`, 'utf8'))

if (verdict.verdict !== 'approved') {
  console.error(`El veredicto de ${id} es "${verdict.verdict}", no se promueve`)
  process.exit(1)
}

const okIndexes = new Set(
  (verdict.murderVerdicts as { index: number; ok: boolean }[]).filter((m) => m.ok).map((m) => m.index),
)
const murders = (candidate.murders as unknown[]).filter((_, i) => okIndexes.has(i))

const promoted = {
  ...candidate,
  murders,
  validation: {
    status: 'approved',
    validatedAt: new Date().toISOString().slice(0, 10),
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
