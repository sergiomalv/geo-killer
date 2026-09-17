import { describe, expect, it } from 'vitest'

describe('vitest', () => {
  it('runs with jsdom', () => {
    const el = document.createElement('div')
    el.textContent = 'ok'
    expect(el).toHaveTextContent('ok')
  })
})
