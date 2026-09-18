import type { Murder } from '../data/schema'
import type { ClueLevel } from '../game/engine'
import { useLang, useT } from '../i18n'
import { formatDate } from './format'

interface Props {
  murders: Murder[]
  level: ClueLevel
}

export function ClueList({ murders, level }: Props) {
  const lang = useLang()
  const t = useT()
  return (
    <ol className="clue-list">
      {murders.map((m, i) => (
        <li key={i} className="clue-item">
          <span className="clue-index">{i + 1}</span>
          <div className="clue-body">
            {level >= 1 ? <div className="clue-date">{formatDate(m, lang)}</div> : null}
            {level >= 2 ? <div className="clue-victim">{m.victim}</div> : null}
            {level >= 3 ? <div className="clue-method">{m.method}</div> : null}
            {level === 0 ? <div className="clue-muted">{t('clues.none')}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
