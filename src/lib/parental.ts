/**
 * Parental-controls enforcement for media-ui-app.
 *
 * Reads parental prefs written by admin-ui via the BFF userdata blob
 * (ParentalPrefs fields on UserPreferences.parental).  All enforcement
 * is fail-open: when prefs are unavailable the content is shown; when
 * prefs explicitly restrict a title it is hidden/blocked.
 */

import type { Movie, TVShow } from '../types';
import { getParentalPrefs, type ParentalPrefs } from './userdata';

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
