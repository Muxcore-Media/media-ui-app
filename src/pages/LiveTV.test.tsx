import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LiveTV from './LiveTV'

const listLiveTV = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listLiveTV: (...args: unknown[]) => listLiveTV(...args),
      createLiveTVTimer: vi.fn(async () => ({ ok: true })),
    },
  }
})

describe('LiveTV page', () => {
  beforeEach(() => {
    listLiveTV.mockReset()
    listLiveTV.mockResolvedValue({
      channels: [
        {
          id: 'ch1',
          name: 'News 24',
          number: '101',
          url: 'http://example/stream',
          category: 'News',
        },
      ],
      recordings: [],
      timers: [],
    })
  })

  it('renders channel guide', async () => {
    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('livetv-page')).toBeInTheDocument()
    expect(await screen.findByText('News 24')).toBeInTheDocument()
  })
})

describe('LiveTV accessibility', () => {
  beforeEach(() => {
    listLiveTV.mockReset()
    listLiveTV.mockResolvedValue({ channels: [], recordings: [], timers: [] })
  })

  it('has a page h1, tablist, and announces loading on initial render', () => {
    listLiveTV.mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Live TV' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Live TV sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Guide' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('status', { name: 'Loading Live TV' })).toBeInTheDocument()
  })

  it('shows guide empty state when no channels are configured', async () => {
    render(
      <MemoryRouter>
        <LiveTV />
      </MemoryRouter>,
    )

    expect(await screen.findByText('No channels')).toBeInTheDocument()
    expect(screen.getByTestId('livetv-guide-empty')).toBeInTheDocument()
  })
})
