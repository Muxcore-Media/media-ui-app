import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MovieDetail from './MovieDetail'

const getMovie = vi.fn()
const jellyfinPlayURL = vi.fn()
const fetchPlaybackAnalysis = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    fetchPlaybackAnalysis: (...args: unknown[]) => fetchPlaybackAnalysis(...args),
    api: {
      getMovie: (...args: unknown[]) => getMovie(...args),
      jellyfinPlayURL: (...args: unknown[]) => jellyfinPlayURL(...args),
    },
  }
})

describe('MovieDetail page', () => {
  beforeEach(() => {
    getMovie.mockReset()
    jellyfinPlayURL.mockReset()
    fetchPlaybackAnalysis.mockReset()
    jellyfinPlayURL.mockResolvedValue(null)
    fetchPlaybackAnalysis.mockResolvedValue({
      src: '/stream/movies/m-550',
      enabled: true,
      info_line: '1080p Remux',
    })
    getMovie.mockResolvedValue({
      id: 'm-550',
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      runtime: 139,
      vote_average: 8.4,
      genres: ['Drama'],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/m-550',
      created_at: '',
    })
  })

  it('renders movie metadata', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('movie-detail-page')).toBeInTheDocument()
    expect(screen.getByText('Fight Club')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /play/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('1080p Remux')).toBeInTheDocument()
    })
  })
})
