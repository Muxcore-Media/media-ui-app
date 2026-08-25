import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Movies from './Movies';
import type { ListResponse, Movie } from '../types';

const listMovies = vi.fn();
const search = vi.fn();
const requestMovie = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      search: (...args: unknown[]) => search(...args),
      requestMovie: (...args: unknown[]) => requestMovie(...args),
      requestTitle: (...args: unknown[]) => requestMovie(...args),
    },
  };
});

function renderMovies() {
  return render(
    <MemoryRouter>
      <Movies />
    </MemoryRouter>,
  );
}

describe('Movies library list', () => {
  beforeEach(() => {
    listMovies.mockReset();
    search.mockReset();
    requestMovie.mockReset();
  });

  it('shows empty library state when BFF returns no items', async () => {
    listMovies.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>);

    renderMovies();

    await waitFor(() => {
      expect(screen.getByText(/No movies ready to watch yet/i)).toBeInTheDocument();
    });
  });

  it('renders fixture library cards from BFF list payload', async () => {
    listMovies.mockResolvedValueOnce({
      items: [
        {
          id: 'm1',
          title: 'Fight Club',
          year: 1999,
          overview: '',
          runtime: 139,
          vote_average: 8.4,
          genres: [],
          poster_url: '/images/movies/p.jpg',
          has_file: true,
          stream_url: '/stream/movies/m1',
          created_at: '',
        },
      ],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>);

    renderMovies();

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /Fight Club/i });
      expect(links[0]).toHaveAttribute('href', '/movies/m1');
    });
    expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
  });

  it('surfaces auth/BFF errors instead of empty library', async () => {
    listMovies.mockRejectedValueOnce(new Error('unauthorized (auth.required)'));

    renderMovies();

    await waitFor(() => {
      expect(screen.getByText(/unauthorized \(auth\.required\)/i)).toBeInTheDocument();
    });
  });
});

describe('Movies accessibility', () => {
  beforeEach(() => {
    listMovies.mockReset();
  });

  it('has a page h1 and labeled filter controls', async () => {
    listMovies.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>);

    renderMovies();

    expect(screen.getByRole('heading', { level: 1, name: 'Movies' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filter and sort movies' })).toBeInTheDocument();
    expect(screen.getByLabelText('Genre')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading movies' })).toBeInTheDocument();
  });
});
