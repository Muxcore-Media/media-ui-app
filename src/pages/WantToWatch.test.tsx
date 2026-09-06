import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WantToWatch from './WantToWatch';
import { toggleWantToWatch, updatePreferences } from '../lib/userdata';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const getMovie = vi.fn();
const getTVShow = vi.fn();
const requestTitle = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
      requestTitle: (...args: unknown[]) => requestTitle(...args),
    },
  };
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

function enableKidsPgCeiling() {
  updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WantToWatch />
    </MemoryRouter>,
  );
}

describe('Want to Watch page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    requestTitle.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getMovie.mockRejectedValue(new Error('not found'));
    getTVShow.mockRejectedValue(new Error('not found'));
    requestTitle.mockResolvedValue({ status: 'requested' });
  });

  it('shows empty state when no titles are saved', () => {
    renderPage();
    expect(screen.getByTestId('want-to-watch-page')).toBeInTheDocument();
    expect(screen.getByTestId('want-to-watch-empty')).toBeInTheDocument();
    expect(screen.getByText(/Nothing on your list yet/i)).toBeInTheDocument();
  });

  it('renders saved titles and one-tap request', async () => {
    toggleWantToWatch({
      id: 'tmdb:movie:550',
      kind: 'movie',
      title: 'Fight Club',
      href: '/discover/movie/550',
      year: 1999,
      tmdbId: 550,
      overview: 'soap',
      poster: '/p.jpg',
    });
    renderPage();
    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request' }));
    await waitFor(() => {
      expect(requestTitle).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: 550, title: 'Fight Club', mediaType: 'movie' }),
      );
    });
    expect(await screen.findByText('Requested')).toBeInTheDocument();
  });

  it('removes a saved title', async () => {
    toggleWantToWatch({
      id: 'tmdb:movie:550',
      kind: 'movie',
      title: 'Fight Club',
      href: '/discover/movie/550',
      tmdbId: 550,
    });
    renderPage();
    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Fight Club from Want to Watch' }));
    expect(await screen.findByTestId('want-to-watch-empty')).toBeInTheDocument();
  });
});

describe('Want to Watch accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    requestTitle.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('has a page h1, labeled section, and refresh control', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Want to Watch' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Saved titles (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Want to Watch' })).toBeInTheDocument();
    expect(screen.getByTestId('want-to-watch-empty')).toBeInTheDocument();
  });
});

describe('Want to Watch parental rails', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    requestTitle.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getMovie.mockRejectedValue(new Error('not found'));
    getTVShow.mockRejectedValue(new Error('not found'));
  });

  it('hides a restricted title after joining library content_rating', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE, PG_LIBRARY_MOVIE], total: 2 });
    toggleWantToWatch({
      id: 'movie-42',
      kind: 'movie',
      title: 'Inception',
      href: '/movies/movie-42',
      poster_url: '/poster.jpg',
    });
    toggleWantToWatch({
      id: 'movie-pg',
      kind: 'movie',
      title: 'Finding Nemo',
      href: '/movies/movie-pg',
      poster_url: '/poster.jpg',
    });

    renderPage();

    expect(await screen.findByText('Finding Nemo')).toBeInTheDocument();
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Saved titles (1)' })).toBeInTheDocument();
  });
});
