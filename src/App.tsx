import { useEffect, useState } from 'react'
import killersJson from './data/killers.json'
import scheduleJson from './data/schedule.json'
import { availableCaseIds, loadCase } from './data/cases'
import { killersSchema, scheduleSchema, type Case } from './data/schema'
import { caseIdForDay, dayNumber } from './game/schedule'
import { InfinitePage } from './pages/InfinitePage'
import { TodayPage } from './pages/TodayPage'

const killers = killersSchema.parse(killersJson)
const schedule = scheduleSchema.parse(scheduleJson)

type Loaded = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ready'; caseData: Case }

type Mode = 'daily' | 'infinite'

function readMode(): Mode {
  return window.location.hash === '#infinito' ? 'infinite' : 'daily'
}

function useHashMode(): Mode {
  const [mode, setMode] = useState<Mode>(readMode)
  useEffect(() => {
    const onChange = () => setMode(readMode())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return mode
}

function DailyApp() {
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
    }).catch(() => {
      if (!cancelled) setLoaded({ kind: 'error' })
    })
    return () => { cancelled = true }
  }, [day])

  if (loaded.kind === 'loading') return <main className="page"><p>Abriendo expediente…</p></main>
  if (loaded.kind === 'missing') return <main className="page"><p>Hoy no hay reto. Vuelve mañana.</p></main>
  if (loaded.kind === 'error') return <main className="page"><p>No se ha podido cargar el caso. Comprueba la conexión y recarga.</p></main>
  return <TodayPage key={day} day={day} caseData={loaded.caseData} killers={killers} />
}

export default function App() {
  const mode = useHashMode()
  if (mode === 'infinite') return <InfinitePage killers={killers} availableIds={availableCaseIds()} />
  return <DailyApp />
}
