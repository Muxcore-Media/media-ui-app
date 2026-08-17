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
}

export interface SearchResult {
  id: number
  title: string
  year: number
  overview: string
  poster: string
  voteAvg: number
  mediaType: 'movie' | 'tv'
}

export interface MediaRequest {
  id: string
  itemType: string
  itemId: string
  tmdbId: number
  title: string
  year: number
  poster: string
  status: string
  createdAt: string
  updatedAt: string
}
