import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PersonDetail from './PersonDetail';

const getPersonCredits = vi.fn();
const listMovies = vi.fn();
const listTVShows = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      getPersonCredits: (...args: unknown[]) => getPersonCredits(...args),
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
    },
  };
});

const emptyLibrary = { items: [], total: 0, page: 1, page_size: 500 };

const samplePerson = {
  id: 287,
  name: 'Brad Pitt',
  biography: 'American actor and film producer.',
  birthday: '1963-12-18',
  profilePath: '/brad.jpg',
  credits: [
    { tmdbId: 807, title: 'Se7en', year: 1995, mediaType: 'movie' as const, character: 'Mills', poster: '/se7en.jpg' },
    { tmdbId: 550, title: 'Fight Club', year: 1999, mediaType: 'movie' as const, character: 'Tyler Durden', poster: '/fc.jpg' },
    { tmdbId: 1396, title: 'Breaking Bad', year: 2008, mediaType: 'tv' as const, character: 'Heisenberg', poster: '/bb.jpg' },
  ],
};

const movieLibrary = {
  items: [
    { id: 'm-807', title: 'Se7en', year: 1995, tmdb_id: 807, vote_average: 8.5, genres: ['Crime'], poster_url: '', has_file: true, stream_url: '/stream/m-807', overview: '', runtime: 127, created_at: '' },
    { id: 'm-550', title: 'Fight Club', year: 1999, tmdb_id: 550, vote_average: 8.4, genres: ['Drama'], poster_url: '', has_file: true, stream_url: '/stream/m-550', overview: '', runtime: 139, created_at: '' },
  ],
  total: 2,
  page: 1,
  page_size: 500,
};

const tvLibrary = {
  items: [
    { id: 'tv-1396', title: 'Breaking Bad', year: 2008, tmdb_id: 1396, vote_average: 9.5, genres: ['Drama'], poster_url: '', has_file: true, stream_url: '', overview: '', created_at: '' },
  ],
  total: 1,
  page: 1,
  page_size: 500,
};

function renderPage(path = '/person/287') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/person/:id" element={<PersonDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PersonDetail page', () => {
  beforeEach(() => {
    getPersonCredits.mockReset();
    listMovies.mockReset();
    listTVShows.mockReset();
  });

  it('renders person name and library title matches', async () => {
    getPersonCredits.mockResolvedValue(samplePerson);
    listMovies.mockResolvedValue(movieLibrary);
    listTVShows.mockResolvedValue(tvLibrary);

    renderPage();

    expect(await screen.findByTestId('person-detail-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Brad Pitt' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Se7en/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fight Club/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Breaking Bad/i })).toBeInTheDocument();
  });

  it('shows soft-empty state when no credits match library', async () => {
    getPersonCredits.mockResolvedValue(samplePerson);
    listMovies.mockResolvedValue(emptyLibrary);
    listTVShows.mockResolvedValue(emptyLibrary);

    renderPage();

    expect(await screen.findByTestId('person-empty')).toBeInTheDocument();
    expect(screen.getByText(/No titles featuring Brad Pitt/i)).toBeInTheDocument();
  });

  it('shows error banner when person fetch fails', async () => {
    getPersonCredits.mockRejectedValue(new Error('Not found'));
    listMovies.mockResolvedValue(emptyLibrary);
    listTVShows.mockResolvedValue(emptyLibrary);

    renderPage();

    expect(await screen.findByTestId('person-detail-page')).toBeInTheDocument();
    // The error banner should display the error message
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('shows error for invalid person id', async () => {
    renderPage('/person/abc');

    expect(await screen.findByTestId('person-detail-page')).toBeInTheDocument();
    expect(screen.getByText(/Person not found/i)).toBeInTheDocument();
  });

  it('links back to home', async () => {
    getPersonCredits.mockResolvedValue(samplePerson);
    listMovies.mockResolvedValue(emptyLibrary);
    listTVShows.mockResolvedValue(emptyLibrary);

    renderPage();

    await screen.findByTestId('person-detail-page');
    expect(screen.getByRole('link', { name: /Back to home/i })).toHaveAttribute('href', '/');
  });
});
