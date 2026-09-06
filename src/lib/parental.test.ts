import { describe, expect, it, beforeEach } from 'vitest';
import {
  ratingLevel,
  ratingExceedsMax,
  filterByParentalControls,
  applyParentalFilter,
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
  filterUserdataByParental,
  indexLibraryRatings,
  missingLibraryFetches,
  ratingLookupKey,
  resolveUserdataContentRating,
  hashPin,
  verifyPin,
  getParentalState,
  normalizeRating,
} from './parental';
import { updatePreferences } from './userdata';
import { setCurrentUserId } from './session';

// ---------------------------------------------------------------------------
// Rating normalization
// ---------------------------------------------------------------------------

describe('normalizeRating', () => {
  it('upper-cases and trims', () => {
    expect(normalizeRating('  pg-13 ')).toBe('PG-13');
    expect(normalizeRating('tv-ma')).toBe('TV-MA');
    expect(normalizeRating('')).toBe('');
    expect(normalizeRating(null)).toBe('');
    expect(normalizeRating(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Rating levels
// ---------------------------------------------------------------------------

describe('ratingLevel', () => {
  it('assigns correct levels', () => {
    expect(ratingLevel('G')).toBe(0);
    expect(ratingLevel('TV-Y')).toBe(0);
    expect(ratingLevel('TV-Y7')).toBe(0);
    expect(ratingLevel('NR')).toBe(0);
    expect(ratingLevel('PG')).toBe(1);
    expect(ratingLevel('TV-PG')).toBe(1);
    expect(ratingLevel('TV-G')).toBe(1);
    expect(ratingLevel('PG-13')).toBe(2);
    expect(ratingLevel('TV-14')).toBe(2);
    expect(ratingLevel('R')).toBe(3);
    expect(ratingLevel('TV-MA')).toBe(3);
    expect(ratingLevel('NC-17')).toBe(4);
  });

  it('returns -1 for unknown ratings', () => {
    expect(ratingLevel('UNKNOWN')).toBe(-1);
    expect(ratingLevel('')).toBe(-1);
    expect(ratingLevel(undefined)).toBe(-1);
    expect(ratingLevel(null)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// ratingExceedsMax
// ---------------------------------------------------------------------------

describe('ratingExceedsMax', () => {
  it('returns false when no ceiling is configured', () => {
    expect(ratingExceedsMax('R', '')).toBe(false);
    expect(ratingExceedsMax('NC-17', '')).toBe(false);
  });

  it('returns true when title rating exceeds the ceiling', () => {
    expect(ratingExceedsMax('R', 'PG-13')).toBe(true);
    expect(ratingExceedsMax('NC-17', 'R')).toBe(true);
    expect(ratingExceedsMax('TV-MA', 'PG')).toBe(true);
  });

  it('returns false when title rating is within the ceiling', () => {
    expect(ratingExceedsMax('PG', 'PG-13')).toBe(false);
    expect(ratingExceedsMax('PG-13', 'PG-13')).toBe(false);
    expect(ratingExceedsMax('G', 'PG')).toBe(false);
    expect(ratingExceedsMax('TV-14', 'TV-MA')).toBe(false);
  });

  it('fails open for unknown title ratings (never blocks)', () => {
    expect(ratingExceedsMax('UNRATED-CUSTOM', 'G')).toBe(false);
    expect(ratingExceedsMax(undefined, 'PG')).toBe(false);
    expect(ratingExceedsMax(null, 'R')).toBe(false);
  });

  it('fails open for unknown max ratings', () => {
    expect(ratingExceedsMax('R', 'UNKNOWN-MAX')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterByParentalControls
// ---------------------------------------------------------------------------

type TestItem = { id: string; content_rating?: string };

function makeItem(id: string, content_rating?: string): TestItem {
  return { id, content_rating };
}

describe('filterByParentalControls', () => {
  it('returns all items when no restriction is set', () => {
    const items = [makeItem('1', 'R'), makeItem('2', 'NC-17'), makeItem('3')];
    expect(filterByParentalControls(items, { kidsMode: false, maxRating: '' })).toHaveLength(3);
  });

  it('filters items exceeding maxRating', () => {
    const items = [
      makeItem('g', 'G'),
      makeItem('pg', 'PG'),
      makeItem('pg13', 'PG-13'),
      makeItem('r', 'R'),
      makeItem('nc17', 'NC-17'),
    ];
    const result = filterByParentalControls(items, { kidsMode: false, maxRating: 'PG-13' });
    expect(result.map((i) => i.id)).toEqual(['g', 'pg', 'pg13']);
  });

  it('uses PG ceiling in kids mode when maxRating is empty', () => {
    const items = [
      makeItem('g', 'G'),
      makeItem('pg', 'PG'),
      makeItem('pg13', 'PG-13'),
      makeItem('r', 'R'),
    ];
    const result = filterByParentalControls(items, { kidsMode: true, maxRating: '' });
    expect(result.map((i) => i.id)).toEqual(['g', 'pg']);
  });

  it('respects explicit maxRating even in kids mode', () => {
    const items = [makeItem('g', 'G'), makeItem('pg13', 'PG-13'), makeItem('r', 'R')];
    const result = filterByParentalControls(items, { kidsMode: true, maxRating: 'PG-13' });
    expect(result.map((i) => i.id)).toEqual(['g', 'pg13']);
  });

  it('never blocks items with unknown/missing ratings (fail-open)', () => {
    const items = [makeItem('no-rating'), makeItem('unknown', 'WEIRD-RATING')];
    const result = filterByParentalControls(items, { kidsMode: true, maxRating: 'G' });
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// applyParentalFilter — soft-fail open when prefs unavailable
// ---------------------------------------------------------------------------

describe('applyParentalFilter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns all items when no parental prefs are stored (soft-fail open)', () => {
    const items = [makeItem('1', 'R'), makeItem('2', 'NC-17')];
    expect(applyParentalFilter(items)).toHaveLength(2);
  });

  it('filters when kidsMode is enabled', () => {
    updatePreferences({ parental: { kidsMode: true, maxRating: '', pinHash: '', pinEnabled: false } });
    const items = [makeItem('g', 'G'), makeItem('r', 'R')];
    const result = applyParentalFilter(items);
    expect(result.map((i) => i.id)).toEqual(['g']);
  });

  it('filters when maxRating is set without kidsMode', () => {
    updatePreferences({ parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false } });
    const items = [makeItem('pg13', 'PG-13'), makeItem('r', 'R')];
    const result = applyParentalFilter(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('pg13');
  });
});

// ---------------------------------------------------------------------------
// PIN hashing and verification
// ---------------------------------------------------------------------------

async function adminHashParentalPin(userId: string, pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${pin}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('hashPin', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentUserId('');
  });

  it('produces a 64-char hex SHA-256 digest', async () => {
    const hash = await hashPin('1234');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it('same PIN always produces the same hash', async () => {
    expect(await hashPin('5678')).toBe(await hashPin('5678'));
  });

  it('different PINs produce different hashes', async () => {
    expect(await hashPin('1111')).not.toBe(await hashPin('2222'));
  });

  it('salts with userID + ":" + pin (admin-ui hashParentalPIN)', async () => {
    const userId = 'user-household-1';
    const pin = '2468';
    expect(await hashPin(pin, userId)).toBe(await adminHashParentalPin(userId, pin));
  });

  it('same PIN with different user ids produces different hashes', async () => {
    expect(await hashPin('1234', 'alice')).not.toBe(await hashPin('1234', 'bob'));
  });

  it('uses the cached session user id when none is passed', async () => {
    setCurrentUserId('cached-user');
    expect(await hashPin('9999')).toBe(await adminHashParentalPin('cached-user', '9999'));
  });
});

describe('verifyPin', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentUserId('');
  });

  it('returns true when pinHash is empty (no PIN configured)', async () => {
    expect(await verifyPin('1234', '')).toBe(true);
  });

  it('returns true when PIN matches stored hash', async () => {
    const hash = await hashPin('9876');
    expect(await verifyPin('9876', hash)).toBe(true);
  });

  it('returns false when PIN does not match', async () => {
    const hash = await hashPin('1111');
    expect(await verifyPin('9999', hash)).toBe(false);
  });

  it('is case-insensitive for stored hash (accepts uppercase hash)', async () => {
    const hash = (await hashPin('4321')).toUpperCase();
    expect(await verifyPin('4321', hash)).toBe(true);
  });

  it('verifies an admin-style salted hash with the current user id', async () => {
    const userId = 'auth-local-user-9';
    const pin = '1357';
    const stored = await adminHashParentalPin(userId, pin);
    setCurrentUserId(userId);
    expect(await verifyPin(pin, stored)).toBe(true);
    expect(await verifyPin('0000', stored)).toBe(false);
    expect(await verifyPin(pin, stored, 'other-user')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getParentalState — reads from localStorage
// ---------------------------------------------------------------------------

describe('getParentalState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns safe defaults when no prefs are stored', () => {
    const s = getParentalState();
    expect(s.kidsMode).toBe(false);
    expect(s.maxRating).toBe('');
    expect(s.pinEnabled).toBe(false);
    expect(s.anyRestriction).toBe(false);
  });

  it('reflects stored parental prefs', () => {
    updatePreferences({
      parental: { kidsMode: true, maxRating: 'PG', pinHash: 'abc', pinEnabled: true },
    });
    const s = getParentalState();
    expect(s.kidsMode).toBe(true);
    expect(s.maxRating).toBe('PG');
    expect(s.pinEnabled).toBe(true);
    expect(s.anyRestriction).toBe(true);
  });

  it('reports anyRestriction as true when only maxRating is set', () => {
    updatePreferences({ parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false } });
    expect(getParentalState().anyRestriction).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Userdata rail join (progress / favorites / next-up)
// ---------------------------------------------------------------------------

describe('ratingLookupKey', () => {
  it('keys movies by item id', () => {
    expect(ratingLookupKey({ id: 'm1', kind: 'movie' })).toBe('movie:m1');
  });

  it('keys episodes and shows by parent show id', () => {
    expect(ratingLookupKey({ id: 'ep1', kind: 'episode', href: '/tv/show-9' })).toBe('show:show-9');
    expect(ratingLookupKey({ id: 'show-9', kind: 'tv', showId: 'show-9' })).toBe('show:show-9');
  });

  it('returns null for kinds that have no library movie/show rating', () => {
    expect(ratingLookupKey({ id: 'track-1', kind: 'music' })).toBeNull();
  });
});

describe('resolveUserdataContentRating', () => {
  const index = indexLibraryRatings(
    [{ id: 'm1', content_rating: 'R' }],
    [{ id: 'show-1', content_rating: 'TV-MA' }],
  );

  it('prefers a rating already stashed on the userdata row', () => {
    expect(
      resolveUserdataContentRating({ id: 'm1', kind: 'movie', content_rating: 'PG-13' }, index),
    ).toBe('PG-13');
  });

  it('joins movies and episodes to library ratings', () => {
    expect(resolveUserdataContentRating({ id: 'm1', kind: 'movie' }, index)).toBe('R');
    expect(
      resolveUserdataContentRating({ id: 'ep-2', kind: 'episode', href: '/tv/show-1' }, index),
    ).toBe('TV-MA');
  });

  it('returns undefined when the library has no matching rating (fail-open)', () => {
    expect(resolveUserdataContentRating({ id: 'missing', kind: 'movie' }, index)).toBeUndefined();
  });
});

describe('filterUserdataByParental', () => {
  const movies = [
    { id: 'pg-movie', content_rating: 'PG' },
    { id: 'r-movie', content_rating: 'R' },
  ];
  const shows = [{ id: 'ma-show', content_rating: 'TV-MA' }];
  const index = indexLibraryRatings(movies, shows);

  const rows = [
    { id: 'pg-movie', kind: 'movie', title: 'Nemo' },
    { id: 'r-movie', kind: 'movie', title: 'Fight Club' },
    { id: 'ep-1', kind: 'episode', title: 'S01E01', href: '/tv/ma-show' },
    { id: 'unknown', kind: 'movie', title: 'Unrated' },
  ];

  it('drops restricted titles and keeps allowed + unknown ratings', () => {
    const visible = filterUserdataByParental(rows, index, { kidsMode: true, maxRating: 'PG' });
    expect(visible.map((r) => r.id)).toEqual(['pg-movie', 'unknown']);
    expect(visible[0]?.content_rating).toBe('PG');
  });

  it('keeps every row when no restriction is configured', () => {
    const visible = filterUserdataByParental(rows, index, { kidsMode: false, maxRating: '' });
    expect(visible).toHaveLength(4);
  });
});

describe('applyUserdataParentalFilter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('joins favorites to library ratings using stored prefs', () => {
    updatePreferences({
      parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false },
    });
    const visible = applyUserdataParentalFilter(
      [
        { id: 'ok', kind: 'movie', title: 'Ok' },
        { id: 'nope', kind: 'movie', title: 'Nope' },
      ],
      [
        { id: 'ok', content_rating: 'PG' },
        { id: 'nope', content_rating: 'R' },
      ],
      [],
    );
    expect(visible.map((r) => r.id)).toEqual(['ok']);
  });
});

describe('expandLibraryRatingsForUserdata', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('skips per-id fetches when no parental restriction is on', async () => {
    const getMovie = async () => ({ id: 'need-movie', content_rating: 'R' });
    const getTVShow = async () => ({ id: 'need-show', content_rating: 'TV-MA' });
    const expanded = await expandLibraryRatingsForUserdata(
      [{ id: 'need-movie', kind: 'movie' }],
      [],
      [],
      { getMovie, getTVShow },
    );
    expect(expanded.movies).toEqual([]);
    expect(expanded.shows).toEqual([]);
  });

  it('fetches missing library rows when kids mode is on', async () => {
    updatePreferences({
      parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
    });
    const getMovie = async (id: string) =>
      id === 'need-movie' ? { id, content_rating: 'R' } : null;
    const getTVShow = async (id: string) =>
      id === 'need-show' ? { id, content_rating: 'TV-MA' } : null;
    const expanded = await expandLibraryRatingsForUserdata(
      [
        { id: 'need-movie', kind: 'movie' },
        { id: 'ep-1', kind: 'episode', href: '/tv/need-show' },
        { id: 'known', kind: 'movie' },
      ],
      [{ id: 'known', content_rating: 'PG' }],
      [],
      { getMovie, getTVShow },
    );
    expect(expanded.movies.map((m) => m.id)).toEqual(['known', 'need-movie']);
    expect(expanded.shows.map((s) => s.id)).toEqual(['need-show']);
  });
});

describe('missingLibraryFetches', () => {
  it('lists movie/show ids that are not yet in the index', () => {
    const index = indexLibraryRatings([{ id: 'known', content_rating: 'PG' }], []);
    const missing = missingLibraryFetches(
      [
        { id: 'known', kind: 'movie' },
        { id: 'need-movie', kind: 'movie' },
        { id: 'ep-1', kind: 'episode', href: '/tv/need-show' },
        { id: 'stashed', kind: 'movie', content_rating: 'R' },
      ],
      index,
    );
    expect(missing.movies).toEqual(['need-movie']);
    expect(missing.shows).toEqual(['need-show']);
  });
});
