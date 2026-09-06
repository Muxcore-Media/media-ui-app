import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GenreLanding from './GenreLanding';

const listMovies = vi.fn();
const listTVShows = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
    },
  };
});

const DRAMA_MOVIE = {
  id: 'movie-drama-1',
  title: 'The Crown',
  year: 2023,
  overview: 'A drama film',
  runtime: 120,
  vote_average: 8.5,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '/stream/movie-drama-1',
  created_at: '2024-01-01T00:00:00Z',
};

const DRAMA_SHOW = {
  id: 'show-drama-1',
  title: 'Succession',
  year: 2022,
  overview: 'A drama show',
  vote_average: 9.2,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
};

const ACTION_MOVIE = {
  id: 'movie-action-1',
  title: 'Mad Max',
  year: 2015,
  overview: '',
  runtime: 120,
  vote_average: 8.1,
  genres: ['Action'],
  poster_url: '',
  has_file: true,
  stream_url: '/stream/movie-action-1',
  created_at: '2024-01-01T00:00:00Z',
};

function renderGenreLanding(genre = 'Drama') {
  return render(
    <MemoryRouter initialEntries={[`/genre/${encodeURIComponent(genre)}`]}>
      <Routes>
        <Route path="/genre/:name" element={<GenreLanding />} />
        <Route path="/movies" element={<div>Movies page</div>} />
        <Route path="/tv" element={<div>TV page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GenreLanding page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('renders the page with the genre name in the heading', async () => {
    renderGenreLanding('Drama');
    expect(await screen.findByRole('heading', { level: 1, name: 'Drama' })).toBeInTheDocument();
    expect(screen.getByTestId('genre-landing-page')).toBeInTheDocument();
  });

  it('shows breadcrumb with the genre name', async () => {
    renderGenreLanding('Sci-Fi');
    await screen.findByRole('heading', { level: 1, name: 'Sci-Fi' });
    expect(screen.getByText('Sci-Fi', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('displays matching movies', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE, ACTION_MOVIE], total: 2 });
    renderGenreLanding('Drama');
    expect(await screen.findByText('The Crown')).toBeInTheDocument();
    expect(screen.queryByText('Mad Max')).not.toBeInTheDocument();
  });

  it('displays matching TV shows', async () => {
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    expect(await screen.findByText('Succession')).toBeInTheDocument();
  });

  it('displays both movies and shows matching the genre', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    expect(await screen.findByText('The Crown')).toBeInTheDocument();
    expect(await screen.findByText('Succession')).toBeInTheDocument();
  });

  it('shows an empty state when no titles match the genre', async () => {
    renderGenreLanding('Horror');
    expect(await screen.findByTestId('genre-empty')).toBeInTheDocument();
  });

  it('shows a title count in the page description', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    await screen.findByText(/2 titles/i);
  });

  it('shows filter buttons when content exists', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    await screen.findByText('The Crown');
    expect(screen.getByRole('group', { name: /filter by content type/i })).toBeInTheDocument();
  });

  it('filters to only movies when "Movies" button is pressed', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    await screen.findByText('The Crown');

    fireEvent.click(screen.getByRole('button', { name: /movies/i }));
    expect(screen.getByText('The Crown')).toBeInTheDocument();
    expect(screen.queryByText('Succession')).not.toBeInTheDocument();
  });

  it('filters to only TV shows when "TV Shows" button is pressed', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    await screen.findByText('Succession');

    fireEvent.click(screen.getByRole('button', { name: /tv shows/i }));
    expect(screen.getByText('Succession')).toBeInTheDocument();
    expect(screen.queryByText('The Crown')).not.toBeInTheDocument();
  });

  it('shows all results again when "All" button is pressed after filtering', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    await screen.findByText('The Crown');

    fireEvent.click(screen.getByRole('button', { name: /movies/i }));
    expect(screen.queryByText('Succession')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all/i }));
    await waitFor(() => {
      expect(screen.getByText('The Crown')).toBeInTheDocument();
      expect(screen.getByText('Succession')).toBeInTheDocument();
    });
  });

  it('does not show filter buttons when no content matches', async () => {
    renderGenreLanding('Horror');
    await screen.findByTestId('genre-empty');
    expect(screen.queryByRole('group', { name: /filter by content type/i })).not.toBeInTheDocument();
  });

  it('URL-decodes the genre name from the route param', async () => {
    listMovies.mockResolvedValue({
      items: [
        {
          ...DRAMA_MOVIE,
          title: 'Sci-Fi Movie',
          genres: ['Science Fiction'],
        },
      ],
      total: 1,
    });
    renderGenreLanding('Science Fiction');
    expect(await screen.findByRole('heading', { level: 1, name: 'Science Fiction' })).toBeInTheDocument();
    expect(await screen.findByText('Sci-Fi Movie')).toBeInTheDocument();
  });

  it('applies parental filter: restricted titles are excluded', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false } }),
    );
    listMovies.mockResolvedValue({
      items: [
        { ...DRAMA_MOVIE, content_rating: 'R' },
        { ...DRAMA_MOVIE, id: 'movie-pg', title: 'Friendly Drama', content_rating: 'PG' },
      ],
      total: 2,
    });
    renderGenreLanding('Drama');
    await screen.findByText('Friendly Drama');
    expect(screen.queryByText('The Crown')).not.toBeInTheDocument();
  });

  it('movie cards link to the detail page', async () => {
    listMovies.mockResolvedValue({ items: [DRAMA_MOVIE], total: 1 });
    renderGenreLanding('Drama');
    const link = await screen.findByRole('link', { name: /The Crown/i });
    expect(link.getAttribute('href')).toBe('/movies/movie-drama-1');
  });

  it('show cards link to the TV detail page', async () => {
    listTVShows.mockResolvedValue({ items: [DRAMA_SHOW], total: 1 });
    renderGenreLanding('Drama');
    const link = await screen.findByRole('link', { name: /Succession/i });
    expect(link.getAttribute('href')).toBe('/tv/show-drama-1');
  });
});

describe('GenreLanding — loading and error states', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
  });

  it('shows a loading status while fetching', () => {
    listMovies.mockImplementation(() => new Promise(() => {}));
    listTVShows.mockImplementation(() => new Promise(() => {}));
    renderGenreLanding('Drama');
    expect(screen.getByRole('status', { name: /loading drama titles/i })).toBeInTheDocument();
  });

  it('shows an error banner when the API fails', async () => {
    listMovies.mockRejectedValue(new Error('Network error'));
    listTVShows.mockRejectedValue(new Error('Network error'));
    renderGenreLanding('Drama');
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
    });
  });
});
