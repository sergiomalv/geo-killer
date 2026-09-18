import { useEffect, useState } from 'react'
import { loadCase } from '../data/cases'
import type { Case, KillerEntry } from '../data/schema'
import { infiniteGuess, nextInfiniteCase, startInfinite, type InfiniteState } from '../game/infinite'
import { loadInfinite, saveInfinite } from '../game/storage'
import { GameBoard } from '../components/GameBoard'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLang, useT } from '../i18n'

interface Props {
  killers: KillerEntry[]
  availableIds: string[]
  random?: () => number
}

type Loaded = { caseId: string; kind: 'error' } | { caseId: string; kind: 'ready'; caseData: Case }

function initialState(available: string[], random: () => number): InfiniteState {
  const saved = loadInfinite()
  return saved && available.includes(saved.caseId) ? saved : startInfinite(available, random)
}

export function InfinitePage({ killers, availableIds, random = Math.random }: Props) {
  const [state, setState] = useState(() => initialState(availableIds, random))
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const isLoading = loaded === null || loaded.caseId !== state.caseId
  const lang = useLang()
  const t = useT()

  useEffect(() => {
    saveInfinite(state)
  }, [state])

  useEffect(() => {
    let cancelled = false
    loadCase(state.caseId, lang)
      .then((caseData) => {
        if (cancelled) return
        setLoaded(caseData ? { caseId: state.caseId, kind: 'ready', caseData } : { caseId: state.caseId, kind: 'error' })
      })
      .catch(() => { if (!cancelled) setLoaded({ caseId: state.caseId, kind: 'error' }) })
    return () => { cancelled = true }
  }, [state.caseId, lang])

  function handleGuess(killerId: string) {
    setState((prev) => infiniteGuess(prev, killerId))
  }

  function handleNext() {
    // Desde el estado de error el caso sigue "playing"; se marca como terminado para poder saltarlo.
    // La racha no cambia: un fallo de carga no es culpa del jugador.
    setState((prev) => nextInfiniteCase({ ...prev, status: prev.status === 'playing' ? 'lost' : prev.status }, availableIds, random))
  }

  const nextButton = (
    <button type="button" className="next-case" onClick={handleNext}>{t('infinite.next')}</button>
  )

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <nav className="page-nav">
          <span className="page-day">{t('infinite.streak', { n: state.streak })}</span>
          <a href="#">{t('infinite.dailyLink')}</a>
          <LanguageToggle />
        </nav>
      </header>
      {state.wrapped ? <p className="page-notice" aria-live="polite">{t('infinite.wrapped')}</p> : null}
      {isLoading ? <p>{t('app.loading')}</p> : null}
      {!isLoading && loaded.kind === 'error' ? (
        <>
          <p>{t('infinite.loadError')}</p>
          {nextButton}
        </>
      ) : null}
      {!isLoading && loaded.kind === 'ready' ? (
        <GameBoard
          caseData={loaded.caseData}
          killers={killers}
          state={state}
          onGuess={handleGuess}
          afterResult={nextButton}
        />
      ) : null}
    </main>
  )
}
