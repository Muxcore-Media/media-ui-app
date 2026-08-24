import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Mixed from '../pages/Mixed'
import Movies from '../pages/Movies'
import type { ListResponse, Movie, TVShow } from '../types'

/** AGENTS.md §8 breakpoints: mobile <640, tablet 640–1024, desktop 1024–1536, wide >1536 */
const BREAKPOINTS = [
  { name: 'mobile', width: 375 },
  { name: 'tablet', width: 768 },
  { name: 'desktop', width: 1280 },
  { name: 'wide', width: 1920 },
] as const

const listMovies = vi.fn()
const listTVShows = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
    },
  }
})

function mockViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  Object.defineProperty(document.documentElement, 'clientWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

function assertNoHorizontalOverflow() {
  const doc = document.documentElement
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1)
}

describe('responsive layout (AGENTS.md §8)', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listTVShows.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm1',
          title: 'Fixture Movie',
          year: 2020,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '',
        },
      ] satisfies Movie[],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>)
    listTVShows.mockResolvedValue({
      items: [
        {
          id: 't1',
          title: 'Fixture Show',
          year: 2021,
          overview: '',
          status: 'Continuing',
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          vote_average: 8,
          stream_url: '',
          created_at: '',
          seasons: [],
        } as TVShow,
      ],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<TVShow>)
  })

  for (const bp of BREAKPOINTS) {
    it(`Movies page renders without horizontal overflow at ${bp.name} (${bp.width}px)`, async () => {
      mockViewport(bp.width)
      render(
        <MemoryRouter>
          <Movies />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByTestId('movies-page')).toBeInTheDocument()
      })
      assertNoHorizontalOverflow()
    })

    it(`Mixed page renders without horizontal overflow at ${bp.name} (${bp.width}px)`, async () => {
      mockViewport(bp.width)
      render(
        <MemoryRouter>
          <Mixed />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByTestId('mixed-page')).toBeInTheDocument()
      })
      assertNoHorizontalOverflow()
    })
  }
})
