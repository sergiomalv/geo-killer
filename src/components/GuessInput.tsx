import { useState, type FormEvent } from 'react'
import type { KillerEntry } from '../data/schema'
import { matchesKiller, searchKillers } from '../game/matching'

interface Props {
  killers: KillerEntry[]
  disabled: boolean
  onGuess: (killerId: string) => void
}

export function GuessInput({ killers, disabled, onGuess }: Props) {
  const [text, setText] = useState('')
  const suggestions = searchKillers(text, killers)

  function choose(id: string) {
    onGuess(id)
    setText('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const exact = killers.find((k) => matchesKiller(text, k))
    const chosen = exact ?? (suggestions.length === 1 ? suggestions[0] : undefined)
    if (chosen) choose(chosen.id)
  }

  return (
    <form className="guess" onSubmit={handleSubmit} autoComplete="off">
      <input
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls="guess-options"
        aria-autocomplete="list"
        className="guess-input"
        placeholder="¿Quién es el asesino?"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
      />
      {suggestions.length > 0 ? (
        <ul id="guess-options" role="listbox" className="guess-options">
          {suggestions.map((k) => (
            <li key={k.id} role="option" aria-selected={false} className="guess-option" onClick={() => choose(k.id)}>
              <span>{k.name}</span>
              {k.aliases.length > 0 ? <span className="guess-alias">{k.aliases.join(' · ')}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
