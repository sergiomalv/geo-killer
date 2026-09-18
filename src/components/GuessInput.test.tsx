import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuessInput } from './GuessInput'

const killers = [
  { id: 'david-berkowitz', name: 'David Berkowitz', aliases: ['El hijo de Sam'] },
  { id: 'ted-bundy', name: 'Ted Bundy', aliases: [] },
  { id: 'peter-sutcliffe', name: 'Peter Sutcliffe', aliases: [] },
  { id: 'peter-kurten', name: 'Peter Kürten', aliases: [] },
]

describe('GuessInput', () => {
  it('muestra sugerencias al escribir', () => {
    render(<GuessInput killers={killers} disabled={false} onGuess={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sam' } })
    expect(screen.getByRole('option', { name: /David Berkowitz/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Ted Bundy/ })).toBeNull()
  })

  it('al pulsar una sugerencia envía el id y limpia', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'bundy' } })
    fireEvent.click(screen.getByRole('option', { name: /Ted Bundy/ }))
    expect(onGuess).toHaveBeenCalledWith('ted-bundy')
    expect(input).toHaveValue('')
  })

  it('con Enter envía si el texto coincide exactamente con nombre o alias', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'el hijo de sám' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).toHaveBeenCalledWith('david-berkowitz')
  })

  it('con Enter y texto parcial envía la primera sugerencia', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'bund' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).toHaveBeenCalledWith('ted-bundy')
  })

  it('con Enter y sin coincidencias no envía nada', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'zzz' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).not.toHaveBeenCalled()
  })

  it('con Enter y varias sugerencias no envía nada', () => {
    const onGuess = vi.fn()
    render(<GuessInput killers={killers} disabled={false} onGuess={onGuess} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'peter' } })
    fireEvent.submit(input.closest('form')!)
    expect(onGuess).not.toHaveBeenCalled()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('se deshabilita', () => {
    render(<GuessInput killers={killers} disabled={true} onGuess={() => {}} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
