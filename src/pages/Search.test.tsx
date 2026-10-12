import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Search from './Search';
import { CapabilitiesContext, DEFAULT_CAPABILITIES, type Capabilities } from '../lib/capabilities';
import { recordRestrictedRoute, resetRestrictedRoutes } from '../lib/restricted-routes';

afterEach(() => {
  act(() => resetRestrictedRoutes());
});

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const oldMovie = { id: 'old', title: 'Fight old result', has_file: true, stream_url: '/stream/old' };
const newMovie = { id: 'new', title: 'Journey new result', has_file: true, stream_url: '/stream/new' };

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
    requestMovie.mockReset();
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

  it('offers query entry that uses the URL query and preserves the selected scope', async () => {
    search.mockResolvedValue([]);
    renderSearch('/search?q=Fight&scope=movies');
    await screen.findByTestId('search-empty');
    const input = screen.getByRole('textbox', { name: 'Search' });
    expect(input).toHaveValue('Fight');
    fireEvent.change(input, { target: { value: 'Journey' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(search).toHaveBeenLastCalledWith('Journey'));
    expect(screen.getByRole('radio', { name: 'Movies' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'false');
    expect(requestMovie).not.toHaveBeenCalled();
  });

  it('removes page query entry when the current session search route is refused', () => {
    renderSearch('/search');
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    act(() => recordRestrictedRoute('/api/search?q=Journey', 'parental.restricted_route'));
    expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it.each(['success', 'failure'] as const)('clearing a pending query ends loading before its late %s', async (outcome) => {
    const pending = deferred<{ items: typeof oldMovie[] }>();
    listMovies.mockReturnValueOnce(pending.promise);
    search.mockResolvedValue([]);
    renderSearch('/search?q=Fight&scope=movies');
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
    expect(screen.getAllByTestId('poster-skeleton')).toHaveLength(6);

    const input = screen.getByRole('textbox', { name: 'Search' });
    input.focus();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Movies' })).toHaveAttribute('aria-checked', 'true');
    expect.soft(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();
    expect.soft(screen.queryAllByTestId('poster-skeleton')).toHaveLength(0);

    await act(async () => {
      if (outcome === 'success') pending.resolve({ items: [oldMovie] });
      else pending.reject(new Error('Old search failed'));
      await pending.promise.catch(() => {});
    });
    expect(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('poster-skeleton')).toHaveLength(0);
    expect(screen.queryByText(oldMovie.title)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listMovies).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it.each(['success', 'failure'] as const)('an old %s after clearing cannot finish a newer pending search', async (outcome) => {
    const oldRequest = deferred<{ items: typeof oldMovie[] }>();
    const newRequest = deferred<{ items: typeof newMovie[] }>();
    listMovies.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
    search.mockResolvedValue([]);
    renderSearch('/search?q=Fight&scope=movies');
    const input = screen.getByRole('textbox', { name: 'Search' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(listMovies).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'Journey' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(listMovies).toHaveBeenCalledTimes(2);

    await act(async () => {
      if (outcome === 'success') oldRequest.resolve({ items: [oldMovie] });
      else oldRequest.reject(new Error('Old search failed'));
      await oldRequest.promise.catch(() => {});
    });
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
    expect(screen.getAllByTestId('poster-skeleton')).toHaveLength(6);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(oldMovie.title)).not.toBeInTheDocument();

    await act(async () => {
      newRequest.resolve({ items: [newMovie] });
      await newRequest.promise;
    });
    expect(await screen.findByText(newMovie.title)).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('poster-skeleton')).toHaveLength(0);
  });
});
