/**
 * Tests for the Books and Audiobooks shelves on the Home page (umbrella#117).
 * Covers: populated shelves, empty/unavailable soft-hide, pref toggles,
 * independent failure isolation, and Settings toggle persistence.
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
const listBooks = vi.fn();
const listAudiobooks = vi.fn();

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
      listBooks: (...args: unknown[]) => listBooks(...args),
      listAudiobooks: (...args: unknown[]) => listAudiobooks(...args),
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

const AUTHOR_1 = { id: 'author-1', name: 'Ursula K. Le Guin' };
const AUTHOR_2 = { id: 'author-2', name: 'Philip K. Dick' };

const AUDIOBOOK_1 = { id: 'ab-1', title: 'Dune', narrator: 'Scott Brick' };
const AUDIOBOOK_2 = { id: 'ab-2', title: 'Foundation' };

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
// Books (Browse Authors) shelf — populated state
// ---------------------------------------------------------------------------

describe('Home Books shelf — populated', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listBooks.mockResolvedValue({
      items: [AUTHOR_1, AUTHOR_2],
      total: 2,
      available: true,
    });
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: false });
  });

  it('renders the Browse Authors shelf with author names', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: 'Ursula K. Le Guin' })).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: 'Philip K. Dick' })).toBeInTheDocument();
  });

  it('author tiles link to /books/:id', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    const link = within(shelf).getByRole('link', { name: 'Ursula K. Le Guin' });
    expect(link.getAttribute('href')).toBe('/books/author-1');
  });

  it('Browse Authors shelf has a "See all" link pointing to /books', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/books');
  });

  it('uses the name field from LibraryRow as the tile label', async () => {
    listBooks.mockResolvedValue({
      items: [{ id: 'a3', name: 'Jane Austen' }],
      total: 1,
      available: true,
    });
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    expect(within(shelf).getByRole('link', { name: 'Jane Austen' })).toBeInTheDocument();
  });

  it('falls back to the title field when name is absent', async () => {
    listBooks.mockResolvedValue({
      items: [{ id: 'a4', title: 'Anonymous Author' }],
      total: 1,
      available: true,
    });
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    expect(within(shelf).getByRole('link', { name: 'Anonymous Author' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Audiobooks shelf — populated state
// ---------------------------------------------------------------------------

describe('Home Audiobooks shelf — populated', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
    listAudiobooks.mockResolvedValue({
      items: [AUDIOBOOK_1, AUDIOBOOK_2],
      total: 2,
      available: true,
    });
  });

  it('renders the Audiobooks shelf with book titles', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByText('Dune')).toBeInTheDocument();
    expect(within(shelf).getByText('Foundation')).toBeInTheDocument();
  });

  it('displays narrator when present', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(within(shelf).getByText('Scott Brick')).toBeInTheDocument();
  });

  it('audiobook tiles link to /audiobooks/:id', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    const dune = within(shelf).getByRole('link', { name: /Dune narrated by Scott Brick/i });
    expect(dune.getAttribute('href')).toBe('/audiobooks/ab-1');
    const foundation = within(shelf).getByRole('link', { name: /^Foundation$/i });
    expect(foundation.getAttribute('href')).toBe('/audiobooks/ab-2');
  });

  it('Audiobooks shelf has a "See all" link pointing to /audiobooks', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/audiobooks');
  });

  it('tile aria-label includes narrator when present', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(within(shelf).getByRole('link', { name: /Dune narrated by Scott Brick/i })).toBeInTheDocument();
  });

  it('tile aria-label is just the title when narrator is absent', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(within(shelf).getByRole('link', { name: 'Foundation' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Soft-empty / unavailable — Books shelf
// ---------------------------------------------------------------------------

describe('Home Books shelf — soft-empty / unavailable', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: false });
  });

  it('hides Books shelf when listBooks returns available=false', async () => {
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });

  it('hides Books shelf when listBooks returns an empty items array', async () => {
    listBooks.mockResolvedValue({ items: [], total: 0, available: true });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });

  it('hides Books shelf when listBooks throws an error', async () => {
    listBooks.mockRejectedValue(new Error('books unavailable'));
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });

  it('does not break Home when listBooks throws — video content still loads', async () => {
    listBooks.mockRejectedValue(new Error('Network error'));
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
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Soft-empty / unavailable — Audiobooks shelf
// ---------------------------------------------------------------------------

describe('Home Audiobooks shelf — soft-empty / unavailable', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
  });

  it('hides Audiobooks shelf when listAudiobooks returns available=false', async () => {
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: false });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });

  it('hides Audiobooks shelf when listAudiobooks returns empty items', async () => {
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: true });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });

  it('hides Audiobooks shelf when listAudiobooks throws an error', async () => {
    listAudiobooks.mockRejectedValue(new Error('audiobooks unavailable'));
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });

  it('does not break Home when listAudiobooks throws — Home still renders', async () => {
    listAudiobooks.mockRejectedValue(new Error('Service unavailable'));
    listBooks.mockResolvedValue({ items: [AUTHOR_1], total: 1, available: true });
    renderHome();
    // Books shelf should still render even if audiobooks fails.
    const shelf = await screen.findByTestId('home-books-authors');
    expect(shelf).toBeInTheDocument();
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Independent failure isolation
// ---------------------------------------------------------------------------

describe('Home Books/Audiobooks shelves — independent failure isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
  });

  it('books failure does not prevent audiobooks from rendering', async () => {
    listBooks.mockRejectedValue(new Error('books down'));
    listAudiobooks.mockResolvedValue({ items: [AUDIOBOOK_1], total: 1, available: true });
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(shelf).toBeInTheDocument();
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });

  it('audiobooks failure does not prevent books from rendering', async () => {
    listBooks.mockResolvedValue({ items: [AUTHOR_1], total: 1, available: true });
    listAudiobooks.mockRejectedValue(new Error('audiobooks down'));
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    expect(shelf).toBeInTheDocument();
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });

  it('both shelves render independently when both APIs succeed', async () => {
    listBooks.mockResolvedValue({ items: [AUTHOR_1, AUTHOR_2], total: 2, available: true });
    listAudiobooks.mockResolvedValue({ items: [AUDIOBOOK_1, AUDIOBOOK_2], total: 2, available: true });
    renderHome();
    expect(await screen.findByTestId('home-books-authors')).toBeInTheDocument();
    expect(await screen.findByTestId('home-audiobooks')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Preference toggles — showBooks
// ---------------------------------------------------------------------------

describe('Home Books shelf — showBooks preference', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listBooks.mockResolvedValue({ items: [AUTHOR_1], total: 1, available: true });
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: false });
  });

  it('shows Books shelf when showBooks preference is enabled (default)', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-books-authors');
    expect(shelf).toBeInTheDocument();
  });

  it('hides Books shelf when showBooks preference is disabled', async () => {
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
          showBooks: false,
          showAudiobooks: true,
        },
      }),
    );
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-books-authors')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Preference toggles — showAudiobooks
// ---------------------------------------------------------------------------

describe('Home Audiobooks shelf — showAudiobooks preference', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
    listAudiobooks.mockResolvedValue({ items: [AUDIOBOOK_1], total: 1, available: true });
  });

  it('shows Audiobooks shelf when showAudiobooks preference is enabled (default)', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-audiobooks');
    expect(shelf).toBeInTheDocument();
  });

  it('hides Audiobooks shelf when showAudiobooks preference is disabled', async () => {
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
          showAudiobooks: false,
        },
      }),
    );
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-audiobooks')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Settings — showBooks and showAudiobooks toggles
// ---------------------------------------------------------------------------

describe('Settings — showBooks toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Books shelf toggle in the home feed settings', () => {
    renderSettings('/settings/home');
    expect(screen.getByRole('checkbox', { name: 'Books shelf (Browse Authors)' })).toBeInTheDocument();
  });

  it('persists showBooks=false when the toggle is unchecked and saved', () => {
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Books shelf (Browse Authors)' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showBooks).toBe(false);
  });

  it('persists showBooks=true when the toggle is saved while checked', () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ home: { showBooks: false } }),
    );
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Books shelf (Browse Authors)' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showBooks).toBe(true);
  });
});

describe('Settings — showAudiobooks toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Audiobooks shelf toggle in the home feed settings', () => {
    renderSettings('/settings/home');
    expect(screen.getByRole('checkbox', { name: 'Audiobooks shelf' })).toBeInTheDocument();
  });

  it('persists showAudiobooks=false when the toggle is unchecked and saved', () => {
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Audiobooks shelf' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showAudiobooks).toBe(false);
  });

  it('persists showAudiobooks=true when the toggle is saved while checked', () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ home: { showAudiobooks: false } }),
    );
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Audiobooks shelf' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showAudiobooks).toBe(true);
  });
});
