/** Page-level rendering of server-side parental outcomes (ADR-0031) outside the player. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Search from './Search';
import MovieDetail from './MovieDetail';
import { ParentalError } from '../api/errors';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../lib/capabilities';

const search = vi.fn();
const listMovies = vi.fn();
const getMovie = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: vi.fn().mockResolvedValue({ items: [] }),
      listMusic: vi.fn().mockResolvedValue({ items: [] }),
      listBooks: vi.fn().mockResolvedValue({ items: [] }),
      listComics: vi.fn().mockResolvedValue({ items: [] }),
      listAudiobooks: vi.fn().mockResolvedValue({ items: [] }),
      search: (...args: unknown[]) => search(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      jellyfinPlayURL: vi.fn().mockResolvedValue(null),
      getDiscoverDetail: vi.fn().mockResolvedValue(null),
    },
  };
});

function renderAt(path: string) {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/search" element={<Search />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
        </Routes>
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('restricted_route on a feature page', () => {
  beforeEach(() => {
    search.mockReset();
    listMovies.mockReset();
    listMovies.mockResolvedValue({ items: [] });
  });

  it('shows a calm not-available-for-restricted-accounts status instead of an error', async () => {
    search.mockRejectedValue(new ParentalError('parental.restricted_route', 403));
    renderAt('/search?q=Fight');
    const notice = await screen.findByTestId('parental-notice');
    expect(notice).toHaveAttribute('data-parental-code', 'parental.restricted_route');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(/restricted accounts/i);
    expect(screen.queryByTestId('page-error')).not.toBeInTheDocument();
  });

  it('shows a retryable alert, not results, when parental controls cannot be checked', async () => {
    search.mockRejectedValue(new ParentalError('parental.policy_unavailable', 503));
    renderAt('/search?q=Fight');
    const notice = await screen.findByTestId('parental-notice');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent(/try again in a moment/i);
  });
});

describe('blocked item detail', () => {
  it('replaces "Movie not found" with the not-available state', async () => {
    getMovie.mockRejectedValue(new ParentalError('parental.blocked', 403));
    renderAt('/movies/m-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Not available for this profile' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('parental-notice')).toHaveAttribute('data-parental-code', 'parental.blocked');
    expect(screen.queryByText('Movie not found')).not.toBeInTheDocument();
  });

  it('keeps "Movie not found" for an ordinary failure', async () => {
    getMovie.mockRejectedValue(new Error('404 Not Found'));
    renderAt('/movies/m-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Movie not found' })).toBeInTheDocument();
    expect(screen.getByTestId('page-error')).toBeInTheDocument();
  });
});

describe('library list fails closed when the policy cannot be checked', () => {
  it('shows the retryable alert and no results', async () => {
    listMovies.mockReset();
    search.mockReset();
    search.mockResolvedValue([]);
    listMovies.mockRejectedValue(new ParentalError('parental.classification_unavailable', 503));
    renderAt('/search?q=Fight');
    const notice = await screen.findByTestId('parental-notice');
    expect(notice).toHaveAttribute('data-parental-code', 'parental.classification_unavailable');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('No matches')).not.toBeInTheDocument();
  });
});
