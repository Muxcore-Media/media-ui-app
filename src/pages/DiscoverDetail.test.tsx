import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DiscoverDetail from './DiscoverDetail'

const getDiscoverDetail = vi.fn()
const requestTitle = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      getDiscoverDetail: (...args: unknown[]) => getDiscoverDetail(...args),
      requestTitle: (...args: unknown[]) => requestTitle(...args),
    },
  }
})

describe('DiscoverDetail', () => {
  beforeEach(() => {
    getDiscoverDetail.mockReset()
    requestTitle.mockReset()
  })

  it('renders genres and trailer', async () => {
    getDiscoverDetail.mockResolvedValueOnce({
      id: 550,
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      tagline: 'Mischief. Mayhem. Soap.',
      genres: ['Drama', 'Thriller'],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 8.4,
      runtime: 139,
      status: 'Released',
      mediaType: 'movie',
      trailer: { name: 'Trailer', youtubeKey: 'abc123', url: 'https://www.youtube.com/watch?v=abc123' },
    })

    render(
      <MemoryRouter initialEntries={['/discover/movie/550?return=%2Fsearch%3Fq%3Dfight']}>
        <Routes>
          <Route path="/discover/:type/:id" element={<DiscoverDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Fight Club' })).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByTitle('Trailer')).toHaveAttribute('src', expect.stringContaining('abc123'))
  })

  it('renders cast when present', async () => {
    getDiscoverDetail.mockResolvedValueOnce({
      id: 550,
      title: 'Fight Club',
      year: 1999,
      overview: 'soap',
      genres: [],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 8.4,
      mediaType: 'movie',
      cast: [
        { id: 1, name: 'Brad Pitt', character: 'Tyler Durden', profilePath: '/brad.jpg' },
        { id: 2, name: 'Edward Norton', character: 'The Narrator' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/discover/movie/550']}>
        <Routes>
          <Route path="/discover/:type/:id" element={<DiscoverDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('discover-cast')).toBeInTheDocument()
    expect(screen.getByText('Brad Pitt')).toBeInTheDocument()
    expect(screen.getByText('Tyler Durden')).toBeInTheDocument()
    expect(screen.getByText('The Narrator')).toBeInTheDocument()
  })

  it('submits request from detail page', async () => {
    getDiscoverDetail.mockResolvedValueOnce({
      id: 550,
      title: 'Fight Club',
      year: 1999,
      overview: 'soap',
      genres: [],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 8.4,
      mediaType: 'movie',
    })
    requestTitle.mockResolvedValueOnce({ status: 'requested' })

    render(
      <MemoryRouter initialEntries={['/discover/movie/550']}>
        <Routes>
          <Route path="/discover/:type/:id" element={<DiscoverDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Request movie/i }))
    await waitFor(() => {
      expect(requestTitle).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: 550, title: 'Fight Club', mediaType: 'movie' }),
      )
    })
  })
})
