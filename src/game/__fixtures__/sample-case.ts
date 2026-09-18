import type { Case } from '../../data/schema'

export const sampleCase: Case = {
  id: 'caso-prueba',
  name: 'Asesino de Prueba',
  aliases: ['El Fantasma', 'The Ghost'],
  country: 'Pruebalandia',
  activeYears: '1980-1983',
  wikipedia: { es: 'https://es.wikipedia.org/wiki/Prueba', en: null },
  sources: [],
  toll: null,
  summary: 'Caso ficticio usado solo en tests.',
  murders: [
    {
      city: 'Ciudad Uno', region: null, country: 'Pruebalandia',
      lat: 40.0, lng: -3.0, date: '1980-05-01', datePrecision: 'day',
      victim: 'Víctima Uno', method: 'Método uno.',
      sourceQuote: 'cita literal uno', sourceLang: 'es',
    },
    {
      city: 'Ciudad Dos', region: 'Barrio Dos', country: 'Pruebalandia',
      lat: 41.0, lng: -2.0, date: '1981-06', datePrecision: 'month',
      victim: 'Víctima no identificada', method: 'Método dos.',
      sourceQuote: 'cita literal dos', sourceLang: 'es',
    },
    {
      city: 'Ciudad Tres', region: null, country: 'Pruebalandia',
      lat: 42.0, lng: -1.0, date: '1983', datePrecision: 'year',
      victim: 'Víctima Tres', method: 'Método tres.',
      sourceQuote: 'cita literal tres', sourceLang: 'es',
    },
  ],
  validation: { status: 'approved', validatedAt: '2026-09-17', validator: 'test', notes: '' },
}
