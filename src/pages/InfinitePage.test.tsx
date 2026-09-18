import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InfinitePage } from './InfinitePage'
import { sampleCase } from '../game/__fixtures__/sample-case'
import { renderWithLang } from '../test/renderWithLang'

vi.mock('../components/CaseMap', () => ({ CaseMap: () => <div data-testid="map" /> }))

const secondCase = { ...sampleCase, id: 'segundo', name: 'Segundo Asesino', aliases: ['El Segundo'] }
const cases: Record<string, typeof sampleCase> = { 'caso-prueba': sampleCase, segundo: secondCase }

vi.mock('../data/cases', () => ({
  loadCase: (id: string) => Promise.resolve(cases[id] ?? null),
}))

const killers = [
  { id: 'caso-prueba', name: 'Asesino de Prueba', aliases: ['El Fantasma'] },
  { id: 'segundo', name: 'Segundo Asesino', aliases: ['El Segundo'] },
  { id: 'otro', name: 'Otro Asesino', aliases: [] },
  { id: 'k3', name: 'Tercero', aliases: [] },
  { id: 'k4', name: 'Cuarto', aliases: [] },
  { id: 'k5', name: 'Quinto', aliases: [] },
]
const available = ['caso-prueba', 'segundo']
const firstRandom = () => 0

function renderPage() {
  return renderWithLang(<InfinitePage killers={killers} availableIds={available} random={firstRandom} />)
}

async function guess(text: string) {
  const input = await screen.findByRole('combobox')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.submit(input.closest('form')!)
}

describe('InfinitePage', () => {
  beforeEach(() => localStorage.clear())

  it('carga un caso y muestra racha 0', async () => {
    renderPage()
    expect(await screen.findByTestId('map')).toBeInTheDocument()
    expect(screen.getByText('Racha: 0')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Diario' })).toHaveAttribute('href', '#')
  })

  it('acertar sube la racha y ofrece el siguiente caso', async () => {
    renderPage()
    await guess('el fantasma')
    expect(await screen.findByText('Racha: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente caso' }))
    await guess('el segundo')
    expect(await screen.findByText(/Segundo Asesino/)).toBeInTheDocument()
    expect(screen.getByText('Racha: 2')).toBeInTheDocument()
  })

  it('perder reinicia la racha', async () => {
    renderPage()
    await guess('el fantasma')
    await screen.findByText('Racha: 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente caso' }))
    for (const g of ['otro', 'tercero', 'cuarto', 'quinto']) await guess(g)
    expect(await screen.findByText('Racha: 0')).toBeInTheDocument()
    expect(screen.getByText('Caso sin resolver')).toBeInTheDocument()
  })

  it('avisa al completar la vuelta', async () => {
    renderPage()
    await guess('el fantasma')
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente caso' }))
    await guess('el segundo')
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente caso' }))
    expect(await screen.findByText(/Vuelta completa/)).toBeInTheDocument()
  })

  it('persiste entre montajes', async () => {
    const { unmount } = renderPage()
    await guess('el fantasma')
    await screen.findByText('Racha: 1')
    unmount()
    renderPage()
    expect(await screen.findByText('Racha: 1')).toBeInTheDocument()
    expect(screen.getByText(/Caso resuelto/)).toBeInTheDocument()
  })
})
