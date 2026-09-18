import { useLang, useT } from '../i18n'
import { formatCountries } from './format'

interface Props {
  name: string
  nickname: string | null
  countries: string[]
  activeYears: string
  wikipedia: string | null
  /** `null` mientras la carta está tapada. */
  confirmed: number | null
  attributed: { min: number; max: number } | null
}

export function KillerCard({ name, nickname, countries, activeYears, wikipedia, confirmed, attributed }: Props) {
  const lang = useLang()
  const t = useT()
  const revealed = confirmed !== null

  function attributedText(): string | null {
    if (attributed === null) return null
    if (attributed.min !== attributed.max) {
      return t('duel.attributed.range', { min: attributed.min, max: attributed.max })
    }
    return t(attributed.min === 1 ? 'duel.attributed.one' : 'duel.attributed.other', { n: attributed.min })
  }

  const attributedLabel = revealed ? attributedText() : null

  return (
    <article className="killer-card">
      <h2 className="killer-name">{name}</h2>
      {nickname ? <p className="killer-nickname">{nickname}</p> : null}
      <p className="killer-meta">{formatCountries(countries, lang)} · {activeYears}</p>
      {/* Contenedor siempre montado: una región `aria-live` solo se anuncia si ya existía
          en el DOM cuando cambia su contenido, no si se monta ya con la cifra dentro. */}
      <div className="killer-count" aria-live="polite">
        {revealed ? (
          <>
            <strong className="killer-number">{confirmed}</strong>
            <span className="killer-confirmed">
              {t(confirmed === 1 ? 'duel.confirmed.one' : 'duel.confirmed.other', { n: confirmed })}
            </span>
            {attributedLabel ? <span className="killer-attributed">{attributedLabel}</span> : null}
            {wikipedia ? (
              <a href={wikipedia} target="_blank" rel="noreferrer">{t('result.wikipedia')}</a>
            ) : null}
          </>
        ) : (
          <p className="killer-hidden">{t('duel.hidden')}</p>
        )}
      </div>
    </article>
  )
}
