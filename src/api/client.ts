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
} from '../types';
import type { Capabilities, FeatureKey, LibraryKey } from '../lib/capabilities';
import { DEFAULT_CAPABILITIES } from '../lib/capabilities';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const OFFLINE_FETCH_MESSAGE = "You're offline. Check your connection and try again.";

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** User-facing copy for route-level fetch failures (ErrorBanner). */
export function friendlyFetchError(err: unknown, fallback = 'Something went wrong'): string {
  if (isOffline()) return OFFLINE_FETCH_MESSAGE;
  return err instanceof Error ? err.message : fallback;
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    if (isOffline()) throw new Error(OFFLINE_FETCH_MESSAGE);
    throw err;
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body?.error) {
        detail = body.code ? `${body.error} (${body.code})` : body.error;
      }
    } catch {
      /* plain-text error bodies are fine */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

function posterURL(path: string, kind: 'movie' | 'tv' = 'movie'): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/images/')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${path}`;
  }
  return kind === 'tv' ? `/images/tv/${path}` : `/images/movies/${path}`;
}

function normalizeMovie(raw: Record<string, unknown>): Movie {
  const id = String(raw.id ?? raw.movieId ?? '');
  const poster = String(
    raw.poster_url ?? raw.posterUrl ?? raw.poster ?? raw.poster_path ?? raw.posterPath ?? '',
  );
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
    tmdb_id:
      raw.tmdb_id != null || raw.tmdbId != null ? Number(raw.tmdb_id ?? raw.tmdbId) : undefined,
    backdrop_url: posterURL(
      String(raw.backdrop_url ?? raw.backdropUrl ?? raw.backdrop_path ?? ''),
      'movie',
    ),
    tagline: raw.tagline != null ? String(raw.tagline) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    content_rating:
      raw.content_rating != null || raw.contentRating != null || raw.officialRating != null
        ? String(raw.content_rating ?? raw.contentRating ?? raw.officialRating)
        : undefined,
    collection_id:
      raw.collection_id != null || raw.collectionId != null
        ? Number(raw.collection_id ?? raw.collectionId)
        : undefined,
    collection_name:
      raw.collection_name != null || raw.collectionName != null
        ? String(raw.collection_name ?? raw.collectionName)
        : undefined,
    root_folder_path:
      raw.root_folder_path != null || raw.rootFolderPath != null
        ? String(raw.root_folder_path ?? raw.rootFolderPath)
        : undefined,
    library_type:
      raw.library_type != null || raw.libraryType != null
        ? String(raw.library_type ?? raw.libraryType)
        : undefined,
  };
}

function normalizeEpisode(raw: Record<string, unknown>): Episode {
  const id = String(raw.id ?? '');
  const hasFile = Boolean(raw.has_file ?? raw.hasFile);
  return {
    id,
    season_number: Number(raw.season_number ?? raw.seasonNumber ?? 0),
    episode_number: Number(raw.episode_number ?? raw.episodeNumber ?? 0),
    title: String(raw.title ?? raw.name ?? ''),
    overview: String(raw.overview ?? ''),
    runtime: Number(raw.runtime ?? 0),
    has_file: hasFile,
    stream_url: String(
      raw.stream_url ?? raw.streamUrl ?? (hasFile && id ? `/stream/tv/${id}` : ''),
    ),
    air_date:
      raw.air_date != null || raw.airDate != null ? String(raw.air_date ?? raw.airDate) : undefined,
  };
}

function normalizeSeason(raw: Record<string, unknown>): Season {
  const eps = Array.isArray(raw.episodes)
    ? (raw.episodes as Record<string, unknown>[]).map(normalizeEpisode)
    : [];
  return {
    id: String(raw.id ?? ''),
    season_number: Number(raw.season_number ?? raw.seasonNumber ?? 0),
    name: String(raw.name ?? ''),
    episode_count: Number(raw.episode_count ?? raw.episodeCount ?? eps.length),
    poster_url: posterURL(String(raw.poster_url ?? raw.posterUrl ?? raw.poster_path ?? ''), 'tv'),
    episodes: eps,
  };
}

