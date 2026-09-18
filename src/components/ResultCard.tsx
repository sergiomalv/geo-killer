import type { Case } from '../data/schema'

interface Props {
  caseData: Case
  status: 'won' | 'lost'
  attempts: number
}

export function ResultCard({ caseData, status, attempts }: Props) {
  const url = caseData.wikipedia.es ?? caseData.wikipedia.en
  return (
    <section className="result" aria-live="polite">
      <h2>{status === 'won' ? `Caso resuelto en ${attempts} intento${attempts === 1 ? '' : 's'}` : 'Caso sin resolver'}</h2>
      <p className="result-name">
        {caseData.name}
        {caseData.aliases.length > 0 ? <span className="result-alias"> · {caseData.aliases.join(' · ')}</span> : null}
      </p>
      <p className="result-meta">{caseData.country} · {caseData.activeYears}</p>
      <p>{caseData.summary}</p>
      {url ? <a href={url} target="_blank" rel="noreferrer">Leer en Wikipedia</a> : null}
    </section>
  )
}
