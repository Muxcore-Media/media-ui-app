import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RequestableCard from './RequestableCard'

describe('RequestableCard', () => {
  it('links to discover detail and keeps return path', () => {
    render(
      <MemoryRouter>
        <RequestableCard
          item={{
            id: 550,
            title: 'Fight Club',
            year: 1999,
            overview: 'soap',
            poster: '/p.jpg',
            voteAvg: 8.4,
            mediaType: 'movie',
          }}
          onRequest={() => {}}
          returnTo="/search?q=fight"
        />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /Fight Club/i })
    expect(link).toHaveAttribute('href', '/discover/movie/550?return=%2Fsearch%3Fq%3Dfight')
    expect(screen.getByRole('button', { name: 'Request' })).toBeInTheDocument()
  })
})
