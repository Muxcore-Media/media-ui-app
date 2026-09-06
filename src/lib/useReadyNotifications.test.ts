import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import {
  isRequestPlayable,
  playableKey,
  resolveLinkedLibraryItems,
  useReadyNotifications,
  watchableRequests,
} from './useReadyNotifications';
import type { MediaRequest, Movie, TVShow } from '../types';
import * as apiClient from '../api/client';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useToast — isolates the hook from the React context tree
// ---------------------------------------------------------------------------

const toastSpy = vi.fn();
vi.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: toastSpy, removeToast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(overrides: Partial<MediaRequest> = {}): MediaRequest {
  return {
    id: 'req-1',
    itemType: 'movie',
    itemId: 'm1',
    tmdbId: 101,
    title: 'Test Film',
    year: 2024,
    poster: '',
    status: 'requested',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'm1',
    title: 'Test Film',
    year: 2024,
    overview: '',
    runtime: 100,
    vote_average: 7,
    genres: [],
    poster_url: '',
    has_file: false,
    stream_url: '',
    created_at: '2024-01-01',
    ...overrides,
  };
}

function makeShow(overrides: Partial<TVShow> = {}): TVShow {
  return {
    id: 's1',
    title: 'Test Show',
    year: 2024,
    overview: '',
    vote_average: 8,
    genres: [],
    poster_url: '',
    has_file: false,
    stream_url: '',
    created_at: '2024-01-01',
    ...overrides,
  };
}

/**
 * Mirrors tip media-movies / media-tvshows List* handling:
 * pageSize < 1 or pageSize > 100 is clamped to 20, default title ASC.
 */
function tipClampedList<T extends { title: string }>(library: T[], pageSize: number) {
  const size = pageSize < 1 || pageSize > 100 ? 20 : pageSize;
  const sorted = [...library].sort((a, b) => a.title.localeCompare(b.title));
  return { items: sorted.slice(0, size), total: library.length, page: 1, page_size: size };
}

function fillerMovies(count: number): Movie[] {
  return Array.from({ length: count }, (_, i) =>
    makeMovie({
      id: `filler-m-${String(i + 1).padStart(3, '0')}`,
      title: `Alpha Filler ${String(i + 1).padStart(3, '0')}`,
      has_file: true,
    }),
  );
}

function fillerShows(count: number): TVShow[] {
  return Array.from({ length: count }, (_, i) =>
    makeShow({
      id: `filler-s-${String(i + 1).padStart(3, '0')}`,
      title: `Alpha Show ${String(i + 1).padStart(3, '0')}`,
      has_file: true,
    }),
  );
}

/** Oversized library: requested title sorts after the first clamped page. */
const OVERSIZED_MOVIES = [...fillerMovies(200), makeMovie({ id: 'zebra-1', title: 'Zebra', has_file: true })];
const OVERSIZED_SHOWS = [...fillerShows(200), makeShow({ id: 'zebra-s1', title: 'Zebra Show', has_file: true })];

/**
 * Flush pending microtasks without advancing fake timers.
 * Needed because the first poll() is launched directly (not via setTimeout).
 */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Pure helper unit tests
// ---------------------------------------------------------------------------

describe('playableKey', () => {
  it('uses itemType:itemId when itemId is set', () => {
    expect(playableKey(makeRequest({ itemType: 'movie', itemId: 'm1' }))).toBe('movie:m1');
    expect(playableKey(makeRequest({ itemType: 'tv', itemId: 's42' }))).toBe('tv:s42');
  });

  it('falls back to tmdb key when itemId is empty', () => {
    expect(playableKey(makeRequest({ itemId: '', tmdbId: 99 }))).toBe('movie:tmdb:99');
  });

  it('falls back to lowercase title when neither itemId nor tmdbId', () => {
    expect(playableKey(makeRequest({ itemId: '', tmdbId: 0, title: 'Dune Part Two' }))).toBe(
      'movie:dune part two',
    );
  });
});

