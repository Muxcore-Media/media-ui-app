import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Studios from './Studios';

const listMovies = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
    },
  };
});

const MCU_MOVIE = {
  id: '1',
  title: 'Iron Man',
  year: 2008,
  overview: '',
  runtime: 0,
  vote_average: 0,
  genres: ['Action'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '',
  collection_name: 'Marvel Cinematic Universe',
};

const ACTION_MOVIE = {
  id: '2',
  title: 'Die Hard',
  year: 1988,
  overview: '',
  runtime: 0,
  vote_average: 0,
  genres: ['Action'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '',
};

describe('Studios page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listMovies.mockResolvedValue({
      items: [MCU_MOVIE, ACTION_MOVIE],
      total: 2,
    });
  });

  it('lists studio buckets from collections and genres', async () => {
    render(
      <MemoryRouter>
        <Studios />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('studios-page')).toBeInTheDocument();
    expect(await screen.findByText('Marvel Cinematic Universe')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies parental filter: restricted titles are excluded from counts and grid', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false } }),
    );
    listMovies.mockResolvedValue({
      items: [
        { ...MCU_MOVIE, content_rating: 'R' },
        { ...MCU_MOVIE, id: 'movie-pg', title: 'Safe Movie', content_rating: 'G' },
        { ...ACTION_MOVIE, content_rating: 'R' },
        { ...ACTION_MOVIE, id: 'movie-pg-action', title: 'Safe Action', content_rating: 'PG' },
      ],
      total: 4,
    });

    render(
      <MemoryRouter>
        <Studios />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('studios-page')).toBeInTheDocument();
    expect(screen.getByText('Marvel Cinematic Universe')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.queryByText('Iron Man')).not.toBeInTheDocument();
    expect(screen.queryByText('Die Hard')).not.toBeInTheDocument();

    // Aggregate counts exclude restricted titles (1 safe title per bucket).
    expect(screen.getAllByText('1')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /Marvel Cinematic Universe/i }));
    expect(await screen.findByText('Safe Movie')).toBeInTheDocument();
    expect(screen.queryByText('Iron Man')).not.toBeInTheDocument();
  });
});
