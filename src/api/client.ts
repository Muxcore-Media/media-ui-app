import type {
  Episode,
  LibraryListResponse,
  LibraryRow,
  ListResponse,
  MediaRequest,
  Movie,
  MusicArtistDetail,
  SearchResult,
  DiscoverDetail,
  Season,
  TVShow,
} from '../types'
import type { Capabilities, FeatureKey, LibraryKey } from '../lib/capabilities'
import { DEFAULT_CAPABILITIES } from '../lib/capabilities'

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
    collection_id: raw.collection_id != null || raw.collectionId != null ? Number(raw.collection_id ?? raw.collectionId) : undefined,
    collection_name:
      raw.collection_name != null || raw.collectionName != null
        ? String(raw.collection_name ?? raw.collectionName)
        : undefined,
    root_folder_path:
      raw.root_folder_path != null || raw.rootFolderPath != null
        ? String(raw.root_folder_path ?? raw.rootFolderPath)
        : undefined,
    library_type: raw.library_type != null || raw.libraryType != null ? String(raw.library_type ?? raw.libraryType) : undefined,
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
    library: obj.library != null ? String(obj.library) : undefined,
    filter_mode: obj.filter_mode != null || obj.filterMode != null ? String(obj.filter_mode ?? obj.filterMode) : undefined,
  }
}

function mergeCapabilities(raw: { libraries?: Record<string, boolean>; features?: Record<string, boolean> }): Capabilities {
  const libraries = { ...DEFAULT_CAPABILITIES.libraries }
  const features = { ...DEFAULT_CAPABILITIES.features }
  for (const key of Object.keys(libraries) as LibraryKey[]) {
    if (typeof raw.libraries?.[key] === 'boolean') libraries[key] = raw.libraries[key]
  }
  for (const key of Object.keys(features) as FeatureKey[]) {
    if (typeof raw.features?.[key] === 'boolean') features[key] = raw.features[key]
  }
  return { libraries, features }
}

