import { useEffect, useState } from 'react'
import type { Case, KillerEntry } from '../data/schema'
import { clueLevel, createGame, submitGuess, type GameState } from '../game/engine'
import { loadProgress, saveProgress } from '../game/storage'
import { AttemptsBar } from '../components/AttemptsBar'
import { CaseMap } from '../components/CaseMap'
import { ClueList } from '../components/ClueList'
import { GuessInput } from '../components/GuessInput'
import { ResultCard } from '../components/ResultCard'

interface Props {
  day: number
  caseData: Case
  killers: KillerEntry[]
}

function initialState(day: number, caseId: string): GameState {
  const saved = loadProgress(day)
  return saved && saved.caseId === caseId ? saved : createGame(caseId)
}

export function TodayPage({ day, caseData, killers }: Props) {
  const [state, setState] = useState(() => initialState(day, caseData.id))
  const level = clueLevel(state)
  const finished = state.status !== 'playing'

  useEffect(() => {
    saveProgress(day, state)
  }, [day, state])

  function handleGuess(killerId: string) {
    setState((prev) => submitGuess(prev, killerId))
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <span className="page-day">Caso #{day + 1}</span>
      </header>
      <CaseMap murders={caseData.murders} level={level} />
      <div className="page-controls">
        <AttemptsBar guesses={state.guesses} status={state.status} />
        <GuessInput killers={killers} disabled={finished} onGuess={handleGuess} />
      </div>
      {finished ? (
        <ResultCard caseData={caseData} status={state.status as 'won' | 'lost'} attempts={state.guesses.length} />
      ) : null}
      <ClueList murders={caseData.murders} level={level} />
    </main>
  )
}
