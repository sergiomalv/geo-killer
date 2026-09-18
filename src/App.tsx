import { useEffect, useState } from 'react'
import killersJson from './data/killers.json'
import scheduleJson from './data/schedule.json'
import { loadCase } from './data/cases'
import { killersSchema, scheduleSchema, type Case } from './data/schema'
import { caseIdForDay, dayNumber } from './game/schedule'
import { TodayPage } from './pages/TodayPage'

const killers = killersSchema.parse(killersJson)
const schedule = scheduleSchema.parse(scheduleJson)

type Loaded = { kind: 'loading' } | { kind: 'missing' } | { kind: 'ready'; caseData: Case }

export default function App() {
  const day = dayNumber(new Date(), schedule.launchDate)
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadCase(caseIdForDay(day, schedule.order)).then((caseData) => {
      if (cancelled) return
      if (caseData === null) {
        console.error(`No hay fichero de caso para el día ${day}`)
        setLoaded({ kind: 'missing' })
      } else {
        setLoaded({ kind: 'ready', caseData })
      }
    })
    return () => { cancelled = true }
  }, [day])

  if (loaded.kind === 'loading') return <main className="page"><p>Abriendo expediente…</p></main>
  if (loaded.kind === 'missing') return <main className="page"><p>Hoy no hay reto. Vuelve mañana.</p></main>
  return <TodayPage day={day} caseData={loaded.caseData} killers={killers} />
}
