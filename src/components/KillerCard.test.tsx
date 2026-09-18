import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KillerCard } from './KillerCard'
import { renderWithLang } from '../test/renderWithLang'

const base = {
  name: 'Gary Ridgway',
  nickname: 'el asesino de Green River',
  countries: ['US'],
  activeYears: '1982-1998',
  wikipedia: 'https://es.wikipedia.org/wiki/Gary_Ridgway',
}

describe('KillerCard', () => {
  it('muestra nombre, apodo, país y años', () => {
    renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.getByText('Gary Ridgway')).toBeInTheDocument()
    expect(screen.getByText(/el asesino de Green River/)).toBeInTheDocument()
    expect(screen.getByText(/Estados Unidos/)).toBeInTheDocument()
    expect(screen.getByText(/1982-1998/)).toBeInTheDocument()
  })

  it('tapada no enseña ninguna cifra', () => {
    renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.getByText('Cifra por descubrir')).toBeInTheDocument()
    expect(screen.queryByText(/confirmadas/)).not.toBeInTheDocument()
  })

  it('revelada enseña la cifra confirmada', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />)
    expect(screen.getByText('49')).toBeInTheDocument()
    expect(screen.getByText('49 víctimas confirmadas')).toBeInTheDocument()
  })

  it('usa el singular con una sola víctima', () => {
    renderWithLang(<KillerCard {...base} confirmed={1} attributed={null} />)
    expect(screen.getByText('1 víctima confirmada')).toBeInTheDocument()
  })

  it('enseña una cifra atribuida única sin rango', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={{ min: 71, max: 71 }} />)
    expect(screen.getByText('71 atribuidas')).toBeInTheDocument()
  })

  it('enseña el rango atribuido cuando min y max difieren', () => {
    renderWithLang(<KillerCard {...base} confirmed={52} attributed={{ min: 56, max: 60 }} />)
    expect(screen.getByText('56-60 atribuidas')).toBeInTheDocument()
  })

  it('solo enlaza a Wikipedia al revelar', () => {
    const { unmount } = renderWithLang(<KillerCard {...base} confirmed={null} attributed={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    unmount()
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', base.wikipedia)
  })

  it('aguanta sin apodo y con varios países', () => {
    renderWithLang(
      <KillerCard name="Andréi Chikatilo" nickname={null} countries={['UA', 'RU']}
        activeYears="1978-1990" wikipedia={null} confirmed={52} attributed={null} />,
    )
    expect(screen.getByText(/Ucrania · Rusia/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('traduce al inglés', () => {
    renderWithLang(<KillerCard {...base} confirmed={49} attributed={null} />, 'en')
    expect(screen.getByText('49 confirmed victims')).toBeInTheDocument()
    expect(screen.getByText(/United States/)).toBeInTheDocument()
  })
})
