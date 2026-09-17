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

export const caseSchema = z.object({
  id: z.string().regex(SLUG_PATTERN),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  country: z.string().min(1),
  activeYears: z.string().min(1),
  wikipedia: z
    .object({ es: z.url().nullable(), en: z.url().nullable() })
    .refine((w) => w.es !== null || w.en !== null, { message: 'hace falta al menos una URL de Wikipedia' }),
  summary: z.string().min(1),
  murders: z.array(murderSchema).min(3).max(8),
  validation: validationSchema,
})

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
