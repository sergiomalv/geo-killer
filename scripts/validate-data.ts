import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { caseSchema, killersSchema, scheduleSchema } from '../src/data/schema.ts'

const DATA_DIR = join(process.cwd(), 'src', 'data')
const errors: string[] = []

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function report(label: string, result: { success: boolean; error?: z.ZodError }) {
  if (!result.success && result.error) {
    errors.push(`${label}:\n${z.prettifyError(result.error)}`)
  }
}

const killersResult = killersSchema.safeParse(readJson(join(DATA_DIR, 'killers.json')))
report('killers.json', killersResult)
const killerIds = new Set(killersResult.success ? killersResult.data.map((k) => k.id) : [])

const scheduleResult = scheduleSchema.safeParse(readJson(join(DATA_DIR, 'schedule.json')))
report('schedule.json', scheduleResult)

const caseIds = new Set<string>()
const casesDir = join(DATA_DIR, 'cases')
for (const file of readdirSync(casesDir).filter((f) => f.endsWith('.json')).sort()) {
  const result = caseSchema.safeParse(readJson(join(casesDir, file)))
  report(`cases/${file}`, result)
  if (!result.success) continue
  const c = result.data
  caseIds.add(c.id)
  if (file !== `${c.id}.json`) errors.push(`cases/${file}: el nombre del fichero no coincide con id "${c.id}"`)
  if (!killerIds.has(c.id)) errors.push(`cases/${file}: id "${c.id}" no está en killers.json`)
}

if (scheduleResult.success) {
  for (const id of scheduleResult.data.order) {
    if (!caseIds.has(id)) errors.push(`schedule.json: "${id}" no tiene fichero en cases/`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n\n'))
  console.error(`\n${errors.length} problema(s) encontrado(s)`)
  process.exit(1)
}
console.log(`OK: ${caseIds.size} casos, ${killerIds.size} killers, ${scheduleResult.success ? scheduleResult.data.order.length : 0} días programados`)
