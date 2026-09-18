import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'
import { formatDate } from './format'

interface Props {
  murders: Murder[]
  level: ClueLevel
}

export function ClueList({ murders, level }: Props) {
  return (
    <ol className="clue-list">
      {murders.map((m, i) => (
        <li key={i} className="clue-item">
          <span className="clue-index">{i + 1}</span>
          <div className="clue-body">
            {level >= 1 ? <div className="clue-date">{formatDate(m)}</div> : null}
            {level >= 2 ? <div className="clue-victim">{m.victim}</div> : null}
            {level >= 3 ? <div className="clue-method">{m.method}</div> : null}
            {level === 0 ? <div className="clue-muted">Sin más pistas todavía</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
