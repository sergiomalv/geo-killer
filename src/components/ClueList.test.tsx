import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClueList } from './ClueList'
import { sampleCase } from '../game/__fixtures__/sample-case'
import { renderWithLang } from '../test/renderWithLang'

describe('ClueList', () => {
  it('a nivel 0 solo numera los lugares', () => {
    renderWithLang(<ClueList murders={sampleCase.murders} level={0} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText(/1980/)).toBeNull()
    expect(screen.queryByText(/Víctima Uno/)).toBeNull()
  })

  it('a nivel 1 muestra fechas con su precisión', () => {
    renderWithLang(<ClueList murders={sampleCase.murders} level={1} />)
    expect(screen.getByText('01/05/1980')).toBeInTheDocument()
    expect(screen.getByText('06/1981')).toBeInTheDocument()
    expect(screen.getByText('1983')).toBeInTheDocument()
  })

  it('a nivel 2 muestra víctimas', () => {
    renderWithLang(<ClueList murders={sampleCase.murders} level={2} />)
    expect(screen.getByText('Víctima Uno')).toBeInTheDocument()
    expect(screen.getByText('Víctima no identificada')).toBeInTheDocument()
  })

  it('a nivel 3 muestra el método', () => {
    renderWithLang(<ClueList murders={sampleCase.murders} level={3} />)
    expect(screen.getByText('Método uno.')).toBeInTheDocument()
  })

  it('muestra "fecha desconocida" si date es null', () => {
    const m = { ...sampleCase.murders[0], date: null, datePrecision: null }
    renderWithLang(<ClueList murders={[m]} level={1} />)
    expect(screen.getByText('Fecha desconocida')).toBeInTheDocument()
  })

  it('en inglés las fechas van en orden estadounidense', () => {
    renderWithLang(<ClueList murders={sampleCase.murders} level={1} />, 'en')
    expect(screen.getByText('05/01/1980')).toBeInTheDocument()
  })
})
