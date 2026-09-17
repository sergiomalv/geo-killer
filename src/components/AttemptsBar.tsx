import { MAX_ATTEMPTS } from '../game/engine'

interface Props {
  guesses: string[]
  status: 'playing' | 'won' | 'lost'
}

export function AttemptsBar({ guesses, status }: Props) {
  const cells = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i >= guesses.length) return 'empty'
    const isLast = i === guesses.length - 1
    return status === 'won' && isLast ? 'hit' : 'miss'
  })
  return (
    <div className="attempts" aria-label={`${guesses.length} de ${MAX_ATTEMPTS} intentos`}>
      {cells.map((c, i) => (
        <span key={i} className={`attempt attempt-${c}`} />
      ))}
    </div>
  )
}
