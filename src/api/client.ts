import type {
  Episode,
  AudiobookDetail,
  LibraryListResponse,
  LibraryRow,
  ListResponse,
  MediaRequest,
  Movie,
  MusicArtistDetail,
  PersonDetail,
  RelatedItem,
  ActivityResponse,
  ActivityRetryResult,
  CalendarResponse,
  CutoffUnmetResponse,
  ReleaseBlockResult,
  ReleaseGrabResult,
  ReleaseSearchResponse,
  SearchNowResult,
  WantedResponse,
  RelatedResponse,
  SearchResult,
  DiscoverDetail,
  MediaIssue,
  Season,
  TVShow,
} from '../types';
import type { Capabilities, FeatureKey, LibraryKey } from '../lib/capabilities';
import { DEFAULT_CAPABILITIES } from '../lib/capabilities';
import {
  normalizeAcquisitionStatus,
  normalizeHouseholdIndexer,
  normalizeIndexers,
  type AcquisitionStatus,
  type HouseholdIndexer,
  type IndexersResponse,
} from '../lib/acquisition-status';
import { normalizeWatchTogether, type WatchTogetherRoom } from '../lib/watch-together';
import {
  customFormatWriteBody,
  normalizeFormatScore,
  normalizeFormatsCatalog,
  normalizeParsedQuality,
  normalizeQualityFormat,
  normalizeQualityProfile,
  normalizeReleaseProfile,
  qualityProfileWriteBody,
  releaseProfileWriteBody,
  type FormatScorePreview,
  type FormatsCatalog,
  type ParsedQuality,
  type QualityFormat,
  type QualityProfile,
  type ReleaseProfile,
} from '../lib/formats';
import {
  normalizeLibraryRoot,
  normalizeRootBrowse,
  normalizeRootPick,
  normalizeRootProbe,
  normalizeRootsCatalog,
  rootWriteBody,
  type LibraryRoot,
  type RootBrowseListing,
  type RootPick,
  type RootProbe,
  type RootsCatalog,
} from '../lib/roots';
import {
  normalizeLibraryScanResult,
  normalizeLibraryScanStatus,
  normalizeWatchDir,
  normalizeWatchDirs,
  type LibraryScanResult,
  type LibraryScanStatus,
  type WatchDir,
  type WatchDirsResponse,
} from '../lib/library-scan';
import {
  normalizeRenamePreview,
  normalizeRenameResult,
  renameQuery,
  type RenamePreview,
  type RenameResult,
} from '../lib/rename';
import {
  normalizeNamingTemplate,
  normalizeNamingTemplates,
  type NamingTemplate,
  type NamingTemplatesResponse,
} from '../lib/naming-templates';
import { normalizeOrganize, type OrganizeResult } from '../lib/organize';
import { normalizeSessions, type SessionsResponse } from '../lib/sessions';
import {
  normalizeDuplicates,
  normalizeHistoryImport,
  normalizeItemWatchStats,
  normalizeStaleLibrary,
  normalizeStorage,
  normalizeStorageHistory,
  normalizeTautulliImport,
  normalizeWatchCharts,
  normalizeWatchStats,
  type DuplicatesResponse,
  type WatchChartsResponse,
  type HistoryImportResult,
  type ItemWatchStats,
  type StaleLibraryResponse,
  type StorageHistoryResponse,
  type StorageResponse,
  type TautulliImportResult,
  type WatchStatsResponse,
} from '../lib/watch-stats';
import { normalizeWatchHistory, type WatchHistoryResponse } from '../lib/watch-history';
import { normalizeMissing, type MissingResponse } from '../lib/missing';
import { normalizeSkipMedia, type SkipMediaResponse } from '../lib/skip-media';
import {
  normalizeJellyfinRefresh,
  normalizeJellyfinStatus,
  normalizeJellyfinSync,
  type JellyfinRefreshResult,
  type JellyfinStatus,
  type JellyfinSyncResult,
} from '../lib/jellyfin-sync';
import { normalizeJellyfinLink, type JellyfinLink } from '../lib/jellyfin-link';
import { normalizePlexSyncLists, type PlexSyncListsResponse } from '../lib/plex-sync';
import {
  normalizeAutoTagCatalog,
  normalizeAutoTagClassify,
  type AutoTag,
  type AutoTagCatalog,
  type AutoTagClassifyResult,
  type AutoTagRule,
} from '../lib/auto-tags';
import { normalizeGuardCatalog, normalizeGuardRule, type GuardCatalog, type GuardRule, type GuardTrust } from '../lib/guard';
import {
  normalizeWatchNotifyCatalog,
  normalizeWatchNotifyDestination,
  normalizeWatchNotifyRule,
  type WatchNotifyCatalog,
  type WatchNotifyDestination,
  type WatchNotifyFilters,
  type WatchNotifyRule,
} from '../lib/watch-notify';
import { normalizeBlocklist, type BlocklistResponse } from '../lib/blocklist';
import { normalizeDelayProfiles, type DelayProfile, type DelayProfilesResponse } from '../lib/delay-profiles';
import { normalizeInvite, normalizeInvites, type HouseholdInvite, type InvitesResponse } from '../lib/invites';
import { normalizeHouseholdUser, normalizeUsers, type HouseholdUser, type UsersResponse } from '../lib/users';
import { normalizeTOTP, type HouseholdTOTP } from '../lib/totp';
import {
  normalizePasskeyBegin,
  normalizePasskeys,
  type PasskeyBegin,
  type PasskeysResponse,
} from '../lib/passkeys';
import {
  normalizePasswordResets,
  type PasswordResetsResponse,
} from '../lib/password-resets';
import {
  keyWriteBody,
  normalizeCreatedAPIKey,
  normalizeKeys,
  type CreatedAPIKey,
  type KeysResponse,
} from '../lib/keys';
import {
  listSourceUpdateBody,
  listSourceWriteBody,
  normalizeListSource,
  normalizeListSources,
  normalizeListSyncHistory,
  normalizeListSyncItems,
  type ListSource,
  type ListSourcesResponse,
  type ListSyncHistoryResponse,
  type ListSyncItemsResponse,
} from '../lib/list-sources';
import {
  migrateWriteBody,
  normalizeMigrateResult,
  type MigrateResult,
} from '../lib/arr-migrate';
import {
  notifyWriteBody,
  normalizeNotifications,
  type NotificationsStatus,
} from '../lib/notifications';
import { itemTagsPath, normalizeLibraryTag, normalizeTags, tagWriteBody, type LibraryTag, type TagsResponse } from '../lib/tags';
import {
  normalizeAlternateTitle,
  normalizeAlternateTitles,
  titlesPath,
  type AlternateTitle,
  type AlternateTitlesResponse,
} from '../lib/alternate-titles';
import { historyPath, normalizeItemHistory, type ItemHistoryResponse } from '../lib/item-history';
import {
  householdCollectionBody,
  householdExclusionBody,
  householdProtectionBody,
  householdRuleBody,
  normalizeMaintainerCandidate,
  normalizeMaintainerCollection,
  normalizeMaintainerExclusion,
  normalizeMaintainerProtection,
  normalizeMaintainerRule,
  normalizeMaintainerRun,
  normalizeMaintainerStatus,
  type HouseholdCollectionInput,
  type HouseholdExclusionInput,
  type HouseholdRuleInput,
  type MaintainerCandidate,
  type MaintainerCollection,
  type MaintainerExclusion,
  type MaintainerProtection,
  type MaintainerRule,
  type MaintainerRun,
  type MaintainerStatus,
} from '../lib/maintainer';
import {
  artworkPath,
  normalizeItemArtwork,
  normalizeItemArtworkList,
  replaceArtworkBody,
  type ItemArtwork,
  type ItemArtworkResponse,
} from '../lib/item-artwork';
import {
  itemSubtitlesPath,
  normalizeItemSubtitle,
  normalizeItemSubtitles,
  uploadSubtitleBody,
  type ItemSubtitleFile,
  type ItemSubtitlesResponse,
} from '../lib/item-subtitles';
import { normalizeMovieFiles, type MovieFilesResponse } from '../lib/item-files';
import { normalizeBackups, normalizeHouseholdBackup, type BackupsStatus, type HouseholdBackup } from '../lib/backups';
import {
  massEditSubtitleBody,
  normalizeSubtitleBlacklist,
  normalizeSubtitleHistory,
  normalizeSubtitleLanguages,
  normalizeSubtitleLibrary,
  normalizeSubtitleProfiles,
  normalizeSubtitleProviders,
  normalizeSubtitleProfile,
  normalizeWanted,
  normalizeWantedItem,
  wantedWriteBody,
  type SubtitleBlacklistResponse,
  type SubtitleHistoryResponse,
  type SubtitleLanguagesResponse,
  type SubtitleLibraryResponse,
  type SubtitleProfile,
  type SubtitleProfilesResponse,
  type SubtitleProvidersResponse,
  type SubtitleWantedItem,
  type SubtitleWantedResponse,
} from '../lib/subtitle-ops';
import { normalizeSeriesOverride, type SeriesOverrideResponse } from '../lib/series-override';
import {
  normalizeImportCandidates,
  normalizeImportResult,
  type ImportCandidatesResponse,
  type ImportPathResult,
} from '../lib/manual-import';

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

/**
 * End the BFF session. The BFF requires POST /logout (same-origin, CSRF-checked);
 * GET only renders a confirm page. On success go to the login page; if the POST
 * fails, fall back to the GET confirm page, which carries its own POST form.
 */
export async function signOut(): Promise<void> {
  try {
    const res = await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) throw new Error(`logout failed: ${res.status}`);
    window.location.assign('/login');
  } catch {
    window.location.assign('/logout');
  }
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

/**
 * Extract a single studio name from a raw API record.
 * Handles plain string fields (`studio`, `studioName`) as well as array forms
 * (`studios`, `productionCompanies`) used by Plex/Jellyfin/Emby.
 */
