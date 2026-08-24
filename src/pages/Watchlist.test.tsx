import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Watchlist from './Watchlist'

const watchlist = vi.fn()

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      watchlist: (...args: unknown[]) => watchlist(...args),
      requestTitle: vi.fn(async () => ({ status: 'pending' })),
    },
  }
})

describe('Watchlist page', () => {
  beforeEach(() => {
    watchlist.mockReset()
    watchlist.mockResolvedValue([
      {
        id: 550,
        title: 'Fight Club',
        year: 1999,
        overview: '',
        poster: '',
        voteAvg: 0,
        mediaType: 'movie' as const,
      },
    ])
  })

  it('renders synced watchlist titles', async () => {
    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('watchlist-page')).toBeInTheDocument()
    expect(await screen.findByText('Fight Club')).toBeInTheDocument()
  })

  it('shows empty state when watchlist has no items', async () => {
    watchlist.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No watchlist items')).toBeInTheDocument()
    expect(screen.getByText(/Add import-list sources in admin/i)).toBeInTheDocument()
  })

  it('surfaces API errors', async () => {
    watchlist.mockRejectedValueOnce(new Error('watchlist unavailable'))

    render(
      <MemoryRouter>
        <Watchlist />
      </MemoryRouter>,
    )

    expect(await screen.findByText('watchlist unavailable')).toBeInTheDocument()
  })
})
