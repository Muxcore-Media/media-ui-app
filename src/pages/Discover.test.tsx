import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Discover from './Discover'

const discoverBrowse = vi.fn()

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client')
  return {
    ...actual,
    api: {
      ...actual.api,
      discoverBrowse: (...args: unknown[]) => discoverBrowse(...args),
      requestTitle: vi.fn(),
    },
  }
})

describe('Discover', () => {
  beforeEach(() => {
    discoverBrowse.mockReset()
    discoverBrowse.mockImplementation(async (category: string, type: string) => {
      if (category === 'trending' && type === 'movie') {
        return [{ id: 550, title: 'Fight Club', year: 1999, overview: '', poster: '/p.jpg', voteAvg: 8.4, mediaType: 'movie' }]
      }
      return []
    })
  })

  it('renders trending movie shelf', async () => {
    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()
    expect(await screen.findByText('Trending movies')).toBeInTheDocument()
    expect(await screen.findByText('Fight Club')).toBeInTheDocument()
  })

  it('renders trending TV shelf', async () => {
    discoverBrowse.mockImplementation(async (category: string, type: string) => {
      if (category === 'trending' && type === 'tv') {
        return [{ id: 1396, title: 'Breaking Bad', year: 2008, overview: '', poster: '', voteAvg: 9, mediaType: 'tv' }]
      }
      return []
    })

    render(
      <MemoryRouter>
        <Discover />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Trending TV')).toBeInTheDocument()
    expect(await screen.findByText('Breaking Bad')).toBeInTheDocument()
  })
})