export const api = {
  async getCapabilities(): Promise<Capabilities> {
    return mergeCapabilities(await getJSON('/api/capabilities'))
  },

  async listMovies(
    page = 1,
    pageSize = 48,
    opts?: { library?: 'musicvideos' | 'homevideos' | string },
  ): Promise<ListResponse<Movie>> {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (opts?.library) {
      q.set('library', opts.library)
    }
    const data = await getJSON<unknown>(`/api/movies?${q}`)
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

  async getDiscoverDetail(type: 'movie' | 'tv', id: number): Promise<DiscoverDetail> {
    const data = await getJSON<DiscoverDetail>(`/api/discover/${type}/${id}`)
    return {
      ...data,
      mediaType: data.mediaType === 'tv' ? 'tv' : 'movie',
      genres: Array.isArray(data.genres) ? data.genres : [],
    }
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

  async listMusic(): Promise<LibraryListResponse> {
    return getLibraryList('/api/music')
  },
  async listBooks(): Promise<LibraryListResponse> {
    return getLibraryList('/api/books')
  },
  async getBookAuthor(id: string): Promise<{
    author: { id: string; name: string; path?: string }
    books: Array<{
      id: string
      title: string
      year?: number
      isbn?: string
      files?: Array<{ id: string; title: string; path: string; stream_url?: string }>
    }>
  }> {
    return getJSON(`/api/books/${encodeURIComponent(id)}`)
  },
  async listComics(): Promise<LibraryListResponse> {
    return getLibraryList('/api/comics')
  },
  async listAudiobooks(): Promise<LibraryListResponse> {
    return getLibraryList('/api/audiobooks')
  },

  async getMusicArtist(id: string): Promise<MusicArtistDetail> {
    return getJSON<MusicArtistDetail>(`/api/music/${encodeURIComponent(id)}`)
  },

  async getTrackLyrics(trackId: string): Promise<{ found: boolean; text: string; title?: string; format?: string }> {
    return getJSON(`/api/music/tracks/${encodeURIComponent(trackId)}/lyrics`)
  },

  async listLiveTV(): Promise<{
    channels: Array<{
      id: string
      name: string
      number: string
      url?: string
      category?: string
      now_playing?: { title: string; start: string; end: string }
    }>
    recordings?: Array<{
      id: string
      channel_id: string
      title: string
      start: string
      end: string
      status: string
      path?: string
    }>
    timers?: Array<{
      id: string
      channel_id: string
      title: string
      start: string
      end: string
      series?: boolean
    }>
    guide?: Array<{
      channel_id: string
      title: string
      start: string
      end: string
    }>
    available: boolean
  }> {
    return getJSON('/api/livetv')
  },

  async createLiveTVTimer(input: {
    channel_id: string
    title: string
    series?: boolean
    start?: string
    end?: string
  }): Promise<{ ok: boolean }> {
    return getJSON('/api/livetv/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  },

  async listCollections(): Promise<{ items: { id: string; name: string; movie_count: number }[] }> {
    return getJSON('/api/collections')
  },

  async getCollection(id: string): Promise<{ id: string; name: string; movies: import('../types').Movie[] }> {
    const raw = await getJSON<{ id: string; name: string; movies: Record<string, unknown>[] }>(
      `/api/collections/${encodeURIComponent(id)}`,
    )
    return {
      id: raw.id,
      name: raw.name,
      movies: (raw.movies || []).map((m) => normalizeMovie(m)),
    }
  },

  async approveQuickConnect(code: string): Promise<{ ok: boolean; message?: string }> {
    return getJSON('/api/quickconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
  },

  async getUserdata(): Promise<{
    progress: Record<string, unknown>
    favorites: Record<string, unknown>
    prefs?: unknown
  }> {
    return getJSON('/api/userdata')
  },

  async putUserdata(blob: {
    progress: Record<string, unknown>
    favorites: Record<string, unknown>
    prefs?: unknown
  }): Promise<void> {
    await getJSON('/api/userdata', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blob),
    })
  },
}

async function getLibraryList(path: string): Promise<LibraryListResponse> {
  const data = await getJSON<Record<string, unknown>>(path)
  const rows = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : []
  const items: LibraryRow[] = rows.map((row) => ({
    ...row,
    id: String(row.id ?? row.name ?? row.title ?? Math.random()),
    name: row.name != null ? String(row.name) : undefined,
    title: row.title != null ? String(row.title) : undefined,
    path: row.path != null ? String(row.path) : undefined,
    year: row.year != null ? Number(row.year) : undefined,
  }))
  return {
    items,
    total: Number(data.total ?? items.length),
    page: Number(data.page ?? 1),
    page_size: Number(data.page_size ?? data.pageSize ?? items.length),
    available: data.available !== false,
    coming_soon: Boolean(data.coming_soon),
    message: data.message != null ? String(data.message) : undefined,
    library: data.library != null ? String(data.library) : undefined,
    error: data.error != null ? String(data.error) : undefined,
    code: data.code != null ? String(data.code) : undefined,
  }
}

export type PlaybackResolve = {
  stream_url: string
  mode: 'direct' | 'transcode' | string
  resume_enabled: boolean
  transcoder_enabled: boolean
  prefer_direct_play: boolean
  max_bitrate_mbps: string
  trickplay_enabled: boolean
  transcoder_available: boolean
}

export async function resolvePlayback(src: string): Promise<PlaybackResolve> {
  const q = new URLSearchParams({ src })
  return getJSON<PlaybackResolve>(`/api/playback/resolve?${q}`)
}

export type PlaybackSubtitleTrack = {
  id: string
  label: string
  language?: string
  srclang?: string
  src: string
  default?: boolean
}

export async function fetchPlaybackSubtitles(src: string): Promise<{ tracks: PlaybackSubtitleTrack[] }> {
  const q = new URLSearchParams({ src })
  return getJSON<{ tracks: PlaybackSubtitleTrack[] }>(`/api/playback/subtitles?${q}`)
}

export { posterURL, normalizeMovie, normalizeTV }
