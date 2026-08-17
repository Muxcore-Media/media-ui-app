import type { Episode, ListResponse, MediaRequest, Movie, SearchResult, Season, TVShow } from '../types'

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
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string; code?: string }
      if (body?.error) {
        detail = body.code ? `${body.error} (${body.code})` : body.error
      }
    } catch {
      /* plain-text error bodies are fine */
    }
    throw new Error(detail)
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

function normalizeEpisode(raw: Record<string, unknown>): Episode {
  const id = String(raw.id ?? '')
  const hasFile = Boolean(raw.has_file ?? raw.hasFile)
  return {
    id,
    season_number: Number(raw.season_number ?? raw.seasonNumber ?? 0),
    episode_number: Number(raw.episode_number ?? raw.episodeNumber ?? 0),
    title: String(raw.title ?? raw.name ?? ''),
    overview: String(raw.overview ?? ''),
    runtime: Number(raw.runtime ?? 0),
    has_file: hasFile,
    stream_url: String(raw.stream_url ?? raw.streamUrl ?? (hasFile && id ? `/stream/tv/${id}` : '')),
    air_date: raw.air_date != null || raw.airDate != null ? String(raw.air_date ?? raw.airDate) : undefined,
  }
}

function normalizeSeason(raw: Record<string, unknown>): Season {
  const eps = Array.isArray(raw.episodes) ? (raw.episodes as Record<string, unknown>[]).map(normalizeEpisode) : []
  return {
    id: String(raw.id ?? ''),
    season_number: Number(raw.season_number ?? raw.seasonNumber ?? 0),
    name: String(raw.name ?? ''),
    episode_count: Number(raw.episode_count ?? raw.episodeCount ?? eps.length),
    poster_url: posterURL(String(raw.poster_url ?? raw.posterUrl ?? raw.poster_path ?? ''), 'tv'),
    episodes: eps,
  }
}

function normalizeTV(raw: Record<string, unknown>): TVShow {
  const id = String(raw.id ?? raw.seriesId ?? '')
  const poster =
    String(raw.poster_url ?? raw.posterUrl ?? raw.poster ?? raw.poster_path ?? raw.posterPath ?? '')
  const seasons = Array.isArray(raw.seasons) ? (raw.seasons as Record<string, unknown>[]).map(normalizeSeason) : undefined
  const hasFile =
    Boolean(raw.has_file ?? raw.hasFile) ||
    Boolean(seasons?.some((s) => s.episodes.some((e) => e.has_file)))
  const streamURL =
    String(raw.stream_url ?? raw.streamUrl ?? '') ||
    seasons?.flatMap((s) => s.episodes).find((e) => e.has_file)?.stream_url ||
    ''
  return {
    id,
    title: String(raw.title ?? raw.name ?? ''),
    year: Number(raw.year ?? 0),
    overview: String(raw.overview ?? ''),
    vote_average: Number(raw.vote_average ?? raw.voteAverage ?? raw.voteAvg ?? 0),
    genres: Array.isArray(raw.genres) ? (raw.genres as string[]) : [],
    poster_url: posterURL(poster, 'tv'),
    has_file: hasFile,
    stream_url: streamURL,
    created_at: String(raw.created_at ?? raw.createdAt ?? ''),
    tmdb_id: raw.tmdb_id != null || raw.tmdbId != null ? Number(raw.tmdb_id ?? raw.tmdbId) : undefined,
    backdrop_url: posterURL(String(raw.backdrop_url ?? raw.backdropUrl ?? raw.backdrop_path ?? ''), 'tv'),
    status: raw.status != null ? String(raw.status) : undefined,
    seasons,
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
    const data = await getJSON<unknown>(`/api/movies?page=${page}&page_size=${pageSize}`)
    return asList(data, normalizeMovie)
  },

  async getMovie(id: string): Promise<Movie> {
    const data = await getJSON<Record<string, unknown>>(`/api/movies/${encodeURIComponent(id)}`)
    const row = (data.movie || data.item || data) as Record<string, unknown>
    return normalizeMovie(row)
  },

  async listTVShows(page = 1, pageSize = 48): Promise<ListResponse<TVShow>> {
    const data = await getJSON<unknown>(`/api/tv?page=${page}&page_size=${pageSize}`)
    return asList(data, normalizeTV)
  },

  async getTVShow(id: string): Promise<TVShow> {
    const data = await getJSON<Record<string, unknown>>(`/api/tv/${encodeURIComponent(id)}`)
    const row = (data.show || data.series || data.item || data) as Record<string, unknown>
    return normalizeTV(row)
  },

  async search(query: string): Promise<SearchResult[]> {
    const data = await getJSON<{ results?: SearchResult[]; error?: string }>(
      `/api/search?q=${encodeURIComponent(query)}`,
    )
    return (data.results || []).map((row) => ({
      ...row,
      mediaType: row.mediaType === 'tv' ? 'tv' : 'movie',
    }))
  },

  async requestTitle(input: {
    tmdbId: number
    title: string
    year: number
    overview: string
    poster: string
    mediaType: 'movie' | 'tv'
  }): Promise<{ requestId: string; movieId?: string; seriesId?: string; status: string }> {
    return getJSON('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
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
      body: JSON.stringify({ ...input, mediaType: 'movie' }),
    })
  },

  async listRequests(): Promise<MediaRequest[]> {
    return getJSON<MediaRequest[]>('/api/requests')
  },

  /** Jellyfin web deep-link for a MuxCore library id (404 when unlinked). */
  async jellyfinPlayURL(muxId: string): Promise<string | null> {
    try {
      const data = await getJSON<{ url?: string }>(`/api/jellyfin/play?mux_id=${encodeURIComponent(muxId)}`)
      return data.url || null
    } catch {
      return null
    }
  },
}

export { posterURL, normalizeMovie, normalizeTV }
