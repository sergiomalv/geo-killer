import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelPage } from './DuelPage'
import { buildIndex } from '../data/tolls'
import { sampleTolls } from '../game/__fixtures__/sample-tolls'
import { REVEAL_MS } from '../game/duel'
import { renderWithLang } from '../test/renderWithLang'

const index = buildIndex(sampleTolls)
const killers = [
  { id: 'a', name: 'Asesino Uno', aliases: [] },
  { id: 'b', name: 'Asesino Dos', aliases: [] },
  { id: 'c', name: 'Asesino Tres', aliases: [] },
  { id: 'd', name: 'Asesino Cuatro', aliases: [] },
]
const first = () => 0

function renderPage() {
  return renderWithLang(<DuelPage tolls={index} killers={killers} random={first} />)
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

/** Deja pasar la pausa en la que la carta revelada se queda a la vista. */
function encadenar() {
  act(() => { vi.advanceTimersByTime(REVEAL_MS) })
}

describe('DuelPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reparte dos asesinos y solo enseña la cifra de la izquierda', () => {
    renderPage()
    expect(screen.getByText('Asesino Uno')).toBeInTheDocument()
    expect(screen.getByText('Asesino Dos')).toBeInTheDocument()
    expect(screen.getByText('3 víctimas confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
  })

  it('acertar revela la cifra, sube la racha y encadena la ronda siguiente', () => {
    renderPage()
    click('Más')
    expect(screen.getByText('10 víctimas confirmadas')).toBeInTheDocument()
    expect(screen.getByText('Racha: 1')).toBeInTheDocument()
    encadenar()
    expect(screen.getByText('Asesino Tres')).toBeInTheDocument()
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
  })

  it('fallar termina la partida y ofrece volver a empezar', () => {
    renderPage()
    click('Menos')
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    expect(screen.getByText('10 víctimas confirmadas')).toBeInTheDocument()
    // Perder no encadena: la partida se queda quieta hasta que el jugador reinicia.
    encadenar()
    encadenar()
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    click('Jugar otra vez')
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
    expect(screen.queryByText('Fin de la partida')).not.toBeInTheDocument()
  })

  it('el empate cuenta como acierto y se avisa', () => {
    renderPage()
    click('Más')
    encadenar()
    // Ahora izquierda = b (10) y derecha = c (10).
    click('Menos')
    expect(screen.getByText('Empate: sigues.')).toBeInTheDocument()
    expect(screen.getByText('Racha: 2')).toBeInTheDocument()
  })

  it('conserva el récord al perder y reiniciar', () => {
    renderPage()
    click('Más')
    encadenar()
    click('Menos')
    encadenar()
    expect(screen.getByText('Récord: 2')).toBeInTheDocument()
    // Ahora izquierda = c (10) y derecha = d (52): decir "menos" es fallar.
    click('Menos')
    expect(screen.getByText('Fin de la partida')).toBeInTheDocument()
    click('Jugar otra vez')
    expect(screen.getByText('Récord: 2')).toBeInTheDocument()
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
  })

  it('recupera la partida guardada al volver a montar', () => {
    const { unmount } = renderPage()
    click('Más')
    encadenar()
    unmount()
    renderPage()
    expect(screen.getByText('Racha: 1')).toBeInTheDocument()
    expect(screen.getByText('Asesino Dos')).toBeInTheDocument()
  })

  it('avisa en vez de romper si no hay datos suficientes', () => {
    renderWithLang(<DuelPage tolls={buildIndex([])} killers={killers} random={first} />)
    expect(screen.getByText('Este modo todavía no tiene datos suficientes.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Más' })).not.toBeInTheDocument()
  })
})
