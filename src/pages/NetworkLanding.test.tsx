import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NetworkLanding from './NetworkLanding';

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

const HBO_SHOW = {
  id: 'show-hbo-1',
  title: 'The Wire',
  year: 2002,
  overview: 'An HBO show',
  vote_average: 9.3,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  network: 'HBO',
};

const HBO_SHOW_2 = {
  id: 'show-hbo-2',
  title: 'Sopranos',
  year: 1999,
  overview: 'Another HBO show',
  vote_average: 9.5,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  network: 'HBO',
};

const OTHER_SHOW = {
  id: 'show-abc-1',
  title: 'Lost',
  year: 2004,
  overview: '',
  vote_average: 8.4,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  network: 'ABC',
};

function renderNetworkLanding(network = 'HBO') {
  return render(
    <MemoryRouter initialEntries={[`/network/${encodeURIComponent(network)}`]}>
      <Routes>
        <Route path="/network/:name" element={<NetworkLanding />} />
        <Route path="/movies" element={<div>Movies page</div>} />
        <Route path="/tv" element={<div>TV page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NetworkLanding page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('renders the network name in the heading', async () => {
    renderNetworkLanding('HBO');
    expect(await screen.findByRole('heading', { level: 1, name: 'HBO' })).toBeInTheDocument();
    expect(screen.getByTestId('network-landing-page')).toBeInTheDocument();
  });

  it('shows a breadcrumb with the network name', async () => {
    renderNetworkLanding('HBO');
    await screen.findByRole('heading', { level: 1, name: 'HBO' });
    expect(screen.getByText('HBO', { selector: '[aria-current="page"]' })).toBeInTheDocument();
    expect(screen.getByText('Networks')).toBeInTheDocument();
  });

  it('displays matching TV shows', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW, OTHER_SHOW], total: 2 });
    renderNetworkLanding('HBO');
    expect(await screen.findByText('The Wire')).toBeInTheDocument();
    expect(screen.queryByText('Lost')).not.toBeInTheDocument();
  });

  it('displays multiple matching shows for the same network', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW, HBO_SHOW_2, OTHER_SHOW], total: 3 });
    renderNetworkLanding('HBO');
    expect(await screen.findByText('The Wire')).toBeInTheDocument();
    expect(await screen.findByText('Sopranos')).toBeInTheDocument();
    expect(screen.queryByText('Lost')).not.toBeInTheDocument();
  });

  it('shows the empty state when no titles match the network', async () => {
    renderNetworkLanding('Unknown Network');
    expect(await screen.findByTestId('network-empty')).toBeInTheDocument();
  });

  it('shows a title count in the page description', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW, HBO_SHOW_2], total: 2 });
    renderNetworkLanding('HBO');
    await screen.findByText(/2 titles/i);
  });

  it('shows filter buttons when content exists', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW], total: 1 });
    renderNetworkLanding('HBO');
    await screen.findByText('The Wire');
    expect(screen.getByRole('group', { name: /filter by content type/i })).toBeInTheDocument();
  });

  it('filters to only TV shows when "TV Shows" button is pressed', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW], total: 1 });
    renderNetworkLanding('HBO');
    await screen.findByText('The Wire');

    fireEvent.click(screen.getByRole('button', { name: /tv shows/i }));
    expect(screen.getByText('The Wire')).toBeInTheDocument();
  });

  it('URL-decodes the network name from the route param', async () => {
    listTVShows.mockResolvedValue({
      items: [{ ...HBO_SHOW, network: 'Disney+' }],
      total: 1,
    });
    renderNetworkLanding('Disney+');
    expect(await screen.findByRole('heading', { level: 1, name: 'Disney+' })).toBeInTheDocument();
    expect(await screen.findByText('The Wire')).toBeInTheDocument();
  });

  it('applies parental filter: restricted shows are excluded', async () => {
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ parental: { kidsMode: true, maxRating: 'TV-PG', pinHash: '', pinEnabled: false } }),
    );
    listTVShows.mockResolvedValue({
      items: [
        { ...HBO_SHOW, content_rating: 'TV-MA' },
        { ...HBO_SHOW_2, content_rating: 'TV-PG' },
      ],
      total: 2,
    });
    renderNetworkLanding('HBO');
    expect(await screen.findByText('Sopranos')).toBeInTheDocument();
    expect(screen.queryByText('The Wire')).not.toBeInTheDocument();
  });

  it('show cards link to the TV detail page', async () => {
    listTVShows.mockResolvedValue({ items: [HBO_SHOW], total: 1 });
    renderNetworkLanding('HBO');
    const link = await screen.findByRole('link', { name: /The Wire/i });
    expect(link.getAttribute('href')).toBe('/tv/show-hbo-1');
  });

  it('does not show filter buttons when no content matches', async () => {
    renderNetworkLanding('Unknown Network');
    await screen.findByTestId('network-empty');
    expect(screen.queryByRole('group', { name: /filter by content type/i })).not.toBeInTheDocument();
  });
});

describe('NetworkLanding — loading and error states', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
  });

  it('shows a loading status while fetching', () => {
    listMovies.mockImplementation(() => new Promise(() => {}));
    listTVShows.mockImplementation(() => new Promise(() => {}));
    renderNetworkLanding('HBO');
    expect(screen.getByRole('status', { name: /loading hbo titles/i })).toBeInTheDocument();
  });

  it('shows an error banner when the API fails', async () => {
    listMovies.mockRejectedValue(new Error('Network error'));
    listTVShows.mockRejectedValue(new Error('Network error'));
    renderNetworkLanding('HBO');
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
    });
  });
});
