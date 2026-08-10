import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Music from './Music'
import type { LibraryListResponse } from '../types'

const listMusic = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      listMusic: (...args: unknown[]) => listMusic(...args),
    },
  }
})

describe('Music consumer section', () => {
  beforeEach(() => {
    listMusic.mockReset()
  })

  it('shows coming soon when BFF reports module unavailable', async () => {
    listMusic.mockResolvedValueOnce({
      items: [],
      total: 0,
      available: false,
      coming_soon: true,
      message: 'Coming soon — enable library-plus',
    } satisfies LibraryListResponse)

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Music />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('library-coming-soon')).toBeInTheDocument()
    })
    expect(listMusic).toHaveBeenCalled()
    expect(screen.getByText(/Coming soon — enable library-plus/i)).toBeInTheDocument()
  })

  it('renders fixture artists from BFF list payload', async () => {
    listMusic.mockResolvedValueOnce({
      items: [{ id: 'ar1', name: 'Björk', path: '/lib/Björk', monitored: true }],
      total: 1,
      available: true,
    } satisfies LibraryListResponse)

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Music />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Björk')).toBeInTheDocument()
    })
    expect(screen.getByTestId('library-list')).toBeInTheDocument()
  })
})
