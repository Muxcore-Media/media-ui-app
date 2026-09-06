/**
 * Parental-controls enforcement for media-ui-app.
 *
 * Reads parental prefs written by admin-ui via the BFF userdata blob
 * (ParentalPrefs fields on UserPreferences.parental).  All enforcement
 * is fail-open: when prefs are unavailable the content is shown; when
 * prefs explicitly restrict a title it is hidden/blocked.
 */

import type { Movie, TVShow } from '../types';
import { getParentalPrefs, showIdFromHref, type ParentalPrefs } from './userdata';

// ---------------------------------------------------------------------------
// Rating hierarchy
// ---------------------------------------------------------------------------

/**
 * Numeric severity level for a content rating string.
 * Lower = less restrictive.  Unknown/unrated titles return -1 (treated as
 * unrestricted so legitimate unrated content isn't silently blocked).
 */
const RATING_LEVELS: Record<string, number> = {
  // Kids / all-ages
  'G': 0,
  'TV-Y': 0,
  'TV-Y7': 0,
  'TV-Y7-FV': 0,
  'NR': 0,        // unrated → treat permissively
  'UR': 0,
  'ALL': 0,
  'E': 0,         // ESRB Everyone
  // General audiences with mild content
  'PG': 1,
  'TV-G': 1,
  'TV-PG': 1,
  'E10+': 1,      // ESRB Everyone 10+
  // Teen
  'PG-13': 2,
  'TV-14': 2,
  'T': 2,         // ESRB Teen
  // Mature
  'R': 3,
  'TV-MA': 3,
  'M': 3,         // ESRB Mature
  'MA': 3,
  // Adult
  'NC-17': 4,
  'AO': 4,        // ESRB Adults Only
  'X': 4,
};

/**
 * Normalise a raw rating string to its canonical upper-case form for
 * `RATING_LEVELS` lookup.
 */
export function normalizeRating(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().toUpperCase();
}

/** Numeric level for a rating string; -1 when unknown (treated as unrestricted). */
export function ratingLevel(rating: string | undefined | null): number {
  const key = normalizeRating(rating);
  if (!key) return -1;
  return RATING_LEVELS[key] ?? -1;
}

/**
 * Returns true when `titleRating` exceeds `maxRating`.
 * Unknown title ratings are never blocked (fail-open per spec).
 * Empty `maxRating` means no ceiling is configured → not blocked.
 */
export function ratingExceedsMax(
  titleRating: string | undefined | null,
  maxRating: string,
): boolean {
  if (!maxRating) return false;
  const titleLevel = ratingLevel(titleRating);
  if (titleLevel === -1) return false; // unknown → don't block
  const maxLevel = ratingLevel(maxRating);
  if (maxLevel === -1) return false;   // unknown max → don't block
  return titleLevel > maxLevel;
}

// ---------------------------------------------------------------------------
// Typed item helpers (Movie | TVShow)
// ---------------------------------------------------------------------------

type RatableItem = Pick<Movie | TVShow, 'content_rating'>;

/** Returns true when the item should be hidden given current parental prefs. */
export function isItemRestricted(
  item: RatableItem,
  prefs: Pick<ParentalPrefs, 'kidsMode' | 'maxRating'>,
): boolean {
  const { kidsMode, maxRating } = prefs;
  const ceiling = kidsMode && !maxRating ? 'PG' : maxRating;
  if (!ceiling) return false;
  return ratingExceedsMax(item.content_rating, ceiling);
}

/** Filter an array of items, removing any restricted by current parental prefs. */
export function filterByParentalControls<T extends RatableItem>(
  items: T[],
  prefs: Pick<ParentalPrefs, 'kidsMode' | 'maxRating'>,
): T[] {
  const { kidsMode, maxRating } = prefs;
  if (!kidsMode && !maxRating) return items;
  return items.filter((item) => !isItemRestricted(item, prefs));
}

/**
 * Convenience wrapper: reads current prefs from localStorage and filters.
 * Soft-fails open when prefs cannot be read.
 */
export function applyParentalFilter<T extends RatableItem>(items: T[]): T[] {
  try {
    const prefs = getParentalPrefs();
    return filterByParentalControls(items, prefs);
  } catch {
    return items;
  }
}

// ---------------------------------------------------------------------------
// Userdata rail join (progress / favorites / next-up → library ratings)
// ---------------------------------------------------------------------------

/** Progress, favorite, or next-up row that can be joined to a library rating. */
export type UserdataRatingKey = {
  id: string;
  kind?: string;
  href?: string;
  showId?: string;
  content_rating?: string;
};

export type LibraryRatingIndex = Map<string, string | undefined>;

function movieRatingKey(id: string): string {
  return `movie:${id}`;
}

function showRatingKey(id: string): string {
  return `show:${id}`;
}

/**
 * Library lookup key for a userdata row.
 * Movies key by item id; episodes/shows key by parent show id.
 */
export function ratingLookupKey(entry: UserdataRatingKey): string | null {
  const kind = entry.kind;
  if (kind === 'episode' || kind === 'tv') {
    const showId = entry.showId || showIdFromHref(entry.href);
    return showId ? showRatingKey(showId) : null;
  }
  if (kind === 'movie' || !kind) {
    return entry.id ? movieRatingKey(entry.id) : null;
  }
  return null;
}

/** Index movie/show `content_rating` values for userdata-rail joins. */
export function indexLibraryRatings(
  movies: Array<{ id: string; content_rating?: string }>,
  shows: Array<{ id: string; content_rating?: string }>,
): LibraryRatingIndex {
  const map: LibraryRatingIndex = new Map();
  for (const movie of movies) map.set(movieRatingKey(movie.id), movie.content_rating);
  for (const show of shows) map.set(showRatingKey(show.id), show.content_rating);
  return map;
}

