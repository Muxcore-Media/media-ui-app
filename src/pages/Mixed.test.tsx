import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Mixed from './Mixed'

const listMovies = vi.fn()
const listTVShows = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
    },
  }
})

describe('Mixed page', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listTVShows.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm1',
          title: 'Alpha Movie',
          year: 2020,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '',
        },
      ],
      total: 1,
    })
    listTVShows.mockResolvedValue({
      items: [
        {
          id: 't1',
          title: 'Beta Show',
          year: 2021,
          overview: '',
          genres: [],
          poster_url: '',
          has_file: true,
          created_at: '',
        },
      ],
      total: 1,
    })
  })

  it('filters movies and TV in one grid', async () => {
    render(
      <MemoryRouter>
        <Mixed />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('mixed-page')).toBeInTheDocument()
    expect(screen.getByText('Alpha Movie')).toBeInTheDocument()
    expect(screen.getByText('Beta Show')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Filter…'), { target: { value: 'beta' } })
    expect(screen.queryByText('Alpha Movie')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Show')).toBeInTheDocument()
  })
})

describe('Mixed accessibility', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listTVShows.mockReset()
    listMovies.mockImplementation(() => new Promise(() => {}))
    listTVShows.mockImplementation(() => new Promise(() => {}))
  })

  it('has a page h1 and labelled filter input', () => {
    render(
      <MemoryRouter>
        <Mixed />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Mixed' })).toBeInTheDocument()
    expect(screen.getByLabelText('Filter titles')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading mixed library' })).toBeInTheDocument()
    expect(screen.getByTestId('mixed-loading')).toHaveAttribute('aria-busy', 'true')
  })
})
