/**
 * Tests for the "Because you watched" personalized shelf — umbrella #94/#96.
 *
 * Covers:
 *  - Empty watch history → shelf is hidden
 *  - Working related API (correct tmdb:... id format) → shelf shows titles
 *  - BFF / graph down → shelf soft-hides, Home still loads
 *  - available: false → shelf soft-hides (graph module not installed)
 *  - No tmdb_id on seed → soft-hide (no valid external id to send)
 *  - Parental filter removes restricted titles
 *  - Deduplication against Continue Watching / Next Up seeds
 *  - has_file filter — only playable library titles appear
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
const getRelated = vi.fn();

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
      getRelated: (...args: unknown[]) => getRelated(...args),
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

/**
 * Make a library Movie with has_file and an optional tmdb_id.
 * The id is a library-internal string; tmdb_id is the TMDB numeric key used
 * by the graph BFF.
 */
function makeLibraryMovie(overrides: Partial<{
  id: string;
  title: string;
  has_file: boolean;
  content_rating: string;
  tmdb_id: number;
}> = {}) {
  return {
    id: overrides.id ?? 'lib-m-1',
    title: overrides.title ?? 'Library Movie',
    year: 2025,
    overview: 'A library film',
    runtime: 100,
    vote_average: 7.5,
    genres: ['Drama'],
    poster_url: '',
    has_file: overrides.has_file ?? true,
    stream_url: '/stream/movies/' + (overrides.id ?? 'lib-m-1'),
    created_at: '2025-01-01T00:00:00.000Z',
    tmdb_id: overrides.tmdb_id,
    content_rating: overrides.content_rating,
  };
}

/**
 * Make a RelatedItem as the BFF returns (TMDB-shaped, numeric id, no has_file).
 */
function makeRelatedItem(overrides: Partial<{
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  content_rating: string;
}> = {}) {
  return {
    id: overrides.id ?? 9001,
    title: overrides.title ?? 'Related Title',
    year: 2024,
    overview: 'A related film',
    poster: '/poster.jpg',
    voteAvg: 7.0,
    mediaType: overrides.mediaType ?? 'movie',
    content_rating: overrides.content_rating,
  };
}

/** Seed watched movie — library id "movie-seed", TMDB id 550. */
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

