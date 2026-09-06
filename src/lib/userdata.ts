/** Server-authoritative userdata: BFF/userdata-local is source of truth; localStorage is cache/offline. */

import { buildEpisodePlayerHref } from './playHref';

export type MediaKind = 'movie' | 'tv' | 'episode' | 'music' | 'book' | 'other';

export type ProgressEntry = {
  id: string;
  kind: MediaKind;
  title: string;
  poster_url?: string;
  href: string;
  stream_url?: string;
  positionSec: number;
  durationSec: number;
  updatedAt: string;
  watched?: boolean;
};

export type FavoriteEntry = {
  id: string;
  kind: MediaKind;
  title: string;
  poster_url?: string;
  href: string;
  year?: number;
};

/** Parental-control prefs written by admin-ui and synced via the BFF userdata blob. */
export type ParentalPrefs = {
  /** Whether kids mode is active for this profile. */
  kidsMode: boolean;
  /**
   * Maximum allowed content rating.  Empty string means unrestricted.
   * Recognised values (case-insensitive): G, PG, PG-13, R, NC-17,
   * TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA.
   */
  maxRating: string;
  /**
   * SHA-256 hex digest of the 4-digit PIN.  Empty string means no PIN is set.
   * Admin-ui writes this field; media-ui-app only reads and verifies it.
   */
  pinHash: string;
  /** Whether a PIN is required to leave kids mode or unlock a restricted title. */
  pinEnabled: boolean;
};

export type UserPreferences = {
  display: {
    theme: 'dark' | 'light' | 'system';
    libraryPageSize: number;
    showWatchedIndicators: boolean;
  };
  home: {
    showContinueWatching: boolean;
    showFavorites: boolean;
    showRecentRequests: boolean;
    showNextUp: boolean;
    showRecentlyAdded: boolean;
  };
  playback: {
    autoplayNext: boolean;
    rememberPosition: boolean;
    skipIntroSec: number;
  };
  subtitles: {
    enabled: boolean;
    language: string;
    textSize: 'sm' | 'md' | 'lg';
    /** 0-100 background opacity behind subtitle text (custom renderer). */
    backgroundOpacity: number;
    edgeStyle: 'none' | 'drop-shadow' | 'outline';
    verticalPosition: 'bottom' | 'top';
  };
  controls: {
    enableKeyboardShortcuts: boolean;
  };
  player: {
    /** Manual quality/version cap id from QUALITY_OPTIONS; 'auto' = original/source. */
    preferredQuality: string;
    theaterMode: boolean;
    /** Aspect-ratio/zoom mode for the video element. */
    aspectMode: 'contain' | 'cover' | 'fill';
  };
  /** Parental-control settings written by admin-ui and synced read-only here. */
  parental: ParentalPrefs;
};

const KEYS = {
  progress: 'muxcore.userdata.progress.v1',
  favorites: 'muxcore.userdata.favorites.v1',
  prefs: 'muxcore.userdata.prefs.v1',
  playlists: 'muxcore.userdata.playlists.v1',
  queue: 'muxcore.userdata.queue.v1',
  meta: 'muxcore.userdata.meta.v1',
} as const;

export type Playlist = { id: string; name: string; itemIds: string[] };

export type QueueItem = {
  id: string;
  kind: MediaKind;
  title: string;
  href: string;
  stream_url?: string;
  poster_url?: string;
};

type Meta = { serverAuthoritative: boolean; lastPullAt?: string };

const defaultPrefs = (): UserPreferences => ({
  display: {
    theme: 'dark',
    libraryPageSize: 48,
    showWatchedIndicators: true,
  },
  home: {
    showContinueWatching: true,
    showFavorites: true,
    showRecentRequests: true,
    showNextUp: true,
    showRecentlyAdded: true,
  },
  playback: {
    autoplayNext: false,
    rememberPosition: true,
    skipIntroSec: 0,
  },
  subtitles: {
    enabled: true,
    language: 'eng',
    textSize: 'md',
    backgroundOpacity: 60,
    edgeStyle: 'drop-shadow',
    verticalPosition: 'bottom',
  },
  controls: {
    enableKeyboardShortcuts: true,
  },
  player: {
    preferredQuality: 'auto',
    theaterMode: false,
    aspectMode: 'contain',
  },
  parental: {
    kidsMode: false,
    maxRating: '',
    pinHash: '',
    pinEnabled: false,
  },
});

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getMeta(): Meta {
  return readJSON<Meta>(KEYS.meta, { serverAuthoritative: false });
}

function setMeta(patch: Partial<Meta>): void {
  writeJSON(KEYS.meta, { ...getMeta(), ...patch });
}

