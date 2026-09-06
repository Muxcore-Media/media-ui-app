import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Queue from './Queue';
import { updatePreferences } from '../lib/userdata';

const listQueue = vi.fn();
const continueWatching = vi.fn();
const listFavorites = vi.fn();
const listRequests = vi.fn();
const listMovies = vi.fn();
const listTVShows = vi.fn();
const getMovie = vi.fn();
const getTVShow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listRequests: (...args: unknown[]) => listRequests(...args),
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
    },
  };
});

vi.mock('../lib/userdata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/userdata')>();
  return {
    ...actual,
    listQueue: (...args: unknown[]) => listQueue(...args),
    continueWatching: (...args: unknown[]) => continueWatching(...args),
    listFavorites: (...args: unknown[]) => listFavorites(...args),
    clearQueue: vi.fn(),
    dequeue: vi.fn(),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Queue />
    </MemoryRouter>,
  );
}

function resetQueueMocks() {
  listQueue.mockReset();
  continueWatching.mockReset();
  listFavorites.mockReset();
  listRequests.mockReset();
  listMovies.mockReset();
  listTVShows.mockReset();
  getMovie.mockReset();
  getTVShow.mockReset();
  listQueue.mockReturnValue([]);
  continueWatching.mockReturnValue([]);
  listFavorites.mockReturnValue([]);
  listRequests.mockResolvedValue([]);
  listMovies.mockResolvedValue({ items: [], total: 0 });
  listTVShows.mockResolvedValue({ items: [], total: 0 });
  getMovie.mockRejectedValue(new Error('not found'));
  getTVShow.mockRejectedValue(new Error('not found'));
}

describe('Queue page', () => {
  beforeEach(() => {
    localStorage.clear();
    resetQueueMocks();
  });

  it('shows empty state when queue and suggestions are empty', () => {
    renderPage();

    expect(screen.getByTestId('queue-page')).toBeInTheDocument();
    expect(screen.getByTestId('queue-empty')).toBeInTheDocument();
    expect(screen.getByText('Queue empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
  });

  it('labels suggestion list for screen readers when queue is empty', () => {
    continueWatching.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Suggested Movie',
        href: '/movies/m1',
        positionSec: 100,
        durationSec: 1000,
        updatedAt: '',
      },
    ]);

    renderPage();

    expect(screen.getByRole('list', { name: /Suggested picks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suggested Movie' })).toHaveAttribute(
      'href',
      '/movies/m1',
    );
  });

  it('shows API statusLabel and statusDetail on rows when queue item matches an active request', async () => {
    listQueue.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Stalled Movie',
        href: '/movies/m1',
      },
      {
        id: 's1',
        kind: 'tv',
        title: 'Detail Show',
        href: '/tv/s1',
      },
    ]);
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-stalled',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Stalled Movie',
        year: 2020,
        poster: '',
        status: 'stalled',
        statusLabel: 'Stalled — no peers',
        statusDetail: 'no peers',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'r-detail',
        itemType: 'tv',
        itemId: 's1',
        tmdbId: 2,
        title: 'Detail Show',
        year: 2021,
        poster: '',
        status: 'import_failed',
        statusLabel: 'Import failed',
        statusDetail: 'path not under a scanner watch directory',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Stalled — no peers')).toBeInTheDocument();
    });
    expect(screen.queryByText('no peers')).not.toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText('path not under a scanner watch directory')).toBeInTheDocument();
  });
});

describe('Queue accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    resetQueueMocks();
  });

  it('has a page h1 and labeled queue section when items are shown', () => {
    listQueue.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Queued Movie',
        href: '/movies/m1',
      },
    ]);

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Playback queue' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Playback queue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play Queued Movie' })).toHaveAttribute(
      'href',
      '/movies/m1',
    );
  });
});

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

function enableKidsPgCeiling() {
  updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

describe('Queue parental rails', () => {
  beforeEach(() => {
    localStorage.clear();
    resetQueueMocks();
  });

  it('hides a restricted Continue Watching seed after joining library content_rating', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE, PG_LIBRARY_MOVIE], total: 2 });
    continueWatching.mockReturnValue([
      MOVIE_PROGRESS,
      {
        ...MOVIE_PROGRESS,
        id: 'movie-pg',
        title: 'Finding Nemo',
        href: '/movies/movie-pg',
        stream_url: '/stream/movies/movie-pg',
      },
    ]);

    renderPage();

    expect(await screen.findByRole('link', { name: 'Finding Nemo' })).toBeInTheDocument();
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('forwards joined content_rating on the resume player href', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [PG_LIBRARY_MOVIE], total: 1 });
    continueWatching.mockReturnValue([
      {
        ...MOVIE_PROGRESS,
        id: 'movie-pg',
        title: 'Finding Nemo',
        href: '/movies/movie-pg',
        stream_url: '/stream/movies/movie-pg',
      },
    ]);

    renderPage();

    const play = await screen.findByRole('link', { name: 'Play Finding Nemo' });
    const href = play.getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).toContain('content_rating=PG');
  });

  it('keeps an unrated Continue Watching seed (soft-fail open)', async () => {
    enableKidsPgCeiling();
    continueWatching.mockReturnValue([MOVIE_PROGRESS]);

    renderPage();

    const play = await screen.findByRole('link', { name: 'Play Inception' });
    const href = play.getAttribute('href') ?? '';
    expect(href).toContain('/player');
    expect(href).not.toContain('content_rating');
  });

  it('fetches a missing library movie so the join can hide a restricted resume row', async () => {
    enableKidsPgCeiling();
    getMovie.mockResolvedValue(R_LIBRARY_MOVIE);
    continueWatching.mockReturnValue([MOVIE_PROGRESS]);

    renderPage();

    await waitFor(() => {
      expect(getMovie).toHaveBeenCalledWith('movie-42');
    });
    await waitFor(() => {
      expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queue-empty')).toBeInTheDocument();
  });

  it('hides a restricted persisted queue title and stamps content_rating on an allowed play link', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE, PG_LIBRARY_MOVIE], total: 2 });
    listQueue.mockReturnValue([
      {
        id: 'movie-42',
        kind: 'movie',
        title: 'Inception',
        href: '/movies/movie-42',
        stream_url: '/stream/movies/movie-42',
      },
      {
        id: 'movie-pg',
        kind: 'movie',
        title: 'Finding Nemo',
        href: '/movies/movie-pg',
        stream_url: '/stream/movies/movie-pg',
      },
    ]);

    renderPage();

    const play = await screen.findByRole('link', { name: 'Play Finding Nemo' });
    expect(play.getAttribute('href') ?? '').toContain('content_rating=PG');
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('hides a restricted favorites seed', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE], total: 1 });
    listFavorites.mockReturnValue([
      {
        id: 'movie-42',
        kind: 'movie',
        title: 'Inception',
        href: '/movies/movie-42',
        poster_url: '/poster.jpg',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('queue-empty')).toBeInTheDocument();
  });
});
