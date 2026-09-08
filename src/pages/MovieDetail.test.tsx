import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MovieDetail from './MovieDetail';

const getMovie = vi.fn();
const jellyfinPlayURL = vi.fn();
const fetchPlaybackAnalysis = vi.fn();
const getRelated = vi.fn();
const getDiscoverDetail = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    fetchPlaybackAnalysis: (...args: unknown[]) => fetchPlaybackAnalysis(...args),
    api: {
      getMovie: (...args: unknown[]) => getMovie(...args),
      jellyfinPlayURL: (...args: unknown[]) => jellyfinPlayURL(...args),
      getRelated: (...args: unknown[]) => getRelated(...args),
      getDiscoverDetail: (...args: unknown[]) => getDiscoverDetail(...args),
      setMonitored: vi.fn().mockResolvedValue({ monitored: true }),
      addWanted: vi.fn().mockResolvedValue({ added: true, queue_id: 'w_movie_m1' }),
      setQualityProfile: vi.fn().mockResolvedValue({ quality_profile_id: 'qp_hd' }),
      getFormats: vi.fn().mockResolvedValue({ available: false, formats: [], profiles: [] }),
      listTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
      getItemTags: vi.fn().mockResolvedValue({ available: false, tags: [] }),
      listAlternateTitles: vi.fn().mockResolvedValue({ available: false, titles: [] }),
      listItemHistory: vi.fn().mockResolvedValue({ available: false, items: [], total: 0 }),
      getItemWatchStats: vi.fn().mockResolvedValue({ available: false, itemId: '', playCount: 0 }),
      listItemArtwork: vi.fn().mockResolvedValue({ available: false, items: [] }),
      replaceItemArtwork: vi.fn(),
      listItemSubtitles: vi.fn().mockResolvedValue({ available: false, items: [], files: [] }),
      listMovieFiles: vi.fn().mockResolvedValue({ available: false, items: [] }),
      deleteMovieFile: vi.fn(),
      uploadItemSubtitle: vi.fn(),
      deleteItemSubtitle: vi.fn(),
      searchSubtitleWanted: vi.fn().mockResolvedValue({ searched: 0, downloaded: 0 }),
      upsertMaintainerProtection: vi.fn(),
      addAlternateTitle: vi.fn(),
      deleteAlternateTitle: vi.fn(),
      setItemTags: vi.fn().mockResolvedValue({ ok: true, tag_ids: [] }),
      listRoots: vi.fn().mockResolvedValue({ available: false, roots: [] }),
      previewRename: vi.fn().mockResolvedValue({ available: false, items: [] }),
      applyRename: vi.fn().mockResolvedValue({ available: false, items: [], renamed: 0, errors: 0 }),
      setRootFolder: vi.fn().mockResolvedValue({ root_folder_path: '/data/movies' }),
      removeLibraryItem: vi.fn().mockResolvedValue({ removed: true, delete_files: false }),
      refreshLibraryItem: vi.fn().mockResolvedValue({ refreshed: true }),
      removeEpisodeFile: vi.fn().mockResolvedValue({ removed: true, delete_files: true }),
      removeMovieFile: vi.fn().mockResolvedValue({ removed: true, delete_files: true, files: 1 }),
    },
  };
});

describe('MovieDetail page', () => {
  beforeEach(() => {
    getMovie.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    getRelated.mockResolvedValue({ items: [], available: false });
    getDiscoverDetail.mockResolvedValue(null);
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
    expect(screen.getByTestId('offline-download')).toBeInTheDocument();
    expect(screen.getByTestId('delete-movie-file')).toBeInTheDocument();
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
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    getRelated.mockResolvedValue({ items: [], available: false });
    getDiscoverDetail.mockResolvedValue(null);
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

describe('MovieDetail – RelatedShelf integration', () => {
  const baseMovie = {
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
    tmdb_id: 550,
  };

  beforeEach(() => {
    getMovie.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({ src: '', enabled: false });
    getMovie.mockResolvedValue(baseMovie);
    getDiscoverDetail.mockResolvedValue(null);
  });

  it('renders the Related Titles shelf when graph returns items', async () => {
    getRelated.mockResolvedValue({
      items: [
        {
          id: 807,
          title: 'Se7en',
          year: 1995,
          overview: 'A thriller.',
          poster: '/se7en.jpg',
          voteAvg: 8.6,
          mediaType: 'movie',
          relation: 'related_to',
        },
      ],
      available: true,
    });

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('movie-detail-page');
    const shelf = await screen.findByTestId('related-shelf');
    expect(shelf).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Se7en/i })).toBeInTheDocument();
    expect(getRelated).toHaveBeenCalledWith('tmdb:movie:550');
  });

  it('does not render the Related Titles shelf when graph is unavailable', async () => {
    getRelated.mockResolvedValue({ items: [], available: false });

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('movie-detail-page');
    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(screen.queryByTestId('related-shelf')).not.toBeInTheDocument();
  });

  it('does not break the detail page when getRelated rejects', async () => {
    getRelated.mockRejectedValue(new Error('graph offline'));

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const page = await screen.findByTestId('movie-detail-page');
    expect(page).toBeInTheDocument();
    // The main title still renders — page is not broken by graph error.
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(screen.queryByTestId('related-shelf')).not.toBeInTheDocument();
  });
});

describe('MovieDetail – trailer', () => {
  const movieWithTmdb = {
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
    tmdb_id: 550,
  };

  beforeEach(() => {
    getMovie.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({ src: '', enabled: false });
    getRelated.mockResolvedValue({ items: [], available: false });
    getMovie.mockResolvedValue(movieWithTmdb);
  });

  it('renders a trailer embed when discover detail includes a trailer', async () => {
    getDiscoverDetail.mockResolvedValue({
      id: 550,
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      genres: ['Drama'],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 8.4,
      mediaType: 'movie',
      trailer: {
        name: 'Official Trailer',
        youtubeKey: 'SUXWAEX2jlg',
        url: 'https://www.youtube.com/watch?v=SUXWAEX2jlg',
      },
    });

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('movie-detail-page');
    const trailerSection = await screen.findByTestId('trailer-section');
    expect(trailerSection).toBeInTheDocument();
    expect(screen.getByTitle('Official Trailer')).toHaveAttribute(
      'src',
      expect.stringContaining('SUXWAEX2jlg'),
    );
  });

  it('does not render a trailer section when discover detail has no trailer', async () => {
    getDiscoverDetail.mockResolvedValue({
      id: 550,
      title: 'Fight Club',
      year: 1999,
      overview: 'An insomniac office worker...',
      genres: ['Drama'],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 8.4,
      mediaType: 'movie',
    });

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('movie-detail-page');
    await waitFor(() => expect(getDiscoverDetail).toHaveBeenCalled());
    expect(screen.queryByTestId('trailer-section')).not.toBeInTheDocument();
  });

  it('does not render a trailer section when discover detail fetch fails', async () => {
    getDiscoverDetail.mockRejectedValue(new Error('discover offline'));

    render(
      <MemoryRouter initialEntries={['/movies/m-550']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('movie-detail-page');
    await waitFor(() => expect(getDiscoverDetail).toHaveBeenCalled());
    expect(screen.queryByTestId('trailer-section')).not.toBeInTheDocument();
  });
});
