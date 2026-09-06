import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudioLanding from './StudioLanding';

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

const PIXAR_MOVIE = {
  id: 'movie-pixar-1',
  title: 'Inside Out',
  year: 2015,
  overview: 'A Pixar film',
  runtime: 95,
  vote_average: 8.2,
  genres: ['Animation'],
  poster_url: '',
  has_file: true,
  stream_url: '/stream/movie-pixar-1',
  created_at: '2024-01-01T00:00:00Z',
  studio: 'Pixar',
};

const PIXAR_SHOW = {
  id: 'show-pixar-1',
  title: 'Pixar Shorts',
  year: 2022,
  overview: 'Short films',
  vote_average: 8.0,
  genres: ['Animation'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  studio: 'Pixar',
};

const OTHER_MOVIE = {
  id: 'movie-other-1',
  title: 'Dark Knight',
  year: 2008,
  overview: '',
  runtime: 152,
  vote_average: 9.0,
  genres: ['Action'],
  poster_url: '',
  has_file: true,
  stream_url: '/stream/movie-other-1',
  created_at: '2024-01-01T00:00:00Z',
  studio: 'Warner Bros.',
};

function renderStudioLanding(studio = 'Pixar') {
  return render(
    <MemoryRouter initialEntries={[`/studio/${encodeURIComponent(studio)}`]}>
      <Routes>
        <Route path="/studio/:name" element={<StudioLanding />} />
        <Route path="/movies" element={<div>Movies page</div>} />
        <Route path="/tv" element={<div>TV page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StudioLanding page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('renders the studio name in the heading', async () => {
    renderStudioLanding('Pixar');
    expect(await screen.findByRole('heading', { level: 1, name: 'Pixar' })).toBeInTheDocument();
    expect(screen.getByTestId('studio-landing-page')).toBeInTheDocument();
  });

  it('shows a breadcrumb with the studio name', async () => {
    renderStudioLanding('Pixar');
    await screen.findByRole('heading', { level: 1, name: 'Pixar' });
    expect(screen.getByText('Pixar', { selector: '[aria-current="page"]' })).toBeInTheDocument();
    expect(screen.getByText('Studios')).toBeInTheDocument();
  });

  it('displays matching movies', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE, OTHER_MOVIE], total: 2 });
    renderStudioLanding('Pixar');
    expect(await screen.findByText('Inside Out')).toBeInTheDocument();
    expect(screen.queryByText('Dark Knight')).not.toBeInTheDocument();
  });

  it('displays matching TV shows', async () => {
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    expect(await screen.findByText('Pixar Shorts')).toBeInTheDocument();
  });

  it('displays both matching movies and shows', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    expect(await screen.findByText('Inside Out')).toBeInTheDocument();
    expect(await screen.findByText('Pixar Shorts')).toBeInTheDocument();
  });

  it('shows the empty state when no titles match the studio', async () => {
    renderStudioLanding('Unknown Studio');
    expect(await screen.findByTestId('studio-empty')).toBeInTheDocument();
  });

  it('shows a title count in the page description', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    await screen.findByText(/2 titles/i);
  });

  it('shows filter buttons when content exists', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    await screen.findByText('Inside Out');
    expect(screen.getByRole('group', { name: /filter by content type/i })).toBeInTheDocument();
  });

  it('filters to only movies when "Movies" button is pressed', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    await screen.findByText('Inside Out');

    fireEvent.click(screen.getByRole('button', { name: /movies/i }));
    expect(screen.getByText('Inside Out')).toBeInTheDocument();
    expect(screen.queryByText('Pixar Shorts')).not.toBeInTheDocument();
  });

  it('filters to only TV shows when "TV Shows" button is pressed', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    await screen.findByText('Pixar Shorts');

    fireEvent.click(screen.getByRole('button', { name: /tv shows/i }));
    expect(screen.getByText('Pixar Shorts')).toBeInTheDocument();
    expect(screen.queryByText('Inside Out')).not.toBeInTheDocument();
  });

  it('shows all results again when "All" is pressed after filtering', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    await screen.findByText('Inside Out');

    fireEvent.click(screen.getByRole('button', { name: /movies/i }));
    expect(screen.queryByText('Pixar Shorts')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all/i }));
    await waitFor(() => {
      expect(screen.getByText('Inside Out')).toBeInTheDocument();
      expect(screen.getByText('Pixar Shorts')).toBeInTheDocument();
    });
  });

  it('does not show filter buttons when no content matches', async () => {
    renderStudioLanding('Unknown Studio');
    await screen.findByTestId('studio-empty');
    expect(screen.queryByRole('group', { name: /filter by content type/i })).not.toBeInTheDocument();
  });

  it('URL-decodes the studio name from the route param', async () => {
    listMovies.mockResolvedValue({
      items: [{ ...PIXAR_MOVIE, studio: 'Warner Bros.' }],
      total: 1,
    });
    renderStudioLanding('Warner Bros.');
    expect(await screen.findByRole('heading', { level: 1, name: 'Warner Bros.' })).toBeInTheDocument();
    expect(await screen.findByText('Inside Out')).toBeInTheDocument();
  });

  it('applies parental filter: restricted titles are excluded', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: true, maxRating: 'PG', pinHash: '', pinEnabled: false } }),
    );
    listMovies.mockResolvedValue({
      items: [
        { ...PIXAR_MOVIE, content_rating: 'R' },
        { ...PIXAR_MOVIE, id: 'movie-pg', title: 'Safe Movie', content_rating: 'G' },
      ],
      total: 2,
    });
    renderStudioLanding('Pixar');
    expect(await screen.findByText('Safe Movie')).toBeInTheDocument();
    expect(screen.queryByText('Inside Out')).not.toBeInTheDocument();
  });

  it('movie cards link to the detail page', async () => {
    listMovies.mockResolvedValue({ items: [PIXAR_MOVIE], total: 1 });
    renderStudioLanding('Pixar');
    const link = await screen.findByRole('link', { name: /Inside Out/i });
    expect(link.getAttribute('href')).toBe('/movies/movie-pixar-1');
  });

  it('show cards link to the TV detail page', async () => {
    listTVShows.mockResolvedValue({ items: [PIXAR_SHOW], total: 1 });
    renderStudioLanding('Pixar');
    const link = await screen.findByRole('link', { name: /Pixar Shorts/i });
    expect(link.getAttribute('href')).toBe('/tv/show-pixar-1');
  });
});

describe('StudioLanding — loading and error states', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
  });

  it('shows a loading status while fetching', () => {
    listMovies.mockImplementation(() => new Promise(() => {}));
    listTVShows.mockImplementation(() => new Promise(() => {}));
    renderStudioLanding('Pixar');
    expect(screen.getByRole('status', { name: /loading pixar titles/i })).toBeInTheDocument();
  });

  it('shows an error banner when the API fails', async () => {
    listMovies.mockRejectedValue(new Error('Network error'));
    listTVShows.mockRejectedValue(new Error('Network error'));
    renderStudioLanding('Pixar');
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
    });
  });
});
