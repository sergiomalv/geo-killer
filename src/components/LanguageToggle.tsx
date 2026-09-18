import { useLang, useSetLang, useT } from '../i18n'

/** Botón que muestra el idioma al que se puede cambiar, no el actual. */
export function LanguageToggle() {
  const lang = useLang()
  const setLang = useSetLang()
  const t = useT()
  const otro = lang === 'es' ? 'en' : 'es'
  return (
    <button
      type="button"
      className="lang-toggle"
      aria-label={t('lang.toggle')}
      onClick={() => setLang(otro)}
    >
      {otro.toUpperCase()}
    </button>
  )
}
