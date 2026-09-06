import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import * as userdata from '../lib/userdata';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const listRequests = vi.fn();
const getTVShow = vi.fn();
const getMovie = vi.fn();
const listCollections = vi.fn();

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

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listTVShows.mockResolvedValue({
      items: [
        {
          id: 'show-1',
          title: 'New Show',
          year: 2026,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '2026-08-20T00:00:00.000Z',
          seasons: [],
        },
      ],
      total: 1,
    });
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-1',
          title: 'Fresh Movie',
          year: 2026,
          overview: '',
          runtime: 0,
          vote_average: 8,
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/movie-1',
          created_at: '2026-08-21T00:00:00.000Z',
        },
      ],
      total: 1,
    });
  });

  it('renders recently added shelf from library timestamps', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const page = await screen.findByTestId('home-page');
    const shelf = await screen.findByTestId('home-recently-added');
    expect(page).toBeInTheDocument();
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Fresh Movie');
    expect(shelf).toHaveTextContent('New Show');
    expect(shelf).toHaveTextContent('Added');
  });

  it('hides recently added shelf when home preference is disabled', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        display: { theme: 'dark', libraryPageSize: 48, showWatchedIndicators: true },
        home: {
          showContinueWatching: true,
          showFavorites: true,
          showRecentRequests: true,
          showNextUp: true,
          showRecentlyAdded: false,
        },
        playback: { autoplayNext: false, rememberPosition: true, skipIntroSec: 0 },
        subtitles: {
          enabled: true,
          language: 'eng',
          textSize: 'md',
          backgroundOpacity: 60,
          edgeStyle: 'drop-shadow',
          verticalPosition: 'bottom',
        },
        controls: { enableKeyboardShortcuts: true },
        player: { preferredQuality: 'auto', theaterMode: false, aspectMode: 'contain' },
      }),
    );

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    expect(screen.queryByTestId('home-recently-added')).not.toBeInTheDocument();
  });
});

describe('Home accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('uses the featured title as the page h1 when a hero is shown', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-hero',
          title: 'Hero Feature',
          year: 2024,
          overview: 'A featured film',
          runtime: 120,
          vote_average: 9,
          genres: ['Drama'],
          poster_url: '/poster.jpg',
          backdrop_url: '/backdrop.jpg',
          has_file: true,
          stream_url: '/stream/movies/movie-hero',
          created_at: '2026-08-21T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hero Feature' }),
    ).toBeInTheDocument();
  });

  it('exposes a page h1 when the feed is empty', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });

  it('announces loading on initial render', () => {
    vi.mocked(userdata.pullUserdataFromServer).mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading home' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Continue Watching rail
// ---------------------------------------------------------------------------

const MOVIE_PROGRESS = {
  id: 'movie-42',
  kind: 'movie' as const,
  title: 'Inception',
  poster_url: '/poster.jpg',
  href: '/movies/movie-42',
  stream_url: '/stream/movies/movie-42',
  positionSec: 1200,
  durationSec: 7200,
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const EPISODE_PROGRESS = {
  id: 'ep-5',
  kind: 'episode' as const,
  title: 'Breaking Bad S01E05 · Gray Matter',
  poster_url: '/poster-bb.jpg',
  href: '/tv/show-bb',
  stream_url: '/stream/tv/ep-5',
  positionSec: 900,
  durationSec: 3600,
  updatedAt: '2026-09-02T00:00:00.000Z',
};

describe('Continue Watching rail', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    // Restore mocks that a previous test may have overridden (e.g. loading test).
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders when in-progress movie entries exist', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Inception');
  });

  it('renders when in-progress episodic entries exist', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([EPISODE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toHaveTextContent('Breaking Bad S01E05');
  });

  it('is hidden when there are no in-progress items (quiet empty state)', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Wait for page to finish loading — empty state heading appears when done.
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-continue')).not.toBeInTheDocument();
  });

  it('card link resolves to the player route so tap resumes at stored position', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    const link = within(shelf).getAllByRole('link')[0];
    const href = link.getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).toContain('movie-42');
    // Must not force a restart — player should resume from saved position.
    expect(href).not.toContain('restart=1');
  });

  it('shows time remaining in the subtitle when duration is known', async () => {
    // positionSec=1200, durationSec=7200 → 6000s = 100 min remaining → "1h 40m left"
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toHaveTextContent('left');
  });

  it('falls back to "Resume" subtitle when duration is unknown', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([
      { ...MOVIE_PROGRESS, durationSec: 0 },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toHaveTextContent('Resume');
  });
});

