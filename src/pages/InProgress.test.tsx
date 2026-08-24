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
      expect(screen.getByText(/Nothing in progress/i)).toBeInTheDocument()
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

  it('surfaces import_failed requests in the attention section', async () => {
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-fail',
        itemType: 'movie',
        itemId: 'm9',
        tmdbId: 9,
        title: 'Broken Import',
        year: 2020,
        poster: '',
        status: 'import_failed',
        createdAt: '',
        updatedAt: '',
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('in-progress-attention')).toBeInTheDocument()
    })
    expect(screen.getByText('Broken Import')).toBeInTheDocument()
    expect(screen.getByText('Import failed')).toBeInTheDocument()
    expect(screen.getByText(/could not be added to your library/i)).toBeInTheDocument()
  })

  it('shows API statusLabel and statusDetail on cards when present', async () => {
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-stalled',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Stalled Movie',
        year: 2020,
        poster: '',
        status: 'stalled',
        statusLabel: 'Stalled — no peers',
        statusDetail: 'no peers',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'r-detail',
        itemType: 'tv',
        itemId: 's1',
        tmdbId: 2,
        title: 'Detail Show',
        year: 2021,
        poster: '',
        status: 'import_failed',
        statusLabel: 'Import failed',
        statusDetail: 'path not under a scanner watch directory',
        createdAt: '',
        updatedAt: '',
      },
    ])

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('in-progress-attention')).toBeInTheDocument()
    })
    expect(screen.getByText('Stalled — no peers')).toBeInTheDocument()
    expect(screen.queryByText('no peers')).not.toBeInTheDocument()
    expect(screen.getByText('Import failed')).toBeInTheDocument()
    expect(screen.getByText('path not under a scanner watch directory')).toBeInTheDocument()
  })
})

describe('InProgress accessibility', () => {
  beforeEach(() => {
    listRequests.mockReset()
    listMovies.mockReset()
    listTVShows.mockReset()
    listMovies.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 })
    listTVShows.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 })
    listRequests.mockResolvedValue([])
  })

  it('has a page h1 and announces loading on initial render', () => {
    listRequests.mockImplementation(() => new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'In progress' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading in-progress titles' })).toBeInTheDocument()
  })
})