/** True after a successful pull from BFF — home/next-up should prefer this cache. */
export function isServerAuthoritative(): boolean {
  return getMeta().serverAuthoritative;
}

export function getUserdataSyncStatus(): { authoritative: boolean; lastPullAt?: string } {
  const meta = getMeta();
  return { authoritative: meta.serverAuthoritative, lastPullAt: meta.lastPullAt };
}

export function listProgress(): ProgressEntry[] {
  const map = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
  return Object.values(map).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProgress(id: string): ProgressEntry | undefined {
  const map = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
  return map[id];
}

export function upsertProgress(
  entry: Omit<ProgressEntry, 'updatedAt'> & { updatedAt?: string; watched?: boolean },
): ProgressEntry {
  const map = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
  const next: ProgressEntry = {
    ...entry,
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
  if (entry.watched === undefined) {
    const ratio = next.durationSec > 0 ? next.positionSec / next.durationSec : 0;
    if (ratio >= 0.92) {
      next.watched = true;
      next.positionSec = 0;
    }
  } else {
    next.watched = entry.watched;
    if (entry.watched) next.positionSec = 0;
  }
  map[next.id] = next;
  writeJSON(KEYS.progress, map);
  void pushUserdataToServer();
  return next;
}

export function markWatched(id: string, watched: boolean): void {
  const map = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
  const cur = map[id];
  if (!cur) return;
  map[id] = {
    ...cur,
    watched,
    positionSec: watched ? 0 : cur.positionSec,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(KEYS.progress, map);
  void pushUserdataToServer();
}

export function continueWatching(limit = 24): ProgressEntry[] {
  return listProgress()
    .filter(
      (p) =>
        !p.watched &&
        p.positionSec > 5 &&
        (p.durationSec === 0 || p.positionSec / p.durationSec < 0.92),
    )
    .slice(0, limit);
}

/** Extract `/tv/:showId` from a progress href/back link. */
export function showIdFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const m = href.match(/(?:^|\/)tv\/([^/?#]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export type NextUpEntry = {
  id: string;
  kind: 'movie' | 'episode';
  title: string;
  poster_url?: string;
  href: string;
  stream_url?: string;
  subtitle?: string;
  showId?: string;
};

type EpisodeLike = {
  id: string;
  season_number: number;
  episode_number: number;
  title?: string;
  has_file?: boolean;
  stream_url?: string;
};

type ShowLike = {
  id: string;
  title: string;
  poster_url?: string;
  seasons?: Array<{ season_number: number; episodes?: EpisodeLike[] }>;
};

export function flattenEpisodes(show: ShowLike): EpisodeLike[] {
  const out: EpisodeLike[] = [];
  for (const season of show.seasons || []) {
    for (const ep of season.episodes || []) {
      out.push(ep);
    }
  }
  return out.sort((a, b) =>
    a.season_number !== b.season_number
      ? a.season_number - b.season_number
      : a.episode_number - b.episode_number,
  );
}

export type ShowPlayTargets = {
  resume: string | null;
  fromBeginning: string | null;
};

/** Hero play targets for a TV show detail page (next-up or first playable, plus S01E01). */
export function resolveShowPlayTargets(show: ShowLike): ShowPlayTargets {
  const playable = flattenEpisodes(show).filter((ep) => ep.has_file && ep.stream_url);
  if (playable.length === 0) return { resume: null, fromBeginning: null };

  const first = playable[0];
  const fromBeginning = episodePlayHref(show, first, true);
  const defaultPlay = episodePlayHref(show, first, false);
  const showProgress = listProgress().filter((p) => showIdFromHref(p.href) === show.id);

  const inProgress = showProgress.find(
    (p) => p.kind === 'episode' && !p.watched && p.positionSec > 5,
  );
  if (inProgress) {
    const ep = playable.find((e) => e.id === inProgress.id);
    if (ep) return { resume: episodePlayHref(show, ep), fromBeginning };
  }

  const watched = showProgress
    .filter((p) => p.kind === 'episode' && p.watched)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (watched.length > 0) {
    const next = nextEpisodeAfter(show, watched[0].id);
    if (next?.has_file && next.stream_url) {
      return { resume: episodePlayHref(show, next), fromBeginning };
    }
  }

  return { resume: defaultPlay, fromBeginning };
}

export function nextEpisodeAfter(show: ShowLike, episodeId: string): EpisodeLike | null {
  const eps = flattenEpisodes(show);
  const idx = eps.findIndex((e) => e.id === episodeId);
  if (idx < 0) return null;
  for (let i = idx + 1; i < eps.length; i++) {
    if (eps[i].has_file) return eps[i];
  }
  return null;
}

function episodePlayHref(show: ShowLike, ep: EpisodeLike, restart = false): string {
  if (!ep.has_file || !ep.stream_url) return `/tv/${show.id}`;
  return (
    buildEpisodePlayerHref(show, {
      id: ep.id,
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      title: ep.title,
      has_file: ep.has_file,
      stream_url: ep.stream_url,
    }, { restart }) || `/tv/${show.id}`
  );
}

/**
 * Derive Next Up from server/local progress:
 * - Continue Watching covers partially watched movies/episodes
 * - Next Up = after a watched episode, the following episode with a file (TV detail API)
 */
export async function resolveNextUp(
  fetchShow: (showId: string) => Promise<ShowLike>,
  limit = 12,
): Promise<NextUpEntry[]> {
  const progress = listProgress();
  const continueIds = new Set(continueWatching(100).map((p) => p.id));
  const out: NextUpEntry[] = [];
  const seen = new Set<string>();
  const showCache = new Map<string, ShowLike | null>();

  const loadShow = async (showId: string): Promise<ShowLike | null> => {
    if (showCache.has(showId)) return showCache.get(showId) ?? null;
    try {
      const show = await fetchShow(showId);
      showCache.set(showId, show);
      return show;
    } catch {
      showCache.set(showId, null);
      return null;
    }
  };

  for (const p of progress) {
    if (out.length >= limit) break;
    if (p.kind !== 'episode' && p.kind !== 'tv') continue;
    const watched = p.watched || (p.durationSec > 0 && p.positionSec / p.durationSec >= 0.92);
    if (!watched) continue;
    const showId = showIdFromHref(p.href);
    if (!showId) continue;
    const show = await loadShow(showId);
    if (!show) continue;
    let next: EpisodeLike | null = null;
    if (p.kind === 'episode') {
      next = nextEpisodeAfter(show, p.id);
    } else {
      const eps = flattenEpisodes(show);
      next =
        eps.find((e) => e.has_file && !progress.some((x) => x.id === e.id && x.watched)) || null;
    }
    if (!next || seen.has(next.id)) continue;
    if (continueIds.has(next.id)) continue;
    seen.add(next.id);
    const epTitle = `${show.title} S${String(next.season_number).padStart(2, '0')}E${String(next.episode_number).padStart(2, '0')}`;
    out.push({
      id: next.id,
      kind: 'episode',
      title: next.title ? `${epTitle} · ${next.title}` : epTitle,
      poster_url: show.poster_url || p.poster_url,
      href: episodePlayHref(show, next),
      stream_url: next.stream_url,
      subtitle: 'Next up',
      showId: show.id,
    });
  }

  return out.slice(0, limit);
}

/** Recently finished titles (watched) — feed for next-up resolution. */
export function recentlyWatched(limit = 24): ProgressEntry[] {
  return listProgress()
    .filter((p) => p.watched)
    .slice(0, limit);
}

/** Extract `/tv/:showId` from a progress href when present. */
export function tvShowIdFromHref(href: string): string | null {
  const m = href.match(/\/tv\/([^/?#]+)/);
  return m?.[1] || null;
}

export function listFavorites(): FavoriteEntry[] {
  const map = readJSON<Record<string, FavoriteEntry>>(KEYS.favorites, {});
  return Object.values(map).sort((a, b) => a.title.localeCompare(b.title));
}

export function isFavorite(id: string): boolean {
  const map = readJSON<Record<string, FavoriteEntry>>(KEYS.favorites, {});
  return Boolean(map[id]);
}

export function toggleFavorite(entry: FavoriteEntry): boolean {
  const map = readJSON<Record<string, FavoriteEntry>>(KEYS.favorites, {});
  if (map[entry.id]) {
    delete map[entry.id];
    writeJSON(KEYS.favorites, map);
    void pushUserdataToServer();
    return false;
  }
  map[entry.id] = entry;
  writeJSON(KEYS.favorites, map);
  void pushUserdataToServer();
  return true;
}

export function getPreferences(): UserPreferences {
  const stored = readJSON<Partial<UserPreferences>>(KEYS.prefs, {});
  const base = defaultPrefs();
  return {
    display: { ...base.display, ...stored.display },
    home: { ...base.home, ...stored.home },
    playback: { ...base.playback, ...stored.playback },
    subtitles: { ...base.subtitles, ...stored.subtitles },
    controls: { ...base.controls, ...stored.controls },
    player: { ...base.player, ...stored.player },
    parental: { ...base.parental, ...stored.parental },
  };
}

/** Read only the parental section from cached prefs (safe to call at render time). */
export function getParentalPrefs(): ParentalPrefs {
  return getPreferences().parental;
}

export function updatePreferences(patch: Partial<UserPreferences>): UserPreferences {
  const cur = getPreferences();
  const next: UserPreferences = {
    display: { ...cur.display, ...patch.display },
    home: { ...cur.home, ...patch.home },
    playback: { ...cur.playback, ...patch.playback },
    subtitles: { ...cur.subtitles, ...patch.subtitles },
    controls: { ...cur.controls, ...patch.controls },
    player: { ...cur.player, ...patch.player },
    parental: { ...cur.parental, ...patch.parental },
  };
  writeJSON(KEYS.prefs, next);
  void pushUserdataToServer();
  return next;
}

export function listPlaylists(): Playlist[] {
  return readJSON<Playlist[]>(KEYS.playlists, []);
}

export function savePlaylists(list: Playlist[]): void {
  writeJSON(KEYS.playlists, list);
  void pushUserdataToServer();
}

export function listQueue(): QueueItem[] {
  return readJSON<QueueItem[]>(KEYS.queue, []);
}

export function saveQueue(list: QueueItem[]): void {
  writeJSON(KEYS.queue, list);
  void pushUserdataToServer();
}

export function enqueue(item: QueueItem): void {
  const cur = listQueue().filter((q) => q.id !== item.id);
  saveQueue([...cur, item]);
}

export function dequeue(id: string): void {
  saveQueue(listQueue().filter((q) => q.id !== id));
}

export function clearQueue(): void {
  saveQueue([]);
}

type ServerBlob = {
  progress?: Record<string, ProgressEntry>;
  favorites?: Record<string, FavoriteEntry>;
  prefs?: UserPreferences;
  playlists?: Playlist[];
  queue?: QueueItem[];
};

function mergeProgressMaps(
  local: Record<string, ProgressEntry>,
  server: Record<string, ProgressEntry>,
): Record<string, ProgressEntry> {
  const out: Record<string, ProgressEntry> = { ...local };
  for (const [id, entry] of Object.entries(server)) {
    const cur = out[id];
    if (!cur || (entry.updatedAt || '') >= (cur.updatedAt || '')) {
      out[id] = entry;
    }
  }
  return out;
}

/** Pull server userdata into localStorage cache. Server wins on progress conflicts. */
export async function pullUserdataFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/userdata', { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      setMeta({ serverAuthoritative: false });
      return false;
    }
    const blob = (await res.json()) as ServerBlob;
    if (blob.progress && typeof blob.progress === 'object') {
      const local = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
      writeJSON(KEYS.progress, mergeProgressMaps(local, blob.progress));
    }
    if (blob.favorites && typeof blob.favorites === 'object') {
      writeJSON(KEYS.favorites, blob.favorites);
    }
    if (blob.prefs && typeof blob.prefs === 'object') {
      writeJSON(KEYS.prefs, blob.prefs);
      applyTheme((blob.prefs as UserPreferences).display?.theme || 'dark');
    }
    if (Array.isArray(blob.playlists)) {
      writeJSON(KEYS.playlists, blob.playlists);
    }
    if (Array.isArray(blob.queue)) {
      writeJSON(KEYS.queue, blob.queue);
    }
    setMeta({ serverAuthoritative: true, lastPullAt: new Date().toISOString() });
    return true;
  } catch {
    setMeta({ serverAuthoritative: false });
    return false;
  }
}

export async function pushUserdataToServer(): Promise<void> {
  try {
    const progress = readJSON<Record<string, ProgressEntry>>(KEYS.progress, {});
    const favorites = readJSON<Record<string, FavoriteEntry>>(KEYS.favorites, {});
    const prefs = getPreferences();
    const playlists = listPlaylists();
    const queue = listQueue();
    const res = await fetch('/api/userdata', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ progress, favorites, prefs, playlists, queue }),
    });
    if (!res.ok) return;
    const merged = (await res.json()) as ServerBlob;
    // Apply server merge result so local cache matches SoT.
    if (merged.progress) writeJSON(KEYS.progress, merged.progress);
    if (merged.favorites) writeJSON(KEYS.favorites, merged.favorites);
    if (merged.prefs) writeJSON(KEYS.prefs, merged.prefs);
    if (Array.isArray(merged.playlists)) writeJSON(KEYS.playlists, merged.playlists);
    if (Array.isArray(merged.queue)) writeJSON(KEYS.queue, merged.queue);
    setMeta({ serverAuthoritative: true });
  } catch {
    /* offline — localStorage remains the working cache until reconnect */
  }
}

export function applyTheme(theme: UserPreferences['display']['theme']): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.dataset.theme = dark ? 'dark' : 'light';
}
