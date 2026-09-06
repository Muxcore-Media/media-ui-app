import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { isRequestPlayable, playableKey, useReadyNotifications, watchableRequests } from './useReadyNotifications';
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

function makeListResponse<T>(items: T[]) {
  return { items, total: items.length, page: 1, page_size: items.length };
}

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

  beforeEach(() => {
    toastSpy.mockClear();
    localStorage.removeItem('media-ui:notified-playable');
    listRequestsMock = vi.fn();
    listMoviesMock = vi.fn();
    listTVShowsMock = vi.fn();
    vi.spyOn(apiClient.api, 'listRequests').mockImplementation(listRequestsMock);
    vi.spyOn(apiClient.api, 'listMovies').mockImplementation(listMoviesMock);
    vi.spyOn(apiClient.api, 'listTVShows').mockImplementation(listTVShowsMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not toast on the first poll (baseline establishment)', async () => {
    listRequestsMock.mockResolvedValue([makeRequest({ status: 'added' })]);
    listMoviesMock.mockResolvedValue(makeListResponse([makeMovie({ has_file: true })]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);

    expect(toastSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('toasts when an item transitions to has_file=true after baseline', async () => {
    listRequestsMock
      .mockResolvedValueOnce([makeRequest({ status: 'requested' })])
      .mockResolvedValueOnce([makeRequest({ status: 'added' })]);
    listMoviesMock
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: false })]))
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: true })]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

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
    unmount();
  });

  it('toasts for TV shows when has_file transitions to true', async () => {
    const tvReq = makeRequest({ itemType: 'tv', itemId: 's1', title: 'Test Show', status: 'workflow' });
    const show = makeShow({ id: 's1', has_file: false });

    listRequestsMock
      .mockResolvedValueOnce([tvReq])
      .mockResolvedValueOnce([{ ...tvReq, status: 'added' }]);
    listMoviesMock.mockResolvedValue(makeListResponse([]));
    listTVShowsMock
      .mockResolvedValueOnce(makeListResponse([show]))
      .mockResolvedValueOnce(makeListResponse([{ ...show, has_file: true }]));

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
    unmount();
  });

  it('does not toast for the same item on a subsequent poll (localStorage seen-list)', async () => {
    listRequestsMock.mockResolvedValue([makeRequest({ status: 'requested' })]);
    listMoviesMock
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: false })]))
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: true })]))
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: true })]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

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
    listMoviesMock
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: false })]))
      .mockResolvedValueOnce(makeListResponse([makeMovie({ has_file: true })]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

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
    const movies = [
      makeMovie({ id: 'm1', has_file: true }),
      makeMovie({ id: 'm2', has_file: true }),
    ];
    listRequestsMock.mockResolvedValue(requests);
    listMoviesMock.mockResolvedValue(makeListResponse(movies));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

    const { unmount } = renderHook(() => useReadyNotifications());

    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(toastSpy).not.toHaveBeenCalled();
    unmount();
  });

  it('handles polling errors silently (no crash, no toast)', async () => {
    listRequestsMock.mockRejectedValue(new Error('Network error'));
    listMoviesMock.mockResolvedValue(makeListResponse([]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

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
    listMoviesMock.mockResolvedValue(makeListResponse([]));
    listTVShowsMock.mockResolvedValue(makeListResponse([]));

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
    unmount();
  });
});
