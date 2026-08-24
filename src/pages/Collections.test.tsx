import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Collections from './Collections'

const listMovies = vi.fn()
const listCollections = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listCollections: (...args: unknown[]) => listCollections(...args),
      getCollection: vi.fn(),
    },
  }
})

describe('Collections page', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listCollections.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: '1',
          title: 'Action One',
          year: 2020,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '',
        },
        {
          id: '2',
          title: 'Action Two',
          year: 2021,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '',
        },
      ],
      total: 2,
    })
    listCollections.mockResolvedValue({
      items: [{ id: '10', name: 'MCU', movie_count: 3 }],
    })
  })

  it('renders server collections and genre groups', async () => {
    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('collections-page')).toBeInTheDocument()
    expect(await screen.findByText('MCU')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })
})
