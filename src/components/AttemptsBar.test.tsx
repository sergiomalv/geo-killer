import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttemptsBar } from './AttemptsBar'

describe('AttemptsBar', () => {
  it('pinta el acierto en verde y los fallos previos en rojo', () => {
    const { container } = render(<AttemptsBar guesses={['a', 'b', 'x']} status="won" />)
    const cells = container.querySelectorAll('.attempt')
    expect(cells).toHaveLength(4)
    expect(cells[0]).toHaveClass('attempt-miss')
    expect(cells[1]).toHaveClass('attempt-miss')
    expect(cells[2]).toHaveClass('attempt-hit')
    expect(cells[3]).toHaveClass('attempt-empty')
  })

  it('pinta cuatro fallos al perder', () => {
    const { container } = render(<AttemptsBar guesses={['a', 'b', 'c', 'd']} status="lost" />)
    expect(container.querySelectorAll('.attempt-miss')).toHaveLength(4)
    expect(container.querySelectorAll('.attempt-hit')).toHaveLength(0)
  })
})
