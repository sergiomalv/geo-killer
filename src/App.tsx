import { useEffect, useState } from 'react'
import killersJson from './data/killers.json'
import scheduleJson from './data/schedule.json'
import { availableCaseIds, loadCase } from './data/cases'
import { killersSchema, scheduleSchema, type Case } from './data/schema'
import { caseIdForDay, dayNumber } from './game/schedule'
import { DuelPage } from './pages/DuelPage'
import { InfinitePage } from './pages/InfinitePage'
import { TodayPage } from './pages/TodayPage'
import { tolls } from './data/tolls'
import type { Mode } from './components/ModeTabs'
import { useLang, useT } from './i18n'

const killers = killersSchema.parse(killersJson)
const schedule = scheduleSchema.parse(scheduleJson)

type Loaded = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ready'; caseData: Case }

function readMode(): Mode {
  if (window.location.hash === '#infinito') return 'infinite'
  if (window.location.hash === '#mas-o-menos') return 'duel'
  return 'daily'
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
  const lang = useLang()
  const t = useT()
  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadCase(caseIdForDay(day, schedule.order), lang).then((caseData) => {
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
  }, [day, lang])

  if (loaded.kind === 'loading') return <main className="page"><p>{t('app.loading')}</p></main>
  if (loaded.kind === 'missing') return <main className="page"><p>{t('app.noCase')}</p></main>
  if (loaded.kind === 'error') return <main className="page"><p>{t('app.loadError')}</p></main>
  return <TodayPage key={day} day={day} caseData={loaded.caseData} killers={killers} />
}

export default function App() {
  const mode = useHashMode()
  if (mode === 'duel') return <DuelPage tolls={tolls} killers={killers} />
  if (mode === 'infinite') return <InfinitePage killers={killers} availableIds={availableCaseIds()} />
  return <DailyApp />
}
