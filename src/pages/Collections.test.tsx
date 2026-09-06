import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Collections from './Collections';
import { updatePreferences } from '../lib/userdata';
import type { Movie } from '../types';

const listMovies = vi.fn();
const listCollections = vi.fn();
const getCollection = vi.fn();

function movie(partial: Partial<Movie> & Pick<Movie, 'id' | 'title'>): Movie {
  return {
    year: 2020,
    overview: '',
    runtime: 100,
    vote_average: 7,
    genres: ['Action'],
    poster_url: '',
    has_file: true,
    stream_url: `/stream/movies/${partial.id}`,
    created_at: '',
    ...partial,
  };
}

function enableKidsPgCeiling() {
  updatePreferences({
    parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false },
  });
}

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listCollections: (...args: unknown[]) => listCollections(...args),
      getCollection: (...args: unknown[]) => getCollection(...args),
    },
  };
});

describe('Collections page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listCollections.mockReset();
    getCollection.mockReset();
    listMovies.mockResolvedValue({
      items: [
        movie({ id: '1', title: 'Action One', year: 2020, runtime: 0, vote_average: 0, stream_url: '' }),
        movie({ id: '2', title: 'Action Two', year: 2021, runtime: 0, vote_average: 0, stream_url: '' }),
      ],
      total: 2,
    });
    listCollections.mockResolvedValue({
      items: [{ id: '10', name: 'MCU', movie_count: 3 }],
    });
  });

  it('renders server collections and genre groups', async () => {
    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('collections-page')).toBeInTheDocument();
    expect(await screen.findByText('MCU')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('opens a collection as a horizontal shelf on click', async () => {
    getCollection.mockResolvedValue({
      id: '10',
      name: 'MCU',
      movies: [movie({ id: 'm1', title: 'Iron Man', year: 2008, runtime: 126, vote_average: 7.9 })],
    });

    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );

    const openBtn = await screen.findByRole('button', { name: /Open MCU collection/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByTestId('collection-shelf')).toBeInTheDocument();
    });
    expect(screen.getByText('Iron Man')).toBeInTheDocument();
  });

  it('closes the shelf when the close button is clicked', async () => {
    getCollection.mockResolvedValue({
      id: '10',
      name: 'MCU',
      movies: [movie({ id: 'm1', title: 'Iron Man', year: 2008, runtime: 126, vote_average: 7.9 })],
    });

    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );

    const openBtn = await screen.findByRole('button', { name: /Open MCU collection/i });
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByTestId('collection-shelf')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Close MCU collection/i }));
    expect(screen.queryByTestId('collection-shelf')).not.toBeInTheDocument();
  });

  it('hides an R-rated title from genre shelves under kids mode / maxRating', async () => {
    enableKidsPgCeiling();
    listMovies.mockResolvedValue({
      items: [
        movie({ id: 'pg-1', title: 'Finding Nemo', content_rating: 'PG', genres: ['Family'] }),
        movie({ id: 'pg-2', title: 'Toy Story', content_rating: 'G', genres: ['Family'] }),
        movie({ id: 'r-1', title: 'Deadpool', content_rating: 'R', genres: ['Family'] }),
      ],
      total: 3,
    });

    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Finding Nemo')).toBeInTheDocument();
    expect(screen.getByText('Toy Story')).toBeInTheDocument();
    expect(screen.queryByText('Deadpool')).not.toBeInTheDocument();
  });

  it('hides an R-rated title from an opened box-set shelf under kids mode / maxRating', async () => {
    enableKidsPgCeiling();
    getCollection.mockResolvedValue({
      id: '10',
      name: 'MCU',
      movies: [
        movie({ id: 'pg-1', title: 'Finding Nemo', content_rating: 'PG' }),
        movie({ id: 'r-1', title: 'Deadpool', content_rating: 'R' }),
      ],
    });

    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Open MCU collection/i }));

    await waitFor(() => {
      expect(screen.getByTestId('collection-shelf')).toBeInTheDocument();
    });
    expect(screen.getByText('Finding Nemo')).toBeInTheDocument();
    expect(screen.queryByText('Deadpool')).not.toBeInTheDocument();
  });
});

describe('Collections accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listCollections.mockReset();
    getCollection.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listCollections.mockResolvedValue({ items: [] });
  });

  it('has a page h1 and announces loading on initial render', () => {
    listMovies.mockImplementation(() => new Promise(() => {}));
    listCollections.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Collections' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading collections' })).toBeInTheDocument();
  });
});
