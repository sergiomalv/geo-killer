import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { sampleCase } from './game/__fixtures__/sample-case'

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
    render(<App />)
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })

  it('muestra el modo infinito con #infinito y vuelve al cambiar el hash', async () => {
    window.location.hash = '#infinito'
    render(<App />)
    expect(await screen.findByText(/Racha:/)).toBeInTheDocument()
    await act(async () => {
      window.location.hash = ''
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByText(/Caso #/)).toBeInTheDocument()
  })
})
