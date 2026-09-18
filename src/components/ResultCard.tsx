import type { Case } from '../data/schema'
import { useLang, useT } from '../i18n'

interface Props {
  caseData: Case
  status: 'won' | 'lost'
  attempts: number
}

export function ResultCard({ caseData, status, attempts }: Props) {
  const lang = useLang()
  const t = useT()
  // El enlace preferido es el del idioma en que se juega.
  const url = lang === 'en'
    ? caseData.wikipedia.en ?? caseData.wikipedia.es
    : caseData.wikipedia.es ?? caseData.wikipedia.en
  const heading = status === 'won'
    ? t(attempts === 1 ? 'result.won.one' : 'result.won.other', { n: attempts })
    : t('result.lost')
  return (
    <section className="result" aria-live="polite">
      <h2>{heading}</h2>
      <p className="result-name">
        {caseData.name}
        {caseData.aliases.length > 0 ? <span className="result-alias"> · {caseData.aliases.join(' · ')}</span> : null}
      </p>
      <p className="result-meta">{caseData.country} · {caseData.activeYears}</p>
      <p>{caseData.summary}</p>
      {url ? <a href={url} target="_blank" rel="noreferrer">{t('result.wikipedia')}</a> : null}
    </section>
  )
}
