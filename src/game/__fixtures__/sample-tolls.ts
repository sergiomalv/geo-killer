import type { Toll } from '../../data/schema'

function toll(id: string, confirmed: number, extra: Partial<Toll> = {}): Toll {
  return {
    id,
    confirmed,
    attributed: null,
    countries: ['ES'],
    activeYears: '1980-1983',
    nickname: null,
    wikipedia: { es: `https://es.wikipedia.org/wiki/${id}`, en: null },
    confirmedQuote: `cita de prueba para ${id}`,
    sourceLang: 'es',
    validation: { status: 'approved', validatedAt: '2026-09-18', validator: 'test', notes: '' },
    ...extra,
  }
}

/**
 * Los ids son letras a propósito: `buildIndex` ordena alfabéticamente, así que el orden de
 * esta lista es también el orden en que los reparte la partida. `b` y `c` comparten cifra
 * para poder ejercitar la regla del empate.
 */
export const sampleTolls: Toll[] = [
  toll('a', 3, { nickname: { es: 'el Uno', en: 'the One' } }),
  toll('b', 10),
  toll('c', 10, { countries: ['UA', 'RU'] }),
  toll('d', 52, { attributed: { min: 56, max: 60 }, attributedQuote: 'cita atribuida de prueba' }),
]
