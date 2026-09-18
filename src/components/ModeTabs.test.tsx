import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ModeTabs } from './ModeTabs'
import { renderWithLang } from '../test/renderWithLang'

describe('ModeTabs', () => {
  it('enlaza los tres modos a su hash', () => {
    renderWithLang(<ModeTabs active="daily" />)
    expect(screen.getByRole('link', { name: 'Infinito' })).toHaveAttribute('href', '#infinito')
    expect(screen.getByRole('link', { name: 'Más o menos' })).toHaveAttribute('href', '#mas-o-menos')
  })

  it('marca la pestaña activa y no la enlaza', () => {
    renderWithLang(<ModeTabs active="daily" />)
    const activa = screen.getByText('Diario')
    expect(activa).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Diario' })).not.toBeInTheDocument()
  })

  it('marca la pestaña activa del modo infinito', () => {
    renderWithLang(<ModeTabs active="infinite" />)
    expect(screen.getByText('Infinito')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Diario' })).toHaveAttribute('href', '#')
  })

  it('deshabilita el duelo cuando no hay datos', () => {
    renderWithLang(<ModeTabs active="daily" duelEnabled={false} />)
    expect(screen.queryByRole('link', { name: 'Más o menos' })).not.toBeInTheDocument()
    expect(screen.getByText('Más o menos')).toHaveAttribute('aria-disabled', 'true')
  })

  it('traduce al inglés', () => {
    renderWithLang(<ModeTabs active="daily" />, 'en')
    expect(screen.getByRole('link', { name: 'Higher or Lower' })).toBeInTheDocument()
  })
})
