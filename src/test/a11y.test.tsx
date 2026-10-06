/**
 * Automated axe-core accessibility checks (NFR-A11Y-001) over real consumer components.
 *
 * jsdom has no layout/paint engine, so rules that need rendering are scoped out:
 *  - `color-contrast`: needs computed colours/geometry; jsdom cannot evaluate it.
 *  - `region`: page-level landmark rule; meaningless for components rendered in isolation
 *    (full-page checks that render <main> are covered separately via the Layout shell test).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { configureAxe } from 'vitest-axe';
import Movies from '../pages/Movies';
import Search from '../pages/Search';
import ForgotPassword from '../pages/ForgotPassword';
import Nav from '../components/layout/Nav';
import HeaderSearch from '../components/layout/HeaderSearch';
import { PinGateDialog } from '../components/parental/PinGateDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import ErrorScreen from '../components/player/ErrorScreen';
import PosterCard from '../components/media/PosterCard';
import { Shelf, ShelfItem } from '../components/media/Shelf';
import RequestableCard from '../components/search/RequestableCard';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../lib/capabilities';
import type { ListResponse, Movie } from '../types';

// axe's icon-ligature check probes canvas; jsdom logs "not implemented" noise otherwise.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const axe = configureAxe({
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
});

const listMovies = vi.fn();
const listTVShows = vi.fn();
const search = vi.fn();

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
      requestMovie: vi.fn(),
      requestTitle: vi.fn(),
    },
  };
});

const movie: Movie = {
  id: 'm1',
  title: 'Fight Club',
  year: 1999,
  overview: '',
  runtime: 139,
  vote_average: 8.4,
  genres: [],
  poster_url: '/images/movies/p.jpg',
  has_file: true,
  stream_url: '/stream/movies/m1',
  created_at: '',
};

function withCaps(ui: React.ReactElement, initial = '/') {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps: DEFAULT_CAPABILITIES, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('axe: harness control', () => {
  it('actually detects violations (guards against vacuous passes)', async () => {
    const { container } = render(
      <div>
        <img src="/x.png" />
        <button />
      </div>,
    );
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toEqual(
      expect.arrayContaining(['image-alt', 'button-name']),
    );
    expect(results).not.toHaveNoViolations();
  });
});

describe('axe: pages', () => {
  beforeEach(() => {
    listMovies.mockReset();
    listTVShows.mockReset();
    search.mockReset();
  });

  it('Movies library grid with content', async () => {
    listMovies.mockResolvedValueOnce({
      items: [movie],
      total: 1,
      page: 1,
      page_size: 48,
    } satisfies ListResponse<Movie>);
    const { container } = render(
      <MemoryRouter>
        <Movies />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Fight Club/i })[0]).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Movies empty state', async () => {
    listMovies.mockResolvedValueOnce({ items: [], total: 0, page: 1, page_size: 48 });
    const { container } = render(
      <MemoryRouter>
        <Movies />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/No movies ready to watch yet/i)).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Movies error state', async () => {
    listMovies.mockRejectedValueOnce(new Error('unauthorized (auth.required)'));
    const { container } = render(
      <MemoryRouter>
        <Movies />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/unauthorized/i)).toBeTruthy());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Search page with query', async () => {
    listMovies.mockResolvedValue({ items: [movie], total: 1, page: 1, page_size: 48 });
    listTVShows.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 48 });
    search.mockResolvedValue([]);
    const { container } = withCaps(
      <Routes>
        <Route path="/search" element={<Search />} />
      </Routes>,
      '/search?q=Fight',
    );
    await waitFor(() => expect(screen.getAllByText(/Fight Club/i).length).toBeGreaterThan(0));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ForgotPassword form', async () => {
    const { container } = render(<ForgotPassword />);
    expect(screen.getByTestId('forgot-password-username')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('axe: navigation and forms', () => {
  it('primary + mobile navigation', async () => {
    const { container } = withCaps(<Nav />);
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('header search', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/movies']}>
        <HeaderSearch />
      </MemoryRouter>,
    );
    expect(screen.getByRole('search')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('axe: modals', () => {
  it('PIN gate dialog', async () => {
    const { container } = render(
      <PinGateDialog pinHash="x" onSuccess={vi.fn()} onCancel={vi.fn()} actionLabel="Unlock test" />,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('axe: shared primitives', () => {
  it('EmptyState', async () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="Nothing here" message="Nothing here yet." />,
    );
    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ErrorBanner', async () => {
    const { container } = render(<ErrorBanner message="Could not load library." />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('LoadingStatus', async () => {
    const { container } = render(<LoadingStatus label="Loading movies" />);
    expect(container.textContent || container.innerHTML).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ErrorBoundary fallback', async () => {
    const Boom = () => {
      throw new Error('boom');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    spy.mockRestore();
    expect(screen.getByTestId('render-error')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('player ErrorScreen', async () => {
    const { container } = withCaps(
      <ErrorScreen message="Playback failed." href="/movies" onRetry={() => {}} />,
    );
    expect(screen.getByText('Playback unavailable')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('axe: cards and shelves', () => {
  it('PosterCard (library + no poster)', async () => {
    const { container } = render(
      <MemoryRouter>
        <ul>
          <li>
            <PosterCard item={movie} type="movie" />
          </li>
          <li>
            <PosterCard item={{ ...movie, id: 'm2', title: 'No Art', poster_url: '' }} type="movie" />
          </li>
        </ul>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link').length).toBe(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Shelf with cards and See all', async () => {
    const { container } = render(
      <MemoryRouter>
        <Shelf title="Recently Added" seeAllHref="/movies">
          <ShelfItem>
            <PosterCard item={movie} type="movie" />
          </ShelfItem>
        </Shelf>
      </MemoryRouter>,
    );
    expect(screen.getByText('Recently Added')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('RequestableCard', async () => {
    const { container } = render(
      <MemoryRouter>
        <RequestableCard
          item={{
            id: 550,
            title: 'Fight Club',
            year: 1999,
            overview: 'soap',
            poster: '/p.jpg',
            voteAvg: 8.4,
            mediaType: 'movie',
          }}
          onRequest={() => {}}
          returnTo="/search?q=fight"
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Request' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
