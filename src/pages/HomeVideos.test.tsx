import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeVideos from './HomeVideos'

const listMovies = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
    },
  }
})

describe('HomeVideos page', () => {
  beforeEach(() => {
    listMovies.mockReset()
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'hv1',
          title: 'Family Reunion 2024',
          year: 2024,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/hv1',
          created_at: '',
        },
      ],
      total: 1,
    })
  })

  it('loads homevideos library filter', async () => {
    render(
      <MemoryRouter>
        <HomeVideos />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('homevideos-page')).toBeInTheDocument()
    expect(await screen.findByText('Family Reunion 2024')).toBeInTheDocument()
    expect(listMovies).toHaveBeenCalledWith(1, 200, { library: 'homevideos' })
  })
})
