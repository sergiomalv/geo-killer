import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { LanguageProvider } from '../i18n'
import type { Lang } from '../i18n/lang'

/**
 * Renderiza dentro del proveedor de idioma. Por defecto en español, que es como
 * están escritas las aserciones de los tests que ya existían.
 */
export function renderWithLang(ui: ReactElement, lang: Lang = 'es', options?: RenderOptions): RenderResult {
  return render(<LanguageProvider initial={lang}>{ui}</LanguageProvider>, options)
}
