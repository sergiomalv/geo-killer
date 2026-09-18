import { describe, expect, it } from 'vitest'
import { AttemptsBar } from './AttemptsBar'
import { renderWithLang } from '../test/renderWithLang'

describe('AttemptsBar', () => {
  it('pinta el acierto en verde y los fallos previos en rojo', () => {
    const { container } = renderWithLang(<AttemptsBar guesses={['a', 'b', 'x']} status="won" />)
    const cells = container.querySelectorAll('.attempt')
    expect(cells).toHaveLength(4)
    expect(cells[0]).toHaveClass('attempt-miss')
    expect(cells[1]).toHaveClass('attempt-miss')
    expect(cells[2]).toHaveClass('attempt-hit')
    expect(cells[3]).toHaveClass('attempt-empty')
  })

  it('pinta cuatro fallos al perder', () => {
    const { container } = renderWithLang(<AttemptsBar guesses={['a', 'b', 'c', 'd']} status="lost" />)
    expect(container.querySelectorAll('.attempt-miss')).toHaveLength(4)
    expect(container.querySelectorAll('.attempt-hit')).toHaveLength(0)
  })

  it('la etiqueta accesible está traducida', () => {
    const { container } = renderWithLang(<AttemptsBar guesses={['a']} status="playing" />, 'en')
    const label = container.querySelector('.attempts')!.getAttribute('aria-label')!
    expect(label).toContain('1')
    expect(label).toContain('4')
    expect(label).not.toContain('intentos')
  })
})
