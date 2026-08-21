import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
      requestTitle: (...args: unknown[]) => requestTV(...args),
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
      expect(screen.getByText(/No TV shows ready to watch yet/i)).toBeInTheDocument()
    })
  })

  it('renders only watchable series in the library grid', async () => {
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
      expect(screen.getByText(/No TV shows ready to watch yet/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /View in progress/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: /Fixture Series/i })).not.toBeInTheDocument()
  })
})
