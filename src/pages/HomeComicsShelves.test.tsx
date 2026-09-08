/**
 * Tests for the Comics shelf on the Home page (umbrella#120).
 * Covers: populated shelf, empty/unavailable soft-hide, pref toggle,
 * failure isolation, and Settings toggle persistence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Settings from './Settings';
import * as userdata from '../lib/userdata';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../lib/capabilities';

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const listMovies = vi.fn();
const listTVShows = vi.fn();
const listRequests = vi.fn();
const getTVShow = vi.fn();
const getMovie = vi.fn();
const listCollections = vi.fn();
const listComics = vi.fn();

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
      listWatchHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
      listSessions: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
      listComics: (...args: unknown[]) => listComics(...args),
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
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMIC_1 = { id: 'comic-1', title: 'Saga', publisher: 'Image Comics' };
const COMIC_2 = { id: 'comic-2', title: 'Sandman' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupEmptyVideoLibrary() {
  listMovies.mockResolvedValue({ items: [], total: 0 });
  listTVShows.mockResolvedValue({ items: [], total: 0 });
  listRequests.mockResolvedValue([]);
  listCollections.mockResolvedValue({ items: [] });
  getTVShow.mockRejectedValue(new Error('not found'));
  getMovie.mockRejectedValue(new Error('not found'));
  vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
  vi.mocked(userdata.continueWatching).mockReturnValue([]);
  vi.mocked(userdata.listFavorites).mockReturnValue([]);
  vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
  vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

function renderSettings(path = '/settings') {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/settings/*" element={<Settings />} />
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

// ---------------------------------------------------------------------------
// Comics shelf — populated state
// ---------------------------------------------------------------------------

describe('Home Comics shelf — populated', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listComics.mockResolvedValue({
      items: [COMIC_1, COMIC_2],
      total: 2,
      available: true,
    });
  });

  it('renders the Comics shelf with comic titles', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByText('Saga')).toBeInTheDocument();
    expect(within(shelf).getByText('Sandman')).toBeInTheDocument();
  });

  it('displays publisher when present', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(within(shelf).getByText('Image Comics')).toBeInTheDocument();
  });

  it('comic tiles link to the series page', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(within(shelf).getByRole('link', { name: /Saga — Image Comics/i }).getAttribute('href')).toBe('/comics/comic-1');
    expect(within(shelf).getByRole('link', { name: /^Sandman$/i }).getAttribute('href')).toBe('/comics/comic-2');
  });

  it('Comics shelf has a "See all" link pointing to /comics', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/comics');
  });

  it('tile aria-label includes publisher when present', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(within(shelf).getByRole('link', { name: /Saga — Image Comics/i })).toBeInTheDocument();
  });

  it('tile aria-label is just the title when publisher is absent', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(within(shelf).getByRole('link', { name: 'Sandman' })).toBeInTheDocument();
  });

  it('falls back to the name field when title is absent', async () => {
    listComics.mockResolvedValue({
      items: [{ id: 'c3', name: 'Watchmen' }],
      total: 1,
      available: true,
    });
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(within(shelf).getByRole('link', { name: 'Watchmen' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Soft-empty / unavailable
// ---------------------------------------------------------------------------

describe('Home Comics shelf — soft-empty / unavailable', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
  });

  it('hides Comics shelf when listComics returns available=false', async () => {
    listComics.mockResolvedValue({ items: [], total: 0, available: false });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-comics')).not.toBeInTheDocument();
  });

  it('hides Comics shelf when listComics returns an empty items array', async () => {
    listComics.mockResolvedValue({ items: [], total: 0, available: true });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-comics')).not.toBeInTheDocument();
  });

  it('hides Comics shelf when listComics throws an error', async () => {
    listComics.mockRejectedValue(new Error('comics unavailable'));
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-comics')).not.toBeInTheDocument();
  });

  it('does not break Home when listComics throws — video content still loads', async () => {
    listComics.mockRejectedValue(new Error('Network error'));
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-ok',
          title: 'Working Movie',
          year: 2026,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/movie-ok',
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    renderHome();
    const shelf = await screen.findByTestId('home-recently-added');
    expect(shelf).toHaveTextContent('Working Movie');
    expect(screen.queryByTestId('home-comics')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Preference toggle — showComics
// ---------------------------------------------------------------------------

describe('Home Comics shelf — showComics preference', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listComics.mockResolvedValue({ items: [COMIC_1], total: 1, available: true });
  });

  it('shows Comics shelf when showComics preference is enabled (default)', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-comics');
    expect(shelf).toBeInTheDocument();
  });

  it('hides Comics shelf when showComics preference is disabled', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        home: {
          showContinueWatching: true,
          showFavorites: true,
          showRecentRequests: true,
          showNextUp: true,
          showRecentlyAdded: true,
          showRecentlyWatched: true,
          showUpcoming: true,
          showCollections: true,
          showPlaylists: true,
          showWantToWatch: true,
          showGenres: true,
          showStudios: true,
          showNetworks: true,
          showMusic: true,
          showBooks: true,
          showAudiobooks: true,
          showComics: false,
        },
      }),
    );
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-comics')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Settings — showComics toggle
// ---------------------------------------------------------------------------

describe('Settings — showComics toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Comics shelf toggle in the home feed settings', () => {
    renderSettings('/settings/home');
    expect(screen.getByRole('checkbox', { name: 'Comics shelf' })).toBeInTheDocument();
  });

  it('persists showComics=false when the toggle is unchecked and saved', () => {
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Comics shelf' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showComics).toBe(false);
  });

  it('persists showComics=true when the toggle is saved while checked', () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ home: { showComics: false } }),
    );
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Comics shelf' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showComics).toBe(true);
  });
});
