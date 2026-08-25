import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('Studios page', () => {
  beforeEach(() => {
    listMovies.mockReset();
    listMovies.mockResolvedValue({
      items: [
        {
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
        },
        {
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
        },
      ],
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
});
