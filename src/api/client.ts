import type { ListResponse, MediaRequest, Movie, SearchResult, TVShow } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

function posterURL(path: string, kind: 'movie' | 'tv' = 'movie'): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/images/')) {
    return path
  }
  if (path.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${path}`
  }
  return kind === 'tv' ? `/images/tv/${path}` : `/images/movies/${path}`
}

function normalizeMovie(raw: Record<string, unknown>): Movie {
  const id = String(raw.id ?? raw.movieId ?? '')
  const poster =
    String(raw.poster_url ?? raw.posterUrl ?? raw.poster ?? raw.poster_path ?? raw.posterPath ?? '')
  return {
    id,
    title: String(raw.title ?? ''),
    year: Number(raw.year ?? 0),
    overview: String(raw.overview ?? ''),
    runtime: Number(raw.runtime ?? 0),
    vote_average: Number(raw.vote_average ?? raw.voteAverage ?? raw.voteAvg ?? 0),
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    poster_url: posterURL(poster, 'movie'),
    has_file: Boolean(raw.has_file ?? raw.hasFile),
    stream_url: String(raw.stream_url ?? raw.streamUrl ?? (id ? `/stream/movies/${id}` : '')),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    tmdb_id: raw.tmdb_id != null || raw.tmdbId != null ? Number(raw.tmdb_id ?? raw.tmdbId) : undefined,
    backdrop_url: posterURL(String(raw.backdrop_url ?? raw.backdropUrl ?? raw.backdrop_path ?? ''), 'movie'),
    tagline: raw.tagline != null ? String(raw.tagline) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
  }
}

function normalizeTV(raw: Record<string, unknown>): TVShow {
  const id = String(raw.id ?? raw.seriesId ?? '')
  const poster =
    String(raw.poster_url ?? raw.posterUrl ?? raw.poster ?? raw.poster_path ?? raw.posterPath ?? '')
  return {
    id,
    title: String(raw.title ?? raw.name ?? ''),
    year: Number(raw.year ?? 0),
    overview: String(raw.overview ?? ''),
    vote_average: Number(raw.vote_average ?? raw.voteAverage ?? raw.voteAvg ?? 0),
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    poster_url: posterURL(poster, 'tv'),
    has_file: Boolean(raw.has_file ?? raw.hasFile),
    stream_url: String(raw.stream_url ?? raw.streamUrl ?? ''),
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    tmdb_id: raw.tmdb_id != null || raw.tmdbId != null ? Number(raw.tmdb_id ?? raw.tmdbId) : undefined,
    backdrop_url: posterURL(String(raw.backdrop_url ?? raw.backdropUrl ?? raw.backdrop_path ?? ''), 'tv'),
    status: raw.status != null ? String(raw.status) : undefined,
  }
}

function asList<T>(data: unknown, map: (row: Record<string, unknown>) => T): ListResponse<T> {
  if (Array.isArray(data)) {
    const items = data.map((row) => map(row as Record<string, unknown>))
    return { items, total: items.length, page: 1, page_size: items.length }
  }
  const obj = (data || {}) as Record<string, unknown>
  const rows = (obj.items || obj.results || obj.movies || obj.shows || []) as Record<string, unknown>[]
  const items = rows.map(map)
  return {
    items,
    total: Number(obj.total ?? items.length),
    page: Number(obj.page ?? 1),
    page_size: Number(obj.page_size ?? obj.pageSize ?? items.length),
  }
}

export const api = {
  async listMovies(page = 1, pageSize = 48): Promise<ListResponse<Movie>> {
    // TODO: media-movies currently serves images only on HTTP; wire a JSON BFF or module endpoint.
    try {
      const data = await getJSON<unknown>(`/api/movies?page=${page}&page_size=${pageSize}`)
      return asList(data, normalizeMovie)
    } catch {
      return { items: [], total: 0, page, page_size: pageSize }
    }
  },

  async getMovie(id: string): Promise<Movie | null> {
    try {
      const data = await getJSON<Record<string, unknown>>(`/api/movies/${encodeURIComponent(id)}`)
      const row = (data.movie || data.item || data) as Record<string, unknown>
      return normalizeMovie(row)
    } catch {
      return null
    }
  },

  async listTVShows(page = 1, pageSize = 48): Promise<ListResponse<TVShow>> {
    // TODO: media-tvshows currently lacks a consumer JSON list HTTP API; wire BFF when available.
    try {
      const data = await getJSON<unknown>(`/api/tv?page=${page}&page_size=${pageSize}`)
      return asList(data, normalizeTV)
    } catch {
      return { items: [], total: 0, page, page_size: pageSize }
    }
  },

  async getTVShow(id: string): Promise<TVShow | null> {
    try {
      const data = await getJSON<Record<string, unknown>>(`/api/tv/${encodeURIComponent(id)}`)
      const row = (data.show || data.series || data.item || data) as Record<string, unknown>
      return normalizeTV(row)
    } catch {
      return null
    }
  },

  async search(query: string): Promise<SearchResult[]> {
    const data = await getJSON<{ results?: SearchResult[]; error?: string }>(
      `/api/search?q=${encodeURIComponent(query)}`,
    )
    return data.results || []
  },

  async requestMovie(input: {
    tmdbId: number
    title: string
    year: number
    overview: string
    poster: string
  }): Promise<{ requestId: string; movieId: string; status: string }> {
    return getJSON('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  async listRequests(): Promise<MediaRequest[]> {
    return getJSON<MediaRequest[]>('/api/requests')
  },
}

export { posterURL, normalizeMovie, normalizeTV }
