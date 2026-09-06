import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import * as userdata from '../lib/userdata';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const listRequests = vi.fn();
const getTVShow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listRequests: (...args: unknown[]) => listRequests(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
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
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    // Restore mocks that a previous test may have overridden (e.g. loading test).
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
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
    listRequests.mockResolvedValue([]);
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    vi.mocked(userdata.pullUserdataFromServer).mockResolvedValue(true);
    vi.mocked(userdata.continueWatching).mockReturnValue([]);
    vi.mocked(userdata.listFavorites).mockReturnValue([]);
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
