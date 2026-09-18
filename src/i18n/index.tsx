import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import es from './es.json'
import en from './en.json'
import { isLang, type Lang } from './lang'

export type { Lang }
export { isLang, LANGS } from './lang'

/** Clave de localStorage. Sigue la convención de `storage.ts`: `geokiller.<qué>`. */
export const LANG_KEY = 'geokiller.lang'

/** El catálogo español define el juego de claves válidas. */
export type Key = keyof typeof es
export type Params = Record<string, string | number>
export type T = (key: Key, params?: Params) => string

const catalogs: Record<Lang, Record<string, string>> = { es, en }

export function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

export function translate(lang: Lang, key: Key, params?: Params): string {
  // Respaldo al español si el catálogo del idioma no tiene la clave; a la clave si tampoco está.
  const template = catalogs[lang][key] ?? catalogs.es[key] ?? key
  return interpolate(template, params)
}

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (isLang(saved)) return saved
  } catch {
    /* sin acceso a storage: se decide por navegador */
  }
  return navigator.language?.startsWith('en') ? 'en' : 'es'
}

const LangContext = createContext<Lang>('es')
const SetLangContext = createContext<(lang: Lang) => void>(() => {})

interface ProviderProps {
  children: ReactNode
  /** Idioma inicial. Solo para tests: en la aplicación lo decide `detectLang`. */
  initial?: Lang
}

export function LanguageProvider({ children, initial }: ProviderProps) {
  const [lang, setLang] = useState<Lang>(() => initial ?? detectLang())

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* sin acceso a storage: se juega sin recordar el idioma */
    }
  }, [lang])

  return (
    <LangContext.Provider value={lang}>
      <SetLangContext.Provider value={setLang}>{children}</SetLangContext.Provider>
    </LangContext.Provider>
  )
}

export function useLang(): Lang {
  return useContext(LangContext)
}

export function useSetLang(): (lang: Lang) => void {
  return useContext(SetLangContext)
}

export function useT(): T {
  const lang = useLang()
  return useMemo(() => (key: Key, params?: Params) => translate(lang, key, params), [lang])
}
