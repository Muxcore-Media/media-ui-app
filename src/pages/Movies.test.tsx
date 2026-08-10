import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Movies from './Movies'
import type { ListResponse, Movie } from '../types'

const listMovies = vi.fn()
const search = vi.fn()
const requestMovie = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      search: (...args: unknown[]) => search(...args),
      requestMovie: (...args: unknown[]) => requestMovie(...args),
    },
  }
})

function renderMovies() {
  return render(
    <MemoryRouter>
      <Movies />
    </MemoryRouter>,
  )
}

describe('Movies library list', () => {
  beforeEach(() => {
    listMovies.mockReset()
    search.mockReset()
    requestMovie.mockReset()
  })

  it('shows empty library state when BFF returns no items', async () => {
    listMovies.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>)

    renderMovies()

    await waitFor(() => {
      expect(
        screen.getByText(/No library items from the movies API yet/i),
      ).toBeInTheDocument()
    })
  })

  it('renders fixture library cards from BFF list payload', async () => {
    listMovies.mockResolvedValueOnce({
      items: [
        {
          id: 'm1',
          title: 'Fight Club',
          year: 1999,
          overview: '',
          runtime: 139,
          vote_average: 8.4,
          genres: [],
          poster_url: '/images/movies/p.jpg',
          has_file: true,
          stream_url: '/stream/movies/m1',
          created_at: '',
        },
      ],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>)

    renderMovies()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Fight Club/i })).toHaveAttribute(
        'href',
        '/movies/m1',
      )
    })
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('surfaces auth/BFF errors instead of empty library', async () => {
    listMovies.mockRejectedValueOnce(new Error('unauthorized (auth.required)'))

    renderMovies()

    await waitFor(() => {
      expect(screen.getByText(/unauthorized \(auth\.required\)/i)).toBeInTheDocument()
    })
  })

  it('consumer search + request uses fixture Fight Club result offline', async () => {
    listMovies.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>)
    search.mockResolvedValueOnce([
      {
        id: 550,
        title: 'Fight Club',
        year: 1999,
        overview: 'soap',
        poster: '/p.jpg',
        voteAvg: 8.4,
        type: 'movie',
      },
    ])
    requestMovie.mockResolvedValueOnce({ requestId: 'r1', movieId: 'm1', status: 'added' })

    renderMovies()
    await waitFor(() => screen.getByPlaceholderText(/Fight Club/i))

    fireEvent.change(screen.getByPlaceholderText(/Fight Club/i), { target: { value: 'Fight Club' } })
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }))

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith('Fight Club', 'movie')
    })
    await waitFor(() => screen.getByRole('button', { name: /^Request$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Request$/i }))

    await waitFor(() => {
      expect(requestMovie).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: 550, title: 'Fight Club', year: 1999 }),
      )
    })
    expect(await screen.findByText(/Requested “Fight Club” \(added\)/i)).toBeInTheDocument()
  })
})
