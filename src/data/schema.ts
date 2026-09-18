import { z } from 'zod'
import { es } from 'zod/locales'

z.config(es())

export const DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const precisionLength = { year: 4, month: 7, day: 10 } as const

export const murderSchema = z
  .object({
    city: z.string().min(1),
    region: z.string().min(1).nullable(),
    country: z.string().min(1),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    date: z.string().regex(DATE_PATTERN).nullable(),
    datePrecision: z.enum(['year', 'month', 'day']).nullable(),
    victim: z.string().min(1),
    method: z.string().min(1),
    sourceQuote: z.string().min(10),
    sourceLang: z.enum(['es', 'en']),
  })
  .refine((m) => (m.date === null) === (m.datePrecision === null), {
    message: 'date y datePrecision deben ser ambos null o ambos definidos',
  })
  .refine(
    (m) => m.date === null || m.datePrecision === null || m.date.length === precisionLength[m.datePrecision],
    { message: 'la longitud de date no coincide con datePrecision' },
  )

export const validationSchema = z.object({
  status: z.literal('approved'),
  validatedAt: z.iso.date(),
  validator: z.string().min(1),
  notes: z.string(),
})

export const murderTranslationSchema = z.strictObject({
  city: z.string().min(1),
  region: z.string().min(1).nullable(),
  country: z.string().min(1),
  method: z.string().min(1),
})

/**
 * Traducción de un caso. Solo los campos traducibles: los nombres de las víctimas, las
 * coordenadas y las fechas no aparecen aquí, así que el traductor no puede tocarlos.
 * `strictObject` rechaza cualquier campo de más.
 */
export const caseTranslationSchema = z.strictObject({
  id: z.string().regex(SLUG_PATTERN),
  lang: z.literal('en'),
  country: z.string().min(1),
  summary: z.string().min(1),
  aliases: z.array(z.string().min(1)).optional(),
  murders: z.array(murderTranslationSchema).min(3).max(8),
})

export const caseSchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  country: z.string().min(1),
  activeYears: z.string().min(1),
  wikipedia: z.object({ es: z.url().nullable(), en: z.url().nullable() }),
  // Casos sin artículo en Wikipedia: las fuentes generales que los respaldan.
  sources: z.array(z.url()).default([]),
  // Cifra total de víctimas cuando los asesinatos documentados son solo una muestra.
  toll: z.number().int().positive().nullable().default(null),
  summary: z.string().min(1),
  murders: z.array(murderSchema).min(3).max(8),
  validation: validationSchema,
})
  .refine((c) => c.wikipedia.es !== null || c.wikipedia.en !== null || c.sources.length > 0, {
    message: 'hace falta al menos una URL de Wikipedia o una fuente en sources',
    path: ['wikipedia'],
  })

/**
 * Códigos que `Intl.DisplayNames` resuelve a un país actual sin dar error: `SU` devuelve
 * "Rusia" y `YU`/`CS` devuelven "Serbia". Aceptarlos convertiría un dato histórico en un
 * dato falso presentado con confianza, así que se prohíben y se exige el país actual del
 * territorio donde ocurrieron los crímenes.
 */
export const FORBIDDEN_COUNTRY_CODES = ['SU', 'YU', 'CS']

function isRealCountryCode(code: string): boolean {
  if (FORBIDDEN_COUNTRY_CODES.includes(code)) return false
  try {
    // `ZZ` es el código CLDR reservado para "región desconocida": no lanza error ni
    // devuelve el propio código, así que hay que descartarlo aparte.
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
    return name !== code && name !== 'Unknown Region'
  } catch {
    return false
  }
}

export const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, 'código ISO-3166 alpha-2 en mayúsculas')
  .refine(isRealCountryCode, 'código de país inexistente o histórico (SU, YU y CS no valen)')

export const tollSchema = z
  .object({
    id: z.string().regex(SLUG_PATTERN),
    confirmed: z.number().int().positive(),
    attributed: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).nullable(),
    countries: z.array(countryCodeSchema).min(1).max(3),
    activeYears: z.string().min(1),
    nickname: z.object({ es: z.string().min(1).nullable(), en: z.string().min(1).nullable() }).nullable(),
    wikipedia: z.object({ es: z.url().nullable(), en: z.url().nullable() }),
    confirmedQuote: z.string().min(10),
    attributedQuote: z.string().min(10).optional(),
    sourceLang: z.enum(['es', 'en']),
    validation: validationSchema,
  })
  .refine((t) => t.attributed === null || t.attributed.min <= t.attributed.max, {
    message: 'el rango atribuido tiene min mayor que max',
    path: ['attributed'],
  })
  // Lo atribuido nunca puede ser menor que lo probado: si lo es, las dos cifras están cambiadas.
  .refine((t) => t.attributed === null || t.attributed.min >= t.confirmed, {
    message: 'el rango atribuido es menor que las víctimas confirmadas',
    path: ['attributed'],
  })
  .refine((t) => (t.attributed === null) === (t.attributedQuote === undefined), {
    message: 'attributedQuote hace falta si y solo si hay attributed',
    path: ['attributedQuote'],
  })
  .refine((t) => t.wikipedia.es !== null || t.wikipedia.en !== null, {
    message: 'hace falta al menos una URL de Wikipedia',
    path: ['wikipedia'],
  })

export const tollsSchema = z
  .array(tollSchema)
  .refine((list) => new Set(list.map((t) => t.id)).size === list.length, { message: 'ids duplicados' })

export const killerEntrySchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
})

export const killersSchema = z
  .array(killerEntrySchema)
  .refine((list) => new Set(list.map((k) => k.id)).size === list.length, { message: 'ids duplicados' })

export const scheduleSchema = z
  .object({
    launchDate: z.iso.date(),
    order: z.array(z.string().regex(SLUG_PATTERN)).min(1),
  })
  .refine((s) => new Set(s.order).size === s.order.length, { message: 'ids duplicados en order' })

export type Murder = z.infer<typeof murderSchema>
export type Case = z.infer<typeof caseSchema>
export type KillerEntry = z.infer<typeof killerEntrySchema>
export type Schedule = z.infer<typeof scheduleSchema>
export type MurderTranslation = z.infer<typeof murderTranslationSchema>
export type CaseTranslation = z.infer<typeof caseTranslationSchema>
export type Toll = z.infer<typeof tollSchema>
