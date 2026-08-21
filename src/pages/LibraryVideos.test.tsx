import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MusicVideos from './MusicVideos'
import HomeVideos from './HomeVideos'

const listMovies = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      listMovies: (...args: unknown[]) => listMovies(...args),
    },
  }
})

describe('MusicVideos / HomeVideos library pages', () => {
  beforeEach(() => {
    listMovies.mockReset()
  })

  it('loads music videos via ?library=musicvideos', async () => {
    listMovies.mockResolvedValueOnce({
      items: [{ id: 'mv1', title: 'Artist - Official Music Video', year: 2020, overview: '', runtime: 0, vote_average: 0, genres: [], poster_url: '', has_file: true, stream_url: '/stream/movies/mv1', created_at: '' }],
      total: 1,
      page: 1,
      page_size: 200,
      library: 'musicvideos',
      filter_mode: 'config',
    })

    render(
      <MemoryRouter>
        <MusicVideos />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Artist - Official Music Video')).toBeInTheDocument()
    })
    expect(listMovies).toHaveBeenCalledWith(1, 200, { library: 'musicvideos' })
    expect(screen.getByText(/Music videos from your library/i)).toBeInTheDocument()
  })

  it('loads home videos via ?library=homevideos', async () => {
    listMovies.mockResolvedValueOnce({
      items: [{ id: 'hv1', title: 'Vacation 2019', year: 2019, overview: '', runtime: 0, vote_average: 0, genres: [], poster_url: '', has_file: true, stream_url: '/stream/movies/hv1', created_at: '' }],
      total: 1,
      page: 1,
      page_size: 200,
      library: 'homevideos',
      filter_mode: 'heuristic',
    })

    render(
      <MemoryRouter>
        <HomeVideos />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Vacation 2019')).toBeInTheDocument()
    })
    expect(listMovies).toHaveBeenCalledWith(1, 200, { library: 'homevideos' })
    expect(screen.getByText(/Personal videos from your library/i)).toBeInTheDocument()
  })
})
