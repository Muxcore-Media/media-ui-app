/**
 * Tests for the Music shelves on the Home page (umbrella#113).
 * Covers: populated shelves, empty/unavailable soft-hide, pref toggle.
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
const listMusic = vi.fn();
const getMusicArtist = vi.fn();

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
      listMusic: (...args: unknown[]) => listMusic(...args),
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
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

const ARTIST_ROW = {
  id: 'artist-1',
  name: 'Radiohead',
  monitored: true,
};

const ARTIST_ROW_2 = {
  id: 'artist-2',
  name: 'Portishead',
  monitored: true,
};

const ALBUM_DETAIL = {
  artist: { id: 'artist-1', name: 'Radiohead', monitored: true },
  albums: [
    {
      id: 'album-1',
      title: 'OK Computer',
      year: 1997,
      artist_id: 'artist-1',
      tracks: [
        { id: 'track-1', title: 'Paranoid Android', stream_url: '/stream/track-1' },
      ],
    },
    {
      id: 'album-2',
      title: 'Kid A',
      year: 2000,
      artist_id: 'artist-1',
      tracks: [],
    },
  ],
};

const ALBUM_DETAIL_2 = {
  artist: { id: 'artist-2', name: 'Portishead', monitored: true },
  albums: [
    {
      id: 'album-3',
      title: 'Dummy',
      year: 1994,
      artist_id: 'artist-2',
      tracks: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helper: shared beforeEach setup for Home tests
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
// Music shelves — populated state
// ---------------------------------------------------------------------------

describe('Home music shelves — populated', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listMusic.mockResolvedValue({
      items: [ARTIST_ROW, ARTIST_ROW_2],
      total: 2,
      available: true,
    });
    getMusicArtist.mockImplementation((id: string) => {
      if (id === 'artist-1') return Promise.resolve(ALBUM_DETAIL);
      if (id === 'artist-2') return Promise.resolve(ALBUM_DETAIL_2);
      return Promise.reject(new Error('not found'));
    });
  });

  it('renders the Browse Artists shelf with artist names', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-artists');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: 'Radiohead' })).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: 'Portishead' })).toBeInTheDocument();
  });

  it('artist tiles link to /music/:id', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-artists');
    const link = within(shelf).getByRole('link', { name: 'Radiohead' });
    expect(link.getAttribute('href')).toBe('/music/artist-1');
  });

  it('Browse Artists shelf has a "See all" link pointing to /music', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-artists');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/music');
  });

  it('renders the Recently Added Albums shelf with album titles', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-albums');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: /OK Computer/i })).toBeInTheDocument();
    expect(within(shelf).getByRole('link', { name: /Dummy/i })).toBeInTheDocument();
  });

  it('album tiles show artist name and year', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-albums');
    expect(shelf).toHaveTextContent('Radiohead');
    expect(shelf).toHaveTextContent('1997');
  });

  it('album tiles link to the artist page /music/:artistId', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-albums');
    const link = within(shelf).getByRole('link', { name: /OK Computer/i });
    expect(link.getAttribute('href')).toBe('/music/artist-1');
  });

  it('Recently Added Albums shelf has a "See all" link pointing to /music', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-albums');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/music');
  });
});

// ---------------------------------------------------------------------------
// Music shelves — soft-empty / unavailable
// ---------------------------------------------------------------------------

describe('Home music shelves — soft-empty / unavailable', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
  });

  it('does not render music shelves when listMusic returns available=false', async () => {
    listMusic.mockResolvedValue({ items: [], total: 0, available: false, message: 'Music disabled' });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-music-artists')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-music-albums')).not.toBeInTheDocument();
  });

  it('does not render music shelves when listMusic returns an empty items array', async () => {
    listMusic.mockResolvedValue({ items: [], total: 0, available: true });
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-music-artists')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-music-albums')).not.toBeInTheDocument();
  });

  it('does not render music shelves when listMusic throws an error', async () => {
    listMusic.mockRejectedValue(new Error('Network error'));
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-music-artists')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-music-albums')).not.toBeInTheDocument();
  });

  it('does not break Home when listMusic throws — video content still loads', async () => {
    listMusic.mockRejectedValue(new Error('Service unavailable'));
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
    // Recently Added shelf should still appear from video library.
    const shelf = await screen.findByTestId('home-recently-added');
    expect(shelf).toHaveTextContent('Working Movie');
    expect(screen.queryByTestId('home-music-artists')).not.toBeInTheDocument();
  });

  it('shows only the artists shelf when getMusicArtist fails for all artists (no albums)', async () => {
    listMusic.mockResolvedValue({ items: [ARTIST_ROW], total: 1, available: true });
    getMusicArtist.mockRejectedValue(new Error('not found'));
    renderHome();
    // Artists shelf should appear since listMusic succeeded.
    const artistShelf = await screen.findByTestId('home-music-artists');
    expect(artistShelf).toBeInTheDocument();
    // Albums shelf should be absent since no album data came back.
    expect(screen.queryByTestId('home-music-albums')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Music shelves — showMusic preference toggle
// ---------------------------------------------------------------------------

describe('Home music shelves — showMusic preference', () => {
  beforeEach(() => {
    localStorage.clear();
    setupEmptyVideoLibrary();
    listMusic.mockResolvedValue({ items: [ARTIST_ROW], total: 1, available: true });
    getMusicArtist.mockResolvedValue(ALBUM_DETAIL);
  });

  it('hides music shelves when showMusic preference is disabled', async () => {
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
          showMusic: false,
        },
      }),
    );
    renderHome();
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-music-artists')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-music-albums')).not.toBeInTheDocument();
  });

  it('shows music shelves when showMusic preference is enabled (default)', async () => {
    renderHome();
    const shelf = await screen.findByTestId('home-music-artists');
    expect(shelf).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Settings — showMusic toggle
// ---------------------------------------------------------------------------

describe('Settings — showMusic toggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Music shelves toggle in the home feed settings', () => {
    renderSettings('/settings/home');
    expect(screen.getByRole('checkbox', { name: 'Music shelves (Artists & Albums)' })).toBeInTheDocument();
  });

  it('persists showMusic=false when the toggle is unchecked and saved', () => {
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Music shelves (Artists & Albums)' });
    // Default is checked (true); click to uncheck.
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showMusic).toBe(false);
  });

  it('persists showMusic=true when the toggle is saved while checked', () => {
    // Start with showMusic=false in storage.
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ home: { showMusic: false } }),
    );
    renderSettings('/settings/home');
    const checkbox = screen.getByRole('checkbox', { name: 'Music shelves (Artists & Albums)' });
    // It's unchecked; click to re-enable.
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(userdata.getPreferences().home.showMusic).toBe(true);
  });
});