function normalizeTV(raw: Record<string, unknown>): TVShow {
  const id = String(raw.id ?? raw.seriesId ?? '');
  const poster = String(
    raw.poster_url ?? raw.posterUrl ?? raw.poster ?? raw.poster_path ?? raw.posterPath ?? '',
  );
  const seasons = Array.isArray(raw.seasons)
    ? (raw.seasons as Record<string, unknown>[]).map(normalizeSeason)
    : undefined;
  const hasFile =
    Boolean(raw.has_file ?? raw.hasFile) ||
    Boolean(seasons?.some((s) => s.episodes.some((e) => e.has_file)));
  const streamURL =
    String(raw.stream_url ?? raw.streamUrl ?? '') ||
    seasons?.flatMap((s) => s.episodes).find((e) => e.has_file)?.stream_url ||
    '';
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
    tmdb_id:
      raw.tmdb_id != null || raw.tmdbId != null ? Number(raw.tmdb_id ?? raw.tmdbId) : undefined,
    backdrop_url: posterURL(
      String(raw.backdrop_url ?? raw.backdropUrl ?? raw.backdrop_path ?? ''),
      'tv',
    ),
    status: raw.status != null ? String(raw.status) : undefined,
    seasons,
    content_rating:
      raw.content_rating != null || raw.contentRating != null || raw.officialRating != null
        ? String(raw.content_rating ?? raw.contentRating ?? raw.officialRating)
        : undefined,
  };
}

function normalizeRequest(raw: Record<string, unknown>): MediaRequest {
  const statusDetail = raw.statusDetail ?? raw.status_detail;
  const statusLabel = raw.statusLabel ?? raw.status_label;
  return {
    id: String(raw.id ?? ''),
    itemType: String(raw.itemType ?? raw.item_type ?? ''),
    itemId: String(raw.itemId ?? raw.item_id ?? ''),
    tmdbId: Number(raw.tmdbId ?? raw.tmdb_id ?? 0),
    musicbrainzId:
      raw.musicbrainzId != null || raw.musicbrainz_id != null
        ? String(raw.musicbrainzId ?? raw.musicbrainz_id)
        : undefined,
    title: String(raw.title ?? ''),
    year: Number(raw.year ?? 0),
    poster: String(raw.poster ?? ''),
    status: String(raw.status ?? ''),
    statusDetail:
      statusDetail != null && String(statusDetail) !== '' ? String(statusDetail) : undefined,
    statusLabel:
      statusLabel != null && String(statusLabel) !== '' ? String(statusLabel) : undefined,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
  };
}

function asList<T>(data: unknown, map: (row: Record<string, unknown>) => T): ListResponse<T> {
  if (Array.isArray(data)) {
    const items = data.map((row) => map(row as Record<string, unknown>));
    return { items, total: items.length, page: 1, page_size: items.length };
  }
  const obj = (data || {}) as Record<string, unknown>;
  const rows = (obj.items || obj.results || obj.movies || obj.shows || []) as Record<
    string,
    unknown
  >[];
  const items = rows.map(map);
  return {
    items,
    total: Number(obj.total ?? items.length),
    page: Number(obj.page ?? 1),
    page_size: Number(obj.page_size ?? obj.pageSize ?? items.length),
    library: obj.library != null ? String(obj.library) : undefined,
    filter_mode:
      obj.filter_mode != null || obj.filterMode != null
        ? String(obj.filter_mode ?? obj.filterMode)
        : undefined,
  };
}

function mergeCapabilities(raw: {
  libraries?: Record<string, boolean>;
  features?: Record<string, boolean>;
}): Capabilities {
  const libraries = { ...DEFAULT_CAPABILITIES.libraries };
  const features = { ...DEFAULT_CAPABILITIES.features };
  for (const key of Object.keys(libraries) as LibraryKey[]) {
    if (typeof raw.libraries?.[key] === 'boolean') libraries[key] = raw.libraries[key];
  }
  for (const key of Object.keys(features) as FeatureKey[]) {
    if (typeof raw.features?.[key] === 'boolean') features[key] = raw.features[key];
  }
  return { libraries, features };
}

