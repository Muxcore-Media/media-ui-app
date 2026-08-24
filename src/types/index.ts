export type MediaKind = 'movie' | 'tv'

export interface Movie {
  id: string
  title: string
  year: number
  overview: string
  runtime: number
  vote_average: number
  genres: string[]
  poster_url: string
  has_file: boolean
  stream_url: string
  created_at: string
  tmdb_id?: number
  backdrop_url?: string
  tagline?: string
  status?: string
  collection_id?: number
  collection_name?: string
  root_folder_path?: string
  library_type?: string
}

export interface Episode {
  id: string
  season_number: number
  episode_number: number
  title: string
  overview: string
  runtime: number
  has_file: boolean
  stream_url: string
  air_date?: string
}

export interface Season {
  id: string
  season_number: number
  name: string
  episode_count: number
  poster_url: string
  episodes: Episode[]
}

export interface TVShow {
  id: string
  title: string
  year: number
  overview: string
  vote_average: number
  genres: string[]
  poster_url: string
  has_file: boolean
  stream_url: string
  created_at: string
  tmdb_id?: number
  backdrop_url?: string
  status?: string
  seasons?: Season[]
}

export interface ListResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  library?: string
  filter_mode?: 'config' | 'heuristic' | string
}

export interface SearchResult {
  id: number
  musicbrainzId?: string
  releaseGroupId?: string
  recordingId?: string
  artistName?: string
  albumTitle?: string
  title: string
  year: number
  overview: string
  poster: string
  voteAvg: number
  mediaType: 'movie' | 'tv' | 'music' | 'music_album' | 'music_track'
}

export interface DiscoverTrailer {
  name: string
  youtubeKey: string
  url: string
}

export interface DiscoverCastMember {
  id: number
  name: string
  character?: string
  profilePath?: string
}

export interface DiscoverDetail {
  id: number
  title: string
  year: number
  overview: string
  tagline?: string
  genres: string[]
  poster: string
  backdrop: string
  voteAvg: number
  runtime?: number
  status?: string
  mediaType: 'movie' | 'tv'
  trailer?: DiscoverTrailer
  cast?: DiscoverCastMember[]
}

export interface MediaRequest {
  id: string
  itemType: string
  itemId: string
  tmdbId: number
  musicbrainzId?: string
  title: string
  year: number
  poster: string
  status: string
  statusDetail?: string
  statusLabel?: string
  createdAt: string
  updatedAt: string
}

/** Soft library rows from mediauiprox /api/{music|books|comics|audiobooks}. */
export interface LibraryRow {
  id: string
  name?: string
  title?: string
  path?: string
  year?: number
  publisher?: string
  [key: string]: unknown
}

export interface LibraryListResponse {
  items: LibraryRow[]
  total: number
  page?: number
  page_size?: number
  available?: boolean
  coming_soon?: boolean
  message?: string
  library?: string
  error?: string
  code?: string
}

export interface MusicTrack {
  id: string
  album_id?: string
  artist_id?: string
  title: string
  path?: string
  stream_url?: string
}

export interface MusicAlbum {
  id: string
  artist_id?: string
  title: string
  year?: number
  tracks?: MusicTrack[]
}

export interface MusicArtistDetail {
  artist: { id: string; name: string; path?: string; monitored?: boolean }
  albums: MusicAlbum[]
}