function extractStudio(raw: Record<string, unknown>): string | undefined {
  // Plain string fields first (Plex-style)
  for (const key of ['studio', 'studioName', 'studio_name']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  // Array forms: Jellyfin/Emby return `Studios` as [{Name,Id}] or plain string[]
  for (const key of ['studios', 'Studios']) {
    const arr = raw[key];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object') {
        const name = (first as Record<string, unknown>).Name ?? (first as Record<string, unknown>).name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
  }
  // TMDB-style productionCompanies
  for (const key of ['productionCompanies', 'production_companies']) {
    const arr = raw[key];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object') {
        const name = (first as Record<string, unknown>).name ?? (first as Record<string, unknown>).Name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
  }
  return undefined;
}

/**
 * Extract a broadcast/streaming network name from a raw TV show API record.
 * Handles Plex `network`, Jellyfin `Networks` array, and common snake_case aliases.
 */
function extractNetwork(raw: Record<string, unknown>): string | undefined {
  // Plain string fields first (Plex-style)
  for (const key of ['network', 'networkName', 'network_name', 'tvNetwork']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  // Array forms: Jellyfin/Emby
  for (const key of ['networks', 'Networks']) {
    const arr = raw[key];
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string' && first.trim()) return first.trim();
      if (first && typeof first === 'object') {
        const name = (first as Record<string, unknown>).Name ?? (first as Record<string, unknown>).name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
  }
  return undefined;
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
    studio: extractStudio(raw),
    monitored: raw.monitored === true,
    quality_profile_id:
      raw.quality_profile_id != null || raw.qualityProfileId != null
        ? String(raw.quality_profile_id ?? raw.qualityProfileId)
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
    monitored: raw.monitored === true,
    quality: raw.quality != null && String(raw.quality).trim() ? String(raw.quality) : undefined,
    filename: raw.filename != null && String(raw.filename).trim() ? String(raw.filename) : undefined,
    file_id: raw.file_id != null || raw.fileId != null ? String(raw.file_id ?? raw.fileId) : undefined,
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
    monitored: raw.monitored === true,
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
    network: extractNetwork(raw),
    studio: extractStudio(raw),
    monitored: raw.monitored === true,
    quality_profile_id:
      raw.quality_profile_id != null || raw.qualityProfileId != null
        ? String(raw.quality_profile_id ?? raw.qualityProfileId)
        : undefined,
    root_folder_path:
      raw.root_folder_path != null || raw.rootFolderPath != null
        ? String(raw.root_folder_path ?? raw.rootFolderPath)
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
    qualityProfileId:
      raw.qualityProfileId != null || raw.quality_profile_id != null
        ? String(raw.qualityProfileId ?? raw.quality_profile_id)
        : undefined,
    seasonNumber:
      raw.seasonNumber != null || raw.season_number != null
        ? Number(raw.seasonNumber ?? raw.season_number)
        : undefined,
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

export type ViewerProfile = {
  id: string;
  name: string;
  kids: boolean;
  pin_set: boolean;
};

export type ViewerProfiles = {
  active_id: string;
  profiles: ViewerProfile[];
};

export const api = {
  async getCapabilities(): Promise<Capabilities> {
    return mergeCapabilities(await getJSON('/api/capabilities'));
  },

  async getAcquisition(): Promise<AcquisitionStatus> {
    return normalizeAcquisitionStatus(await getJSON<Record<string, unknown>>('/api/acquisition'));
  },

  async listIndexers(): Promise<IndexersResponse> {
    return normalizeIndexers(await getJSON<unknown>('/api/indexers'));
  },

  async createIndexer(input: {
    name: string;
    base_url: string;
    api_key?: string;
    implementation?: string;
    enable?: boolean;
  }): Promise<HouseholdIndexer> {
    return normalizeHouseholdIndexer(
      await getJSON<unknown>('/api/indexers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },

  async updateIndexer(
    id: number,
    input: { name?: string; base_url?: string; api_key?: string; enable?: boolean },
  ): Promise<HouseholdIndexer> {
    return normalizeHouseholdIndexer(
      await getJSON<unknown>(`/api/indexers/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },

  async deleteIndexer(id: number): Promise<void> {
    await getJSON<unknown>(`/api/indexers/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
  },

  async listSessions(): Promise<SessionsResponse> {
    return normalizeSessions(await getJSON<Record<string, unknown>>('/api/sessions'));
  },

  async listSkipMedia(): Promise<SkipMediaResponse> {
    return normalizeSkipMedia(await getJSON<Record<string, unknown>>('/api/playback/segments/media'));
  },

  async getWatchStats(days = 30): Promise<WatchStatsResponse> {
    return normalizeWatchStats(
      await getJSON<Record<string, unknown>>(`/api/watch-stats?days=${encodeURIComponent(String(days))}`),
    );
  },

  async getItemWatchStats(id: string, runtimeMinutes?: number): Promise<ItemWatchStats> {
    const q = new URLSearchParams({ id });
    if (runtimeMinutes && runtimeMinutes > 0) q.set('runtime', String(Math.round(runtimeMinutes)));
    return normalizeItemWatchStats(await getJSON<Record<string, unknown>>(`/api/watch-stats/item?${q}`));
  },

  async getStaleLibrary(staleDays = 90): Promise<StaleLibraryResponse> {
    return normalizeStaleLibrary(
      await getJSON<Record<string, unknown>>(
        `/api/watch-stats/stale?stale_days=${encodeURIComponent(String(staleDays))}&limit=40`,
      ),
    );
  },

  async importTautulliHistory(input: {
    tautulliUrl?: string;
    apiKey?: string;
    recordsJson?: string;
    dryRun: boolean;
  }): Promise<TautulliImportResult> {
    return normalizeTautulliImport(
      await getJSON<Record<string, unknown>>('/api/watch-stats/import-tautulli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tautulli_url: input.tautulliUrl ?? '',
          api_key: input.apiKey ?? '',
          records_json: input.recordsJson ?? '',
          dry_run: input.dryRun,
        }),
      }),
    );
  },

  async importJellystatHistory(input: {
    backupJson: string;
    dryRun: boolean;
  }): Promise<HistoryImportResult> {
    return normalizeHistoryImport(
      await getJSON<Record<string, unknown>>('/api/watch-stats/import-jellystat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_json: input.backupJson,
          dry_run: input.dryRun,
        }),
      }),
    );
  },

  async getLibraryDuplicates(): Promise<DuplicatesResponse> {
    return normalizeDuplicates(await getJSON<Record<string, unknown>>('/api/watch-stats/duplicates?limit=20'));
  },

  async getLibraryStorage(): Promise<StorageResponse> {
    return normalizeStorage(await getJSON<Record<string, unknown>>('/api/watch-stats/storage'));
  },

  async getLibraryStorageHistory(days = 90): Promise<StorageHistoryResponse> {
    return normalizeStorageHistory(
      await getJSON<Record<string, unknown>>(`/api/watch-stats/storage-history?days=${encodeURIComponent(String(days))}`),
    );
  },

  async getWatchCharts(days = 30): Promise<WatchChartsResponse> {
    return normalizeWatchCharts(
      await getJSON<Record<string, unknown>>(`/api/watch-stats/charts?days=${encodeURIComponent(String(days))}`),
    );
  },

  async stopSession(id: string): Promise<{ stopped: boolean; serverType?: string }> {
    return getJSON<{ stopped: boolean; serverType?: string }>(
      `/api/sessions/${encodeURIComponent(id)}/stop`,
      { method: 'POST' },
    );
  },

  async listWatchHistory(
    limit = 100,
    filter?: { userId?: string; q?: string },
  ): Promise<WatchHistoryResponse> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (filter?.userId) q.set('userId', filter.userId);
    if (filter?.q) q.set('q', filter.q);
    return normalizeWatchHistory(await getJSON<Record<string, unknown>>(`/api/history?${q}`));
  },

  async getSeriesOverride(id: string): Promise<SeriesOverrideResponse> {
    return normalizeSeriesOverride(
      await getJSON<Record<string, unknown>>(`/api/tv/${encodeURIComponent(id)}/override`),
    );
  },

  async upsertSeriesOverride(input: {
    id: string;
    delayMinutes: number;
    preferredGroups: string[];
    ignoredGroups: string[];
  }): Promise<SeriesOverrideResponse> {
    return normalizeSeriesOverride(
      await getJSON<Record<string, unknown>>(`/api/tv/${encodeURIComponent(input.id)}/override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delay_minutes: input.delayMinutes,
          preferred_groups: input.preferredGroups,
          ignored_groups: input.ignoredGroups,
        }),
      }),
    );
  },

  async deleteSeriesOverride(id: string): Promise<{ removed: boolean }> {
    return getJSON<{ removed: boolean }>(`/api/tv/${encodeURIComponent(id)}/override`, { method: 'DELETE' });
  },

  async listImportCandidates(): Promise<ImportCandidatesResponse> {
    return normalizeImportCandidates(await getJSON<Record<string, unknown>>('/api/import/candidates'));
  },

  async importPath(body: {
    path: string;
    title?: string;
    media_type?: string;
    year?: number;
    season_number?: number;
    episode_number?: number;
  }): Promise<ImportPathResult> {
    return normalizeImportResult(
      await getJSON<Record<string, unknown>>('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  },

  async getFormats(): Promise<FormatsCatalog> {
    return normalizeFormatsCatalog(await getJSON<Record<string, unknown>>('/api/formats'));
  },

  async syncTrashGuides(input?: {
    scoreSet?: string;
    importProfiles?: boolean;
    services?: string[];
    official?: boolean;
  }): Promise<FormatsCatalog> {
    return normalizeFormatsCatalog(
      await getJSON<Record<string, unknown>>('/api/formats/sync-trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? { importProfiles: true, services: ['radarr', 'sonarr'] }),
      }),
    );
  },

  async scoreRelease(title: string, profileId?: string): Promise<FormatScorePreview> {
    return normalizeFormatScore(
      await getJSON<Record<string, unknown>>('/api/formats/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, profileId }),
      }),
    );
  },

  async parseQuality(title: string): Promise<ParsedQuality> {
    return normalizeParsedQuality(
      await getJSON<Record<string, unknown>>('/api/formats/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }),
    );
  },

  async createQualityProfile(
    input: Pick<
      QualityProfile,
      'name' | 'minScore' | 'cutoffScore' | 'upgradeAllowed' | 'upgradeDelayMinutes' | 'formatScores'
    >,
  ): Promise<QualityProfile> {
    const raw = await getJSON<{ profile?: unknown }>('/api/formats/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qualityProfileWriteBody(input)),
    });
    return normalizeQualityProfile(raw.profile);
  },

  async updateQualityProfile(
    id: string,
    input: Pick<
      QualityProfile,
      'name' | 'minScore' | 'cutoffScore' | 'upgradeAllowed' | 'upgradeDelayMinutes' | 'formatScores'
    >,
  ): Promise<QualityProfile> {
    const raw = await getJSON<{ profile?: unknown }>(`/api/formats/profiles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qualityProfileWriteBody(input)),
    });
    return normalizeQualityProfile(raw.profile);
  },

  async deleteQualityProfile(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/formats/profiles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async createCustomFormat(input: Pick<QualityFormat, 'name' | 'score' | 'rules'>): Promise<QualityFormat> {
    const raw = await getJSON<{ format?: unknown }>('/api/formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customFormatWriteBody(input)),
    });
    return normalizeQualityFormat(raw.format);
  },

  async updateCustomFormat(
    id: string,
    input: Pick<QualityFormat, 'name' | 'score' | 'rules'>,
  ): Promise<QualityFormat> {
    const raw = await getJSON<{ format?: unknown }>(`/api/formats/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customFormatWriteBody(input)),
    });
    return normalizeQualityFormat(raw.format);
  },

  async createReleaseProfile(input: {
    name: string;
    preferred?: string[];
    mustContain?: string[];
    mustNotContain?: string[];
    preferredScore?: number;
    enabled?: boolean;
  }): Promise<ReleaseProfile> {
    const raw = await getJSON<{ profile?: unknown }>('/api/formats/release-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseProfileWriteBody(input)),
    });
    return normalizeReleaseProfile(raw.profile);
  },

  async updateReleaseProfile(
    id: string,
    input: {
      name: string;
      preferred?: string[];
      mustContain?: string[];
      mustNotContain?: string[];
      preferredScore?: number;
      enabled?: boolean;
    },
  ): Promise<ReleaseProfile> {
    const raw = await getJSON<{ profile?: unknown }>(`/api/formats/release-profiles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseProfileWriteBody(input)),
    });
    return normalizeReleaseProfile(raw.profile);
  },

  async deleteReleaseProfile(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/formats/release-profiles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async deleteCustomFormat(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/formats/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async createWatchTogether(input: {
    mediaId?: string;
    src: string;
    title?: string;
    positionSeconds?: number;
    playing?: boolean;
  }): Promise<WatchTogetherRoom> {
    return normalizeWatchTogether(
      await getJSON<Record<string, unknown>>('/api/watch-together', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },

  async getWatchTogether(id: string): Promise<WatchTogetherRoom> {
    return normalizeWatchTogether(
      await getJSON<Record<string, unknown>>(`/api/watch-together/${encodeURIComponent(id)}`),
    );
  },

  async syncWatchTogether(
    id: string,
    input: { positionSeconds: number; playing: boolean },
    hostToken?: string,
  ): Promise<WatchTogetherRoom> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hostToken) headers['X-Watch-Together-Host'] = hostToken;
    return normalizeWatchTogether(
      await getJSON<Record<string, unknown>>(`/api/watch-together/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      }),
    );
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

  async setMonitored(input: {
    kind: 'movie' | 'tv' | 'season' | 'episode' | 'artist' | 'album' | 'author' | 'book' | 'series' | 'issue' | 'audiobook';
    id: string;
    monitored: boolean;
  }): Promise<{ monitored: boolean }> {
    const path =
      input.kind === 'movie'
        ? `/api/movies/${encodeURIComponent(input.id)}`
        : input.kind === 'tv'
          ? `/api/tv/${encodeURIComponent(input.id)}`
          : input.kind === 'season'
            ? `/api/tv/seasons/${encodeURIComponent(input.id)}`
            : input.kind === 'artist'
              ? `/api/music/${encodeURIComponent(input.id)}`
              : input.kind === 'album'
                ? `/api/music/albums/${encodeURIComponent(input.id)}`
                : input.kind === 'author'
                  ? `/api/books/${encodeURIComponent(input.id)}`
                  : input.kind === 'book'
                    ? `/api/books/works/${encodeURIComponent(input.id)}`
                    : input.kind === 'series'
                      ? `/api/comics/${encodeURIComponent(input.id)}`
                      : input.kind === 'issue'
                        ? `/api/comics/issues/${encodeURIComponent(input.id)}`
                        : input.kind === 'audiobook'
                          ? `/api/audiobooks/${encodeURIComponent(input.id)}`
                          : `/api/episodes/${encodeURIComponent(input.id)}`;
    return getJSON<{ monitored: boolean }>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monitored: input.monitored }),
    });
  },

  async removeLibraryItem(input: {
    kind: 'movie' | 'tv' | 'artist' | 'author' | 'book' | 'series' | 'issue' | 'audiobook';
    id: string;
    deleteFiles?: boolean;
  }): Promise<{ removed: boolean; delete_files: boolean }> {
    const path =
      input.kind === 'movie'
        ? `/api/movies/${encodeURIComponent(input.id)}`
        : input.kind === 'tv'
          ? `/api/tv/${encodeURIComponent(input.id)}`
          : input.kind === 'artist'
            ? `/api/music/${encodeURIComponent(input.id)}`
            : input.kind === 'author'
              ? `/api/books/${encodeURIComponent(input.id)}`
              : input.kind === 'book'
                ? `/api/books/works/${encodeURIComponent(input.id)}`
                : input.kind === 'series'
                  ? `/api/comics/${encodeURIComponent(input.id)}`
                  : input.kind === 'issue'
                    ? `/api/comics/issues/${encodeURIComponent(input.id)}`
                    : `/api/audiobooks/${encodeURIComponent(input.id)}`;
    const q = input.deleteFiles ? '?delete_files=1' : '';
    return getJSON<{ removed: boolean; delete_files: boolean }>(`${path}${q}`, { method: 'DELETE' });
  },

  async refreshLibraryItem(input: {
    kind: 'movie' | 'tv' | 'artist';
    id: string;
  }): Promise<{ refreshed: boolean }> {
    const path =
      input.kind === 'movie'
        ? `/api/movies/${encodeURIComponent(input.id)}/refresh`
        : input.kind === 'tv'
          ? `/api/tv/${encodeURIComponent(input.id)}/refresh`
          : `/api/music/${encodeURIComponent(input.id)}/refresh`;
    return getJSON<{ refreshed: boolean }>(path, { method: 'POST' });
  },

  async getEpisodeFile(id: string): Promise<{
    available: boolean;
    id: string;
    file_id?: string;
    filename?: string;
    quality?: string;
  }> {
    return getJSON(`/api/episodes/${encodeURIComponent(id)}/file`);
  },

  async removeEpisodeFile(input: {
    id: string;
    deleteFiles?: boolean;
  }): Promise<{ removed: boolean; delete_files: boolean }> {
    const q = input.deleteFiles ? '?delete_files=1' : '';
    return getJSON<{ removed: boolean; delete_files: boolean }>(
      `/api/episodes/${encodeURIComponent(input.id)}/file${q}`,
      { method: 'DELETE' },
    );
  },

  async removeMovieFile(input: {
    id: string;
    deleteFiles?: boolean;
  }): Promise<{ removed: boolean; delete_files: boolean; files: number }> {
    const q = input.deleteFiles ? '?delete_files=1' : '';
    return getJSON<{ removed: boolean; delete_files: boolean; files: number }>(
      `/api/movies/${encodeURIComponent(input.id)}/file${q}`,
      { method: 'DELETE' },
    );
  },

  async setQualityProfile(input: {
    kind: 'movie' | 'tv' | 'artist';
    id: string;
    qualityProfileId: string;
  }): Promise<{ quality_profile_id: string }> {
    const path =
      input.kind === 'movie'
        ? `/api/movies/${encodeURIComponent(input.id)}`
        : input.kind === 'tv'
          ? `/api/tv/${encodeURIComponent(input.id)}`
          : `/api/music/${encodeURIComponent(input.id)}`;
    return getJSON<{ quality_profile_id: string }>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality_profile_id: input.qualityProfileId }),
    });
  },

  async addMusicAlbum(input: {
    artistId: string;
    title: string;
    year?: number;
  }): Promise<{ added: boolean; album: { id: string; title: string; year?: number; monitored?: boolean } }> {
    return getJSON(`/api/music/${encodeURIComponent(input.artistId)}/albums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.title, year: input.year, monitored: true }),
    });
  },

  async addAudiobook(input: {
    author: string;
    title: string;
    year?: number;
  }): Promise<{ added: boolean; item: { id: string; title: string; year?: number } }> {
    return getJSON('/api/audiobooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: input.author,
        title: input.title,
        year: input.year,
        monitored: true,
      }),
    });
  },

  async addBookAuthor(input: {
    name: string;
  }): Promise<{ added: boolean; item: { id: string; name: string } }> {
    return getJSON('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name, monitored: true }),
    });
  },

  async addComicSeries(input: {
    title: string;
    publisher?: string;
  }): Promise<{ added: boolean; item: { id: string; title: string; publisher?: string } }> {
    return getJSON('/api/comics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.title, publisher: input.publisher, monitored: true }),
    });
  },

  async addComicIssue(input: {
    seriesId: string;
    title: string;
    number?: string;
    year?: number;
  }): Promise<{ added: boolean; item: { id: string; title: string; number?: string; year?: number } }> {
    return getJSON(`/api/comics/${encodeURIComponent(input.seriesId)}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: input.title,
        number: input.number,
        year: input.year,
        monitored: true,
      }),
    });
  },

  async addBook(input: {
    authorId: string;
    title: string;
    year?: number;
  }): Promise<{ added: boolean; item: { id: string; title: string; year?: number; monitored?: boolean } }> {
    return getJSON(`/api/books/${encodeURIComponent(input.authorId)}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input.title, year: input.year, monitored: true }),
    });
  },

  async addMusicArtist(input: {
    name: string;
  }): Promise<{ added: boolean; artist: { id: string; name: string; monitored?: boolean } }> {
    return getJSON('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name, monitored: true }),
    });
  },

  async previewRename(input: { movieId?: string; tvId?: string; episodeId?: string }): Promise<RenamePreview> {
    const q = renameQuery(input);
    return normalizeRenamePreview(await getJSON<unknown>(`/api/rename/preview${q ? `?${q}` : ''}`));
  },

  async applyRename(input: { movieId?: string; tvId?: string; episodeId?: string }): Promise<RenameResult> {
    return normalizeRenameResult(
      await getJSON<unknown>('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: input.movieId || undefined,
          tv_id: input.tvId || undefined,
          episode_id: input.episodeId || undefined,
        }),
      }),
    );
  },

  async listNamingTemplates(mediaType?: string): Promise<NamingTemplatesResponse> {
    const q = mediaType ? `?media_type=${encodeURIComponent(mediaType)}` : '';
    return normalizeNamingTemplates(await getJSON<unknown>(`/api/rename/templates${q}`));
  },

  async createNamingTemplate(input: {
    name: string;
    mediaType?: string;
    pattern: string;
    isDefault?: boolean;
  }): Promise<NamingTemplate> {
    const raw = await getJSON<{ template?: unknown }>('/api/rename/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        media_type: input.mediaType,
        pattern: input.pattern,
        is_default: input.isDefault,
      }),
    });
    return normalizeNamingTemplate(raw.template);
  },

  async updateNamingTemplate(
    id: string,
    input: { name: string; pattern: string; isDefault?: boolean },
  ): Promise<NamingTemplate> {
    const raw = await getJSON<{ template?: unknown }>(`/api/rename/templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        pattern: input.pattern,
        is_default: input.isDefault,
      }),
    });
    return normalizeNamingTemplate(raw.template);
  },

  async deleteNamingTemplate(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/rename/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async organizeLibrary(input: {
    directory: string;
    mediaType?: string;
    dryRun?: boolean;
    importMode?: string;
  }): Promise<OrganizeResult> {
    return normalizeOrganize(
      await getJSON<unknown>('/api/rename/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory: input.directory,
          media_type: input.mediaType,
          dry_run: input.dryRun,
          import_mode: input.importMode,
        }),
      }),
    );
  },

  async listRoots(kind?: 'movies' | 'tv' | 'music' | 'books' | 'audiobooks' | 'comics'): Promise<RootsCatalog> {
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return normalizeRootsCatalog(await getJSON<unknown>(`/api/roots${q}`));
  },

  async pickRoot(kind: 'movies' | 'tv' | 'music' | 'books' | 'audiobooks' | 'comics'): Promise<RootPick> {
    return normalizeRootPick(await getJSON<unknown>(`/api/roots/pick?kind=${encodeURIComponent(kind)}`));
  },

  async browseRoots(path = ''): Promise<RootBrowseListing> {
    const q = path ? `?path=${encodeURIComponent(path)}` : '';
    return normalizeRootBrowse(await getJSON<unknown>(`/api/roots/browse${q}`));
  },

  async probeRoot(path: string): Promise<RootProbe> {
    return normalizeRootProbe(
      await getJSON<unknown>('/api/roots/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      }),
    );
  },

  async createRoot(input: {
    path: string;
    name?: string;
    mediaKind?: string;
    isDefault?: boolean;
  }): Promise<LibraryRoot> {
    const data = await getJSON<Record<string, unknown>>('/api/roots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: input.path,
        name: input.name || undefined,
        media_kind: input.mediaKind || undefined,
        is_default: input.isDefault === true,
      }),
    });
    const root = normalizeLibraryRoot(data.root ?? data);
    if (!root) {
      throw new Error('root create returned no path');
    }
    return root;
  },

  async getLibraryScan(): Promise<LibraryScanStatus> {
    return normalizeLibraryScanStatus(await getJSON<unknown>('/api/scan'));
  },

  async listWatchDirs(): Promise<WatchDirsResponse> {
    return normalizeWatchDirs(await getJSON<unknown>('/api/scan/watch-dirs'));
  },

  async createWatchDir(input: {
    path: string;
    mediaType?: string;
    libraryPath?: string;
  }): Promise<WatchDir> {
    return normalizeWatchDir(
      await getJSON<unknown>('/api/scan/watch-dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: input.path,
          media_type: input.mediaType,
          library_path: input.libraryPath,
        }),
      }),
    );
  },

  async deleteWatchDir(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/scan/watch-dirs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async updateWatchDir(
    id: string,
    input: {
      enabled?: boolean;
      path?: string;
      mediaType?: string;
      libraryPath?: string;
      tvLibraryPath?: string;
      musicLibraryPath?: string;
    },
  ): Promise<WatchDir> {
    const body: Record<string, unknown> = {};
    if (input.enabled !== undefined) body.enabled = input.enabled;
    if (input.path !== undefined) body.path = input.path;
    if (input.mediaType !== undefined) body.media_type = input.mediaType;
    if (input.libraryPath !== undefined) body.library_path = input.libraryPath;
    if (input.tvLibraryPath !== undefined) body.tv_library_path = input.tvLibraryPath;
    if (input.musicLibraryPath !== undefined) body.music_library_path = input.musicLibraryPath;
    return normalizeWatchDir(
      await getJSON<unknown>(`/api/scan/watch-dirs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  },

  async runLibraryScan(input?: { type?: 'watch' | 'library_roots'; path?: string; mediaType?: string }): Promise<LibraryScanResult> {
    return normalizeLibraryScanResult(
      await getJSON<unknown>('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: input?.type ?? 'watch',
          path: input?.path,
          media_type: input?.mediaType,
        }),
      }),
    );
  },

  async updateRoot(
    id: string,
    input: { name?: string; mediaKind?: string; isDefault?: boolean },
  ): Promise<LibraryRoot> {
    const data = await getJSON<Record<string, unknown>>(`/api/roots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rootWriteBody(input)),
    });
    const root = normalizeLibraryRoot(data.root ?? data);
    if (!root) {
      throw new Error('root update returned no path');
    }
    return root;
  },

  async deleteRoot(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/roots/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async setRootFolder(input: {
    kind: 'movie' | 'tv' | 'artist' | 'author' | 'audiobook' | 'series';
    id: string;
    rootFolderPath: string;
  }): Promise<{ root_folder_path: string }> {
    const path =
      input.kind === 'movie'
        ? `/api/movies/${encodeURIComponent(input.id)}`
        : input.kind === 'tv'
          ? `/api/tv/${encodeURIComponent(input.id)}`
          : input.kind === 'author'
            ? `/api/books/${encodeURIComponent(input.id)}`
            : input.kind === 'audiobook'
              ? `/api/audiobooks/${encodeURIComponent(input.id)}`
              : input.kind === 'series'
                ? `/api/comics/${encodeURIComponent(input.id)}`
                : `/api/music/${encodeURIComponent(input.id)}`;
    return getJSON<{ root_folder_path: string }>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_folder_path: input.rootFolderPath }),
      });
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
      seasons: Array.isArray(data.seasons) ? data.seasons : undefined,
    };
  },

  /**
   * Fetch a person's biography and combined movie+TV credits via the BFF
   * TMDB person proxy at GET /api/discover/person/:id/credits.
   * Returns a safe empty-credits shape on network / 4xx errors so the page
   * can render a soft-empty state rather than a hard error banner.
   */
  async getPersonCredits(personId: number): Promise<PersonDetail> {
    const data = await getJSON<Record<string, unknown>>(
      `/api/discover/person/${personId}/credits`,
    );
    const rawCredits = (
      Array.isArray(data.credits)
        ? data.credits
        : Array.isArray(data.cast)
          ? (data.cast as unknown[])
          : []
    ) as Record<string, unknown>[];
    const credits = rawCredits.map((c) => ({
      tmdbId: Number(c.tmdbId ?? c.tmdb_id ?? c.id ?? 0),
      title: String(c.title ?? c.name ?? ''),
      year: Number(c.year ?? c.release_year ?? (c.release_date ? String(c.release_date).slice(0, 4) : 0) ?? 0),
      mediaType: String(c.mediaType ?? c.media_type ?? 'movie') === 'tv' ? ('tv' as const) : ('movie' as const),
      character: c.character != null ? String(c.character) : undefined,
      poster: c.poster != null ? String(c.poster ?? c.poster_path ?? '') : undefined,
    }));
    return {
      id: Number(data.id ?? personId),
      name: String(data.name ?? ''),
      biography: data.biography != null ? String(data.biography) : undefined,
      birthday: data.birthday != null ? String(data.birthday) : undefined,
      profilePath: data.profilePath != null ? String(data.profilePath) : data.profile_path != null ? String(data.profile_path) : undefined,
      credits,
    };
  },

  /**
   * Fetch related titles from the media-graph module via the BFF proxy.
   *
   * `externalId` must be a media-graph external-id string, e.g.:
   *   "tmdb:movie:550"  or  "tmdb:tv:1396"
   *
   * Returns `{ items: [], available: false }` when the graph module is not
   * installed or the BFF proxy returns a non-2xx response, so callers can
   * safely hide the rail without breaking the page.
   */
  async getRelated(externalId: string): Promise<RelatedResponse> {
    try {
      const q = new URLSearchParams({ id: externalId });
      const data = await getJSON<{
        items?: Array<Record<string, unknown>>;
        available?: boolean;
      }>(`/api/graph/related?${q}`);
      if (data.available === false) return { items: [], available: false };
      const items: RelatedItem[] = (data.items || []).map((raw) => ({
        id: Number(raw.id ?? raw.tmdb_id ?? raw.tmdbId ?? 0),
        title: String(raw.title ?? ''),
        year: Number(raw.year ?? 0),
        overview: String(raw.overview ?? ''),
        poster: String(raw.poster ?? raw.poster_path ?? raw.posterPath ?? ''),
        voteAvg: Number(raw.vote_avg ?? raw.voteAvg ?? raw.vote_average ?? 0),
        mediaType: String(raw.media_type ?? raw.mediaType ?? 'movie') === 'tv' ? 'tv' : ('movie' as const),
        relation: raw.relation != null ? String(raw.relation) : undefined,
        content_rating:
          raw.content_rating != null || raw.contentRating != null
            ? String(raw.content_rating ?? raw.contentRating)
            : undefined,
      }));
      return { items, available: true };
    } catch {
      return { items: [], available: false };
    }
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

  async listListSources(): Promise<ListSourcesResponse> {
    return normalizeListSources(await getJSON<unknown>('/api/lists'));
  },

  async createListSource(input: {
    name: string;
    type?: string;
    username?: string;
    clientId?: string;
    listUrl?: string;
    syncIntervalMinutes?: number;
    baseUrl?: string;
    apiKey?: string;
    qualityProfileId?: string;
    rootFolderPath?: string;
  }): Promise<ListSource> {
    const raw = await getJSON<{ source?: unknown }>('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listSourceWriteBody(input)),
    });
    return normalizeListSource(raw.source);
  },

  async deleteListSource(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/lists/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async updateListSource(
    id: string,
    input: {
      enabled?: boolean;
      name?: string;
      username?: string;
      clientId?: string;
      listUrl?: string;
      syncIntervalMinutes?: number;
      baseUrl?: string;
      apiKey?: string;
      qualityProfileId?: string;
      rootFolderPath?: string;
    },
  ): Promise<ListSource> {
    const raw = await getJSON<{ source?: unknown }>(`/api/lists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listSourceUpdateBody(input)),
    });
    return normalizeListSource(raw.source);
  },

  async syncListSources(): Promise<{ started: boolean; itemsFound: number; itemsNew: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/lists/sync', { method: 'POST' });
    return {
      started: raw.started === true,
      itemsFound: Number(raw.items_found ?? raw.itemsFound) || 0,
      itemsNew: Number(raw.items_new ?? raw.itemsNew) || 0,
    };
  },

  async syncListSource(id: string): Promise<{ started: boolean; id: string; itemsFound: number; itemsNew: number }> {
    const raw = await getJSON<Record<string, unknown>>(`/api/lists/${encodeURIComponent(id)}/sync`, {
      method: 'POST',
    });
    return {
      started: raw.started === true,
      id: String(raw.id ?? id),
      itemsFound: Number(raw.items_found ?? raw.itemsFound) || 0,
      itemsNew: Number(raw.items_new ?? raw.itemsNew) || 0,
    };
  },

  async testListSource(id: string): Promise<{ ok: boolean; id: string; message: string; itemsFound: number }> {
    const raw = await getJSON<Record<string, unknown>>(`/api/lists/${encodeURIComponent(id)}/test`, {
      method: 'POST',
    });
    return {
      ok: raw.ok === true,
      id: String(raw.id ?? id),
      message: String(raw.message ?? ''),
      itemsFound: Number(raw.items_found ?? raw.itemsFound) || 0,
    };
  },

  async listListHistory(): Promise<ListSyncHistoryResponse> {
    return normalizeListSyncHistory(await getJSON<unknown>('/api/lists/history'));
  },

  async listListItems(opts?: { sourceId?: string; mediaType?: string }): Promise<ListSyncItemsResponse> {
    const q = new URLSearchParams();
    if (opts?.sourceId) q.set('source_id', opts.sourceId);
    if (opts?.mediaType) q.set('media_type', opts.mediaType);
    const suffix = q.toString() ? `?${q}` : '';
    return normalizeListSyncItems(await getJSON<unknown>(`/api/lists/items${suffix}`));
  },

  async migrateArrLibrary(input: {
    service: string;
    baseUrl: string;
    apiKey: string;
    dryRun: boolean;
    remapFrom?: string;
    remapTo?: string;
  }): Promise<MigrateResult> {
    return normalizeMigrateResult(
      await getJSON<unknown>('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(migrateWriteBody(input)),
      }),
    );
  },

  async getJellyfinStatus(): Promise<JellyfinStatus> {
    return normalizeJellyfinStatus(await getJSON<Record<string, unknown>>('/api/jellyfin/status'));
  },

  async syncJellyfinLibrary(input: { direction?: string; dryRun: boolean }): Promise<JellyfinSyncResult> {
    return normalizeJellyfinSync(
      await getJSON<Record<string, unknown>>('/api/jellyfin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: input.direction ?? 'both',
          dry_run: input.dryRun,
        }),
      }),
    );
  },

  async refreshJellyfinLibrary(itemId = ''): Promise<JellyfinRefreshResult> {
    return normalizeJellyfinRefresh(
      await getJSON<Record<string, unknown>>('/api/jellyfin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      }),
    );
  },

  async getJellyfinLink(muxId: string): Promise<JellyfinLink> {
    return normalizeJellyfinLink(
      await getJSON<Record<string, unknown>>(`/api/jellyfin/link?mux_id=${encodeURIComponent(muxId)}`),
    );
  },

  async matchJellyfinItem(input: {
    muxId: string;
    title?: string;
    mediaKind?: string;
    tmdbId?: number;
    path?: string;
  }): Promise<JellyfinLink> {
    return normalizeJellyfinLink(
      await getJSON<Record<string, unknown>>('/api/jellyfin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mux_id: input.muxId,
          title: input.title ?? '',
          media_kind: input.mediaKind ?? 'movie',
          tmdb_id: input.tmdbId ?? 0,
          path: input.path ?? '',
        }),
      }),
    );
  },

  async unlinkJellyfinItem(muxId: string): Promise<{ ok: boolean; muxId: string }> {
    return getJSON<{ ok: boolean; muxId: string }>(
      `/api/jellyfin/link?mux_id=${encodeURIComponent(muxId)}`,
      { method: 'DELETE' },
    );
  },

  async listPlexSyncLists(opts?: { refresh?: boolean; userId?: string; clientId?: string }): Promise<PlexSyncListsResponse> {
    const q = new URLSearchParams();
    if (opts?.refresh) q.set('refresh', '1');
    if (opts?.userId) q.set('userId', opts.userId);
    if (opts?.clientId) q.set('clientId', opts.clientId);
    const suffix = q.toString() ? `?${q}` : '';
    return normalizePlexSyncLists(await getJSON<Record<string, unknown>>(`/api/plex/sync-lists${suffix}`));
  },

  async listTags(media?: string): Promise<TagsResponse> {
    const q = media ? `?media=${encodeURIComponent(media)}` : '';
    return normalizeTags(await getJSON<unknown>(`/api/tags${q}`));
  },

  async createTag(input: { label: string; media?: string }): Promise<LibraryTag> {
    const raw = await getJSON<{ tag?: unknown }>('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tagWriteBody(input)),
    });
    return normalizeLibraryTag(raw.tag);
  },

  async deleteTag(id: string, media?: string): Promise<{ removed: boolean; id: string }> {
    const q = media ? `?media=${encodeURIComponent(media)}` : '';
    return getJSON<{ removed: boolean; id: string }>(`/api/tags/${encodeURIComponent(id)}${q}`, {
      method: 'DELETE',
    });
  },

  async getItemTags(kind: 'movie' | 'tv' | 'artist' | 'music' | 'author', id: string): Promise<TagsResponse> {
    return normalizeTags(await getJSON<unknown>(itemTagsPath(kind, id)));
  },

  async listAlternateTitles(kind: 'movie' | 'tv', id: string): Promise<AlternateTitlesResponse> {
    return normalizeAlternateTitles(await getJSON<unknown>(titlesPath(kind, id)));
  },

  async addAlternateTitle(kind: 'movie' | 'tv', id: string, title: string): Promise<AlternateTitle> {
    const raw = await getJSON<{ title?: unknown }>(titlesPath(kind, id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return normalizeAlternateTitle(raw.title);
  },

  async deleteAlternateTitle(kind: 'movie' | 'tv', id: string, titleId: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`${titlesPath(kind, id)}/${encodeURIComponent(titleId)}`, {
      method: 'DELETE',
    });
  },

  async listItemHistory(kind: 'movie' | 'tv' | 'artist' | 'music' | 'author' | 'series' | 'audiobook', id: string, event?: string): Promise<ItemHistoryResponse> {
    const q = event ? `?event=${encodeURIComponent(event)}` : '';
    return normalizeItemHistory(await getJSON<unknown>(`${historyPath(kind, id)}${q}`));
  },

  async listMovieFiles(id: string): Promise<MovieFilesResponse> {
    return normalizeMovieFiles(await getJSON<unknown>(`/api/movies/${encodeURIComponent(id)}/files`));
  },

  async deleteMovieFile(id: string, fileId: string): Promise<{ removed: boolean; id: string; delete_files?: boolean }> {
    return getJSON<{ removed: boolean; id: string; delete_files?: boolean }>(
      `/api/movies/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}?delete_files=1`,
      { method: 'DELETE' },
    );
  },

  async listTrackFiles(
    id: string,
    albumId?: string,
  ): Promise<{
    available: boolean;
    items: Array<{
      id: string;
      artist_id?: string;
      album_id?: string;
      title?: string;
      filename?: string;
      quality?: string;
      size_bytes?: number;
    }>;
  }> {
    const q = albumId ? `?album_id=${encodeURIComponent(albumId)}` : '';
    return getJSON(`/api/music/${encodeURIComponent(id)}/files${q}`);
  },

  async deleteTrackFile(
    id: string,
    fileId: string,
  ): Promise<{ removed: boolean; id: string; delete_files?: boolean }> {
    return getJSON<{ removed: boolean; id: string; delete_files?: boolean }>(
      `/api/music/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}?delete_files=1`,
      { method: 'DELETE' },
    );
  },

  async listItemArtwork(kind: 'movie' | 'tv' | 'artist' | 'music' | 'author' | 'audiobook' | 'series', id: string): Promise<ItemArtworkResponse> {
    return normalizeItemArtworkList(await getJSON<unknown>(artworkPath(kind, id)));
  },

  async listItemSubtitles(kind: 'movie' | 'tv', id: string): Promise<ItemSubtitlesResponse> {
    return normalizeItemSubtitles(await getJSON<unknown>(itemSubtitlesPath(kind, id)));
  },

  async uploadItemSubtitle(
    kind: 'movie' | 'tv',
    id: string,
    input: { language: string; filename: string; data: string; mediaFileId?: string },
  ): Promise<ItemSubtitleFile> {
    const raw = await getJSON<{ subtitle?: unknown }>(itemSubtitlesPath(kind, id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uploadSubtitleBody(input)),
    });
    return normalizeItemSubtitle(raw.subtitle);
  },

  async deleteItemSubtitle(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/subtitles/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async replaceItemArtwork(
    kind: 'movie' | 'tv' | 'artist' | 'music' | 'author' | 'audiobook' | 'series',
    id: string,
    input: { type: string; filename: string; data: string },
  ): Promise<ItemArtwork> {
    const raw = await getJSON<{ artwork?: unknown }>(artworkPath(kind, id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replaceArtworkBody(input)),
    });
    return normalizeItemArtwork(raw.artwork);
  },

  async setItemTags(kind: 'movie' | 'tv' | 'artist' | 'music' | 'author', id: string, tagIds: string[]): Promise<{ ok: boolean; tag_ids: string[] }> {
    const path = itemTagsPath(kind, id);
    const raw = await getJSON<Record<string, unknown>>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_ids: tagIds }),
    });
    const ids = Array.isArray(raw.tag_ids) ? raw.tag_ids.map(String) : tagIds;
    return { ok: raw.ok === true, tag_ids: ids };
  },

  async getTagging(): Promise<AutoTagCatalog> {
    return normalizeAutoTagCatalog(await getJSON<Record<string, unknown>>('/api/tagging'));
  },

  async createTaggingTag(input: { name: string; category?: string; color?: string }): Promise<AutoTag> {
    const raw = await getJSON<Record<string, unknown>>('/api/tagging/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name, category: input.category ?? '', color: input.color ?? '' }),
    });
    return {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? ''),
      category: String(raw.category ?? ''),
      color: String(raw.color ?? ''),
    };
  },

  async deleteTaggingTag(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/tagging/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async upsertTaggingRule(input: {
    id?: string;
    tagId: string;
    field: string;
    match: string;
    pattern: string;
    enabled: boolean;
  }): Promise<AutoTagRule> {
    const raw = await getJSON<Record<string, unknown>>('/api/tagging/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: input.id ?? '',
        tag_id: input.tagId,
        field: input.field,
        match: input.match,
        pattern: input.pattern,
        enabled: input.enabled,
      }),
    });
    return {
      id: String(raw.id ?? ''),
      tagId: String(raw.tagId ?? raw.tag_id ?? ''),
      field: String(raw.field ?? ''),
      match: String(raw.match ?? ''),
      pattern: String(raw.pattern ?? ''),
      enabled: raw.enabled !== false,
    };
  },

  async deleteTaggingRule(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/tagging/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async classifyTagging(input: {
    mediaId: string;
    title?: string;
    path?: string;
    mediaType?: string;
    genres?: string[];
    merge?: boolean;
  }): Promise<AutoTagClassifyResult> {
    return normalizeAutoTagClassify(
      await getJSON<Record<string, unknown>>('/api/tagging/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: input.mediaId,
          title: input.title ?? '',
          path: input.path ?? '',
          mediaType: input.mediaType ?? '',
          genres: input.genres ?? [],
          merge: input.merge !== false,
        }),
      }),
    );
  },

  async getGuard(): Promise<GuardCatalog> {
    return normalizeGuardCatalog(await getJSON<Record<string, unknown>>('/api/guard'));
  },

  async upsertGuardRule(input: {
    id?: string;
    type: string;
    name: string;
    enabled: boolean;
    params?: Record<string, string>;
  }): Promise<GuardRule> {
    return normalizeGuardRule(
      await getJSON<unknown>('/api/guard/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: input.id ?? '',
          type: input.type,
          name: input.name,
          enabled: input.enabled,
          params: input.params ?? {},
        }),
      }),
    );
  },

  async deleteGuardRule(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/guard/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async ackGuardViolations(ids: string[]): Promise<{ updated: number }> {
    return getJSON<{ updated: number }>('/api/guard/violations/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  },

  async mergeGuardUsers(input: {
    sourceUserId?: string;
    sourceUserName?: string;
    targetUserId?: string;
    targetUserName?: string;
  }): Promise<{ violationsUpdated: number; aliasesCreated: number; sessionsUpdated: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/guard/users/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_user_id: input.sourceUserId ?? '',
        source_user_name: input.sourceUserName ?? '',
        target_user_id: input.targetUserId ?? '',
        target_user_name: input.targetUserName ?? '',
      }),
    });
    return {
      violationsUpdated: Number(raw.violationsUpdated ?? raw.violations_updated) || 0,
      aliasesCreated: Number(raw.aliasesCreated ?? raw.aliases_created) || 0,
      sessionsUpdated: Number(raw.sessionsUpdated ?? raw.sessions_updated) || 0,
    };
  },

  async resetGuardTrust(input: { userId?: string; userName?: string }): Promise<GuardTrust> {
    const raw = await getJSON<Record<string, unknown>>('/api/guard/trust/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: input.userId ?? '', user_name: input.userName ?? '' }),
    });
    return {
      userId: String(raw.userId ?? raw.user_id ?? ''),
      userName: String(raw.userName ?? raw.user_name ?? ''),
      score: Number(raw.score) || 0,
      updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
    };
  },

  async getMaintainer(): Promise<MaintainerStatus> {
    return normalizeMaintainerStatus(await getJSON<unknown>('/api/maintainer'));
  },

  async scanMaintainer(input?: { dryRun?: boolean }): Promise<{ ok: boolean; dryRun: boolean; candidatesFound: number; run: MaintainerRun }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: input?.dryRun ?? true }),
    });
    return {
      ok: raw.ok === true,
      dryRun: raw.dry_run === true || raw.dryRun === true,
      candidatesFound: Number(raw.candidates_found ?? raw.candidatesFound ?? 0),
      run: normalizeMaintainerRun(raw.run),
    };
  },

  async actMaintainer(input?: { dryRun?: boolean; freeUp?: boolean; targetFreePercent?: number }): Promise<{ ok: boolean; actionsTaken: number; run: MaintainerRun }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/act', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dry_run: input?.dryRun === true,
        free_up: input?.freeUp === true,
        target_free_percent: input?.targetFreePercent,
      }),
    });
    return {
      ok: raw.ok === true,
      actionsTaken: Number(raw.actions_taken ?? raw.actionsTaken ?? 0),
      run: normalizeMaintainerRun(raw.run),
    };
  },

  async upsertMaintainerRule(input: HouseholdRuleInput): Promise<MaintainerRule> {
    const raw = await getJSON<{ rule?: unknown }>('/api/maintainer/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(householdRuleBody(input)),
    });
    return normalizeMaintainerRule(raw.rule);
  },

  async previewMaintainerRule(input: HouseholdRuleInput): Promise<{ total: number; matches: MaintainerCandidate[] }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/rules/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(householdRuleBody(input)),
    });
    const matches = Array.isArray(raw.matches) ? raw.matches : [];
    return {
      total: Number(raw.total ?? 0),
      matches: matches.map(normalizeMaintainerCandidate).filter((row) => row.id || row.title),
    };
  },

  async toggleMaintainerRule(id: string): Promise<MaintainerRule> {
    const raw = await getJSON<{ rule?: unknown }>(`/api/maintainer/rules/${encodeURIComponent(id)}/toggle`, {
      method: 'POST',
    });
    return normalizeMaintainerRule(raw.rule);
  },

  async upsertMaintainerProtection(input: {
    itemId: string;
    title: string;
    scope: 'movie' | 'series';
    reason?: string;
  }): Promise<MaintainerProtection> {
    const raw = await getJSON<{ protection?: unknown }>('/api/maintainer/protections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(householdProtectionBody(input)),
    });
    return normalizeMaintainerProtection(raw.protection);
  },

  async deleteMaintainerProtection(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/maintainer/protections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async deleteMaintainerRule(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/maintainer/rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async upsertMaintainerCollection(input: HouseholdCollectionInput): Promise<MaintainerCollection> {
    const raw = await getJSON<{ collection?: unknown }>('/api/maintainer/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(householdCollectionBody(input)),
    });
    return normalizeMaintainerCollection(raw.collection);
  },

  async deleteMaintainerCollection(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/maintainer/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async upsertMaintainerExclusion(input: HouseholdExclusionInput): Promise<MaintainerExclusion> {
    const raw = await getJSON<{ exclusion?: unknown }>('/api/maintainer/exclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(householdExclusionBody(input)),
    });
    return normalizeMaintainerExclusion(raw.exclusion);
  },

  async deleteMaintainerExclusion(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/maintainer/exclusions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async syncMaintainerExclusions(): Promise<{ listsSynced: number; idsLoaded: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/exclusions/sync', { method: 'POST' });
    return {
      listsSynced: Number(raw.lists_synced ?? raw.listsSynced ?? 0),
      idsLoaded: Number(raw.ids_loaded ?? raw.idsLoaded ?? 0),
    };
  },

  async exportMaintainerRules(): Promise<{ rulesJson: string; rulesYaml: string }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/rules/export');
    return {
      rulesJson: String(raw.rules_json ?? raw.rulesJson ?? ''),
      rulesYaml: String(raw.rules_yaml ?? raw.rulesYaml ?? ''),
    };
  },

  async importMaintainerRules(input: { rulesYaml?: string; rulesJson?: string; replace?: boolean }): Promise<{ imported: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/maintainer/rules/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rules_yaml: input.rulesYaml ?? '',
        rules_json: input.rulesJson ?? '',
        replace: input.replace === true,
      }),
    });
    return { imported: Number(raw.imported ?? 0) };
  },

  async maintainerCandidateAction(
    id: string,
    action: 'approve' | 'postpone' | 'cancel',
    days?: number,
  ): Promise<MaintainerCandidate> {
    const raw = await getJSON<{ candidate?: unknown }>(`/api/maintainer/candidates/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    });
    return normalizeMaintainerCandidate(raw.candidate);
  },

  async listBackups(): Promise<BackupsStatus> {
    return normalizeBackups(await getJSON<unknown>('/api/backups'));
  },

  async createBackup(): Promise<HouseholdBackup> {
    const raw = await getJSON<{ backup?: unknown }>('/api/backups', { method: 'POST' });
    return normalizeHouseholdBackup(raw.backup);
  },

  async deleteBackup(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/backups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async restoreBackup(id: string): Promise<{ ok: boolean; id: string; filesRestored: number; restoreDir: string }> {
    const raw = await getJSON<Record<string, unknown>>(`/api/backups/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    });
    return {
      ok: raw.ok === true,
      id: String(raw.id ?? id),
      filesRestored: Number(raw.files_restored ?? raw.filesRestored ?? 0),
      restoreDir: String(raw.restore_dir ?? raw.restoreDir ?? ''),
    };
  },

  async listSubtitleWanted(): Promise<SubtitleWantedResponse> {
    return normalizeWanted(await getJSON<unknown>('/api/subtitles/wanted'));
  },

  async createSubtitleWanted(input: { title: string; language?: string; mediaType?: string }): Promise<SubtitleWantedItem> {
    const raw = await getJSON<{ item?: unknown }>('/api/subtitles/wanted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wantedWriteBody(input)),
    });
    return normalizeWantedItem(raw.item);
  },

  async deleteSubtitleWanted(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/subtitles/wanted/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async searchSubtitleWanted(input?: { mediaIds?: string[]; limit?: number }): Promise<{ searched: number; downloaded: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/subtitles/wanted/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_ids: input?.mediaIds, limit: input?.limit }),
    });
    return { searched: Number(raw.searched ?? 0), downloaded: Number(raw.downloaded ?? 0) };
  },

  async listSubtitleProviders(): Promise<SubtitleProvidersResponse> {
    return normalizeSubtitleProviders(await getJSON<unknown>('/api/subtitles/providers'));
  },

  async setSubtitleProvider(id: string, enabled: boolean): Promise<{ ok: boolean; id: string; enabled: boolean }> {
    const raw = await getJSON<Record<string, unknown>>(`/api/subtitles/providers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const provider = raw.provider && typeof raw.provider === 'object' ? (raw.provider as Record<string, unknown>) : {};
    return {
      ok: raw.ok === true,
      id: String(provider.id ?? id),
      enabled: provider.enabled !== false,
    };
  },

  async listSubtitleHistory(): Promise<SubtitleHistoryResponse> {
    return normalizeSubtitleHistory(await getJSON<unknown>('/api/subtitles/history'));
  },

  async clearSubtitleHistory(): Promise<{ cleared: boolean }> {
    const raw = await getJSON<Record<string, unknown>>('/api/subtitles/history/clear', { method: 'POST' });
    return { cleared: raw.cleared === true };
  },

  async listSubtitleProfiles(): Promise<SubtitleProfilesResponse> {
    return normalizeSubtitleProfiles(await getJSON<unknown>('/api/subtitles/profiles'));
  },

  async listSubtitleLanguages(): Promise<SubtitleLanguagesResponse> {
    return normalizeSubtitleLanguages(await getJSON<unknown>('/api/subtitles/languages'));
  },

  async listSubtitleBlacklist(): Promise<SubtitleBlacklistResponse> {
    return normalizeSubtitleBlacklist(await getJSON<unknown>('/api/subtitles/blacklist'));
  },

  async removeSubtitleBlacklist(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/subtitles/blacklist/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listSubtitleMedia(): Promise<SubtitleLibraryResponse> {
    return normalizeSubtitleLibrary(await getJSON<unknown>('/api/subtitles/media'));
  },

  async setSubtitleMedia(
    id: string,
    input: { languageProfileId?: string; monitored?: boolean },
  ): Promise<{ ok: boolean; id: string }> {
    const raw = await getJSON<Record<string, unknown>>(`/api/subtitles/media/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_profile_id: input.languageProfileId,
        monitored: input.monitored,
      }),
    });
    return { ok: raw.ok === true, id: String(raw.id ?? id) };
  },

  async massEditSubtitleMedia(input: {
    mediaIds: string[];
    languageProfileId?: string;
    setMonitored?: boolean;
    monitored?: boolean;
  }): Promise<{ ok: boolean; updated: number }> {
    const raw = await getJSON<Record<string, unknown>>('/api/subtitles/media/mass-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(massEditSubtitleBody(input)),
    });
    return { ok: raw.ok === true, updated: Number(raw.updated ?? 0) };
  },

  async upsertSubtitleProfile(input: { name: string; languages: string; isDefault?: boolean }): Promise<SubtitleProfile> {
    const raw = await getJSON<{ profile?: unknown }>('/api/subtitles/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: input.name, languages: input.languages, is_default: input.isDefault === true }),
    });
    return normalizeSubtitleProfile(raw.profile);
  },

  async getWatchNotify(): Promise<WatchNotifyCatalog> {
    return normalizeWatchNotifyCatalog(await getJSON<Record<string, unknown>>('/api/watch-notify'));
  },

  async upsertWatchNotifyRule(input: {
    id?: string;
    name: string;
    enabled: boolean;
    eventType: string;
    titleTemplate?: string;
    messageTemplate?: string;
    severity?: string;
    destinationIds?: string[];
    filters?: Partial<WatchNotifyFilters>;
  }): Promise<WatchNotifyRule> {
    return normalizeWatchNotifyRule(
      await getJSON<unknown>('/api/watch-notify/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: input.id ?? '',
          name: input.name,
          enabled: input.enabled,
          eventType: input.eventType,
          titleTemplate: input.titleTemplate ?? '',
          messageTemplate: input.messageTemplate ?? '',
          severity: input.severity ?? 'info',
          destinationIds: input.destinationIds ?? [],
          filters: {
            userIds: input.filters?.userIds ?? [],
            platforms: input.filters?.platforms ?? [],
            mediaTypes: input.filters?.mediaTypes ?? [],
            transcodeOnly: input.filters?.transcodeOnly === true,
            minDurationSec: input.filters?.minDurationSec ?? 0,
          },
        }),
      }),
    );
  },

  async deleteWatchNotifyRule(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/watch-notify/rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async upsertWatchNotifyDestination(input: {
    id?: string;
    name: string;
    type: string;
    enabled: boolean;
    events: string[];
    config?: Record<string, string>;
  }): Promise<WatchNotifyDestination> {
    return normalizeWatchNotifyDestination(
      await getJSON<unknown>('/api/watch-notify/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: input.id ?? '',
          name: input.name,
          type: input.type,
          enabled: input.enabled,
          events: input.events,
          config: input.config ?? {},
        }),
      }),
    );
  },

  async deleteWatchNotifyDestination(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/watch-notify/destinations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async testWatchNotifyDestination(id: string): Promise<{ ok: boolean; id: string }> {
    const raw = await getJSON<Record<string, unknown>>(
      `/api/watch-notify/destinations/${encodeURIComponent(id)}/test`,
      { method: 'POST' },
    );
    return { ok: raw.ok === true, id: String(raw.id ?? id) };
  },

  async getNotifications(): Promise<NotificationsStatus> {
    return normalizeNotifications(await getJSON<unknown>('/api/notifications'));
  },

  async configureNotification(input: {
    channel: string;
    webhookUrl?: string;
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    to?: string;
    enabled?: boolean;
  }): Promise<{ configured: boolean; channel: string }> {
    const raw = await getJSON<Record<string, unknown>>('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyWriteBody(input)),
    });
    return {
      configured: raw.configured === true,
      channel: String(raw.channel ?? input.channel),
    };
  },

  async testNotification(channel: string): Promise<{ ok: boolean; channel: string; error?: string }> {
    const raw = await getJSON<Record<string, unknown>>('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel }),
    });
    return {
      ok: raw.ok === true,
      channel: String(raw.channel ?? channel),
      error: raw.error ? String(raw.error) : undefined,
    };
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
    qualityProfile?: 'hd' | '4k' | string;
    seasonNumber?: number;
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
    if (input.qualityProfile) {
      body.qualityProfile = input.qualityProfile;
    }
    if (input.seasonNumber != null && input.seasonNumber > 0) {
      body.seasonNumber = input.seasonNumber;
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

  async getRequestPolicy(): Promise<RequestPolicy> {
    return normalizeRequestPolicy(await getJSON<Record<string, unknown>>('/api/request-policy'));
  },

  async updateRequestPolicy(input: {
    maxPendingPerUser?: number;
    maxPerWeek?: number;
    autoApproveUsers?: string[];
    autoApproveUsersCsv?: string;
  }): Promise<RequestPolicy> {
    return normalizeRequestPolicy(
      await getJSON<Record<string, unknown>>('/api/request-policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },

  async listIssues(): Promise<MediaIssue[]> {
    const data = await getJSON<{ items?: MediaIssue[] }>('/api/media-issues');
    return data.items || [];
  },

  async reportIssue(input: {
    kind: string;
    mediaType: string;
    mediaId?: string;
    tmdbId?: number;
    title: string;
    message?: string;
  }): Promise<MediaIssue> {
    return getJSON('/api/media-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async approveRequest(requestId: string): Promise<{ status?: string }> {
    return getJSON(`/api/requests/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  },

  async denyRequest(requestId: string, reason = ''): Promise<{ status?: string }> {
    return getJSON(`/api/requests/${encodeURIComponent(requestId)}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
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

  /** Plex web deep-link for a rating key (null when the bridge is down). */
  async plexPlayURL(ratingKey: string): Promise<string | null> {
    const key = ratingKey.trim();
    if (!key) return null;
    try {
      const data = await getJSON<{ url?: string }>(
        `/api/plex/play?rating_key=${encodeURIComponent(key)}`,
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
  async getComicSeries(id: string): Promise<{
    series: { id: string; title: string; publisher?: string; monitored?: boolean; path?: string };
    issues: Array<{
      id: string;
      series_id?: string;
      title: string;
      number?: string;
      year?: number;
      has_file?: boolean;
      stream_url?: string;
    }>;
  }> {
    return getJSON(`/api/comics/${encodeURIComponent(id)}`);
  },
  async importLibraryFile(input: {
    kind: 'book' | 'issue' | 'audiobook' | 'album';
    id: string;
    path: string;
  }): Promise<{ id?: string; stream_url?: string; imported?: boolean }> {
    const path =
      input.kind === 'book'
        ? `/api/books/works/${encodeURIComponent(input.id)}/import`
        : input.kind === 'issue'
          ? `/api/comics/issues/${encodeURIComponent(input.id)}/import`
          : input.kind === 'album'
            ? `/api/music/albums/${encodeURIComponent(input.id)}/import`
            : `/api/audiobooks/${encodeURIComponent(input.id)}/import`;
    return getJSON(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: input.path }),
    });
  },
  async searchReleases(opts: {
    q: string;
    type: 'movie' | 'tv' | 'music' | 'book' | 'comic' | 'audiobook';
    year?: number;
    tmdbId?: number;
    season?: number;
    episode?: number;
  }): Promise<ReleaseSearchResponse> {
    const q = new URLSearchParams({
      q: opts.q,
      type: opts.type,
    });
    if (opts.year) q.set('year', String(opts.year));
    if (opts.tmdbId) q.set('tmdb_id', String(opts.tmdbId));
    if (opts.season) q.set('season', String(opts.season));
    if (opts.episode) q.set('episode', String(opts.episode));
    const raw = await getJSON<ReleaseSearchResponse>(`/api/releases/search?${q}`);
    return {
      ...raw,
      items: (raw.items || []).map((item) => ({
        ...item,
        quality: item.quality ? normalizeParsedQuality(item.quality) : undefined,
      })),
    };
  },
  async grabRelease(body: {
    guid: string;
    title: string;
    download_url?: string;
    download_protocol?: string;
    size?: number;
    score?: number;
    indexer_name?: string;
    item_type: 'movie' | 'tv' | 'music' | 'book' | 'comic' | 'audiobook';
    item_id: string;
    tmdb_id?: number;
  }): Promise<ReleaseGrabResult> {
    return getJSON<ReleaseGrabResult>('/api/releases/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  async listUpgrades(page = 1, pageSize = 50): Promise<CutoffUnmetResponse> {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    return getJSON<CutoffUnmetResponse>(`/api/releases/upgrades?${q}`);
  },
  async searchNow(body?: {
    queue_id?: string;
    item_type?: string;
    item_id?: string;
  }): Promise<SearchNowResult> {
    return getJSON<SearchNowResult>('/api/releases/search-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
  },
  async listBlocklist(): Promise<BlocklistResponse> {
    return normalizeBlocklist(await getJSON<Record<string, unknown>>('/api/blocklist'));
  },

  async listInvites(): Promise<InvitesResponse> {
    return normalizeInvites(await getJSON<Record<string, unknown>>('/api/invites'));
  },

  async createInvite(input: {
    role?: string;
    maxUses?: number;
    ttlHours?: number;
  }): Promise<HouseholdInvite> {
    const raw = await getJSON<{ invite?: unknown }>('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: input.role,
        max_uses: input.maxUses,
        ttl_hours: input.ttlHours,
      }),
    });
    return normalizeInvite(raw.invite);
  },

  async revokeInvite(id: string): Promise<{ revoked: boolean }> {
    return getJSON<{ revoked: boolean }>(`/api/invites/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listUsers(): Promise<UsersResponse> {
    return normalizeUsers(await getJSON<unknown>('/api/users'));
  },

  async createUser(input: { username: string; password: string; role?: string }): Promise<HouseholdUser> {
    const raw = await getJSON<{ user?: unknown }>('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        role: input.role || 'user',
      }),
    });
    return normalizeHouseholdUser(raw.user);
  },

  async setUserPassword(id: string, password: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/users/${encodeURIComponent(id)}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  },

  async setUserRole(id: string, role: string): Promise<HouseholdUser> {
    const raw = await getJSON<{ user?: unknown }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return normalizeHouseholdUser(raw.user);
  },

  async deleteUser(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listViewerProfiles(): Promise<ViewerProfiles> {
    return getJSON<ViewerProfiles>('/api/profiles');
  },

  async createViewerProfile(input: {
    name: string;
    kids: boolean;
    pin?: string;
    current_pin?: string;
  }): Promise<ViewerProfiles> {
    return getJSON<ViewerProfiles>('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async activateViewerProfile(id: string, pin?: string): Promise<ViewerProfiles> {
    return getJSON<ViewerProfiles>('/api/profiles/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin: pin ?? '' }),
    });
  },

  async getTOTP(): Promise<HouseholdTOTP> {
    try {
      return normalizeTOTP(await getJSON<unknown>('/api/totp'));
    } catch {
      return normalizeTOTP({ available: false, enabled: false });
    }
  },

  async enableTOTP(): Promise<HouseholdTOTP> {
    return normalizeTOTP(await getJSON<unknown>('/api/totp', { method: 'POST' }));
  },

  async verifyTOTP(code: string): Promise<HouseholdTOTP> {
    return normalizeTOTP(
      await getJSON<unknown>('/api/totp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
    );
  },

  async disableTOTP(): Promise<HouseholdTOTP> {
    return normalizeTOTP(await getJSON<unknown>('/api/totp', { method: 'DELETE' }));
  },

  async listPasskeys(): Promise<PasskeysResponse> {
    try {
      return normalizePasskeys(await getJSON<unknown>('/api/passkeys'));
    } catch {
      return normalizePasskeys({ available: false, passkeys: [] });
    }
  },

  async beginPasskeyRegister(): Promise<PasskeyBegin> {
    return normalizePasskeyBegin(await getJSON<unknown>('/api/passkeys/register/begin', { method: 'POST' }));
  },

  async completePasskeyRegister(challenge: string, credential: unknown): Promise<{ registered: boolean }> {
    return getJSON<{ registered: boolean }>(
      `/api/passkeys/register/complete?challenge=${encodeURIComponent(challenge)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credential),
      },
    );
  },

  async deletePasskey(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/passkeys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listPasswordResets(): Promise<PasswordResetsResponse> {
    return normalizePasswordResets(await getJSON<unknown>('/api/password-reset'));
  },

  async dismissPasswordReset(id: string): Promise<{ ok: boolean; id: string }> {
    return getJSON<{ ok: boolean; id: string }>(`/api/password-reset/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
    });
  },

  async setPasswordReset(id: string, password: string): Promise<{ ok: boolean; id: string; user_id?: string }> {
    return getJSON<{ ok: boolean; id: string; user_id?: string }>(
      `/api/password-reset/${encodeURIComponent(id)}/password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      },
    );
  },

  async listAPIKeys(): Promise<KeysResponse> {
    return normalizeKeys(await getJSON<unknown>('/api/keys'));
  },

  async createAPIKey(input: { name: string; userId?: string; scopes?: string[] }): Promise<CreatedAPIKey> {
    return normalizeCreatedAPIKey(
      await getJSON<unknown>('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyWriteBody(input)),
      }),
    );
  },

  async rotateAPIKey(id: string): Promise<CreatedAPIKey> {
    return normalizeCreatedAPIKey(
      await getJSON<unknown>(`/api/keys/${encodeURIComponent(id)}/rotate`, { method: 'POST' }),
    );
  },

  async deleteAPIKey(id: string): Promise<{ removed: boolean; id: string }> {
    return getJSON<{ removed: boolean; id: string }>(`/api/keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listDelayProfiles(): Promise<DelayProfilesResponse> {
    return normalizeDelayProfiles(await getJSON<Record<string, unknown>>('/api/delay-profiles'));
  },

  async upsertDelayProfile(input: {
    protocol: string;
    waitMinutes: number;
  }): Promise<DelayProfile> {
    const raw = await getJSON<Record<string, unknown>>('/api/delay-profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: input.protocol,
        wait_minutes: input.waitMinutes,
      }),
    });
    return normalizeDelayProfiles({ available: true, profiles: [raw] }).profiles[0] ?? {
      protocol: input.protocol,
      waitMinutes: input.waitMinutes,
    };
  },

  async clearBlocklist(input: {
    clearAll?: boolean;
    wantedItemId?: string;
    guid?: string;
  }): Promise<{ removed: number }> {
    return getJSON<{ removed: number }>('/api/blocklist/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clear_all: Boolean(input.clearAll),
        wanted_item_id: input.wantedItemId || '',
        guid: input.guid || '',
      }),
    });
  },

  async blockRelease(body: {
    guid: string;
    item_id: string;
    wanted_item_id?: string;
    reason?: string;
  }): Promise<ReleaseBlockResult> {
    return getJSON<ReleaseBlockResult>('/api/releases/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  async listActivity(opts?: { page?: number; pageSize?: number; status?: string }): Promise<ActivityResponse> {
    const q = new URLSearchParams();
    q.set('page', String(opts?.page ?? 1));
    q.set('page_size', String(opts?.pageSize ?? 50));
    if (opts?.status) q.set('status', opts.status);
    return getJSON<ActivityResponse>(`/api/activity?${q}`);
  },
  async retryImport(historyId?: string): Promise<ActivityRetryResult> {
    return getJSON<ActivityRetryResult>('/api/activity/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history_id: historyId || '' }),
    });
  },
  async listWanted(opts?: {
    page?: number;
    pageSize?: number;
    missing?: boolean;
    monitored?: boolean;
    type?: string;
  }): Promise<WantedResponse> {
    const q = new URLSearchParams();
    q.set('page', String(opts?.page ?? 1));
    q.set('page_size', String(opts?.pageSize ?? 50));
    if (opts?.missing) q.set('missing', '1');
    if (opts?.monitored) q.set('monitored', '1');
    if (opts?.type) q.set('type', opts.type);
    return getJSON<WantedResponse>(`/api/wanted?${q}`);
  },
  async listCalendar(opts?: {
    start?: string;
    end?: string;
    unmonitored?: boolean;
  }): Promise<CalendarResponse> {
    const q = new URLSearchParams();
    if (opts?.start) q.set('start', opts.start);
    if (opts?.end) q.set('end', opts.end);
    if (opts?.unmonitored) q.set('unmonitored', '1');
    const qs = q.toString();
    return getJSON<CalendarResponse>(`/api/calendar${qs ? `?${qs}` : ''}`);
  },
  async listMissing(opts?: { type?: string; page?: number; pageSize?: number; seriesId?: string }): Promise<MissingResponse> {
    const q = new URLSearchParams();
    if (opts?.type) q.set('type', opts.type);
    if (opts?.page) q.set('page', String(opts.page));
    if (opts?.pageSize) q.set('page_size', String(opts.pageSize));
    if (opts?.seriesId) q.set('series_id', opts.seriesId);
    const qs = q.toString();
    return normalizeMissing(await getJSON<Record<string, unknown>>(`/api/missing${qs ? `?${qs}` : ''}`));
  },
  async removeWanted(queueId: string): Promise<{ removed: boolean; queue_id: string }> {
    return getJSON('/api/wanted/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue_id: queueId }),
    });
  },
  async addWanted(input: {
    itemType: string;
    itemId: string;
    title?: string;
    year?: number;
    tmdbId?: number;
    qualityProfileId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    seriesId?: string;
    seriesType?: string;
  }): Promise<{ added: boolean; queue_id: string }> {
    return getJSON('/api/wanted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: input.itemType,
        item_id: input.itemId,
        title: input.title ?? '',
        year: input.year ?? 0,
        tmdb_id: input.tmdbId ?? 0,
        quality_profile_id: input.qualityProfileId ?? '',
        season_number: input.seasonNumber ?? 0,
        episode_number: input.episodeNumber ?? 0,
        series_id: input.seriesId ?? '',
        series_type: input.seriesType ?? '',
      }),
    });
  },
  async listAudiobooks(): Promise<LibraryListResponse> {
    return getLibraryList('/api/audiobooks');
  },
  async getAudiobook(id: string): Promise<AudiobookDetail> {
    return getJSON<AudiobookDetail>(`/api/audiobooks/${encodeURIComponent(id)}`);
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

  async listCollections(): Promise<{ items: { id: string; name: string; movie_count: number; monitored?: boolean }[] }> {
    return getJSON('/api/collections');
  },

  async getCollection(
    id: string,
  ): Promise<{
    id: string;
    name: string;
    movies: import('../types').Movie[];
    monitored: boolean;
    searchOnAdd: boolean;
  }> {
    const raw = await getJSON<{
      id: string;
      name: string;
      movies: Record<string, unknown>[];
      monitored?: boolean;
      search_on_add?: boolean;
    }>(`/api/collections/${encodeURIComponent(id)}`);
    return {
      id: raw.id,
      name: raw.name,
      movies: (raw.movies || []).map((m) => normalizeMovie(m)),
      monitored: raw.monitored === true,
      searchOnAdd: raw.search_on_add !== false,
    };
  },

  async setCollectionMonitored(
    id: string,
    input: { monitored: boolean; searchOnAdd?: boolean },
  ): Promise<{ ok: boolean; monitored: boolean }> {
    const raw = await getJSON<{ ok?: boolean; monitored?: boolean }>(`/api/collections/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monitored: input.monitored,
        search_on_add: input.searchOnAdd,
      }),
    });
    return { ok: raw.ok === true, monitored: raw.monitored === true };
  },

  async syncCollection(id: string, addMissing = true): Promise<{ ok: boolean; added: number; alreadyPresent: number }> {
    const raw = await getJSON<{ ok?: boolean; added?: number; already_present?: number }>(
      `/api/collections/${encodeURIComponent(id)}/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_missing: addMissing }),
      },
    );
    return { ok: raw.ok === true, added: Number(raw.added || 0), alreadyPresent: Number(raw.already_present || 0) };
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

export type RequestPolicy = {
  maxPendingPerUser: number;
  maxPerWeek: number;
  autoApproveUsers: string[];
  pendingUsed: number;
  weekUsed: number;
  remainingPending: number;
  remainingWeek: number;
  canRequest: boolean;
  autoApprove: boolean;
  canEdit: boolean;
  code: string;
  reason: string;
};

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRequestPolicy(raw: Record<string, unknown> = {}): RequestPolicy {
  const users = raw.autoApproveUsers ?? raw.auto_approve_users;
  return {
    maxPendingPerUser: asNumber(raw.maxPendingPerUser ?? raw.max_pending_per_user),
    maxPerWeek: asNumber(raw.maxPerWeek ?? raw.max_per_week),
    autoApproveUsers: Array.isArray(users) ? users.map((u) => String(u)).filter(Boolean) : [],
    pendingUsed: asNumber(raw.pendingUsed ?? raw.pending_used),
    weekUsed: asNumber(raw.weekUsed ?? raw.week_used),
    remainingPending: asNumber(raw.remainingPending ?? raw.remaining_pending, -1),
    remainingWeek: asNumber(raw.remainingWeek ?? raw.remaining_week, -1),
    canRequest: raw.canRequest !== false && raw.can_request !== false,
    autoApprove: raw.autoApprove === true || raw.auto_approve === true,
    canEdit: raw.canEdit === true || raw.can_edit === true,
    code: raw.code != null ? String(raw.code) : '',
    reason: raw.reason != null ? String(raw.reason) : '',
  };
}

export type PlaybackSessionEventType = 'started' | 'progress' | 'stopped';

export type PlaybackSessionInput = {
  event_type: PlaybackSessionEventType;
  session_id: string;
  media_id: string;
  title?: string;
  media_type?: string;
  position_seconds?: number;
  duration_seconds?: number;
  is_paused?: boolean;
  is_transcode?: boolean;
  player?: string;
  platform?: string;
};

export type PlaybackSessionResult = {
  accepted: boolean;
  forwarded: boolean;
  stopped?: boolean;
  session_id?: string;
};

/** Fire-and-forget native play → playback-monitor ingest via the BFF. */
export async function reportPlaybackSession(
  input: PlaybackSessionInput,
): Promise<PlaybackSessionResult> {
  return getJSON<PlaybackSessionResult>('/api/playback/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
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

/** Replace skip points for a title (SetSegments). Admin/manager. */
export async function setPlaybackSegments(
  mediaId: string,
  segments: PlaybackSegment[],
): Promise<{ media_id: string; segments: PlaybackSegment[]; enabled: boolean }> {
  return getJSON('/api/playback/segments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId, segments }),
  });
}

/** Clear skip points for a title (DeleteSegments). Admin/manager. */
export async function deletePlaybackSegments(
  mediaId: string,
): Promise<{ media_id: string; segments: PlaybackSegment[]; enabled: boolean }> {
  const q = new URLSearchParams({ media_id: mediaId });
  return getJSON(`/api/playback/segments?${q}`, { method: 'DELETE' });
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
