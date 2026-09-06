import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import History from './History';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const getMovie = vi.fn();
const getTVShow = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      getMovie: (...args: unknown[]) => getMovie(...args),
      getTVShow: (...args: unknown[]) => getTVShow(...args),
    },
  };
});

vi.mock('../lib/userdata', async () => {
  const actual = await vi.importActual<typeof import('../lib/userdata')>('../lib/userdata');
  return {
    ...actual,
    pullUserdataFromServer: vi.fn(async () => true),
  };
});

describe('History page', () => {
  beforeEach(() => {
    localStorage.clear();
    listMovies.mockReset();
    listTVShows.mockReset();
    getMovie.mockReset();
    getTVShow.mockReset();
    listMovies.mockResolvedValue({ items: [], total: 0 });
    listTVShows.mockResolvedValue({ items: [], total: 0 });
  });

  it('renders empty state when no watched items', async () => {
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );
    const empty = await screen.findByTestId('history-empty');
    expect(empty).toBeInTheDocument();
  });

  it('renders watched items from localStorage progress', async () => {
    localStorage.setItem(
      'muxcore.userdata.progress.v1',
      JSON.stringify({
        'm1': {
          id: 'm1',
          kind: 'movie',
          title: 'Watched Movie',
          href: '/movies/m1',
          positionSec: 0,
          durationSec: 7200,
          updatedAt: '2026-09-01T10:00:00Z',
          watched: true,
        },
      }),
    );
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );
    const page = await screen.findByTestId('history-page');
    expect(page).toHaveTextContent('Watched Movie');
  });

  it('shows "Watched" subtitle on each item card', async () => {
    localStorage.setItem(
      'muxcore.userdata.progress.v1',
      JSON.stringify({
        'ep1': {
          id: 'ep1',
          kind: 'episode',
          title: 'S01E01 · Pilot',
          href: '/tv/show-1',
          positionSec: 0,
          durationSec: 3600,
          updatedAt: '2026-09-04T00:00:00Z',
          watched: true,
        },
      }),
    );
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );
    const page = await screen.findByTestId('history-page');
    expect(page).toHaveTextContent('S01E01 · Pilot');
    // Subtitle should contain "Watched"
    expect(page.textContent).toMatch(/Watched/);
  });

  it('does not show unwatched in-progress items', async () => {
    localStorage.setItem(
      'muxcore.userdata.progress.v1',
      JSON.stringify({
        'inprog': {
          id: 'inprog',
          kind: 'movie',
          title: 'In Progress Movie',
          href: '/movies/inprog',
          positionSec: 600,
          durationSec: 7200,
          updatedAt: '2026-09-01T00:00:00Z',
          watched: false,
        },
      }),
    );
    render(
      <MemoryRouter>
        <History />
      </MemoryRouter>,
    );
    const empty = await screen.findByTestId('history-empty');
    expect(empty).toBeInTheDocument();
    expect(screen.queryByText('In Progress Movie')).not.toBeInTheDocument();
  });
});