describe('isRequestPlayable', () => {
  const movieMap = new Map<string, Movie | TVShow>([
    ['movie:m1', makeMovie({ has_file: true })],
    ['movie:m2', makeMovie({ id: 'm2', has_file: false })],
  ]);

  it('returns true when linked movie has has_file', () => {
    expect(isRequestPlayable(makeRequest({ itemId: 'm1' }), movieMap)).toBe(true);
  });

  it('returns false when linked movie has has_file=false', () => {
    expect(isRequestPlayable(makeRequest({ itemId: 'm2' }), movieMap)).toBe(false);
  });

  it('returns false when item not yet in map (not playable yet)', () => {
    expect(isRequestPlayable(makeRequest({ itemId: 'not-in-map' }), movieMap)).toBe(false);
  });

  it('falls back to status=available for items not in movie/tv feeds', () => {
    const emptyMap = new Map<string, Movie | TVShow>();
    expect(
      isRequestPlayable(makeRequest({ itemId: '', status: 'available' }), emptyMap),
    ).toBe(true);
    expect(
      isRequestPlayable(makeRequest({ itemId: '', status: 'added' }), emptyMap),
    ).toBe(false);
  });

  it('tip status vocabulary: none of pending/watchlisted/requested/added/workflow count as playable when itemId maps to has_file=false', () => {
    const mapFalse = new Map<string, Movie | TVShow>([
      ['movie:m1', makeMovie({ has_file: false })],
    ]);
    for (const status of ['pending', 'watchlisted', 'requested', 'added', 'workflow']) {
      expect(
        isRequestPlayable(makeRequest({ itemId: 'm1', status }), mapFalse),
      ).toBe(false);
    }
  });

  it('tip status vocabulary: all statuses count as playable when has_file=true', () => {
    const mapTrue = new Map<string, Movie | TVShow>([
      ['movie:m1', makeMovie({ has_file: true })],
    ]);
    for (const status of ['pending', 'watchlisted', 'requested', 'added', 'workflow']) {
      expect(
        isRequestPlayable(makeRequest({ itemId: 'm1', status }), mapTrue),
      ).toBe(true);
    }
  });
});

describe('resolveLinkedLibraryItems', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('looks up movies and TV by itemId and ignores list-page windows', async () => {
    const getMovie = vi.spyOn(apiClient.api, 'getMovie').mockResolvedValue(
      makeMovie({ id: 'zebra-1', title: 'Zebra', has_file: true }),
    );
    const getTVShow = vi.spyOn(apiClient.api, 'getTVShow').mockResolvedValue(
      makeShow({ id: 'zebra-s1', title: 'Zebra Show', has_file: true }),
    );
    const listMovies = vi.spyOn(apiClient.api, 'listMovies');
    const listTVShows = vi.spyOn(apiClient.api, 'listTVShows');

    const map = await resolveLinkedLibraryItems([
      makeRequest({ itemId: 'zebra-1', title: 'Zebra' }),
      makeRequest({ itemType: 'tv', itemId: 'zebra-s1', title: 'Zebra Show' }),
    ]);

    expect(map.get('movie:zebra-1')?.has_file).toBe(true);
    expect(map.get('tv:zebra-s1')?.has_file).toBe(true);
    expect(getMovie).toHaveBeenCalledWith('zebra-1');
    expect(getTVShow).toHaveBeenCalledWith('zebra-s1');
    expect(listMovies).not.toHaveBeenCalled();
    expect(listTVShows).not.toHaveBeenCalled();
  });

  it('skips denied requests and items without an itemId', async () => {
    const getMovie = vi.spyOn(apiClient.api, 'getMovie').mockResolvedValue(makeMovie());
    const getTVShow = vi.spyOn(apiClient.api, 'getTVShow').mockResolvedValue(makeShow());

    const map = await resolveLinkedLibraryItems([
      makeRequest({ id: 'r-denied', status: 'denied', itemId: 'm1' }),
      makeRequest({ id: 'r-music', itemType: 'music', itemId: '', status: 'requested' }),
    ]);

    expect(map.size).toBe(0);
    expect(getMovie).not.toHaveBeenCalled();
    expect(getTVShow).not.toHaveBeenCalled();
  });

  it('leaves unresolved items out of the map when getMovie 404s', async () => {
    vi.spyOn(apiClient.api, 'getMovie').mockRejectedValue(new Error('not found'));

    const map = await resolveLinkedLibraryItems([makeRequest({ itemId: 'missing' })]);

    expect(map.size).toBe(0);
  });
});

describe('watchableRequests', () => {
  it('excludes denied, failed, and import_failed requests', () => {
    const requests = [
      makeRequest({ id: 'r1', status: 'pending' }),
      makeRequest({ id: 'r2', status: 'denied' }),
      makeRequest({ id: 'r3', status: 'failed' }),
      makeRequest({ id: 'r4', status: 'import_failed' }),
      makeRequest({ id: 'r5', status: 'downloading' }),
      makeRequest({ id: 'r6', status: 'added' }),
      makeRequest({ id: 'r7', status: 'watchlisted' }),
      makeRequest({ id: 'r8', status: 'workflow' }),
      makeRequest({ id: 'r9', status: 'requested' }),
    ];
    const result = watchableRequests(requests);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r5', 'r6', 'r7', 'r8', 'r9']);
  });
});