export const api = {
  async getCapabilities(): Promise<Capabilities> {
    return mergeCapabilities(await getJSON('/api/capabilities'));
  },

  async listMovies(
    page = 1,
    pageSize = 48,
    opts?: { library?: 'musicvideos' | 'homevideos' | string },
  ): Promise<ListResponse<Movie>> {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (opts?.library) {
      q.set('library', opts.library);
    }
    const data = await getJSON<unknown>(`/api/movies?${q}`);
    return asList(data, normalizeMovie);
  },

  async getMovie(id: string): Promise<Movie> {
    const data = await getJSON<Record<string, unknown>>(`/api/movies/${encodeURIComponent(id)}`);
    const row = (data.movie || data.item || data) as Record<string, unknown>;
    return normalizeMovie(row);
  },

  async listTVShows(page = 1, pageSize = 48): Promise<ListResponse<TVShow>> {
    const data = await getJSON<unknown>(`/api/tv?page=${page}&page_size=${pageSize}`);
    return asList(data, normalizeTV);
  },

  async getTVShow(id: string): Promise<TVShow> {
    const data = await getJSON<Record<string, unknown>>(`/api/tv/${encodeURIComponent(id)}`);
    const row = (data.show || data.series || data.item || data) as Record<string, unknown>;
    return normalizeTV(row);
  },

  async search(
    query: string,
    opts?: { type?: 'movie' | 'tv' | 'music' | 'music_album' | 'music_track' },
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (opts?.type) params.set('type', opts.type);
    const data = await getJSON<{ results?: SearchResult[]; error?: string }>(
      `/api/search?${params}`,
    );
    return (data.results || []).map(normalizeSearchResult);
  },

  async getDiscoverDetail(type: 'movie' | 'tv', id: number): Promise<DiscoverDetail> {
    const data = await getJSON<DiscoverDetail>(`/api/discover/${type}/${id}`);
    return {
      ...data,
      mediaType: data.mediaType === 'tv' ? 'tv' : 'movie',
      genres: Array.isArray(data.genres) ? data.genres : [],
    };
  },

  async discoverBrowse(
    category: 'trending' | 'popular',
    type: 'movie' | 'tv',
    opts?: { window?: 'day' | 'week' },
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    if (opts?.window) params.set('window', opts.window);
    const q = params.toString();
    const data = await getJSON<{ results?: SearchResult[]; error?: string }>(
      `/api/discover/${category}/${type}${q ? `?${q}` : ''}`,
    );
    return (data.results || []).map(normalizeSearchResult);
  },

  async watchlist(opts?: { type?: 'movie' | 'tv' }): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    if (opts?.type) params.set('type', opts.type);
    const q = params.toString();
    const data = await getJSON<{ items?: SearchResult[]; error?: string }>(
      `/api/watchlist${q ? `?${q}` : ''}`,
    );
    return (data.items || []).map(normalizeSearchResult);
  },

  async requestTitle(input: {
    tmdbId?: number;
    musicbrainzId?: string;
    releaseGroupId?: string;
    recordingId?: string;
    artistName?: string;
    albumTitle?: string;
    title: string;
    year?: number;
    overview?: string;
    poster?: string;
    mediaType: 'movie' | 'tv' | 'music' | 'music_album' | 'music_track';
  }): Promise<{
    requestId: string;
    movieId?: string;
    seriesId?: string;
    artistId?: string;
    albumId?: string;
    status: string;
  }> {
    const body: Record<string, unknown> = {
      title: input.title,
      overview: input.overview ?? '',
      poster: input.poster ?? '',
      mediaType: input.mediaType,
    };
    if (
      input.mediaType === 'music' ||
      input.mediaType === 'music_album' ||
      input.mediaType === 'music_track'
    ) {
      body.musicbrainzId = input.musicbrainzId ?? '';
      body.releaseGroupId = input.releaseGroupId ?? '';
      body.recordingId = input.recordingId ?? '';
      body.artistName = input.artistName ?? '';
      body.albumTitle = input.albumTitle ?? '';
      if (input.mediaType === 'music_album' || input.mediaType === 'music_track') {
        body.year = input.year ?? 0;
      }
    } else {
      body.tmdbId = input.tmdbId ?? 0;
      body.year = input.year ?? 0;
    }
    return getJSON('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async requestMovie(input: {
    tmdbId: number;
    title: string;
    year: number;
    overview: string;
    poster: string;
  }): Promise<{ requestId: string; movieId: string; status: string }> {
    return getJSON('/api/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, mediaType: 'movie' }),
    });
  },

  async listRequests(): Promise<MediaRequest[]> {
    const data = await getJSON<unknown>('/api/requests');
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => normalizeRequest(row as Record<string, unknown>));
  },

  /** Jellyfin web deep-link for a MuxCore library id (404 when unlinked). */
  async jellyfinPlayURL(muxId: string): Promise<string | null> {
    try {
      const data = await getJSON<{ url?: string }>(
        `/api/jellyfin/play?mux_id=${encodeURIComponent(muxId)}`,
      );
      return data.url || null;
    } catch {
      return null;
    }
  },

  async listMusic(): Promise<LibraryListResponse> {
    return getLibraryList('/api/music');
  },
  async listBooks(): Promise<LibraryListResponse> {
    return getLibraryList('/api/books');
  },
  async getBookAuthor(id: string): Promise<{
    author: { id: string; name: string; path?: string };
    books: Array<{
      id: string;
      title: string;
      year?: number;
      isbn?: string;
      files?: Array<{ id: string; title: string; path: string; stream_url?: string }>;
    }>;
  }> {
    return getJSON(`/api/books/${encodeURIComponent(id)}`);
  },
  async listComics(): Promise<LibraryListResponse> {
    return getLibraryList('/api/comics');
  },
  async listAudiobooks(): Promise<LibraryListResponse> {
    return getLibraryList('/api/audiobooks');
  },

  async getMusicArtist(id: string): Promise<MusicArtistDetail> {
    return getJSON<MusicArtistDetail>(`/api/music/${encodeURIComponent(id)}`);
  },

  async getTrackLyrics(
    trackId: string,
  ): Promise<{ found: boolean; text: string; title?: string; format?: string }> {
    return getJSON(`/api/music/tracks/${encodeURIComponent(trackId)}/lyrics`);
  },

  async listLiveTV(): Promise<{
    channels: Array<{
      id: string;
      name: string;
      number: string;
      url?: string;
      category?: string;
      now_playing?: { title: string; start: string; end: string };
    }>;
    recordings?: Array<{
      id: string;
      channel_id: string;
      title: string;
      start: string;
      end: string;
      status: string;
      path?: string;
    }>;
    timers?: Array<{
      id: string;
      channel_id: string;
      title: string;
      start: string;
      end: string;
      series?: boolean;
    }>;
    guide?: Array<{
      channel_id: string;
      title: string;
      start: string;
      end: string;
    }>;
    available: boolean;
  }> {
    return getJSON('/api/livetv');
  },

  async createLiveTVTimer(input: {
    channel_id: string;
    title: string;
    series?: boolean;
    start?: string;
    end?: string;
  }): Promise<{ ok: boolean }> {
    return getJSON('/api/livetv/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async listCollections(): Promise<{ items: { id: string; name: string; movie_count: number }[] }> {
    return getJSON('/api/collections');
  },

  async getCollection(
    id: string,
  ): Promise<{ id: string; name: string; movies: import('../types').Movie[] }> {
    const raw = await getJSON<{ id: string; name: string; movies: Record<string, unknown>[] }>(
      `/api/collections/${encodeURIComponent(id)}`,
    );
    return {
      id: raw.id,
      name: raw.name,
      movies: (raw.movies || []).map((m) => normalizeMovie(m)),
    };
  },

  async approveQuickConnect(code: string): Promise<{ ok: boolean; message?: string }> {
    return getJSON('/api/quickconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  },

  async getUserdata(): Promise<{
    progress: Record<string, unknown>;
    favorites: Record<string, unknown>;
    prefs?: unknown;
  }> {
    return getJSON('/api/userdata');
  },

  async putUserdata(blob: {
    progress: Record<string, unknown>;
    favorites: Record<string, unknown>;
    prefs?: unknown;
  }): Promise<void> {
    await getJSON('/api/userdata', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blob),
    });
  },
};

