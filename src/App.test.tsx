import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { sampleCase } from './game/__fixtures__/sample-case'
import { renderWithLang } from './test/renderWithLang'

vi.mock('./components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))
vi.mock('./data/cases', () => ({
  loadCase: () => Promise.resolve(sampleCase),
  availableCaseIds: () => ['caso-prueba'],
}))

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('muestra el reto diario por defecto', async () => {
    renderWithLang(<App />)
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })

  it('muestra el modo infinito con #infinito y vuelve al cambiar el hash', async () => {
    window.location.hash = '#infinito'
    renderWithLang(<App />)
    expect(await screen.findByText(/Racha:/)).toBeInTheDocument()
    await act(async () => {
      window.location.hash = ''
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })

  it('muestra el modo más o menos con #mas-o-menos', async () => {
    window.location.hash = '#mas-o-menos'
    renderWithLang(<App />)
    // Con tolls.json vacío el modo avisa en vez de romper; con datos, reparte la primera pareja.
    expect(await screen.findByText(/Este modo todavía no tiene datos suficientes\.|Racha: 0/)).toBeInTheDocument()
  })
})
