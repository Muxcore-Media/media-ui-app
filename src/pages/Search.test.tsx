import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import Search from './Search';
import { axeOptions } from '../a11y/axe';
import { CapabilitiesContext, DEFAULT_CAPABILITIES, type Capabilities } from '../lib/capabilities';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const search = vi.fn();
const requestMovie = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listMusic: vi.fn().mockResolvedValue({ items: [] }),
      listBooks: vi.fn().mockResolvedValue({ items: [] }),
      listComics: vi.fn().mockResolvedValue({ items: [] }),
      listAudiobooks: vi.fn().mockResolvedValue({ items: [] }),
      search: (...args: unknown[]) => search(...args),
      requestTitle: (...args: unknown[]) => requestMovie(...args),
    },
  };
});

function renderSearch(initial = '/search?q=Fight', caps: Capabilities = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('Search page', () => {
  beforeEach(() => {
    listMovies.mockReset();
    listTVShows.mockReset();
    search.mockReset();
    requestMovie.mockReset();
    listMovies.mockResolvedValue({ items: [] });
    listTVShows.mockResolvedValue({ items: [] });
  });

  it('runs unified search from URL query', async () => {
    search.mockResolvedValueOnce([
      {
        id: 550,
        title: 'Fight Club',
        year: 1999,
        overview: 'soap',
        poster: '/p.jpg',
        voteAvg: 8.4,
        mediaType: 'movie',
      },
    ]);

    renderSearch('/search?q=Fight%20Club');

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith('Fight Club');
    });
    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
  });

  it('has no axe violations on the empty search page', async () => {
    const { container } = render(
      <main>
        <CapabilitiesContext.Provider
          value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
        >
          <MemoryRouter initialEntries={['/search']}>
            <Routes>
              <Route path="/search" element={<Search />} />
            </Routes>
          </MemoryRouter>
        </CapabilitiesContext.Provider>
      </main>,
    );
    expect(await screen.findByRole('heading', { name: 'Search' })).toBeInTheDocument();
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it('filters scope to movies only', async () => {
    search.mockResolvedValueOnce([
      {
        id: 550,
        title: 'Fight Club',
        year: 1999,
        overview: '',
        poster: '',
        voteAvg: 8,
        mediaType: 'movie',
      },
      {
        id: 1,
        title: 'Breaking Bad',
        year: 2008,
        overview: '',
        poster: '',
        voteAvg: 9,
        mediaType: 'tv',
      },
    ]);

    renderSearch('/search?q=Fight&scope=movies');

    await waitFor(() => expect(search).toHaveBeenCalled());
    expect(screen.queryByText('Breaking Bad')).not.toBeInTheDocument();
    expect(await screen.findByText('Fight Club')).toBeInTheDocument();
  });

  it('requests remote title', async () => {
    search.mockResolvedValueOnce([
      {
        id: 550,
        title: 'Fight Club',
        year: 1999,
        overview: '',
        poster: '',
        voteAvg: 8,
        mediaType: 'movie',
      },
    ]);
    requestMovie.mockResolvedValueOnce({ status: 'requested' });

    renderSearch('/search?q=Fight%20Club');
    const btn = await screen.findByRole('button', { name: 'Request' });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(requestMovie).toHaveBeenCalledWith(
        expect.objectContaining({ tmdbId: 550, title: 'Fight Club', mediaType: 'movie' }),
      );
    });
  });

  it('shows empty state when search returns no matches', async () => {
    search.mockResolvedValueOnce([]);

    renderSearch('/search?q=NoSuchTitle');

    expect(await screen.findByTestId('search-empty')).toBeInTheDocument();
    expect(screen.getByText(/No results for "NoSuchTitle"/i)).toBeInTheDocument();
  });

  it('requests remote music artist', async () => {
    search.mockImplementation((_q, opts?: { type?: string }) => {
      if (opts?.type === 'music') {
        return Promise.resolve([
          {
            id: 0,
            musicbrainzId: 'a74b1b7f-71a5-3961-8c07-9170df271ef9',
            title: 'Radiohead',
            year: 0,
            overview: 'British rock band',
            poster: '',
            voteAvg: 0,
            mediaType: 'music',
          },
        ]);
      }
      return Promise.resolve([]);
    });
    requestMovie.mockResolvedValueOnce({ status: 'requested' });

    renderSearch('/search?q=Radiohead&scope=music', {
      ...DEFAULT_CAPABILITIES,
      libraries: { ...DEFAULT_CAPABILITIES.libraries, music: true },
    });
    const btn = await screen.findByRole('button', { name: 'Request' });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(requestMovie).toHaveBeenCalledWith(
        expect.objectContaining({
          musicbrainzId: 'a74b1b7f-71a5-3961-8c07-9170df271ef9',
          title: 'Radiohead',
          mediaType: 'music',
        }),
      );
    });
  });
});

describe('Search accessibility', () => {
  beforeEach(() => {
    listMovies.mockReset();
    listTVShows.mockReset();
    search.mockReset();
    listMovies.mockResolvedValue({ items: [] });
    listTVShows.mockResolvedValue({ items: [] });
  });

  it('has a page h1 and filter radiogroup', () => {
    renderSearch('/search');
    expect(screen.getByRole('heading', { level: 1, name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Search filters' })).toBeInTheDocument();
  });

  it('marks the active search scope with aria-checked', async () => {
    search.mockResolvedValueOnce([]);
    renderSearch('/search?q=Fight&scope=movies');
    const movies = await screen.findByRole('radio', { name: 'Movies' });
    expect(movies).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false');
  });

  it('announces loading while search is in flight', () => {
    search.mockImplementation(() => new Promise(() => {}));
    renderSearch('/search?q=Fight');
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
  });
});
