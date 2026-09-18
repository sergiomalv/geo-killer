import { useEffect, useState } from 'react'
import type { TollIndex } from '../data/tolls'
import type { KillerEntry } from '../data/schema'
import { advance, answer, restart, startDuel, REVEAL_MS, type Choice, type DuelState } from '../game/duel'
import { loadDuel, saveDuel } from '../game/storage'
import { KillerCard } from '../components/KillerCard'
import { LanguageToggle } from '../components/LanguageToggle'
import { ModeTabs } from '../components/ModeTabs'
import { useLang, useT } from '../i18n'

interface Props {
  tolls: TollIndex
  killers: KillerEntry[]
  random?: () => number
}

function initialState(tolls: TollIndex, random: () => number): DuelState {
  const saved = loadDuel()
  // Un id guardado que ya no existe (porque cambió el catálogo) invalida la partida entera.
  if (saved && tolls.ids.includes(saved.left) && tolls.ids.includes(saved.right)) return saved
  return startDuel(tolls.ids, random, saved?.best ?? 0)
}

export function DuelPage({ tolls, killers, random = Math.random }: Props) {
  const playable = tolls.ids.length >= 2
  const lang = useLang()
  const t = useT()
  const [state, setState] = useState<DuelState | null>(() => (playable ? initialState(tolls, random) : null))

  useEffect(() => {
    if (state) saveDuel(state)
  }, [state])

  // Tras un acierto la carta revelada se queda a la vista un momento y luego encadena sola.
  useEffect(() => {
    if (state?.status !== 'revealed') return
    const id = setTimeout(() => setState((prev) => (prev ? advance(prev, tolls.ids, random) : prev)), REVEAL_MS)
    return () => clearTimeout(id)
  }, [state, tolls.ids, random])

  if (!playable || state === null) {
    return (
      <main className="page">
        <header className="page-header">
          <h1>Geo Killer</h1>
          <ModeTabs active="duel" duelEnabled={false} />
          <nav className="page-nav"><LanguageToggle /></nav>
        </header>
        <p className="page-notice">{t('duel.unavailable')}</p>
      </main>
    )
  }

  function card(id: string, revealed: boolean) {
    const toll = tolls.byId(id)
    const killer = killers.find((k) => k.id === id)
    if (!toll) return null
    return (
      <KillerCard
        name={killer?.name ?? id}
        nickname={toll.nickname?.[lang] ?? null}
        countries={toll.countries}
        activeYears={toll.activeYears}
        wikipedia={lang === 'en' ? toll.wikipedia.en ?? toll.wikipedia.es : toll.wikipedia.es ?? toll.wikipedia.en}
        confirmed={revealed ? toll.confirmed : null}
        attributed={revealed ? toll.attributed : null}
      />
    )
  }

  function choose(choice: Choice) {
    setState((prev) => (prev ? answer(prev, choice, tolls.counts) : prev))
  }

  const leftName = killers.find((k) => k.id === state.left)?.name ?? state.left

  return (
    <main className="page">
      <header className="page-header">
        <h1>Geo Killer</h1>
        <ModeTabs active="duel" />
        <nav className="page-nav">
          <span className="page-day">{t('duel.streak', { n: state.streak })}</span>
          <span className="page-day">{t('duel.best', { n: state.best })}</span>
          <LanguageToggle />
        </nav>
      </header>
      <section className="duel">
        <p className="duel-question">{t('duel.question', { name: leftName })}</p>
        <div className="duel-cards">
          {card(state.left, true)}
          {card(state.right, state.status !== 'playing')}
        </div>
        {state.status === 'playing' ? (
          <div className="duel-buttons">
            <button type="button" className="duel-choice" onClick={() => choose('higher')}>{t('duel.higher')}</button>
            <button type="button" className="duel-choice" onClick={() => choose('lower')}>{t('duel.lower')}</button>
          </div>
        ) : null}
        {state.status === 'revealed' && state.tie ? (
          <p className="page-notice" aria-live="polite">{t('duel.tie')}</p>
        ) : null}
        {state.status === 'lost' ? (
          <div className="duel-over" aria-live="polite">
            <p className="duel-over-title">{t('duel.lost')}</p>
            <button
              type="button"
              className="next-case"
              onClick={() => setState((prev) => (prev ? restart(prev, tolls.ids, random) : prev))}
            >
              {t('duel.restart')}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
