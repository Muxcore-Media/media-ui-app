import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TVShowDetail from './TVShowDetail';

const getTVShow = vi.fn();
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
      getTVShow: (...args: unknown[]) => getTVShow(...args),
      jellyfinPlayURL: (...args: unknown[]) => jellyfinPlayURL(...args),
      getRelated: (...args: unknown[]) => getRelated(...args),
      getDiscoverDetail: (...args: unknown[]) => getDiscoverDetail(...args),
    },
  };
});

const showWithEpisodes = {
  id: 'bb',
  title: 'Breaking Bad',
  year: 2008,
  overview: 'A chemistry teacher turns to crime.',
  genres: ['Crime'],
  poster_url: '',
  has_file: true,
  vote_average: 9.5,
  status: 'Ended',
  seasons: [
    {
      id: 's1',
      season_number: 1,
      name: 'Season 1',
      episodes: [
        {
          id: 'e1',
          title: 'Pilot',
          season_number: 1,
          episode_number: 1,
          overview: 'First episode',
          has_file: true,
          stream_url: '/stream/tv/bb/1/1',
        },
      ],
    },
  ],
};

describe('TVShowDetail page', () => {
  beforeEach(() => {
    getTVShow.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    getRelated.mockResolvedValue({ items: [], available: false });
    getDiscoverDetail.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({
      src: '/stream/tv/bb/1/1',
      enabled: true,
      info_line: '1080p · H264',
    });
    getTVShow.mockResolvedValue(showWithEpisodes);
  });

  it('renders show metadata and episode list', async () => {
    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('tv-detail-page')).toBeInTheDocument();
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByText(/Pilot/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Play Breaking Bad/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Play Pilot/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('1080p · H264')).toBeInTheDocument();
    });
  });

  it('primary Play button links to the in-app player route, not an external URL', async () => {
    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('tv-detail-page');

    // The episode-level play link should go to /player, not an external Jellyfin URL
    const episodePlayLink = screen.getByRole('link', { name: /Play Pilot/i });
    const href = episodePlayLink.getAttribute('href') ?? '';
    expect(href).toMatch(/^\/player\?/);
    expect(href).toContain('src=');
    expect(href).not.toMatch(/^https?:\/\//);
  });

  it('does not show "Open in linked app" when Jellyfin is not configured', async () => {
    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('tv-detail-page');
    expect(screen.queryByText('Open in linked app')).not.toBeInTheDocument();
  });

  it('shows "Open in linked app" as a secondary option when Jellyfin is available', async () => {
    jellyfinPlayURL.mockResolvedValue('jellyfin://play/breaking-bad');

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByTestId('tv-detail-page');

    // Primary native play links are still present
    expect(screen.getByRole('link', { name: /Play Breaking Bad/i })).toBeInTheDocument();
    // Secondary Jellyfin link is also present
    await waitFor(() => {
      expect(screen.getByText('Open in linked app')).toBeInTheDocument();
    });
  });

  it('shows empty episodes state when no seasons', async () => {
    getTVShow.mockResolvedValueOnce({
      id: 'new-show',
      title: 'Mystery Series',
      year: 2026,
      overview: 'No episodes yet.',
      genres: ['Drama'],
      poster_url: '',
      has_file: false,
      vote_average: 0,
      seasons: [],
    });
    render(
      <MemoryRouter initialEntries={['/tv/new-show']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('tv-detail-page')).toBeInTheDocument();
    expect(screen.getByText('No episodes yet')).toBeInTheDocument();
  });
});