async function getLibraryList(path: string): Promise<LibraryListResponse> {
  const data = await getJSON<Record<string, unknown>>(path);
  const rows = Array.isArray(data.items) ? (data.items as Record<string, unknown>[]) : [];
  const items: LibraryRow[] = rows.map((row) => ({
    ...row,
    id: String(row.id ?? row.name ?? row.title ?? Math.random()),
    name: row.name != null ? String(row.name) : undefined,
    title: row.title != null ? String(row.title) : undefined,
    path: row.path != null ? String(row.path) : undefined,
    year: row.year != null ? Number(row.year) : undefined,
  }));
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
  };
}

export type PlaybackResolve = {
  stream_url: string;
  mode: 'direct' | 'transcode' | string;
  resume_enabled: boolean;
  transcoder_enabled: boolean;
  prefer_direct_play: boolean;
  max_bitrate_mbps: string;
  trickplay_enabled: boolean;
  transcoder_available: boolean;
};

export async function resolvePlayback(src: string): Promise<PlaybackResolve> {
  const q = new URLSearchParams({ src });
  return getJSON<PlaybackResolve>(`/api/playback/resolve?${q}`);
}

/** User-facing copy for mediauiprox playback resolve failures ({error, code}). */
export function friendlyPlaybackError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'Playback failed');
  const codeMatch = raw.match(/\(([^)]+)\)$/);
  const code = codeMatch?.[1];
  const message = code ? raw.replace(/\s*\([^)]+\)$/, '').trim() : raw;

  switch (code) {
    case 'playback.src_required':
      return "This title isn't available to play.";
    case 'playback.method_not_allowed':
      return "Playback isn't available right now. Please try again.";
    case 'playback.internal_error':
      return 'Something went wrong preparing playback. Please try again.';
    default:
      return message || 'Playback failed. Please try again.';
  }
}

