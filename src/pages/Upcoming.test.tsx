import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Upcoming from './Upcoming'

const listTVShows = vi.fn()
const getTVShow = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
    },
  }
})

describe('Upcoming page', () => {
  beforeEach(() => {
    listTVShows.mockReset()
    getTVShow.mockReset()
    const air = new Date()
    air.setDate(air.getDate() + 3)
    const airDate = air.toISOString().slice(0, 10)
    listTVShows.mockResolvedValue({
      items: [{ id: 's1', title: 'Orbital', year: 2026, overview: '', genres: [], poster_url: '', has_file: false, created_at: '' }],
      total: 1,
    })
    getTVShow.mockResolvedValue({
      id: 's1',
      title: 'Orbital',
      year: 2026,
      overview: '',
      genres: [],
      poster_url: '',
      has_file: false,
      created_at: '',
      seasons: [
        {
          id: 'season-1',
          season_number: 1,
          episodes: [
            {
              id: 'e1',
              title: 'Pilot',
              season_number: 1,
              episode_number: 1,
              air_date: airDate,
              has_file: false,
            },
          ],
        },
      ],
    })
  })

  it('lists episodes airing soon', async () => {
    render(
      <MemoryRouter>
        <Upcoming />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('upcoming-page')).toBeInTheDocument()
    expect(await screen.findByText('Orbital')).toBeInTheDocument()
    expect(screen.getByText(/Pilot/)).toBeInTheDocument()
  })
})