// ---------------------------------------------------------------------------
// Up Next rail
// ---------------------------------------------------------------------------

const NEXT_UP_ENTRY = {
  id: 'ep-2',
  kind: 'episode' as const,
  title: "Breaking Bad S01E02 · Cat's in the Bag",
  poster_url: '/poster-bb.jpg',
  href: '/player?src=%2Fstream%2Ftv%2Fep-2&id=ep-2&kind=episode&title=BB+S01E02&showId=show-bb',
  subtitle: 'Next up',
  showId: 'show-bb',
};

describe('Up Next rail', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders when next-up episodes are available', async () => {
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([NEXT_UP_ENTRY]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-next-up');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Breaking Bad');
  });

  it('is hidden when there are no next-up episodes (quiet empty state)', async () => {
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-next-up')).not.toBeInTheDocument();
  });

  it('card link goes directly to the episode player', async () => {
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([NEXT_UP_ENTRY]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-next-up');
    const link = within(shelf).getAllByRole('link')[0];
    expect(link.getAttribute('href')).toContain('/player');
    expect(link.getAttribute('href')).toContain('ep-2');
  });

  it('shows the "Next up" subtitle label from the derived entry', async () => {
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([NEXT_UP_ENTRY]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-next-up');
    expect(shelf).toHaveTextContent('Next up');
  });

  it('both rails can be visible simultaneously', async () => {
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([NEXT_UP_ENTRY]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('home-continue')).toBeInTheDocument();
    expect(await screen.findByTestId('home-next-up')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Parental filter on home userdata rails (umbrella#84)
// ---------------------------------------------------------------------------

const R_LIBRARY_MOVIE = {
  id: 'movie-42',
  title: 'Inception',
  year: 2010,
  overview: '',
  runtime: 148,
  vote_average: 8.8,
  genres: ['Sci-Fi'],
  poster_url: '/poster.jpg',
  has_file: true,
  stream_url: '/stream/movies/movie-42',
  created_at: '2026-08-21T00:00:00.000Z',
  content_rating: 'R',
};

const PG_LIBRARY_MOVIE = {
  ...R_LIBRARY_MOVIE,
  id: 'movie-pg',
  title: 'Finding Nemo',
  stream_url: '/stream/movies/movie-pg',
  content_rating: 'PG',
};

function enableKidsPgCeiling() {
  userdata.updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

describe('Home parental rails', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getMovie.mockRejectedValue(new Error('not found'));
    getTVShow.mockRejectedValue(new Error('not found'));
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('hides a restricted Continue Watching title after joining library content_rating', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE, PG_LIBRARY_MOVIE], total: 2 });
    vi.mocked(userdata.continueWatching).mockReturnValue([
      MOVIE_PROGRESS,
      { ...MOVIE_PROGRESS, id: 'movie-pg', title: 'Finding Nemo', href: '/movies/movie-pg', stream_url: '/stream/movies/movie-pg' },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toHaveTextContent('Finding Nemo');
    expect(shelf).not.toHaveTextContent('Inception');
  });

  it('forwards joined content_rating on the resume player href', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [PG_LIBRARY_MOVIE], total: 1 });
    vi.mocked(userdata.continueWatching).mockReturnValue([
      {
        ...MOVIE_PROGRESS,
        id: 'movie-pg',
        title: 'Finding Nemo',
        href: '/movies/movie-pg',
        stream_url: '/stream/movies/movie-pg',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    const href = within(shelf).getAllByRole('link')[0].getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).toContain('content_rating=PG');
  });

  it('keeps an unrated Continue Watching title (soft-fail open)', async () => {
    enableKidsPgCeiling();
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-continue');
    expect(shelf).toHaveTextContent('Inception');
    const href = within(shelf).getAllByRole('link')[0].getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).not.toContain('content_rating');
  });

  it('fetches a missing library movie so the join can hide a restricted resume row', async () => {
    enableKidsPgCeiling();
    getMovie.mockResolvedValue(R_LIBRARY_MOVIE);
    vi.mocked(userdata.continueWatching).mockReturnValue([MOVIE_PROGRESS]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(getMovie).toHaveBeenCalledWith('movie-42');
    expect(screen.queryByTestId('home-continue')).not.toBeInTheDocument();
  });

  it('hides a restricted Favorites rail title', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE], total: 1 });
    vi.mocked(userdata.listFavorites).mockReturnValue([
      {
        id: 'movie-42',
        kind: 'movie',
        title: 'Inception',
        href: '/movies/movie-42',
        poster_url: '/poster.jpg',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Favorites' })).not.toBeInTheDocument();
  });

  it('hides a restricted Next Up title and stamps content_rating on the player href', async () => {
    enableKidsPgCeiling();
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([
      {
        ...NEXT_UP_ENTRY,
        content_rating: 'TV-MA',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-next-up')).not.toBeInTheDocument();
  });

  it('keeps an allowed Next Up episode and forwards content_rating on its player link', async () => {
    enableKidsPgCeiling();
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([
      {
        ...NEXT_UP_ENTRY,
        title: 'Kids Show S01E02',
        content_rating: 'TV-Y',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-next-up');
    expect(shelf).toHaveTextContent('Kids Show');
    const href = within(shelf).getAllByRole('link')[0].getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).toContain('content_rating=TV-Y');
  });
});

// ---------------------------------------------------------------------------
// Collections shelf
// ---------------------------------------------------------------------------

describe('Collections shelf', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders a collections shelf when server collections are available', async () => {
    listCollections.mockResolvedValue({
      items: [{ id: 'col-1', name: 'MCU', movie_count: 30 }],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-collections');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('MCU');
    expect(shelf).toHaveTextContent('30 titles');
  });

  it('does not render the collections shelf when no server collections exist', async () => {
    listCollections.mockResolvedValue({ items: [] });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-collections')).not.toBeInTheDocument();
  });

  it('collections shelf items link to /collections', async () => {
    listCollections.mockResolvedValue({
      items: [{ id: 'col-2', name: 'Bond Films', movie_count: 25 }],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-collections');
    const link = within(shelf).getByRole('link', { name: /Bond Films/i });
    expect(link.getAttribute('href')).toBe('/collections');
  });
});

// ---------------------------------------------------------------------------
// Playlists shelf
// ---------------------------------------------------------------------------

describe('Playlists shelf', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders a playlists shelf when playlists exist', async () => {
    localStorage.setItem(
      'muxcore.userdata.playlists.v1',
      JSON.stringify([{ id: 'pl-1', name: 'Road Trip Mix', itemIds: ['a', 'b'] }]),
    );

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-playlists');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Road Trip Mix');
    expect(shelf).toHaveTextContent('2 items');
  });

  it('does not render the playlists shelf when no playlists exist', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-playlists')).not.toBeInTheDocument();
  });

  it('playlists shelf items link to /playlists', async () => {
    localStorage.setItem(
      'muxcore.userdata.playlists.v1',
      JSON.stringify([{ id: 'pl-2', name: 'Weekend Watchlist', itemIds: [] }]),
    );

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-playlists');
    const link = within(shelf).getByRole('link', { name: /Weekend Watchlist/i });
    expect(link.getAttribute('href')).toBe('/playlists');
  });
});

describe('Want to Watch rail', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listRequests.mockReset();
    getTVShow.mockReset();
    getMovie.mockReset();
    listCollections.mockReset();
    listCollections.mockResolvedValue({ items: [] });
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders a Want to Watch shelf when titles are saved', async () => {
    vi.mocked(userdata.listWantToWatch).mockReturnValue([
      {
        id: 'movie-pg',
        kind: 'movie',
        title: 'Finding Nemo',
        href: '/movies/movie-pg',
        poster_url: '/poster.jpg',
        tmdbId: 12,
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-want-to-watch');
    expect(shelf).toHaveTextContent('Finding Nemo');
    expect(within(shelf).getByRole('link', { name: /Finding Nemo/i })).toHaveAttribute(
      'href',
      '/movies/movie-pg',
    );
  });

  it('hides a restricted Want to Watch rail title', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
      }),
    );
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-42',
          title: 'Inception',
          year: 2010,
          overview: '',
          runtime: 148,
          vote_average: 8.8,
          genres: ['Sci-Fi'],
          poster_url: '/poster.jpg',
          has_file: true,
          stream_url: '/stream/movies/movie-42',
          created_at: '2026-08-21T00:00:00.000Z',
          content_rating: 'R',
        },
      ],
      total: 1,
    });
    vi.mocked(userdata.listWantToWatch).mockReturnValue([
      {
        id: 'movie-42',
        kind: 'movie',
        title: 'Inception',
        href: '/movies/movie-42',
        poster_url: '/poster.jpg',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-want-to-watch')).not.toBeInTheDocument();
  });
});
