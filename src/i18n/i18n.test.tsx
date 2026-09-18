import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider, detectLang, interpolate, translate, useLang, useSetLang, useT } from './index'

describe('interpolate', () => {
  it('sustituye los marcadores', () => {
    expect(interpolate('Caso #{n}', { n: 3 })).toBe('Caso #3')
    expect(interpolate('{n} de {max} intentos', { n: 1, max: 4 })).toBe('1 de 4 intentos')
  })

  it('deja intacto un marcador sin valor', () => {
    expect(interpolate('Caso #{n}', {})).toBe('Caso #{n}')
  })

  it('sin parámetros devuelve la plantilla', () => {
    expect(interpolate('Caso sin resolver')).toBe('Caso sin resolver')
  })
})

describe('translate', () => {
  it('traduce al idioma pedido', () => {
    expect(translate('es', 'result.lost')).toBe('Caso sin resolver')
    expect(translate('en', 'result.lost')).not.toBe('Caso sin resolver')
  })

  it('interpola', () => {
    expect(translate('es', 'daily.caseNumber', { n: 7 })).toBe('Caso #7')
  })
})

function Probe() {
  const lang = useLang()
  const setLang = useSetLang()
  const t = useT()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="text">{t('result.lost')}</span>
      <button type="button" onClick={() => setLang('en')}>a inglés</button>
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = ''
  })

  it('arranca en el idioma indicado y lo refleja en <html lang>', () => {
    render(<LanguageProvider initial="es"><Probe /></LanguageProvider>)
    expect(screen.getByTestId('lang')).toHaveTextContent('es')
    expect(document.documentElement.lang).toBe('es')
  })

  it('cambia de idioma y lo persiste', () => {
    render(<LanguageProvider initial="es"><Probe /></LanguageProvider>)
    const antes = screen.getByTestId('text').textContent
    act(() => { screen.getByRole('button', { name: 'a inglés' }).click() })
    expect(screen.getByTestId('lang')).toHaveTextContent('en')
    expect(screen.getByTestId('text').textContent).not.toBe(antes)
    expect(localStorage.getItem('geokiller.lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('detectLang', () => {
  beforeEach(() => localStorage.clear())

  it('prefiere lo guardado', () => {
    localStorage.setItem('geokiller.lang', 'en')
    expect(detectLang()).toBe('en')
  })

  it('ignora un valor guardado que no es un idioma', () => {
    localStorage.setItem('geokiller.lang', 'fr')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES')
    expect(detectLang()).toBe('es')
  })

  it('sin nada guardado usa el idioma del navegador', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-GB')
    expect(detectLang()).toBe('en')
  })

  it('con un navegador en otro idioma cae al español', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    expect(detectLang()).toBe('es')
  })
})
