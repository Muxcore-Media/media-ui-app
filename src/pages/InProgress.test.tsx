import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InProgress from './InProgress'

const listRequests = vi.fn()
const listMovies = vi.fn()
const listTVShows = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listRequests: (...args: unknown[]) => listRequests(...args),
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
    },
  }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <InProgress />
    </MemoryRouter>,
  )
}

describe('InProgress page', () => {
  beforeEach(() => {
    listRequests.mockReset()
    listMovies.mockReset()
    listTVShows.mockReset()
    listMovies.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 })
    listTVShows.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 })
  })

  it('shows empty state when nothing is in progress', async () => {
    listRequests.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Nothing in progress right now/i)).toBeInTheDocument()
    })
  })

  it('groups active requests by phase', async () => {
    listRequests.mockResolvedValueOnce([
      {
        id: 'r1',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Downloading Movie',
        year: 2020,
        poster: '',
        status: 'downloading',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'r2',
        itemType: 'tv',
        itemId: 's1',
        tmdbId: 2,
        title: 'Searching Show',
        year: 2021,
        poster: '',
        status: 'searching',
        createdAt: '',
        updatedAt: '',
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('in-progress-downloading')).toBeInTheDocument()
      expect(screen.getByTestId('in-progress-searching')).toBeInTheDocument()
    })
    expect(screen.getByText('Downloading Movie')).toBeInTheDocument()
    expect(screen.getByText('Searching Show')).toBeInTheDocument()
  })
})
