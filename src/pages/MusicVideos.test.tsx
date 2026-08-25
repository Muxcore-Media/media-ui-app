import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MusicVideos from './MusicVideos'

const listMovies = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
    },
  }
})

describe('MusicVideos page', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'mv1',
          title: 'Official Music Video',
          year: 2020,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/mv1',
          created_at: '',
        },
      ],
      total: 1,
    })
  })

  it('loads musicvideos library filter', async () => {
    render(
      <MemoryRouter>
        <MusicVideos />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('musicvideos-page')).toBeInTheDocument()
    expect(await screen.findByText('Official Music Video')).toBeInTheDocument()
    expect(listMovies).toHaveBeenCalledWith(1, 200, { library: 'musicvideos' })
  })
})

describe('MusicVideos accessibility', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'mv1',
          title: 'Official Music Video',
          year: 2020,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/mv1',
          created_at: '',
        },
      ],
      total: 1,
    })
  })

  it('has a page h1 and loading status announcement', async () => {
    listMovies.mockImplementation(() => new Promise(() => {}))
    render(
      <MemoryRouter>
        <MusicVideos />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Music Videos' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading music videos' })).toBeInTheDocument()
    expect(screen.getByTestId('musicvideos-loading')).toHaveAttribute('aria-busy', 'true')
  })
})