describe('TVShowDetail accessibility', () => {
  beforeEach(() => {
    getTVShow.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    getRelated.mockResolvedValue({ items: [], available: false });
    getDiscoverDetail.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({
      src: '/stream/tv/bb/1/1',
      enabled: true,
      info_line: '1080p · H264',
    });
    getTVShow.mockResolvedValue(showWithEpisodes);
  });

  it('uses the show title as the page h1 and labels episode sections', async () => {
    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Breaking Bad' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Episodes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Play Pilot/i })).toBeInTheDocument();
  });

  it('announces loading on initial render', () => {
    getTVShow.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading TV show' })).toBeInTheDocument();
  });

  it('exposes an error heading when the show is missing', async () => {
    getTVShow.mockRejectedValueOnce(new Error('Not found'));

    render(
      <MemoryRouter initialEntries={['/tv/missing']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'TV show not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Not found');
  });
});

describe('TVShowDetail – RelatedShelf integration', () => {
  const baseShow = {
    ...showWithEpisodes,
    tmdb_id: 1396,
  };

  beforeEach(() => {
    getTVShow.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({ src: '', enabled: false });
    getTVShow.mockResolvedValue(baseShow);
    getDiscoverDetail.mockResolvedValue(null);
  });

  it('renders the Related Titles shelf when graph returns items', async () => {
    getRelated.mockResolvedValue({
      items: [
        {
          id: 1438,
          title: 'Better Call Saul',
          year: 2015,
          overview: 'Prequel.',
          poster: '/bcs.jpg',
          voteAvg: 8.9,
          mediaType: 'tv',
          relation: 'same_franchise',
        },
      ],
      available: true,
    });

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('tv-detail-page');
    const shelf = await screen.findByTestId('related-shelf');
    expect(shelf).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Better Call Saul/i })).toBeInTheDocument();
    expect(getRelated).toHaveBeenCalledWith('tmdb:tv:1396');
  });

  it('does not render the Related Titles shelf when graph is unavailable', async () => {
    getRelated.mockResolvedValue({ items: [], available: false });

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('tv-detail-page');
    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(screen.queryByTestId('related-shelf')).not.toBeInTheDocument();
  });

  it('does not break the TV detail page when getRelated rejects', async () => {
    getRelated.mockRejectedValue(new Error('graph offline'));

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const page = await screen.findByTestId('tv-detail-page');
    expect(page).toBeInTheDocument();
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    await waitFor(() => expect(getRelated).toHaveBeenCalled());
    expect(screen.queryByTestId('related-shelf')).not.toBeInTheDocument();
  });
});

describe('TVShowDetail – trailer', () => {
  const showWithTmdb = {
    ...showWithEpisodes,
    tmdb_id: 1396,
  };

  beforeEach(() => {
    getTVShow.mockReset();
    jellyfinPlayURL.mockReset();
    fetchPlaybackAnalysis.mockReset();
    getRelated.mockReset();
    getDiscoverDetail.mockReset();
    jellyfinPlayURL.mockResolvedValue(null);
    fetchPlaybackAnalysis.mockResolvedValue({ src: '', enabled: false });
    getRelated.mockResolvedValue({ items: [], available: false });
    getTVShow.mockResolvedValue(showWithTmdb);
  });

  it('renders a trailer embed when discover detail includes a trailer', async () => {
    getDiscoverDetail.mockResolvedValue({
      id: 1396,
      title: 'Breaking Bad',
      year: 2008,
      overview: 'A chemistry teacher turns to crime.',
      genres: ['Crime'],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 9.5,
      mediaType: 'tv',
      trailer: {
        name: 'Official Trailer',
        youtubeKey: 'HhesaQXLuRY',
        url: 'https://www.youtube.com/watch?v=HhesaQXLuRY',
      },
    });

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('tv-detail-page');
    const trailerSection = await screen.findByTestId('trailer-section');
    expect(trailerSection).toBeInTheDocument();
    expect(screen.getByTitle('Official Trailer')).toHaveAttribute(
      'src',
      expect.stringContaining('HhesaQXLuRY'),
    );
  });

  it('does not render a trailer section when discover detail has no trailer', async () => {
    getDiscoverDetail.mockResolvedValue({
      id: 1396,
      title: 'Breaking Bad',
      year: 2008,
      overview: 'A chemistry teacher turns to crime.',
      genres: ['Crime'],
      poster: '/p.jpg',
      backdrop: '/b.jpg',
      voteAvg: 9.5,
      mediaType: 'tv',
    });

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('tv-detail-page');
    await waitFor(() => expect(getDiscoverDetail).toHaveBeenCalled());
    expect(screen.queryByTestId('trailer-section')).not.toBeInTheDocument();
  });

  it('does not render a trailer section when discover detail fetch fails', async () => {
    getDiscoverDetail.mockRejectedValue(new Error('discover offline'));

    render(
      <MemoryRouter initialEntries={['/tv/bb']}>
        <Routes>
          <Route path="/tv/:id" element={<TVShowDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('tv-detail-page');
    await waitFor(() => expect(getDiscoverDetail).toHaveBeenCalled());
    expect(screen.queryByTestId('trailer-section')).not.toBeInTheDocument();
  });
});
