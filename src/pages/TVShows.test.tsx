import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TVShows from './TVShows'
import type { ListResponse, TVShow } from '../types'

const listTVShows = vi.fn()
const search = vi.fn()
const requestTV = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      search: (...args: unknown[]) => search(...args),
      requestTV: (...args: unknown[]) => requestTV(...args),
    },
  }
})

function renderTV() {
  return render(
    <MemoryRouter>
      <TVShows />
    </MemoryRouter>,
  )
}

describe('TVShows library list', () => {
  beforeEach(() => {
    listTVShows.mockReset()
    search.mockReset()
    requestTV.mockReset()
  })

  it('shows empty library state when BFF returns no series', async () => {
    listTVShows.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<TVShow>)

    renderTV()

    await waitFor(() => {
      expect(screen.getByText(/No TV library items yet/i)).toBeInTheDocument()
    })
  })

  it('renders fixture series cards from BFF list payload', async () => {
    listTVShows.mockResolvedValueOnce({
      items: [
        {
          id: 's1',
          title: 'Fixture Series',
          year: 2020,
          overview: '',
          vote_average: 7,
          genres: [],
          poster_url: '',
          has_file: false,
          stream_url: '',
          created_at: '',
        },
      ],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<TVShow>)

    renderTV()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Fixture Series/i })).toHaveAttribute(
        'href',
        '/tv/s1',
      )
    })
    expect(screen.getByText('No poster')).toBeInTheDocument()
  })

  it('consumer TV search + request uses fixture Breaking Bad offline', async () => {
    listTVShows.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<TVShow>)
    search.mockResolvedValueOnce([
      {
        id: 1396,
        title: 'Breaking Bad',
        year: 2008,
        overview: 'chem',
        poster: '/bb.jpg',
        voteAvg: 8.9,
        type: 'tv',
      },
    ])
    requestTV.mockResolvedValueOnce({ requestId: 'r2', seriesId: 's1', status: 'added' })

    renderTV()
    await waitFor(() => screen.getByPlaceholderText(/Breaking Bad/i))

    fireEvent.change(screen.getByPlaceholderText(/Breaking Bad/i), {
      target: { value: 'Breaking Bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }))

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith('Breaking Bad', 'tv')
    })
    await waitFor(() => screen.getByRole('button', { name: /^Request$/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Request$/i }))

    await waitFor(() => {
      expect(requestTV).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: 1396, title: 'Breaking Bad', year: 2008 }),
      )
    })
    expect(await screen.findByText(/Requested “Breaking Bad” \(added\)/i)).toBeInTheDocument()
  })
})
