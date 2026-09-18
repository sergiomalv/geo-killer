import { MAX_ATTEMPTS } from '../game/engine'
import { useT } from '../i18n'

interface Props {
  guesses: string[]
  status: 'playing' | 'won' | 'lost'
}

export function AttemptsBar({ guesses, status }: Props) {
  const t = useT()
  const cells = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i >= guesses.length) return 'empty'
    const isLast = i === guesses.length - 1
    return status === 'won' && isLast ? 'hit' : 'miss'
  })
  return (
    <div className="attempts" aria-label={t('attempts.label', { n: guesses.length, max: MAX_ATTEMPTS })}>
      {cells.map((c, i) => (
        <span key={i} className={`attempt attempt-${c}`} />
      ))}
    </div>
  )
}
