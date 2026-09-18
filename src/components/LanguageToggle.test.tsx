import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageToggle } from './LanguageToggle'
import { renderWithLang } from '../test/renderWithLang'

describe('LanguageToggle', () => {
  beforeEach(() => localStorage.clear())

  it('jugando en español ofrece pasar a inglés', () => {
    renderWithLang(<LanguageToggle />, 'es')
    expect(screen.getByRole('button')).toHaveTextContent('EN')
  })

  it('jugando en inglés ofrece volver al español', () => {
    renderWithLang(<LanguageToggle />, 'en')
    expect(screen.getByRole('button')).toHaveTextContent('ES')
  })

  it('al pulsar cambia el idioma y lo persiste', () => {
    renderWithLang(<LanguageToggle />, 'es')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('ES')
    expect(localStorage.getItem('geokiller.lang')).toBe('en')
  })

  it('tiene etiqueta accesible', () => {
    renderWithLang(<LanguageToggle />, 'es')
    expect(screen.getByRole('button').getAttribute('aria-label')).toBeTruthy()
  })
})
