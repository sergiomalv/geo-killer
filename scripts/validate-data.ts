import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { caseSchema, killersSchema, scheduleSchema } from '../src/data/schema.ts'

const DATA_DIR = join(process.cwd(), 'src', 'data')
const errors: string[] = []

function readJson(path: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    errors.push(`${label}: JSON inválido (${(e as Error).message})`)
    return undefined
  }
}

function report(label: string, result: { success: boolean; error?: z.ZodError }) {
  if (!result.success && result.error) {
    errors.push(`${label}:\n${z.prettifyError(result.error)}`)
  }
}

const killersJson = readJson(join(DATA_DIR, 'killers.json'), 'killers.json')
const killersResult = killersJson === undefined ? { success: false as const } : killersSchema.safeParse(killersJson)
report('killers.json', killersResult)
const killerIds = new Set(killersResult.success ? killersResult.data.map((k) => k.id) : [])

const scheduleJson = readJson(join(DATA_DIR, 'schedule.json'), 'schedule.json')
const scheduleResult = scheduleJson === undefined ? { success: false as const } : scheduleSchema.safeParse(scheduleJson)
report('schedule.json', scheduleResult)

const caseIds = new Set<string>()
const casesDir = join(DATA_DIR, 'cases')
if (!existsSync(casesDir)) {
  errors.push('cases/: directorio no encontrado')
} else {
  for (const file of readdirSync(casesDir).filter((f) => f.endsWith('.json')).sort()) {
    const label = `cases/${file}`
    const caseJson = readJson(join(casesDir, file), label)
    if (caseJson === undefined) continue
    const result = caseSchema.safeParse(caseJson)
    report(label, result)
    if (!result.success) continue
    const c = result.data
    caseIds.add(c.id)
    if (file !== `${c.id}.json`) errors.push(`${label}: el nombre del fichero no coincide con id "${c.id}"`)
    if (!killerIds.has(c.id)) errors.push(`${label}: id "${c.id}" no está en killers.json`)
  }
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