// ---------------------------------------------------------------------------
// Hook integration tests
// ---------------------------------------------------------------------------

describe('useReadyNotifications hook', () => {
  let listRequestsMock: Mock;
  let listMoviesMock: Mock;
  let listTVShowsMock: Mock;
  let getMovieMock: Mock;
  let getTVShowMock: Mock;

  beforeEach(() => {
    toastSpy.mockClear();
    localStorage.removeItem('media-ui:notified-playable');
    listRequestsMock = vi.fn();
    // Live tip clamp: pageSize > 100 returns the first 20 title-ASC rows only.
    listMoviesMock = vi.fn(async (_page = 1, pageSize = 48) => tipClampedList(OVERSIZED_MOVIES, pageSize));
    listTVShowsMock = vi.fn(async (_page = 1, pageSize = 48) => tipClampedList(OVERSIZED_SHOWS, pageSize));
    getMovieMock = vi.fn(async (id: string) => {
      throw new Error(`movie not found: ${id}`);
    });
    getTVShowMock = vi.fn(async (id: string) => {
      throw new Error(`show not found: ${id}`);
    });
    vi.spyOn(apiClient.api, 'listRequests').mockImplementation(listRequestsMock);
    vi.spyOn(apiClient.api, 'listMovies').mockImplementation(listMoviesMock);
    vi.spyOn(apiClient.api, 'listTVShows').mockImplementation(listTVShowsMock);
    vi.spyOn(apiClient.api, 'getMovie').mockImplementation(getMovieMock);
    vi.spyOn(apiClient.api, 'getTVShow').mockImplementation(getTVShowMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function expectNoOversizedListPage() {
    for (const call of listMoviesMock.mock.calls) {
      const pageSize = Number(call[1] ?? 48);
      expect(pageSize, 'listMovies pageSize must stay within the tip legal window').toBeLessThanOrEqual(100);
    }
    for (const call of listTVShowsMock.mock.calls) {
      const pageSize = Number(call[1] ?? 48);
      expect(pageSize, 'listTVShows pageSize must stay within the tip legal window').toBeLessThanOrEqual(100);
    }
  }

  it('does not toast on the first poll (baseline establishment)', async () => {
    listRequestsMock.mockResolvedValue([makeRequest({ status: 'added' })]);
    getMovieMock.mockResolvedValue(makeMovie({ has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);

    expect(toastSpy).not.toHaveBeenCalled();
    expectNoOversizedListPage();
    unmount();
  });

  it('toasts when an item transitions to has_file=true after baseline', async () => {
    listRequestsMock
      .mockResolvedValueOnce([makeRequest({ status: 'requested' })])
      .mockResolvedValueOnce([makeRequest({ status: 'added' })]);
    getMovieMock
      .mockResolvedValueOnce(makeMovie({ has_file: false }))
      .mockResolvedValueOnce(makeMovie({ has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    // First poll → baseline established
    await act(flushMicrotasks);
    expect(toastSpy).not.toHaveBeenCalled();

    // Second poll → item becomes playable
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).toHaveBeenCalledOnce();
    const call = toastSpy.mock.calls[0][0] as { title: string; href: string };
    expect(call.title).toBe('Test Film is ready to watch');
    expect(call.href).toBe('/movies/m1');
    expect(getMovieMock).toHaveBeenCalledWith('m1');
    expectNoOversizedListPage();
    unmount();
  });

  it('toasts for TV shows when has_file transitions to true', async () => {
    const tvReq = makeRequest({ itemType: 'tv', itemId: 's1', title: 'Test Show', status: 'workflow' });
    const show = makeShow({ id: 's1', has_file: false });

    listRequestsMock
      .mockResolvedValueOnce([tvReq])
      .mockResolvedValueOnce([{ ...tvReq, status: 'added' }]);
    getTVShowMock
      .mockResolvedValueOnce(show)
      .mockResolvedValueOnce({ ...show, has_file: true });

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    expect(toastSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).toHaveBeenCalledOnce();
    const call = toastSpy.mock.calls[0][0] as { title: string; href: string };
    expect(call.title).toBe('Test Show is ready to watch');
    expect(call.href).toBe('/tv/s1');
    expect(getTVShowMock).toHaveBeenCalledWith('s1');
    expectNoOversizedListPage();
    unmount();
  });

  it('toasts a movie whose title sorts outside the first clamped list page', async () => {
    const zebraReq = makeRequest({
      itemId: 'zebra-1',
      title: 'Zebra',
      status: 'added',
    });
    listRequestsMock.mockResolvedValue([zebraReq]);
    getMovieMock
      .mockResolvedValueOnce(makeMovie({ id: 'zebra-1', title: 'Zebra', has_file: false }))
      .mockResolvedValueOnce(makeMovie({ id: 'zebra-1', title: 'Zebra', has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    expect(toastSpy).not.toHaveBeenCalled();
    // A single listMovies(1, 500) would clamp to the first 20 Alpha fillers — not Zebra.
    expect(tipClampedList(OVERSIZED_MOVIES, 500).items.some((m) => m.id === 'zebra-1')).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).toHaveBeenCalledOnce();
    expect(toastSpy.mock.calls[0][0]).toMatchObject({
      title: 'Zebra is ready to watch',
      href: '/movies/zebra-1',
    });
    expect(getMovieMock).toHaveBeenCalledWith('zebra-1');
    expectNoOversizedListPage();
    unmount();
  });

  it('toasts a TV show whose title sorts outside the first clamped list page', async () => {
    const zebraReq = makeRequest({
      itemType: 'tv',
      itemId: 'zebra-s1',
      title: 'Zebra Show',
      status: 'added',
    });
    listRequestsMock.mockResolvedValue([zebraReq]);
    getTVShowMock
      .mockResolvedValueOnce(makeShow({ id: 'zebra-s1', title: 'Zebra Show', has_file: false }))
      .mockResolvedValueOnce(makeShow({ id: 'zebra-s1', title: 'Zebra Show', has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    expect(toastSpy).not.toHaveBeenCalled();
    expect(tipClampedList(OVERSIZED_SHOWS, 500).items.some((s) => s.id === 'zebra-s1')).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).toHaveBeenCalledOnce();
    expect(toastSpy.mock.calls[0][0]).toMatchObject({
      title: 'Zebra Show is ready to watch',
      href: '/tv/zebra-s1',
    });
    expect(getTVShowMock).toHaveBeenCalledWith('zebra-s1');
    expectNoOversizedListPage();
    unmount();
  });

  it('does not toast for the same item on a subsequent poll (localStorage seen-list)', async () => {
    listRequestsMock.mockResolvedValue([makeRequest({ status: 'requested' })]);
    getMovieMock
      .mockResolvedValueOnce(makeMovie({ has_file: false }))
      .mockResolvedValueOnce(makeMovie({ has_file: true }))
      .mockResolvedValueOnce(makeMovie({ has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);

    // Second poll: becomes playable → toast fires once
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });
    expect(toastSpy).toHaveBeenCalledOnce();

    // Third poll: still playable, already in seen-list → no second toast
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });
    expect(toastSpy).toHaveBeenCalledOnce();
    unmount();
  });

  it('does not toast for items already in localStorage seen-list on page reload', async () => {
    localStorage.setItem('media-ui:notified-playable', JSON.stringify(['movie:m1']));

    listRequestsMock.mockResolvedValue([makeRequest({ status: 'added' })]);
    getMovieMock
      .mockResolvedValueOnce(makeMovie({ has_file: false }))
      .mockResolvedValueOnce(makeMovie({ has_file: true }));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);

    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('does not toast for denied or failed requests', async () => {
    const requests = [
      makeRequest({ id: 'r1', status: 'denied' }),
      makeRequest({ id: 'r2', status: 'failed', itemId: 'm2' }),
    ];
    listRequestsMock.mockResolvedValue(requests);
    getMovieMock.mockImplementation(async (id: string) =>
      makeMovie({ id, has_file: true }),
    );

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).not.toHaveBeenCalled();
    expect(getMovieMock).not.toHaveBeenCalled();
    unmount();
  });

  it('handles polling errors silently (no crash, no toast)', async () => {
    listRequestsMock.mockRejectedValue(new Error('Network error'));

    const { unmount } = renderHook(() => useReadyNotifications());

    await expect(act(flushMicrotasks)).resolves.toBeUndefined();

    expect(toastSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('toasts for music/other items that reach status=available (fallback path)', async () => {
    const musicReq: MediaRequest = {
      id: 'req-m',
      itemType: 'music',
      itemId: '',
      tmdbId: 0,
      title: 'Radiohead - OK Computer',
      year: 1997,
      poster: '',
      status: 'requested',
      createdAt: '',
      updatedAt: '',
    };

    listRequestsMock
      .mockResolvedValueOnce([musicReq])
      .mockResolvedValueOnce([{ ...musicReq, status: 'available' }]);

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    expect(toastSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).toHaveBeenCalledOnce();
    const call = toastSpy.mock.calls[0][0] as { title: string };
    expect(call.title).toBe('Radiohead - OK Computer is ready to watch');
    expect(getMovieMock).not.toHaveBeenCalled();
    expect(getTVShowMock).not.toHaveBeenCalled();
    unmount();
  });
});
