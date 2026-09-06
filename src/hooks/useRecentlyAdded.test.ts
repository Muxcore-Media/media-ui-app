import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Movie, TVShow } from '../types';
import { useRecentlyAdded } from './useRecentlyAdded';

// Isolate parental state from global prefs so tests are self-contained.
vi.mock('../lib/parental', async () => {
  const actual = await vi.importActual<typeof import('../lib/parental')>('../lib/parental');
  return {
    ...actual,
    applyParentalFilter: <T,>(items: T[]) => items,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'movie-1',
    title: 'Test Movie',
    year: 2026,
    overview: '',
    runtime: 90,
    vote_average: 7,
    genres: [],
    poster_url: '',
    has_file: true,
    stream_url: '/stream/movies/movie-1',
    created_at: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

function makeShow(overrides: Partial<TVShow> = {}): TVShow {
  return {
    id: 'show-1',
    title: 'Test Show',
    year: 2026,
    overview: '',
    vote_average: 7,
    genres: [],
    poster_url: '',
    has_file: true,
    stream_url: '',
    created_at: '2026-08-21T00:00:00.000Z',
    seasons: [],
    ...overrides,
  };
}

const EMPTY_EXCLUDE = new Set<string>();

// ---------------------------------------------------------------------------
// Core derivation
// ---------------------------------------------------------------------------

describe('useRecentlyAdded — basic derivation', () => {
  it('returns movies and shows sorted newest-first', () => {
    const movies = [
      makeMovie({ id: 'older-movie', created_at: '2026-08-10T00:00:00.000Z' }),
      makeMovie({ id: 'newer-movie', created_at: '2026-08-25T00:00:00.000Z' }),
    ];
    const shows = [makeShow({ id: 'mid-show', created_at: '2026-08-18T00:00:00.000Z' })];

    const { result } = renderHook(() => useRecentlyAdded(movies, shows, EMPTY_EXCLUDE));

    expect(result.current.map((r) => r.item.id)).toEqual([
      'newer-movie',
      'mid-show',
      'older-movie',
    ]);
  });

  it('annotates each row with the correct kind', () => {
    const { result } = renderHook(() =>
      useRecentlyAdded([makeMovie()], [makeShow()], EMPTY_EXCLUDE),
    );

    const kinds = result.current.map((r) => r.kind);
    expect(kinds).toContain('movie');
    expect(kinds).toContain('tv');
  });

  it('attaches the createdAt timestamp string to each row', () => {
    const movies = [makeMovie({ created_at: '2026-09-01T12:00:00.000Z' })];
    const { result } = renderHook(() => useRecentlyAdded(movies, [], EMPTY_EXCLUDE));

    expect(result.current[0].createdAt).toBe('2026-09-01T12:00:00.000Z');
  });

  it('caps the result at 16 items', () => {
    const movies = Array.from({ length: 20 }, (_, i) =>
      makeMovie({ id: `m-${i}`, created_at: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }),
    );

    const { result } = renderHook(() => useRecentlyAdded(movies, [], EMPTY_EXCLUDE));
    expect(result.current).toHaveLength(16);
  });

  it('returns empty array when both lists are empty', () => {
    const { result } = renderHook(() => useRecentlyAdded([], [], EMPTY_EXCLUDE));
    expect(result.current).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Playable-only filter (has_file)
// ---------------------------------------------------------------------------

describe('useRecentlyAdded — playable filter', () => {
  it('excludes movies that lack a file', () => {
    const movies = [
      makeMovie({ id: 'no-file', has_file: false }),
      makeMovie({ id: 'has-file', has_file: true }),
    ];

    const { result } = renderHook(() => useRecentlyAdded(movies, [], EMPTY_EXCLUDE));

    const ids = result.current.map((r) => r.item.id);
    expect(ids).not.toContain('no-file');
    expect(ids).toContain('has-file');
  });

  it('excludes shows that lack a file', () => {
    const shows = [
      makeShow({ id: 'no-file-show', has_file: false }),
      makeShow({ id: 'has-file-show', has_file: true }),
    ];

    const { result } = renderHook(() => useRecentlyAdded([], shows, EMPTY_EXCLUDE));

    const ids = result.current.map((r) => r.item.id);
    expect(ids).not.toContain('no-file-show');
    expect(ids).toContain('has-file-show');
  });

  it('excludes items with a missing or empty created_at', () => {
    const movies = [
      makeMovie({ id: 'no-ts', created_at: '' }),
      makeMovie({ id: 'with-ts', created_at: '2026-08-20T00:00:00.000Z' }),
    ];

    const { result } = renderHook(() => useRecentlyAdded(movies, [], EMPTY_EXCLUDE));

    const ids = result.current.map((r) => r.item.id);
    expect(ids).not.toContain('no-ts');
    expect(ids).toContain('with-ts');
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('useRecentlyAdded — deduplication via excludeIds', () => {
  it('drops a movie whose id appears in excludeIds (Continue Watching overlap)', () => {
    const movie = makeMovie({ id: 'in-progress-movie' });
    const exclude = new Set(['in-progress-movie']);

    const { result } = renderHook(() => useRecentlyAdded([movie], [], exclude));
    expect(result.current).toHaveLength(0);
  });

  it('drops a show whose id appears in excludeIds (Next Up overlap)', () => {
    const show = makeShow({ id: 'next-up-show' });
    const exclude = new Set(['next-up-show']);

    const { result } = renderHook(() => useRecentlyAdded([], [show], exclude));
    expect(result.current).toHaveLength(0);
  });

  it('drops a title in excludeIds while keeping non-excluded siblings', () => {
    const movies = [
      makeMovie({ id: 'excluded', created_at: '2026-08-25T00:00:00.000Z' }),
      makeMovie({ id: 'kept', created_at: '2026-08-20T00:00:00.000Z' }),
    ];
    const exclude = new Set(['excluded']);

    const { result } = renderHook(() => useRecentlyAdded(movies, [], exclude));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].item.id).toBe('kept');
  });

  it('returns all items when excludeIds is empty', () => {
    const movies = [makeMovie({ id: 'm1' }), makeMovie({ id: 'm2' })];

    const { result } = renderHook(() => useRecentlyAdded(movies, [], new Set()));
    expect(result.current).toHaveLength(2);
  });
});
