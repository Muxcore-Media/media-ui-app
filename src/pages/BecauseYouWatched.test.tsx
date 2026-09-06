/**
 * Tests for the "Because you watched" personalized shelf — umbrella #94.
 *
 * Covers:
 *  - Empty watch history → shelf is hidden
 *  - Working related API → shelf shows with "Because you watched <Title>"
 *  - BFF / graph down → shelf soft-hides, Home still loads
 *  - Parental filter removes restricted titles
 *  - Deduplication against Continue Watching / Next Up seeds
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import * as userdata from '../lib/userdata';
import * as parental from '../lib/parental';

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------
const listMovies = vi.fn();
const listTVShows = vi.fn();
const listRequests = vi.fn();
const getTVShow = vi.fn();
const getMovie = vi.fn();
const listCollections = vi.fn();
const getRelatedTitles = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listRequests: (...args: unknown[]) => listRequests(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      listCollections: (...args: unknown[]) => listCollections(...args),
      getRelatedTitles: (...args: unknown[]) => getRelatedTitles(...args),
    },
  };
});

vi.mock('../lib/userdata', async () => {
  const actual = await vi.importActual<typeof import('../lib/userdata')>('../lib/userdata');
  return {
    ...actual,
    pullUserdataFromServer: vi.fn(async () => true),
    continueWatching: vi.fn(() => []),
    listFavorites: vi.fn(() => []),
    listWantToWatch: vi.fn(() => []),
    resolveNextUp: vi.fn(async () => []),
    recentlyWatched: vi.fn(() => []),
  };
});

// ---------------------------------------------------------------------------
// Shared test data helpers
// ---------------------------------------------------------------------------

function makeMovie(overrides: Partial<{
  id: string;
  title: string;
  has_file: boolean;
  content_rating: string;
}> = {}) {
  return {
    id: overrides.id ?? 'related-m-1',
    title: overrides.title ?? 'Related Movie',
    year: 2025,
    overview: 'A related film',
    runtime: 100,
    vote_average: 7.5,
    genres: ['Drama'],
    poster_url: '',
    has_file: overrides.has_file ?? true,
    stream_url: '/stream/movies/' + (overrides.id ?? 'related-m-1'),
    created_at: '2025-01-01T00:00:00.000Z',
    content_rating: overrides.content_rating,
  };
}

const WATCHED_MOVIE: userdata.ProgressEntry = {
  id: 'movie-seed',
  kind: 'movie',
  title: 'Inception',
  poster_url: '/poster.jpg',
  href: '/movies/movie-seed',
  stream_url: '/stream/movies/movie-seed',
  positionSec: 0,
  durationSec: 7200,
  updatedAt: '2026-09-01T00:00:00.000Z',
  watched: true,
};

// ---------------------------------------------------------------------------
// Shared beforeEach
// ---------------------------------------------------------------------------

function setupDefaults() {
  localStorage.clear();
  listMovies.mockReset();
  listTVShows.mockReset();
  listRequests.mockReset();
  getTVShow.mockReset();
  getMovie.mockReset();
  listCollections.mockReset();
  getRelatedTitles.mockReset();

  listCollections.mockResolvedValue({ items: [] });
  listRequests.mockResolvedValue([]);
  listMovies.mockResolvedValue({ items: [], total: 0 });
  listTVShows.mockResolvedValue({ items: [], total: 0 });

  vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
  vi.mocked(userdata.continueWatching).mockReturnValue([]);
  vi.mocked(userdata.listFavorites).mockReturnValue([]);
  vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
  vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  vi.mocked(userdata.recentlyWatched).mockReturnValue([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Because you watched shelf', () => {
  beforeEach(setupDefaults);

  it('is hidden when there is no watch history', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([]);
    getRelatedTitles.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    // Because-you-watched shelf must not be present
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('shows the shelf with seed title when related API returns results', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelatedTitles.mockResolvedValue({
      items: [makeMovie({ id: 'rel-1', title: 'Memento' })],
      seed_title: 'Inception',
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Because you watched Inception');
    expect(shelf).toHaveTextContent('Memento');
  });

  it('falls back to progress title when API omits seed_title', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelatedTitles.mockResolvedValue({
      items: [makeMovie({ id: 'rel-2', title: 'The Prestige' })],
      // no seed_title in response
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Because you watched Inception');
  });

  it('soft-hides the shelf when the related API fails; Home still renders', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelatedTitles.mockRejectedValue(new Error('graph service unavailable'));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Home loads successfully
    await screen.findByTestId('home-page');
    // Shelf is absent (soft-hide)
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('soft-hides the shelf when the related API returns an empty list', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelatedTitles.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('applies parental filter — restricts titles above maxRating', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    // Set a PG-13 ceiling via localStorage prefs
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false } }),
    );

    const safe = makeMovie({ id: 'safe-1', title: 'Safe Film', content_rating: 'PG' });
    const restricted = makeMovie({ id: 'restricted-1', title: 'Restricted Film', content_rating: 'R' });

    getRelatedTitles.mockResolvedValue({ items: [safe, restricted], seed_title: 'Inception' });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Safe Film');
    expect(shelf).not.toHaveTextContent('Restricted Film');
  });

  it('deduplicates items already in Continue Watching', async () => {
    const continueId = 'dup-movie';
    vi.mocked(userdata.continueWatching).mockReturnValue([
      {
        id: continueId,
        kind: 'movie',
        title: 'Duplicate Film',
        href: '/movies/' + continueId,
        stream_url: '/stream/movies/' + continueId,
        positionSec: 600,
        durationSec: 7200,
        updatedAt: '2026-09-02T00:00:00.000Z',
      },
    ]);
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    const duplicate = makeMovie({ id: continueId, title: 'Duplicate Film' });
    const unique = makeMovie({ id: 'unique-1', title: 'Unique Film' });

    getRelatedTitles.mockResolvedValue({ items: [duplicate, unique], seed_title: 'Inception' });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Unique Film');
    expect(shelf).not.toHaveTextContent('Duplicate Film');
  });

  it('does not show items missing has_file', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    const watchable = makeMovie({ id: 'watch-1', title: 'Watchable Movie', has_file: true });
    const noFile = makeMovie({ id: 'nofile-1', title: 'Not Playable', has_file: false });

    getRelatedTitles.mockResolvedValue({ items: [watchable, noFile], seed_title: 'Inception' });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Watchable Movie');
    expect(shelf).not.toHaveTextContent('Not Playable');
  });

  it('uses the watched seed movie id as the API id param', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelatedTitles.mockResolvedValue({
      items: [makeMovie({ id: 'rel-x', title: 'Found Via Seed' })],
      seed_title: 'Inception',
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-because-you-watched');
    // The hook must have called getRelatedTitles with the seed movie's id
    expect(getRelatedTitles).toHaveBeenCalledWith('movie-seed', 'movie', expect.any(Number));
  });

  it('does not show the Recommended shelf (removed in favour of Because you watched)', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([]);
    listMovies.mockResolvedValue({
      items: [makeMovie({ id: 'm-1', title: 'Top Rated Movie' })],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    // The old naive "Recommended" shelf heading must be gone
    expect(screen.queryByRole('heading', { name: 'Recommended' })).not.toBeInTheDocument();
  });
});

// Ensure the parental spy is importable (it uses real implementation)
void parental;
