import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Queue from './Queue';

const listQueue = vi.fn();
const continueWatching = vi.fn();
const listFavorites = vi.fn();
const listRequests = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listRequests: (...args: unknown[]) => listRequests(...args),
    },
  };
});

vi.mock('../lib/userdata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/userdata')>();
  return {
    ...actual,
    listQueue: (...args: unknown[]) => listQueue(...args),
    continueWatching: (...args: unknown[]) => continueWatching(...args),
    listFavorites: (...args: unknown[]) => listFavorites(...args),
    clearQueue: vi.fn(),
    dequeue: vi.fn(),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <Queue />
    </MemoryRouter>,
  );
}

describe('Queue page', () => {
  beforeEach(() => {
    listQueue.mockReset();
    continueWatching.mockReset();
    listFavorites.mockReset();
    listRequests.mockReset();
    listQueue.mockReturnValue([]);
    continueWatching.mockReturnValue([]);
    listFavorites.mockReturnValue([]);
    listRequests.mockResolvedValue([]);
  });

  it('shows empty state when queue and suggestions are empty', () => {
    renderPage();

    expect(screen.getByTestId('queue-page')).toBeInTheDocument();
    expect(screen.getByTestId('queue-empty')).toBeInTheDocument();
    expect(screen.getByText('Queue empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
  });

  it('labels suggestion list for screen readers when queue is empty', () => {
    continueWatching.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Suggested Movie',
        href: '/movies/m1',
        positionSec: 100,
        durationSec: 1000,
        updatedAt: '',
      },
    ]);

    renderPage();

    expect(screen.getByRole('list', { name: /Suggested picks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suggested Movie' })).toHaveAttribute(
      'href',
      '/movies/m1',
    );
  });

  it('shows API statusLabel and statusDetail on rows when queue item matches an active request', async () => {
    listQueue.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Stalled Movie',
        href: '/movies/m1',
      },
      {
        id: 's1',
        kind: 'tv',
        title: 'Detail Show',
        href: '/tv/s1',
      },
    ]);
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-stalled',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Stalled Movie',
        year: 2020,
        poster: '',
        status: 'stalled',
        statusLabel: 'Stalled — no peers',
        statusDetail: 'no peers',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'r-detail',
        itemType: 'tv',
        itemId: 's1',
        tmdbId: 2,
        title: 'Detail Show',
        year: 2021,
        poster: '',
        status: 'import_failed',
        statusLabel: 'Import failed',
        statusDetail: 'path not under a scanner watch directory',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Stalled — no peers')).toBeInTheDocument();
    });
    expect(screen.queryByText('no peers')).not.toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText('path not under a scanner watch directory')).toBeInTheDocument();
  });
});

describe('Queue accessibility', () => {
  beforeEach(() => {
    listQueue.mockReset();
    continueWatching.mockReset();
    listFavorites.mockReset();
    listRequests.mockReset();
    listQueue.mockReturnValue([]);
    continueWatching.mockReturnValue([]);
    listFavorites.mockReturnValue([]);
    listRequests.mockResolvedValue([]);
  });

  it('has a page h1 and labeled queue section when items are shown', () => {
    listQueue.mockReturnValue([
      {
        id: 'm1',
        kind: 'movie',
        title: 'Queued Movie',
        href: '/movies/m1',
      },
    ]);

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Playback queue' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Playback queue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play Queued Movie' })).toHaveAttribute(
      'href',
      '/movies/m1',
    );
  });
});
