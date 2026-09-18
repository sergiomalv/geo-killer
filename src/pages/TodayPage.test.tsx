import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayPage } from './TodayPage'
import { sampleCase } from '../game/__fixtures__/sample-case'
import type { GameState } from '../game/engine'

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

  it('cuatro fallos muestran la derrota y bloquean el buscador', () => {
    const many = [
      ...killers,
      { id: 'k3', name: 'Tercero', aliases: [] },
      { id: 'k4', name: 'Cuarto', aliases: [] },
      { id: 'k5', name: 'Quinto', aliases: [] },
    ]
    render(<TodayPage day={0} caseData={sampleCase} killers={many} />)
    const input = screen.getByRole('combobox')
    for (const name of ['otro', 'tercero', 'cuarto', 'quinto']) {
      fireEvent.change(input, { target: { value: name } })
      fireEvent.submit(input.closest('form')!)
    }
    expect(screen.getByText('Caso sin resolver')).toBeInTheDocument()
    expect(screen.getByText('Método uno.')).toBeInTheDocument()
    expect(input).toBeDisabled()
  })

  it('cambiar de día reinicia la partida aunque el componente no se desmonte', () => {
    const killersWithOtroCaso = [
      ...killers,
      { id: 'otro-caso', name: 'Otro Caso', aliases: [] },
    ]
    const { rerender } = render(
      <TodayPage day={0} caseData={sampleCase} killers={killersWithOtroCaso} />,
    )
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'otro asesino' } })
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)
    expect(document.querySelectorAll('.attempt-miss').length).toBe(1)

    const otroCaso = { ...sampleCase, id: 'otro-caso', name: 'Otro Caso' }
    rerender(<TodayPage day={1} caseData={otroCaso} killers={killersWithOtroCaso} />)

    expect(document.querySelectorAll('.attempt-miss').length).toBe(0)
    const raw = localStorage.getItem('geokiller.progress.1')
    if (raw !== null) {
      const parsed = JSON.parse(raw) as GameState
      expect(parsed.guesses).toEqual([])
    }
  })
})
