import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { TVShow } from '../types';
import { useUpcomingEpisodes } from './useUpcomingEpisodes';

// ---------------------------------------------------------------------------
// API mock
// ---------------------------------------------------------------------------

const getTVShow = vi.fn();
const listCalendar = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getTVShow: (...args: unknown[]) => getTVShow(...args),
      listCalendar: (...args: unknown[]) => listCalendar(...args),
    },
  };
});

// Parental filter is pass-through in unit tests — tested via Home.test.tsx integration.
vi.mock('../lib/parental', async () => {
  const actual = await vi.importActual<typeof import('../lib/parental')>('../lib/parental');
  return { ...actual, applyParentalFilter: <T,>(items: T[]) => items };
});

beforeEach(() => {
  getTVShow.mockReset();
  listCalendar.mockReset();
  // Existing window/dedupe tests exercise the per-show fallback.
  listCalendar.mockRejectedValue(new Error('calendar unavailable'));
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build an air_date string N days offset from today (negative = past). */
function airDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function makeShow(overrides: Partial<TVShow> = {}): TVShow {
  return {
    id: 'show-1',
    title: 'Test Show',
    year: 2024,
    overview: '',
    vote_average: 8,
    genres: [],
    poster_url: '/poster.jpg',
    has_file: true,
    stream_url: '',
    created_at: '2026-01-01T00:00:00.000Z',
    seasons: [],
    ...overrides,
  };
}

function makeShowWithEpisode(overrides: {
  showId?: string;
  episodeId?: string;
  airOffset: number;
  hasFile?: boolean;
}): TVShow {
  return makeShow({
    id: overrides.showId ?? 'show-1',
    seasons: [
      {
        id: 'season-1',
        season_number: 1,
        name: 'Season 1',
        episode_count: 1,
        poster_url: '',
        episodes: [
          {
            id: overrides.episodeId ?? 'ep-1',
            season_number: 1,
            episode_number: 1,
            title: 'Pilot',
            overview: '',
            runtime: 45,
            has_file: overrides.hasFile ?? true,
            stream_url: overrides.hasFile !== false ? '/stream/ep-1' : '',
            air_date: airDate(overrides.airOffset),
          },
        ],
      },
    ],
  });
}

const EMPTY_EXCLUDE = new Set<string>();

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('useUpcomingEpisodes — loading state', () => {
  it('starts in loading state when allShows is non-empty', () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: 7 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    expect(result.current.loading).toBe(true);
  });

  it('stays in loading state when allShows is empty', () => {
    const { result } = renderHook(() => useUpcomingEpisodes([], EMPTY_EXCLUDE));
    expect(result.current.loading).toBe(true);
    expect(result.current.rows).toHaveLength(0);
  });

  it('transitions to loading=false after detail fetches complete', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: 7 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// Window filtering
// ---------------------------------------------------------------------------

describe('useUpcomingEpisodes — air-date window', () => {
  it('includes an episode airing in 7 days (within +30 day window)', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: 7 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].show.id).toBe('show-1');
  });

  it('includes an episode aired yesterday (within -7 day look-back)', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: -1 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
  });

  it('excludes an episode that aired more than 7 days ago', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: -10 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('excludes an episode airing more than 30 days from now', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: 35 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('excludes episodes with no air_date', async () => {
    const show = makeShow({
      seasons: [
        {
          id: 's1',
          season_number: 1,
          name: 'S1',
          episode_count: 1,
          poster_url: '',
          episodes: [
            {
              id: 'ep-no-date',
              season_number: 1,
              episode_number: 1,
              title: 'No Date',
              overview: '',
              runtime: 45,
              has_file: true,
              stream_url: '/stream/ep-no-date',
              // air_date intentionally absent
            },
          ],
        },
      ],
    });
    getTVShow.mockResolvedValue(show);

    const { result } = renderHook(() => useUpcomingEpisodes([makeShow()], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('sorts rows by air date ascending', async () => {
    const showA = makeShow({ id: 'show-a' });
    const showB = makeShow({ id: 'show-b' });
    const detailA = makeShowWithEpisode({ showId: 'show-a', episodeId: 'ep-a', airOffset: 10 });
    const detailB = makeShowWithEpisode({ showId: 'show-b', episodeId: 'ep-b', airOffset: 3 });

    getTVShow.mockImplementation((id: string) => {
      if (id === 'show-a') return Promise.resolve(detailA);
      if (id === 'show-b') return Promise.resolve(detailB);
      return Promise.reject(new Error('not found'));
    });

    const { result } = renderHook(() =>
      useUpcomingEpisodes([showA, showB], EMPTY_EXCLUDE),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows[0].episode.id).toBe('ep-b');
    expect(result.current.rows[1].episode.id).toBe('ep-a');
  });

  it('caps results at 12 items', async () => {
    const shows = Array.from({ length: 15 }, (_, i) => makeShow({ id: `show-${i}` }));
    getTVShow.mockImplementation((id: string) => {
      const i = Number(id.replace('show-', ''));
      return Promise.resolve(makeShowWithEpisode({ showId: id, episodeId: `ep-${i}`, airOffset: i + 1 }));
    });

    const { result } = renderHook(() => useUpcomingEpisodes(shows, EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('useUpcomingEpisodes — deduplication', () => {
  it('excludes a show whose id is in excludeIds', async () => {
    const show = makeShow({ id: 'show-cw' });
    getTVShow.mockResolvedValue(makeShowWithEpisode({ showId: 'show-cw', airOffset: 5 }));

    const { result } = renderHook(() =>
      useUpcomingEpisodes([show], new Set(['show-cw'])),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('excludes an episode whose id is in excludeIds', async () => {
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ episodeId: 'ep-nextup', airOffset: 5 }));

    const { result } = renderHook(() =>
      useUpcomingEpisodes([show], new Set(['ep-nextup'])),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('keeps episodes from non-excluded shows', async () => {
    const showExcluded = makeShow({ id: 'show-excluded' });
    const showKept = makeShow({ id: 'show-kept' });
    const detailExcluded = makeShowWithEpisode({ showId: 'show-excluded', episodeId: 'ep-x', airOffset: 5 });
    const detailKept = makeShowWithEpisode({ showId: 'show-kept', episodeId: 'ep-k', airOffset: 5 });

    getTVShow.mockImplementation((id: string) => {
      if (id === 'show-excluded') return Promise.resolve(detailExcluded);
      if (id === 'show-kept') return Promise.resolve(detailKept);
      return Promise.reject(new Error('not found'));
    });

    const { result } = renderHook(() =>
      useUpcomingEpisodes([showExcluded, showKept], new Set(['show-excluded'])),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].show.id).toBe('show-kept');
  });
});

// ---------------------------------------------------------------------------
// Error resilience
// ---------------------------------------------------------------------------

describe('useUpcomingEpisodes — error handling', () => {
  it('soft-fails and returns empty rows when a single getTVShow call rejects', async () => {
    const show = makeShow();
    getTVShow.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Shallow fallback has no seasons → no rows.
    expect(result.current.rows).toHaveLength(0);
  });

  it('returns rows from successful fetches even when some shows fail', async () => {
    const showOk = makeShow({ id: 'show-ok' });
    const showFail = makeShow({ id: 'show-fail' });
    getTVShow.mockImplementation((id: string) => {
      if (id === 'show-ok')
        return Promise.resolve(makeShowWithEpisode({ showId: 'show-ok', airOffset: 7 }));
      return Promise.reject(new Error('fail'));
    });

    const { result } = renderHook(() =>
      useUpcomingEpisodes([showOk, showFail], EMPTY_EXCLUDE),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].show.id).toBe('show-ok');
  });
});

describe('useUpcomingEpisodes — calendar API', () => {
  it('prefers listCalendar over per-show fetches when available', async () => {
    const show = makeShow({ id: 'show-cal' });
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'tv',
          id: 'ep-cal',
          parent_id: 'show-cal',
          title: 'Test Show',
          subtitle: 'S01E02 · Calendar Ep',
          date: airDate(4),
          href: '/tv/show-cal',
          season_number: 1,
          episode_number: 2,
          has_file: false,
        },
      ],
    });

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getTVShow).not.toHaveBeenCalled();
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].kind).toBe('tv');
    expect(result.current.rows[0].episode.id).toBe('ep-cal');
    expect(result.current.rows[0].episode.episode_number).toBe(2);
  });

  it('maps movie releases onto the rail from calendar items', async () => {
    listCalendar.mockResolvedValue({
      available: true,
      items: [
        {
          kind: 'movie',
          id: 'movie-1',
          parent_id: 'movie-1',
          title: 'Opening Night',
          subtitle: 'Theatrical',
          date: airDate(2),
          href: '/movies/movie-1',
          has_file: true,
        },
      ],
    });

    const { result } = renderHook(() =>
      useUpcomingEpisodes(
        [],
        EMPTY_EXCLUDE,
        [
          {
            id: 'movie-1',
            title: 'Opening Night',
            year: 2026,
            overview: '',
            runtime: 120,
            vote_average: 7,
            genres: [],
            poster_url: '/poster-movie.jpg',
            has_file: true,
            stream_url: '/stream/movies/movie-1',
            created_at: '',
          },
        ],
      ),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].kind).toBe('movie');
    expect(result.current.rows[0].show.title).toBe('Opening Night');
    expect(result.current.rows[0].show.poster_url).toBe('/poster-movie.jpg');
    expect(result.current.rows[0].episode.title).toBe('Theatrical');
  });

  it('falls back to getTVShow when calendar reports unavailable', async () => {
    listCalendar.mockResolvedValue({ available: false, items: [] });
    const show = makeShow();
    getTVShow.mockResolvedValue(makeShowWithEpisode({ airOffset: 7 }));

    const { result } = renderHook(() => useUpcomingEpisodes([show], EMPTY_EXCLUDE));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getTVShow).toHaveBeenCalledWith('show-1');
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].kind).toBe('tv');
  });
});