/** Library entry for the seed — has tmdb_id so the hook can build the external id. */
const SEED_LIBRARY_MOVIE = makeLibraryMovie({
  id: 'movie-seed',
  title: 'Inception',
  tmdb_id: 550,
  has_file: true,
});

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
  getRelated.mockReset();

  listCollections.mockResolvedValue({ items: [] });
  listRequests.mockResolvedValue([]);
  // Default: library contains the seed movie so the hook can resolve its tmdb_id.
  listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE], total: 1 });
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
    getRelated.mockResolvedValue({ items: [], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('shows the shelf with seed title when related API returns results', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    // Library has the seed (tmdb_id=550) and the related neighbor (tmdb_id=9001).
    const relatedLibMovie = makeLibraryMovie({ id: 'lib-memento', title: 'Memento', tmdb_id: 9001 });
    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE, relatedLibMovie], total: 2 });

    // BFF returns RelatedItem with numeric TMDB id.
    getRelated.mockResolvedValue({
      items: [makeRelatedItem({ id: 9001, title: 'Memento' })],
      available: true,
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

  it('uses tmdb:movie:... external id format when calling the graph BFF', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    // Library snapshot supplies tmdb_id=550 for the seed.
    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE], total: 1 });
    getRelated.mockResolvedValue({ items: [], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Wait until the hook has resolved tmdb_id and called the graph BFF.
    // (The call happens after allMovies is populated, so we use waitFor.)
    await waitFor(() => expect(getRelated).toHaveBeenCalledWith('tmdb:movie:550'));
  });

  it('resolves seed tmdb_id via detail fetch when not in library snapshot', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    // Library snapshot does NOT contain the seed.
    listMovies.mockResolvedValue({ items: [], total: 0 });
    // Seed detail fetch supplies the tmdb_id.
    getMovie.mockResolvedValue({ ...SEED_LIBRARY_MOVIE, id: 'movie-seed', tmdb_id: 550 });
    getRelated.mockResolvedValue({ items: [], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(getMovie).toHaveBeenCalledWith('movie-seed');
    expect(getRelated).toHaveBeenCalledWith('tmdb:movie:550');
  });

  it('soft-hides the shelf when the related API fails; Home still renders', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelated.mockRejectedValue(new Error('graph service unavailable'));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Home loads successfully.
    await screen.findByTestId('home-page');
    // Shelf is absent (soft-hide).
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('soft-hides the shelf when available=false (graph module not installed)', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelated.mockResolvedValue({ items: [], available: false });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('soft-hides the shelf when the related API returns an empty list', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    getRelated.mockResolvedValue({ items: [], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
  });

  it('soft-hides the shelf when the seed has no tmdb_id', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);
    // Library has seed but without tmdb_id.
    listMovies.mockResolvedValue({
      items: [makeLibraryMovie({ id: 'movie-seed', title: 'Inception' /* no tmdb_id */ })],
      total: 1,
    });
    // Detail fetch also has no tmdb_id.
    getMovie.mockResolvedValue({ id: 'movie-seed', title: 'Inception' });
    // getRelated should NOT be called.
    getRelated.mockResolvedValue({ items: [], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-because-you-watched')).not.toBeInTheDocument();
    expect(getRelated).not.toHaveBeenCalled();
  });

  it('applies parental filter — restricts titles above maxRating', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    // Set a PG-13 ceiling via localStorage prefs.
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: false, maxRating: 'PG-13', pinHash: '', pinEnabled: false } }),
    );

    const safeItem = makeRelatedItem({ id: 1001, title: 'Safe Film', content_rating: 'PG' });
    const restrictedItem = makeRelatedItem({ id: 1002, title: 'Restricted Film', content_rating: 'R' });

    const safeLib = makeLibraryMovie({ id: 'lib-safe', title: 'Safe Film', tmdb_id: 1001, content_rating: 'PG' });
    const restrictedLib = makeLibraryMovie({ id: 'lib-restricted', title: 'Restricted Film', tmdb_id: 1002, content_rating: 'R' });

    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE, safeLib, restrictedLib], total: 3 });
    getRelated.mockResolvedValue({ items: [safeItem, restrictedItem], available: true });

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

    const dupItem = makeRelatedItem({ id: 5001, title: 'Duplicate Film' });
    const uniqueItem = makeRelatedItem({ id: 5002, title: 'Unique Film' });

    const dupLib = makeLibraryMovie({ id: continueId, title: 'Duplicate Film', tmdb_id: 5001 });
    const uniqueLib = makeLibraryMovie({ id: 'unique-lib', title: 'Unique Film', tmdb_id: 5002 });

    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE, dupLib, uniqueLib], total: 3 });
    getRelated.mockResolvedValue({ items: [dupItem, uniqueItem], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Unique Film');
    expect(shelf).not.toHaveTextContent('Duplicate Film');
  });

  it('does not show items whose library entry is missing has_file', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    const watchableItem = makeRelatedItem({ id: 2001, title: 'Watchable Movie' });
    const noFileItem = makeRelatedItem({ id: 2002, title: 'Not Playable' });

    const watchableLib = makeLibraryMovie({ id: 'lib-watch', title: 'Watchable Movie', tmdb_id: 2001, has_file: true });
    const noFileLib = makeLibraryMovie({ id: 'lib-nofile', title: 'Not Playable', tmdb_id: 2002, has_file: false });

    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE, watchableLib, noFileLib], total: 3 });
    getRelated.mockResolvedValue({ items: [watchableItem, noFileItem], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Watchable Movie');
    expect(shelf).not.toHaveTextContent('Not Playable');
  });

  it('does not show the seed title itself in the related results', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([WATCHED_MOVIE]);

    // A graph neighbor whose tmdb_id happens to join to the seed's library item.
    const seedRelated = makeRelatedItem({ id: 550, title: 'Inception' }); // same tmdb_id as seed
    const otherItem = makeRelatedItem({ id: 3001, title: 'Other Movie' });

    const otherLib = makeLibraryMovie({ id: 'lib-other', title: 'Other Movie', tmdb_id: 3001 });
    // SEED_LIBRARY_MOVIE has id='movie-seed', tmdb_id=550.
    listMovies.mockResolvedValue({ items: [SEED_LIBRARY_MOVIE, otherLib], total: 2 });
    getRelated.mockResolvedValue({ items: [seedRelated, otherItem], available: true });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-because-you-watched');
    expect(shelf).toHaveTextContent('Other Movie');
    // The shelf heading says "Because you watched Inception" — that's expected.
    // Assert that Inception does NOT appear as a poster card (no img with alt="Inception").
    const inceptionPosters = shelf.querySelectorAll('img[alt="Inception"]');
    expect(inceptionPosters).toHaveLength(0);
  });

  it('does not show the Recommended shelf (removed in favour of Because you watched)', async () => {
    vi.mocked(userdata.recentlyWatched).mockReturnValue([]);
    listMovies.mockResolvedValue({
      items: [makeLibraryMovie({ id: 'm-1', title: 'Top Rated Movie' })],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByRole('heading', { name: 'Recommended' })).not.toBeInTheDocument();
  });
});

// Ensure the parental spy is importable (it uses real implementation).
void parental;
