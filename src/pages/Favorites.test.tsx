import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Favorites from './Favorites';
import { toggleFavorite, updatePreferences } from '../lib/userdata';

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
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
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
      <Favorites />
    </MemoryRouter>,
  );
}

describe('Favorites page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getMovie.mockRejectedValue(new Error('not found'));
    getTVShow.mockRejectedValue(new Error('not found'));
  });

  it('shows empty state when no favorites saved', () => {
    renderPage();
    expect(screen.getByTestId('favorites-page')).toBeInTheDocument();
    expect(screen.getByText(/No favorites yet/i)).toBeInTheDocument();
  });

  it('renders saved favorites', () => {
    toggleFavorite({
      id: 'm-42',
      kind: 'movie',
      title: 'Saved Title',
      href: '/movies/m-42',
      poster_url: '',
      year: 1999,
    });
    renderPage();
    expect(screen.getByText('Saved Title')).toBeInTheDocument();
  });
});

describe('Favorites accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('has a page h1, labeled section, and refresh control', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Saved titles (0)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh favorites' })).toBeInTheDocument();
    expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
  });
});

describe('Favorites parental rails', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
    getMovie.mockRejectedValue(new Error('not found'));
    getTVShow.mockRejectedValue(new Error('not found'));
  });

  it('hides a restricted favorite after joining library content_rating', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [R_LIBRARY_MOVIE, PG_LIBRARY_MOVIE], total: 2 });
    toggleFavorite({
      id: 'movie-42',
      kind: 'movie',
      title: 'Inception',
      href: '/movies/movie-42',
      poster_url: '/poster.jpg',
    });
    toggleFavorite({
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

  it('stamps joined content_rating on the favorite card', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({ items: [PG_LIBRARY_MOVIE], total: 1 });
    toggleFavorite({
      id: 'movie-pg',
      kind: 'movie',
      title: 'Finding Nemo',
      href: '/movies/movie-pg',
      poster_url: '/poster.jpg',
    });

    renderPage();

    const card = await screen.findByRole('link', { name: /Finding Nemo/i });
    expect(card).toHaveAttribute('data-content-rating', 'PG');
  });

  it('keeps an unrated favorite (soft-fail open)', async () => {
    enableKidsPgCeiling();
    toggleFavorite({
      id: 'movie-42',
      kind: 'movie',
      title: 'Inception',
      href: '/movies/movie-42',
      poster_url: '/poster.jpg',
    });

    renderPage();

    expect(await screen.findByText('Inception')).toBeInTheDocument();
    const card = screen.getByRole('link', { name: /Inception/i });
    expect(card).not.toHaveAttribute('data-content-rating');
  });

  it('fetches a missing library movie so the join can hide a restricted favorite', async () => {
    enableKidsPgCeiling();
    getMovie.mockResolvedValue(R_LIBRARY_MOVIE);
    toggleFavorite({
      id: 'movie-42',
      kind: 'movie',
      title: 'Inception',
      href: '/movies/movie-42',
      poster_url: '/poster.jpg',
    });

    renderPage();

    await waitFor(() => {
      expect(getMovie).toHaveBeenCalledWith('movie-42');
    });
    await waitFor(() => {
      expect(screen.queryByText('Inception')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('favorites-empty')).toBeInTheDocument();
  });
});
