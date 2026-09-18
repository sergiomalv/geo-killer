import { useEffect, useState } from 'react'
import { loadCase } from '../data/cases'
import type { Case, KillerEntry } from '../data/schema'
import { infiniteGuess, nextInfiniteCase, startInfinite, type InfiniteState } from '../game/infinite'
import { loadInfinite, saveInfinite } from '../game/storage'
import { GameBoard } from '../components/GameBoard'

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

  useEffect(() => {
    saveInfinite(state)
  }, [state])

  useEffect(() => {
    let cancelled = false
    loadCase(state.caseId)
      .then((caseData) => {
        if (cancelled) return
        setLoaded(caseData ? { caseId: state.caseId, kind: 'ready', caseData } : { caseId: state.caseId, kind: 'error' })
      })
      .catch(() => { if (!cancelled) setLoaded({ caseId: state.caseId, kind: 'error' }) })
    return () => { cancelled = true }
  }, [state.caseId])

  function handleGuess(killerId: string) {
    setState((prev) => infiniteGuess(prev, killerId))
  }

  function handleNext() {
    setState((prev) => nextInfiniteCase({ ...prev, status: prev.status === 'playing' ? 'lost' : prev.status }, availableIds, random))
  }

  const nextButton = (
    <button type="button" className="next-case" onClick={handleNext}>Siguiente caso</button>
  )

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <nav className="page-nav">
          <span className="page-day">Racha: {state.streak}</span>
          <a href="#">Reto diario</a>
        </nav>
      </header>
      {state.wrapped ? <p className="page-notice">Vuelta completa: los casos se repiten.</p> : null}
      {isLoading ? <p>Abriendo expediente…</p> : null}
      {!isLoading && loaded.kind === 'error' ? (
        <>
          <p>No se ha podido cargar el caso.</p>
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