export type PlaybackSubtitleTrack = {
  id: string;
  label: string;
  language?: string;
  srclang?: string;
  src: string;
  default?: boolean;
};

export async function fetchPlaybackSubtitles(
  src: string,
): Promise<{ tracks: PlaybackSubtitleTrack[] }> {
  const q = new URLSearchParams({ src });
  return getJSON<{ tracks: PlaybackSubtitleTrack[] }>(`/api/playback/subtitles?${q}`);
}

/** intro | outro | credits | recap skip segment, backed by media-intro-outro. */
export type PlaybackSegment = {
  kind: string;
  start_seconds: number;
  end_seconds: number;
  confidence: number;
  source: string;
};

export async function fetchPlaybackSegments(
  mediaId: string,
  durationSeconds?: number,
): Promise<{ media_id: string; segments: PlaybackSegment[]; enabled: boolean }> {
  const q = new URLSearchParams({ media_id: mediaId });
  if (durationSeconds && durationSeconds > 0)
    q.set('duration', String(Math.round(durationSeconds)));
  return getJSON(`/api/playback/segments?${q}`);
}

/** Embedded container chapter marker from ffprobe (MKV/MP4 chapter tracks). */
export type PlaybackChapter = {
  index: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  source?: 'embedded' | 'scene' | 'interval' | string;
};

export async function fetchPlaybackChapters(
  src: string,
  durationSeconds?: number,
): Promise<{ src: string; chapters: PlaybackChapter[]; enabled: boolean; source?: string }> {
  const q = new URLSearchParams({ src });
  if (durationSeconds && durationSeconds > 0) {
    q.set('duration', String(Math.round(durationSeconds)));
  }
  const raw = await getJSON<{
    src: string;
    source?: string;
    chapters?: Array<{
      index?: number;
      title?: string;
      start_seconds?: number;
      end_seconds?: number;
      startSeconds?: number;
      endSeconds?: number;
      source?: string;
    }>;
    enabled?: boolean;
  }>(`/api/playback/chapters?${q}`);
  const chapters = (raw.chapters || []).map((ch, i) => ({
    index: ch.index ?? i,
    title: ch.title || `Chapter ${i + 1}`,
    start_seconds: ch.start_seconds ?? ch.startSeconds ?? 0,
    end_seconds: ch.end_seconds ?? ch.endSeconds ?? 0,
    source: ch.source,
  }));
  return {
    src: raw.src,
    chapters,
    enabled: raw.enabled ?? chapters.length > 0,
    source: raw.source,
  };
}

export type PlaybackAnalysisVideo = {
  codec?: string;
  width?: number;
  height?: number;
  resolution_label?: string;
  hdr?: boolean;
  hdr_type?: string;
};

export type PlaybackAnalysisAudio = {
  index: number;
  codec?: string;
  language?: string;
  channels?: number;
  channel_layout?: string;
  label?: string;
};

export type PlaybackAnalysisSubtitle = {
  index: number;
  codec?: string;
  language?: string;
  forced?: boolean;
  hearing_impaired?: boolean;
  picture_based?: boolean;
  text_based?: boolean;
  label?: string;
};

export type PlaybackAnalysisQuality = {
  label?: string;
  resolution?: string;
  source?: string;
  codec_group?: string;
  hdr?: boolean;
};

