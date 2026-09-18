import { useEffect, useState } from 'react'
import type { Case, KillerEntry } from '../data/schema'
import { createGame, submitGuess, type GameState } from '../game/engine'
import { loadProgress, saveProgress } from '../game/storage'
import { GameBoard } from '../components/GameBoard'

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
  const gameKey = `${day}:${caseData.id}`
  const [game, setGame] = useState(() => ({ key: gameKey, state: initialState(day, caseData.id) }))
  if (game.key !== gameKey) {
    setGame({ key: gameKey, state: initialState(day, caseData.id) })
  }
  const state = game.state

  useEffect(() => {
    if (game.key === gameKey) saveProgress(day, state)
  }, [day, state, game.key, gameKey])

  function handleGuess(killerId: string) {
    setGame((prev) => ({ ...prev, state: submitGuess(prev.state, killerId) }))
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <nav className="page-nav">
          <span className="page-day">Caso #{day + 1}</span>
          <a href="#infinito">Modo infinito</a>
        </nav>
      </header>
      <GameBoard caseData={caseData} killers={killers} state={state} onGuess={handleGuess} />
    </main>
  )
}
