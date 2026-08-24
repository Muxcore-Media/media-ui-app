import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import * as userdata from '../lib/userdata'

const listMovies = vi.fn()
const listTVShows = vi.fn()
const listRequests = vi.fn()
const getTVShow = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listRequests: (...args: unknown[]) => listRequests(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
    },
  }
})

vi.mock('../lib/userdata', async () => {
  const actual = await vi.importActual<typeof import('../lib/userdata')>('../lib/userdata')
  return {
    ...actual,
    pullUserdataFromServer: vi.fn(async () => true),
    continueWatching: vi.fn(() => []),
    listFavorites: vi.fn(() => []),
    resolveNextUp: vi.fn(async () => []),
  }
})

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear()
    listMovies.mockReset()
    listTVShows.mockReset()
    listRequests.mockReset()
    getTVShow.mockReset()
    listRequests.mockResolvedValue([])
    listTVShows.mockResolvedValue({
      items: [
        {
          id: 'show-1',
          title: 'New Show',
          year: 2026,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '2026-08-20T00:00:00.000Z',
          seasons: [],
        },
      ],
      total: 1,
    })
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-1',
          title: 'Fresh Movie',
          year: 2026,
          overview: '',
          runtime: 0,
          vote_average: 8,
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/movie-1',
          created_at: '2026-08-21T00:00:00.000Z',
        },
      ],
      total: 1,
    })
  })

  it('renders recently added shelf from library timestamps', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )
    const page = await screen.findByTestId('home-page')
    const shelf = await screen.findByTestId('home-recently-added')
    expect(page).toBeInTheDocument()
    expect(shelf).toBeInTheDocument()
    expect(shelf).toHaveTextContent('Fresh Movie')
    expect(shelf).toHaveTextContent('New Show')
    expect(shelf).toHaveTextContent('Added')
  })

  it('hides recently added shelf when home preference is disabled', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        display: { theme: 'dark', libraryPageSize: 48, showWatchedIndicators: true },
        home: {
          showContinueWatching: true,
          showFavorites: true,
          showRecentRequests: true,
          showNextUp: true,
          showRecentlyAdded: false,
        },
        playback: { autoplayNext: false, rememberPosition: true, skipIntroSec: 0 },
        subtitles: {
          enabled: true,
          language: 'eng',
          textSize: 'md',
          backgroundOpacity: 60,
          edgeStyle: 'drop-shadow',
          verticalPosition: 'bottom',
        },
        controls: { enableKeyboardShortcuts: true },
        player: { preferredQuality: 'auto', theaterMode: false, aspectMode: 'contain' },
      }),
    )

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    await screen.findByTestId('home-page')
    expect(screen.queryByTestId('home-recently-added')).not.toBeInTheDocument()
  })
})

describe('Home accessibility', () => {
  beforeEach(() => {
    localStorage.clear()
    listMovies.mockReset()
    listTVShows.mockReset()
    listRequests.mockReset()
    listRequests.mockResolvedValue([])
    listMovies.mockResolvedValue({ items: [], total: 0 })
    listTVShows.mockResolvedValue({ items: [], total: 0 })
  })

  it('uses the featured title as the page h1 when a hero is shown', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-hero',
          title: 'Hero Feature',
          year: 2024,
          overview: 'A featured film',
          runtime: 120,
          vote_average: 9,
          genres: ['Drama'],
          poster_url: '/poster.jpg',
          backdrop_url: '/backdrop.jpg',
          has_file: true,
          stream_url: '/stream/movies/movie-hero',
          created_at: '2026-08-21T00:00:00.000Z',
        },
      ],
      total: 1,
    })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Hero Feature' })).toBeInTheDocument()
  })

  it('exposes a page h1 when the feed is empty', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
  })

  it('announces loading on initial render', () => {
    vi.mocked(userdata.pullUserdataFromServer).mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status', { name: 'Loading home' })).toBeInTheDocument()
  })
})
