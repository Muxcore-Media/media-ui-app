import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieDetail from './MovieDetail';

const getMovie = vi.fn();
const jellyfinPlayURL = vi.fn();
const fetchPlaybackAnalysis = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    fetchPlaybackAnalysis: (...args: unknown[]) => fetchPlaybackAnalysis(...args),
    api: {
      getMovie: (...args: unknown[]) => getMovie(...args),
      jellyfinPlayURL: (...args: unknown[]) => jellyfinPlayURL(...args),
    },
  };
});

describe('MovieDetail page', () => {
  beforeEach(() => {
    getMovie.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({
      src: '/stream/movies/m-550',
      enabled: true,
      info_line: '1080p Remux',
    });
    getMovie.mockResolvedValue({
      id: 'm-550',
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      runtime: 139,
      vote_average: 8.4,
      genres: ['Drama'],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/m-550',
      created_at: '',
    });
  });

  it('renders movie metadata', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('movie-detail-page')).toBeInTheDocument();
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /play/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1080p Remux')).toBeInTheDocument();
    });
  });

  it('primary Play button links to the in-app player route, not an external URL', async () => {
    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('movie-detail-page');

    const playLink = screen.getByRole('link', { name: 'Play Fight Club' });
    const href = playLink.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/player\?/);
    expect(href).toContain('src=');
    expect(href).not.toMatch(/^https?:\/\//);
  });

  it('does not show "Open in linked app" when Jellyfin is not configured', async () => {
    // jellyfinPlayURL returns null → no external button rendered
    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('movie-detail-page');
    expect(screen.queryByText('Open in linked app')).not.toBeInTheDocument();
  });

  it('shows "Open in linked app" as a secondary option when Jellyfin is available', async () => {
    jellyfinPlayURL.mockResolvedValue('jellyfin://play/fight-club');

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('movie-detail-page');

    // Primary native play link is still present
    expect(screen.getByRole('link', { name: 'Play Fight Club' })).toBeInTheDocument();
    // Secondary Jellyfin link is also present
    await waitFor(() => {
      expect(screen.getByText('Open in linked app')).toBeInTheDocument();
    });
  });
});

describe('MovieDetail accessibility', () => {
  beforeEach(() => {
    getMovie.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({
      src: '/stream/movies/m-550',
      enabled: true,
      info_line: '1080p Remux',
    });
  });

  it('uses the movie title as the page h1', async () => {
    getMovie.mockResolvedValue({
      id: 'm-550',
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      runtime: 139,
      vote_average: 8.4,
      genres: ['Drama'],
      poster_url: '',
      has_file: true,
      stream_url: '/stream/movies/m-550',
      created_at: '',
    });

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fight Club' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play Fight Club' })).toBeInTheDocument();
  });

  it('announces loading on initial render', () => {
    getMovie.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading movie' })).toBeInTheDocument();
  });

  it('exposes an error heading and alert when the movie is missing', async () => {
    getMovie.mockRejectedValueOnce(new Error('Not found'));

    render(
      <MemoryRouter initialEntries={['/movies/missing']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Movie not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Not found');
  });
});
