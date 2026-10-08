export type MediaKind = 'movie' | 'tv';

export interface Movie {
  id: string;
  title: string;
  year: number;
  overview: string;
  runtime: number;
  vote_average: number;
  genres: string[];
  poster_url: string;
  has_file: boolean;
  stream_url: string;
  created_at: string;
  tmdb_id?: number;
  backdrop_url?: string;
  tagline?: string;
  status?: string;
  collection_id?: number;
  collection_name?: string;
  root_folder_path?: string;
  library_type?: string;
  /** MPAA / TV content rating as returned by the media server (e.g. "PG-13", "TV-MA"). */
  content_rating?: string;
  /** Production studio / distributor as returned by the media server (e.g. "Pixar", "Warner Bros."). */
  studio?: string;
  /** Whether automation should search and upgrade this movie. */
  monitored?: boolean;
  quality_profile_id?: string;
}

export interface Episode {
  id: string;
  season_number: number;
  episode_number: number;
  title: string;
  overview: string;
  runtime: number;
  has_file: boolean;
  stream_url: string;
  air_date?: string;
  monitored?: boolean;
  quality?: string;
  filename?: string;
  file_id?: string;
}

export interface Season {
  id: string;
  season_number: number;
  name: string;
  episode_count: number;
  poster_url: string;
  episodes: Episode[];
  monitored?: boolean;
}

export interface TVShow {
  id: string;
  title: string;
  year: number;
  overview: string;
  vote_average: number;
  genres: string[];
  poster_url: string;
  has_file: boolean;
  stream_url: string;
  created_at: string;
  tmdb_id?: number;
  backdrop_url?: string;
  status?: string;
  seasons?: Season[];
  /** MPAA / TV content rating as returned by the media server (e.g. "TV-14", "TV-MA"). */
  content_rating?: string;
  /** Broadcast / streaming network (e.g. "HBO", "Netflix", "ABC"). */
  network?: string;
  /** Production studio (e.g. "HBO Studios", "Bad Robot Productions"). */
  studio?: string;
  /** Whether automation should search and upgrade this series. */
  monitored?: boolean;
  quality_profile_id?: string;
  root_folder_path?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  library?: string;
  filter_mode?: 'config' | 'heuristic' | string;
}

export interface SearchResult {
  id: number;
  musicbrainzId?: string;
  releaseGroupId?: string;
  recordingId?: string;
  artistName?: string;
  albumTitle?: string;
  title: string;
  year: number;
  overview: string;
  poster: string;
  voteAvg: number;
  mediaType: 'movie' | 'tv' | 'music' | 'music_album' | 'music_track';
}

export interface DiscoverTrailer {
  name: string;
  youtubeKey: string;
  url: string;
}

export interface DiscoverCastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
}

export interface DiscoverDetail {
  id: number;
  title: string;
  year: number;
  overview: string;
  tagline?: string;
  genres: string[];
  poster: string;
  backdrop: string;
  voteAvg: number;
  runtime?: number;
  status?: string;
  mediaType: 'movie' | 'tv';
  trailer?: DiscoverTrailer;
  cast?: DiscoverCastMember[];
  seasons?: DiscoverSeason[];
}

export interface DiscoverSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate?: string;
}

export interface MediaRequest {
  id: string;
  itemType: string;
  itemId: string;
  tmdbId: number;
  musicbrainzId?: string;
  title: string;
  year: number;
  poster: string;
  status: string;
  statusDetail?: string;
  statusLabel?: string;
  qualityProfileId?: string;
  seasonNumber?: number;
  createdAt: string;
  updatedAt: string;
}

export type MediaIssueKind = 'video' | 'audio' | 'subtitles' | 'wrong' | 'other';

export interface MediaIssue {
  id: string;
  kind: MediaIssueKind | string;
  mediaType: string;
  mediaId?: string;
  tmdbId?: number;
  title: string;
  message: string;
  reportedBy: string;
  createdAt: string;
}

/** Soft library rows from mediauiprox /api/{music|books|comics|audiobooks}. */
export interface LibraryRow {
  id: string;
  name?: string;
  title?: string;
  path?: string;
  year?: number;
  publisher?: string;
  [key: string]: unknown;
}

export interface ReleaseMatch {
  guid: string;
  title: string;
  indexer_name?: string;
  download_protocol?: string;
  size?: number;
  seeders?: number;
  peers?: number;
  score?: number;
  download_url?: string;
  info_url?: string;
  category?: string;
  quality?: {
    label?: string;
    resolution?: string;
    source?: string;
    codec?: string;
    hdr?: boolean;
    score?: number;
  };
}

