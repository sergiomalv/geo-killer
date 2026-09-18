import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayPage } from './TodayPage'
import { sampleCase } from '../game/__fixtures__/sample-case'

vi.mock('../components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))

const killers = [
  { id: 'caso-prueba', name: 'Asesino de Prueba', aliases: ['El Fantasma'] },
  { id: 'otro', name: 'Otro Asesino', aliases: [] },
]

function renderPage() {
  return render(
    <TodayPage
      day={0}
      caseData={sampleCase}
      killers={killers}
    />,
  )
}

describe('TodayPage', () => {
  beforeEach(() => localStorage.clear())

  it('muestra el mapa y el número de día', () => {
    renderPage()
    expect(screen.getByTestId('map')).toBeInTheDocument()
    expect(screen.getByText(/Caso #1/)).toBeInTheDocument()
  })

  it('un fallo desbloquea las fechas', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'otro' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
  })

  it('acertar muestra la tarjeta de resultado', () => {
    renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'el fantasma' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    expect(screen.getByText(/Caso resuelto en 1 intento/)).toBeInTheDocument()
    expect(screen.getByText(/Leer en Wikipedia/)).toBeInTheDocument()
  })

  it('persiste el progreso entre montajes', () => {
    const { unmount } = renderPage()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'otro' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    unmount()
    renderPage()
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
  })
})