/**
 * Prefer a rating already stashed on the userdata row; otherwise join
 * through the library index. Missing/unknown stays undefined (fail-open).
 */
export function resolveUserdataContentRating(
  entry: UserdataRatingKey,
  index: LibraryRatingIndex,
): string | undefined {
  if (entry.content_rating) return entry.content_rating;
  const key = ratingLookupKey(entry);
  if (!key) return undefined;
  return index.get(key);
}

/** Copy joined library ratings onto userdata rows (does not drop any rows). */
export function annotateUserdataWithRatings<T extends UserdataRatingKey>(
  entries: T[],
  index: LibraryRatingIndex,
): Array<T & { content_rating?: string }> {
  return entries.map((entry) => {
    const content_rating = resolveUserdataContentRating(entry, index);
    return content_rating ? { ...entry, content_rating } : { ...entry };
  });
}

/**
 * Filter userdata rails by parental prefs after joining library ratings.
 * Unknown/missing ratings remain (soft-fail open). Soft-fails open if prefs
 * cannot be read.
 */
export function filterUserdataByParental<T extends UserdataRatingKey>(
  entries: T[],
  index: LibraryRatingIndex,
  prefs?: Pick<ParentalPrefs, 'kidsMode' | 'maxRating'>,
): Array<T & { content_rating?: string }> {
  const annotated = annotateUserdataWithRatings(entries, index);
  try {
    const parental = prefs ?? getParentalPrefs();
    return filterByParentalControls(annotated, parental);
  } catch {
    return annotated;
  }
}

/** Convenience: build an index from library lists and filter userdata rows. */
export function applyUserdataParentalFilter<T extends UserdataRatingKey>(
  entries: T[],
  movies: Array<{ id: string; content_rating?: string }>,
  shows: Array<{ id: string; content_rating?: string }>,
): Array<T & { content_rating?: string }> {
  try {
    return filterUserdataByParental(entries, indexLibraryRatings(movies, shows));
  } catch {
    return entries;
  }
}

/** Movie/show ids that still need a library fetch so the join can see a rating. */
export function missingLibraryFetches(
  entries: UserdataRatingKey[],
  index: LibraryRatingIndex,
): { movies: string[]; shows: string[] } {
  const movies = new Set<string>();
  const shows = new Set<string>();
  for (const entry of entries) {
    if (entry.content_rating) continue;
    const key = ratingLookupKey(entry);
    if (!key || index.has(key)) continue;
    if (key.startsWith('movie:')) movies.add(key.slice('movie:'.length));
    else if (key.startsWith('show:')) shows.add(key.slice('show:'.length));
  }
  return { movies: [...movies], shows: [...shows] };
}

type LibraryRatingRow = { id: string; content_rating?: string };

/**
 * When parental restrictions are on, fetch library rows that userdata rails
 * still need so `applyUserdataParentalFilter` can see a `content_rating`.
 * No-ops when kids mode / max rating are off (soft-fail open).
 */
export async function expandLibraryRatingsForUserdata(
  entries: UserdataRatingKey[],
  movies: LibraryRatingRow[],
  shows: LibraryRatingRow[],
  fetchers: {
    getMovie: (id: string) => Promise<LibraryRatingRow | null>;
    getTVShow: (id: string) => Promise<LibraryRatingRow | null>;
  },
): Promise<{ movies: LibraryRatingRow[]; shows: LibraryRatingRow[] }> {
  if (!getParentalState().anyRestriction) {
    return { movies, shows };
  }
  const missing = missingLibraryFetches(entries, indexLibraryRatings(movies, shows));
  if (missing.movies.length === 0 && missing.shows.length === 0) {
    return { movies, shows };
  }
  const [extraMovies, extraShows] = await Promise.all([
    Promise.all(missing.movies.map((id) => fetchers.getMovie(id).catch(() => null))),
    Promise.all(missing.shows.map((id) => fetchers.getTVShow(id).catch(() => null))),
  ]);
  return {
    movies: [...movies, ...extraMovies.filter((row): row is LibraryRatingRow => row != null)],
    shows: [...shows, ...extraShows.filter((row): row is LibraryRatingRow => row != null)],
  };
}

// ---------------------------------------------------------------------------
// PIN verification (Web Crypto — SHA-256)
// ---------------------------------------------------------------------------

/**
 * Hash a PIN string using SHA-256.  Returns the hex digest that can be
 * compared against `ParentalPrefs.pinHash` stored by admin-ui.
 */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Returns true when `pin` matches the stored `pinHash`.
 * Also returns true when `pinHash` is empty (no PIN configured).
 */
export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  if (!pinHash) return true;
  const digest = await hashPin(pin);
  return digest === pinHash.toLowerCase();
}

// ---------------------------------------------------------------------------
// Convenient read of current parental state (safe to call at render time)
// ---------------------------------------------------------------------------

export interface ParentalState {
  kidsMode: boolean;
  maxRating: string;
  pinEnabled: boolean;
  pinHash: string;
  /** True when any restriction is active (kidsMode or maxRating set). */
  anyRestriction: boolean;
}

/** Read current parental state from localStorage prefs. Soft-fails open. */
export function getParentalState(): ParentalState {
  try {
    const p = getParentalPrefs();
    return {
      kidsMode: p.kidsMode,
      maxRating: p.maxRating,
      pinEnabled: p.pinEnabled,
      pinHash: p.pinHash,
      anyRestriction: p.kidsMode || Boolean(p.maxRating),
    };
  } catch {
    return { kidsMode: false, maxRating: '', pinEnabled: false, pinHash: '', anyRestriction: false };
  }
}