export interface ReleaseSearchResponse {
  items: ReleaseMatch[];
  total: number;
  available?: boolean;
  message?: string;
  query?: string;
  type?: string;
}

export interface ReleaseGrabResult {
  download_id: string;
  status: string;
}

export interface CutoffItem {
  queue_id?: string;
  item_type: string;
  item_id: string;
  title: string;
  year?: number;
  current_score: number;
  cutoff_score: number;
  quality_profile_id?: string;
}

export interface CutoffUnmetResponse {
  items: CutoffItem[];
  total: number;
  page?: number;
  page_size?: number;
  available?: boolean;
  message?: string;
}

export interface SearchNowResult {
  started: boolean;
  message?: string;
}

export interface ReleaseBlockResult {
  success: boolean;
  guid?: string;
}

export interface ActivityRecord {
  id: string;
  wanted_item_id?: string;
  guid?: string;
  title: string;
  indexer?: string;
  size?: number;
  score?: number;
  download_protocol?: string;
  status: string;
  status_label?: string;
  status_detail?: string;
  created_at?: string;
  download_id?: string;
  warning?: boolean;
  stuck?: boolean;
}

export interface ActivityResponse {
  items: ActivityRecord[];
  total: number;
  page?: number;
  page_size?: number;
  available?: boolean;
  message?: string;
}

export interface WantedItem {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  year?: number;
  tmdb_id?: number;
  monitored: boolean;
  missing: boolean;
  updated_at?: string;
  season_number?: number;
  episode_number?: number;
}

export interface WantedResponse {
  items: WantedItem[];
  total: number;
  page?: number;
  page_size?: number;
  available?: boolean;
  message?: string;
}

export interface ActivityRetryResult {
  attempted: number;
  message?: string;
}

export interface CalendarItem {
  kind: 'movie' | 'tv' | string;
  id: string;
  parent_id: string;
  title: string;
  subtitle?: string;
  date: string;
  href: string;
  monitored?: boolean;
  has_file?: boolean;
  season_number?: number;
  episode_number?: number;
  year?: number;
  content_rating?: string;
}

export interface CalendarResponse {
  items: CalendarItem[];
  total: number;
  start?: string;
  end?: string;
  available?: boolean;
}

export interface LibraryListResponse {
  items: LibraryRow[];
  total: number;
  page?: number;
  page_size?: number;
  available?: boolean;
  coming_soon?: boolean;
  message?: string;
  library?: string;
  error?: string;
  code?: string;
}

export interface MusicTrack {
  id: string;
  album_id?: string;
  artist_id?: string;
  title: string;
  path?: string;
  stream_url?: string;
}

export interface MusicAlbum {
  id: string;
  artist_id?: string;
  title: string;
  year?: number;
  monitored?: boolean;
  tracks?: MusicTrack[];
}

export interface MusicArtistDetail {
  artist: {
    id: string;
    name: string;
    path?: string;
    monitored?: boolean;
    quality_profile_id?: string;
    root_folder_path?: string;
  };
  albums: MusicAlbum[];
}

export interface AudiobookFile {
  id: string;
  audiobook_id?: string;
  title: string;
  path?: string;
  stream_url?: string;
}

export interface Audiobook {
  id: string;
  author_id?: string;
  title: string;
  narrator?: string;
  asin?: string;
  year?: number;
  duration_seconds?: number;
  monitored?: boolean;
  stream_url?: string;
  files?: AudiobookFile[];
}

export interface AudiobookDetail {
  author: { id: string; name: string; path?: string; monitored?: boolean };
  audiobook: Audiobook;
}

/**
 * A single item returned by the media-graph /api/graph/related endpoint.
 * Extends SearchResult so it can be passed directly to PosterCard as `type="external"`.
 * `content_rating` is display metadata; parental enforcement is server-side (ADR-0031).
 */
export type RelatedItem = SearchResult & {
  /** Graph edge label (e.g. "related_to", "same_franchise", "adaptation", "neighbor"). */
  relation?: string;
  /** Library content rating when the BFF can join it (optional; display only, absence does not mean allowed). */
  content_rating?: string;
};

/** Response shape for GET /api/graph/related. */
export type RelatedResponse = {
  items: RelatedItem[];
  /** False when the media-graph module is not installed / reachable. */
  available: boolean;
};

/** A single credit entry returned by the discover person credits endpoint. */
export interface PersonCredit {
  tmdbId: number;
  title: string;
  year: number;
  mediaType: 'movie' | 'tv';
  character?: string;
  poster?: string;
}

/**
 * Person detail from GET /api/discover/person/:id/credits.
 * Includes TMDB biography/profile data plus a combined credits list.
 */
export interface PersonDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  profilePath?: string;
  credits: PersonCredit[];
}
