import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Collections from './Collections';

const listMovies = vi.fn();
const listCollections = vi.fn();
const getCollection = vi.fn();

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
    listMovies.mockReset();
    listCollections.mockReset();
    getCollection.mockReset();
    listMovies.mockResolvedValue({
      items: [
        {
          id: '1',
          title: 'Action One',
          year: 2020,
          overview: '',
          runtime: 0,
          vote_average: 0,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '',
          created_at: '',
        },
        {
          id: '2',
          title: 'Action Two',
          year: 2021,
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
      movies: [
        {
          id: 'm1',
          title: 'Iron Man',
          year: 2008,
          overview: '',
          runtime: 126,
          vote_average: 7.9,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/m1',
          created_at: '',
        },
      ],
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
      movies: [
        {
          id: 'm1',
          title: 'Iron Man',
          year: 2008,
          overview: '',
          runtime: 126,
          vote_average: 7.9,
          genres: ['Action'],
          poster_url: '',
          has_file: true,
          stream_url: '/stream/movies/m1',
          created_at: '',
        },
      ],
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
});

describe('Collections accessibility', () => {
  beforeEach(() => {
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
