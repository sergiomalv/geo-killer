import { useEffect, useState, type ReactNode } from 'react'
import { LANG_KEY, LangContext, SetLangContext, detectLang, type Lang } from './core'

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