export type PlaybackAnalysis = {
  src: string;
  enabled: boolean;
  info_line?: string;
  container?: string;
  duration_seconds?: number;
  video?: PlaybackAnalysisVideo;
  audio?: PlaybackAnalysisAudio[];
  subtitles?: PlaybackAnalysisSubtitle[];
  quality?: PlaybackAnalysisQuality;
};

export async function fetchPlaybackAnalysis(src: string): Promise<PlaybackAnalysis> {
  const q = new URLSearchParams({ src });
  return getJSON(`/api/playback/analysis?${q}`);
}

/** A single subtitle candidate returned by media-subtitles search. */
export type SubtitleSearchResult = {
  id: string;
  provider: string;
  title: string;
  language: string;
  format: string;
  release?: string;
  downloads?: number;
};

/** Parameters for `searchSubtitles`. */
export type SubtitleSearchParams = {
  title: string;
  language: string;
  year?: number;
  imdbId?: string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
};

/**
 * Search for subtitle candidates via the BFF → media-subtitles module.
 * Returns `available: false` when the module is not installed/configured.
 */
export async function searchSubtitles(
  params: SubtitleSearchParams,
): Promise<{ results: SubtitleSearchResult[]; available: boolean }> {
  const q = new URLSearchParams({ title: params.title, language: params.language });
  if (params.year) q.set('year', String(params.year));
  if (params.imdbId) q.set('imdb_id', params.imdbId);
  if (params.mediaType) q.set('media_type', params.mediaType);
  if (params.season != null) q.set('season', String(params.season));
  if (params.episode != null) q.set('episode', String(params.episode));
  return getJSON<{ results: SubtitleSearchResult[]; available: boolean }>(
    `/api/subtitles/search?${q}`,
  );
}

/**
 * Download a specific subtitle by ID from media-subtitles and register it as a
 * playable sidecar track. Returns the BFF-hosted VTT URL plus display metadata.
 */
export async function downloadSubtitle(
  id: string,
  provider: string,
): Promise<{ track_url: string; language: string; label: string }> {
  return getJSON<{ track_url: string; language: string; label: string }>(
    '/api/subtitles/download',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, provider }),
    },
  );
}

export type TrickplayManifest = {
  url: string;
  intervalSeconds: number;
  cols: number;
  rows: number;
  count: number;
};

/** Fetches the trickplay sprite sheet (as a blob URL) plus its grid layout from response headers. */
export async function fetchTrickplaySprite(
  src: string,
  durationSeconds: number,
  intervalSeconds = 10,
): Promise<TrickplayManifest | null> {
  const q = new URLSearchParams({
    src,
    duration: String(Math.round(durationSeconds)),
    interval: String(intervalSeconds),
  });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/stream/trickplay?${q}`);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const cols = Number(res.headers.get('X-Trickplay-Cols') || '0');
  const rows = Number(res.headers.get('X-Trickplay-Rows') || '0');
  const count = Number(res.headers.get('X-Trickplay-Count') || '0');
  const intervalSecondsActual = Number(
    res.headers.get('X-Trickplay-Interval-Seconds') || String(intervalSeconds),
  );
  if (!cols || !rows) return null;
  const blob = await res.blob();
  return {
    url: URL.createObjectURL(blob),
    intervalSeconds: intervalSecondsActual,
    cols,
    rows,
    count: count || cols * rows,
  };
}

export function normalizeSearchResult(row: SearchResult): SearchResult {
  if (
    row.mediaType === 'music' ||
    row.mediaType === 'music_album' ||
    row.mediaType === 'music_track'
  ) {
    return {
      ...row,
      id: row.id || 0,
      musicbrainzId: row.musicbrainzId,
      releaseGroupId: row.releaseGroupId,
      recordingId: row.recordingId,
      artistName: row.artistName,
      albumTitle: row.albumTitle,
    };
  }
  return {
    ...row,
    mediaType: row.mediaType === 'tv' ? 'tv' : 'movie',
  };
}

export function searchResultKey(row: SearchResult): string {
  if (row.mediaType === 'music_track') {
    return `music_track:${row.recordingId || row.title.toLowerCase()}`;
  }
  if (row.mediaType === 'music_album') {
    return `music_album:${row.releaseGroupId || row.title.toLowerCase()}`;
  }
  if (row.mediaType === 'music') {
    return `music:${row.musicbrainzId || row.title.toLowerCase()}`;
  }
  return `${row.mediaType}:${row.id}`;
}

export { posterURL, normalizeMovie, normalizeTV, normalizeRequest };
