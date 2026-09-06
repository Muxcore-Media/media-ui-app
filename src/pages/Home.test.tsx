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

// ---------------------------------------------------------------------------
// Recently Added rail — deduplication (umbrella #97)
// ---------------------------------------------------------------------------

describe('Recently Added rail — deduplication', () => {
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

  it('omits a title from Recently Added when it is already in Continue Watching', async () => {
    const MOVIE = {
      id: 'movie-overlap',
      title: 'Overlap Movie',
      year: 2026,
      overview: '',
      runtime: 90,
      vote_average: 7,
      genres: [],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/movie-overlap',
      created_at: '2026-09-01T00:00:00.000Z',
    };
    listMovies.mockResolvedValue({ items: [MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.continueWatching).mockReturnValue([
      {
        id: 'movie-overlap',
        kind: 'movie',
        title: 'Overlap Movie',
        href: '/movies/movie-overlap',
        stream_url: '/stream/movies/movie-overlap',
        positionSec: 600,
        durationSec: 5400,
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Continue Watching should have the title …
    const cwShelf = await screen.findByTestId('home-continue');
    expect(cwShelf).toHaveTextContent('Overlap Movie');
    // … but Recently Added should be absent (soft-hidden when empty after dedupe).
    expect(screen.queryByTestId('home-recently-added')).not.toBeInTheDocument();
  });

  it('omits a title from Recently Added when it is already in Next Up', async () => {
    const SHOW = {
      id: 'show-overlap',
      title: 'Overlap Show',
      year: 2026,
      overview: '',
      runtime: 0,
      vote_average: 8,
      genres: [],
      poster_url: '',
      has_file: true,
      stream_url: '',
      created_at: '2026-09-02T00:00:00.000Z',
      seasons: [],
    };
    listTVShows.mockResolvedValue({ items: [SHOW], total: 1 });
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([
      {
        id: 'show-overlap',
        kind: 'episode',
        title: 'Overlap Show S01E01',
        href: '/player?src=/stream/tv/ep-1&id=show-overlap&kind=episode',
        subtitle: 'Next up',
        showId: 'show-overlap',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Next Up should be visible with the show …
    const nextUpShelf = await screen.findByTestId('home-next-up');
    expect(nextUpShelf).toHaveTextContent('Overlap Show');
    // … and Recently Added should be absent after dedupe.
    expect(screen.queryByTestId('home-recently-added')).not.toBeInTheDocument();
  });

  it('still shows Recently Added when the overlapping title is in a different rail', async () => {
    // One movie in CW, a *different* movie in Recently Added — both appear.
    const CW_MOVIE = {
      id: 'movie-cw',
      title: 'CW Movie',
      year: 2026,
      overview: '',
      runtime: 90,
      vote_average: 7,
      genres: [],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/movie-cw',
      created_at: '2026-09-01T00:00:00.000Z',
    };
    const NEW_MOVIE = {
      id: 'movie-new',
      title: 'Brand New Movie',
      year: 2026,
      overview: '',
      runtime: 100,
      vote_average: 8,
      genres: [],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/movie-new',
      created_at: '2026-09-03T00:00:00.000Z',
    };
    listMovies.mockResolvedValue({ items: [CW_MOVIE, NEW_MOVIE], total: 2 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.continueWatching).mockReturnValue([
      {
        id: 'movie-cw',
        kind: 'movie',
        title: 'CW Movie',
        href: '/movies/movie-cw',
        stream_url: '/stream/movies/movie-cw',
        positionSec: 300,
        durationSec: 5400,
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Continue Watching shows the CW title …
    const cwShelf = await screen.findByTestId('home-continue');
    expect(cwShelf).toHaveTextContent('CW Movie');
    // … and Recently Added shows the non-overlapping new title.
    const raShelf = await screen.findByTestId('home-recently-added');
    expect(raShelf).toHaveTextContent('Brand New Movie');
    expect(raShelf).not.toHaveTextContent('CW Movie');
  });

  it('hides Recently Added shelf when all items lack has_file', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'no-file',
          title: 'Unavailable Title',
          year: 2026,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: [],
          poster_url: '',
          has_file: false,
          stream_url: '',
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-recently-added')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Upcoming / On The Air rail (umbrella #100)
// ---------------------------------------------------------------------------

/** Returns an ISO date string for `offsetDays` days from today's date. */
function futureDateIso(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const SHOW_WITH_UPCOMING = {
  id: 'show-upcoming',
  title: 'Drama Series',
  year: 2024,
  overview: '',
  vote_average: 8,
  genres: ['Drama'],
  poster_url: '/poster-drama.jpg',
  has_file: true,
  stream_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
  seasons: [
    {
      id: 'season-1',
      season_number: 1,
      name: 'Season 1',
      episode_count: 2,
      poster_url: '',
      episodes: [
        {
          id: 'ep-upcoming-1',
          season_number: 1,
          episode_number: 5,
          title: 'The Storm',
          overview: '',
          runtime: 50,
          has_file: false,
          stream_url: '',
          air_date: futureDateIso(7),
        },
        {
          id: 'ep-aired-1',
          season_number: 1,
          episode_number: 4,
          title: 'The Calm',
          overview: '',
          runtime: 50,
          has_file: true,
          stream_url: '/stream/ep-aired-1',
          air_date: futureDateIso(-2),
        },
      ],
    },
  ],
};

describe('Upcoming / On The Air rail', () => {
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
    getTVShow.mockRejectedValue(new Error('not found'));
    getMovie.mockRejectedValue(new Error('not found'));
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders the upcoming shelf when shows have episodes with air dates in window', async () => {
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-upcoming');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveTextContent('Drama Series');
  });

  it('shows episode code and title within the upcoming card', async () => {
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-upcoming');
    // Both upcoming and recently-aired episodes should appear in the shelf.
    expect(shelf).toHaveTextContent('S01E05');
    expect(shelf).toHaveTextContent('S01E04');
  });

  it('is soft-hidden when no shows have episodes in the air-date window', async () => {
    const OLD_SHOW = {
      ...SHOW_WITH_UPCOMING,
      id: 'show-old',
      seasons: [
        {
          id: 'season-1',
          season_number: 1,
          name: 'Season 1',
          episode_count: 1,
          poster_url: '',
          episodes: [
            {
              id: 'ep-old',
              season_number: 1,
              episode_number: 1,
              title: 'Old Episode',
              overview: '',
              runtime: 45,
              has_file: true,
              stream_url: '/stream/ep-old',
              air_date: futureDateIso(-60),
            },
          ],
        },
      ],
    };
    listTVShows.mockResolvedValue({ items: [OLD_SHOW], total: 1 });
    getTVShow.mockResolvedValue(OLD_SHOW);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Wait for page to fully load (empty feed shows the Home heading).
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-upcoming')).not.toBeInTheDocument();
  });

  it('is soft-hidden when shows have no air-date data', async () => {
    const NO_DATE_SHOW = {
      ...SHOW_WITH_UPCOMING,
      id: 'show-no-date',
      seasons: [
        {
          id: 'season-1',
          season_number: 1,
          name: 'Season 1',
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
              // air_date absent
            },
          ],
        },
      ],
    };
    listTVShows.mockResolvedValue({ items: [NO_DATE_SHOW], total: 1 });
    getTVShow.mockResolvedValue(NO_DATE_SHOW);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-upcoming')).not.toBeInTheDocument();
  });

  it('is soft-hidden when the showUpcoming preference is disabled', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        display: { theme: 'dark', libraryPageSize: 48, showWatchedIndicators: true },
        home: {
          showContinueWatching: true,
          showFavorites: true,
          showRecentRequests: true,
          showNextUp: true,
          showRecentlyAdded: true,
          showUpcoming: false,
          showCollections: true,
          showPlaylists: true,
          showWantToWatch: true,
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
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-page');
    // Wait for any async operations to settle.
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-upcoming')).not.toBeInTheDocument();
  });

  it('deduplicates: a show already in Continue Watching does not appear in upcoming', async () => {
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);
    vi.mocked(userdata.continueWatching).mockReturnValue([
      {
        id: 'show-upcoming',
        kind: 'tv',
        title: 'Drama Series',
        href: '/tv/show-upcoming',
        stream_url: '',
        positionSec: 600,
        durationSec: 3000,
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // CW should be visible.
    const cwShelf = await screen.findByTestId('home-continue');
    expect(cwShelf).toHaveTextContent('Drama Series');

    // Upcoming should be hidden (all episodes belong to the excluded show).
    await screen.findByTestId('home-continue'); // ensure load settled
    expect(screen.queryByTestId('home-upcoming')).not.toBeInTheDocument();
  });

  it('an in-library episode card links to the player', async () => {
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-upcoming');
    // ep-aired-1 has has_file=true — its card should link to the player.
    const links = within(shelf).getAllByRole('link');
    const playerLinks = links.filter((l) => (l.getAttribute('href') ?? '').includes('/player'));
    expect(playerLinks.length).toBeGreaterThan(0);
    const href = playerLinks[0].getAttribute('href') ?? '';
    expect(href).toContain('ep-aired-1');
  });

  it('a not-yet-available episode card links to the show detail page', async () => {
    // Only include the upcoming (no file) episode.
    const UPCOMING_ONLY = {
      ...SHOW_WITH_UPCOMING,
      seasons: [
        {
          id: 'season-1',
          season_number: 1,
          name: 'Season 1',
          episode_count: 1,
          poster_url: '',
          episodes: [SHOW_WITH_UPCOMING.seasons[0].episodes[0]], // ep-upcoming-1, has_file=false
        },
      ],
    };
    listTVShows.mockResolvedValue({ items: [UPCOMING_ONLY], total: 1 });
    getTVShow.mockResolvedValue(UPCOMING_ONLY);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-upcoming');
    const link = within(shelf).getByRole('link', { name: /Drama Series/i });
    expect(link.getAttribute('href')).toBe('/tv/show-upcoming');
  });

  it('the shelf "See all" link points to the /upcoming page', async () => {
    listTVShows.mockResolvedValue({ items: [SHOW_WITH_UPCOMING], total: 1 });
    getTVShow.mockResolvedValue(SHOW_WITH_UPCOMING);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-upcoming');
    const seeAll = within(shelf).getByRole('link', { name: /see all/i });
    expect(seeAll.getAttribute('href')).toBe('/upcoming');
  });
});

// ---------------------------------------------------------------------------
// Browse by Genre shelf (umbrella#105)
// ---------------------------------------------------------------------------

describe('Browse by Genre shelf', () => {
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
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
    vi.mocked(userdata.listWantToWatch).mockReturnValue([]);
    vi.mocked(userdata.resolveNextUp).mockResolvedValue([]);
  });

  it('renders the genre shelf when movies have genre metadata', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'movie-drama',
          title: 'Drama Film',
          year: 2024,
          overview: '',
          runtime: 120,
          vote_average: 8,
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movie-drama',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-genres');
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByText('Drama')).toBeInTheDocument();
  });

  it('genre tile shows item count', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm1',
          title: 'Movie A',
          year: 2024,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: ['Comedy'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/m1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'm2',
          title: 'Movie B',
          year: 2024,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: ['Comedy'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/m2',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 2,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-genres');
    expect(within(shelf).getByText('2 titles')).toBeInTheDocument();
  });

  it('genre tile links to /genre/:name', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm-sci',
          title: 'Sci-Fi Flick',
          year: 2024,
          overview: '',
          runtime: 100,
          vote_average: 8,
          genres: ['Sci-Fi'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/m-sci',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const shelf = await screen.findByTestId('home-genres');
    const link = within(shelf).getByRole('link', { name: /Sci-Fi/i });
    expect(link.getAttribute('href')).toBe('/genre/Sci-Fi');
  });

  it('is soft-hidden when library items have no genre data', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'no-genre',
          title: 'No Genre Movie',
          year: 2024,
          overview: '',
          runtime: 90,
          vote_average: 7,
          genres: [],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/no-genre',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Wait for page to finish loading.
    await screen.findByTestId('home-recently-added');
    expect(screen.queryByTestId('home-genres')).not.toBeInTheDocument();
  });

  it('is soft-hidden when all items are empty/absent', async () => {
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-genres')).not.toBeInTheDocument();
  });

  it('respects the showGenres preference — hides shelf when disabled', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({
        home: {
          showContinueWatching: true,
          showFavorites: true,
          showRecentRequests: true,
          showNextUp: true,
          showRecentlyAdded: true,
          showUpcoming: true,
          showCollections: true,
          showPlaylists: true,
          showWantToWatch: true,
          showGenres: false,
        },
      }),
    );
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm-drama',
          title: 'Drama Film',
          year: 2024,
          overview: '',
          runtime: 120,
          vote_average: 8,
          genres: ['Drama'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/m-drama',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Genre data exists but pref is off — shelf should be absent.
    await screen.findByTestId('home-recently-added');
    expect(screen.queryByTestId('home-genres')).not.toBeInTheDocument();
  });

  it('excludes restricted genre counts under parental controls', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false } }),
    );
    listMovies.mockResolvedValue({
      items: [
        {
          id: 'm-r',
          title: 'Restricted Film',
          year: 2024,
          overview: '',
          runtime: 100,
          vote_average: 8,
          genres: ['Horror'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/m-r',
          created_at: '2024-01-01T00:00:00Z',
          content_rating: 'R',
        },
      ],
      total: 1,
    });
    listTVShows.mockResolvedValue({ items: [], total: 0 });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Genre shelf should not appear when all Horror items are parental-filtered out.
    await screen.findByRole('heading', { level: 1, name: 'Home' });
    expect(screen.queryByTestId('home-genres')).not.toBeInTheDocument();
  });
});
