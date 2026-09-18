import type { ReactNode } from 'react'
import type { Case, KillerEntry } from '../data/schema'
import { clueLevel, type GameState } from '../game/engine'
import { AttemptsBar } from './AttemptsBar'
import { CaseMap } from './CaseMap'
import { ClueList } from './ClueList'
import { GuessInput } from './GuessInput'
import { ResultCard } from './ResultCard'

interface Props {
  caseData: Case
  killers: KillerEntry[]
  state: GameState
  onGuess: (killerId: string) => void
  /** Se muestra bajo la tarjeta de resultado cuando la partida ha terminado. */
  afterResult?: ReactNode
}

export function GameBoard({ caseData, killers, state, onGuess, afterResult }: Props) {
  const level = clueLevel(state)
  const outcome = state.status === 'playing' ? null : state.status
  return (
    <div className="board">
      <div className="board-map">
        <CaseMap murders={caseData.murders} level={level} toll={caseData.toll} />
      </div>
      <div className="board-panel">
        {/* Los intentos y el buscador quedan fuera de .board-scroll: el desplegable del
            buscador es absolute y dentro del contenedor con overflow se recortaría. */}
        <div className="page-controls">
          <AttemptsBar guesses={state.guesses} status={state.status} />
          <GuessInput killers={killers} disabled={outcome !== null} onGuess={onGuess} />
        </div>
        <div className="board-scroll">
          {outcome ? (
            <>
              <ResultCard caseData={caseData} status={outcome} attempts={state.guesses.length} />
              {afterResult}
            </>
          ) : null}
          <ClueList murders={caseData.murders} level={level} />
        </div>
      </div>
    </div>
  )
}
