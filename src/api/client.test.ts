import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, normalizeMovie, normalizeTV, posterURL } from './client'

describe('posterURL', () => {
  it('passes through absolute and /images paths', () => {
    expect(posterURL('https://cdn.example/p.jpg')).toBe('https://cdn.example/p.jpg')
    expect(posterURL('/images/movies/a.jpg')).toBe('/images/movies/a.jpg')
  })

  it('rewrites relative library paths', () => {
    expect(posterURL('posters/a.jpg', 'movie')).toBe('/images/movies/posters/a.jpg')
    expect(posterURL('posters/b.jpg', 'tv')).toBe('/images/tv/posters/b.jpg')
  })
})

describe('normalizeMovie / normalizeTV', () => {
  it('builds stream URLs for library items', () => {
    const m = normalizeMovie({ id: 'm1', title: 'Fight Club', has_file: true, poster_url: '/images/movies/p.jpg' })
    expect(m.stream_url).toBe('/stream/movies/m1')
    expect(m.poster_url).toBe('/images/movies/p.jpg')

    const tv = normalizeTV({
      id: 's1',
      name: 'Show',
      seasons: [{ id: '1', season_number: 1, episodes: [{ id: 'e1', has_file: true, episode_number: 1 }] }],
    })
    expect(tv.has_file).toBe(true)
    expect(tv.stream_url).toBe('/stream/tv/e1')
  })
})

describe('api smoke (library + request + auth errors)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listMovies parses BFF list contract', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [{ id: 'm1', title: 'A' }], total: 1, page: 1, page_size: 48 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const list = await api.listMovies()
    expect(list.items).toHaveLength(1)
    expect(list.items[0].title).toBe('A')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/movies?')
  })

  it('listMovies passes library filter query', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ id: 'mv1', title: 'MV', library_type: 'musicvideos' }],
          total: 1,
          page: 1,
          page_size: 48,
          library: 'musicvideos',
          filter_mode: 'config',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const list = await api.listMovies(1, 48, { library: 'musicvideos' })
    expect(String(fetchMock.mock.calls[0][0])).toContain('library=musicvideos')
    expect(list.library).toBe('musicvideos')
    expect(list.filter_mode).toBe('config')
    expect(list.items[0].library_type).toBe('musicvideos')
  })

  it('surfaces JSON auth errors instead of silent empty lists', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized', code: 'auth.required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(api.listMovies()).rejects.toThrow(/unauthorized/)
  })

  it('search + requestMovie cover request path', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ id: 550, title: 'Fight Club', year: 1999, overview: '', poster: '', voteAvg: 8 }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ requestId: 'r1', movieId: 'm1', status: 'pending' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const results = await api.search('Fight Club')
    expect(results[0]?.title).toBe('Fight Club')
    expect(results[0]?.mediaType).toBe('movie')

    const req = await api.requestTitle({
      tmdbId: 550,
      title: 'Fight Club',
      year: 1999,
      overview: '',
      poster: '',
      mediaType: 'movie',
    })
    expect(req.requestId).toBe('r1')
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/request')
  })
})
