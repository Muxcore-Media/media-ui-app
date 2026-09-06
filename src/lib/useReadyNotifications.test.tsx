import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useReadyNotifications, getSeenNotificationIds } from './useReadyNotifications';
import { ToastProvider, useToast } from '../components/ui/Toast';
import * as client from '../api/client';
import type { MediaRequest, Movie } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<MediaRequest> = {}): MediaRequest {
  return {
    id: 'req-1',
    itemType: 'movie',
    itemId: 'movie-1',
    tmdbId: 123,
    title: 'Test Movie',
    year: 2024,
    poster: '',
    status: 'downloading',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'movie-1',
    title: 'Test Movie',
    year: 2024,
    overview: '',
    runtime: 100,
    vote_average: 7,
    genres: [],
    poster_url: '',
    has_file: false,
    stream_url: '',
    created_at: '2024-01-01',
    ...overrides,
  };
}

function makeList<T>(items: T[]) {
  return { items, total: items.length, page: 1, page_size: items.length };
}

function Watcher() {
  useReadyNotifications();
  return null;
}

function TestApp({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <Watcher />
        {children}
      </ToastProvider>
    </MemoryRouter>
  );
}

async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// ── useReadyNotifications ─────────────────────────────────────────────────────

describe('useReadyNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not fire toast for already-available requests on first poll (baseline)', async () => {
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([
      makeRequest({ status: 'added' }),
    ]);
    vi.spyOn(client.api, 'listMovies').mockResolvedValue(makeList([makeMovie({ has_file: true })]));
    vi.spyOn(client.api, 'listTVShows').mockResolvedValue(makeList([]));

    render(<TestApp>{null}</TestApp>);
    await act(flushMicrotasks);

    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('fires a toast when has_file transitions from false to true', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([makeRequest({ status: 'added' })]);
    vi.spyOn(client.api, 'listMovies').mockImplementation(async () => {
      callCount++;
      return makeList([makeMovie({ has_file: callCount > 1 })]);
    });
    vi.spyOn(client.api, 'listTVShows').mockResolvedValue(makeList([]));

    render(<TestApp>{null}</TestApp>);

    // First poll → baseline (has_file=false)
    await act(flushMicrotasks);
    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);

    // Second poll → has_file=true → toast fires
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(screen.queryAllByTestId('ready-toast').length).toBeGreaterThan(0);
    const toast = screen.getByTestId('ready-toast');
    expect(toast).toHaveTextContent('Test Movie');
    expect(toast).toHaveTextContent('ready to watch');
    expect(screen.getByText('Watch Now')).toBeInTheDocument();
  });

  it('does not re-fire for the same item after remount (seen list)', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([makeRequest({ status: 'added' })]);
    vi.spyOn(client.api, 'listMovies').mockImplementation(async () => {
      callCount++;
      return makeList([makeMovie({ has_file: callCount > 1 })]);
    });
    vi.spyOn(client.api, 'listTVShows').mockResolvedValue(makeList([]));

    const { unmount } = render(<TestApp>{null}</TestApp>);
    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    // Toast fired → item is in seen list
    expect(screen.queryAllByTestId('ready-toast').length).toBeGreaterThan(0);
    unmount();

    // Remount — movie-1 is now permanently playable
    callCount = 99; // always has_file=true
    render(<TestApp>{null}</TestApp>);
    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    // No new toast — already in seen list
    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('does not toast for denied or failed requests', async () => {
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([
      makeRequest({ status: 'denied' }),
    ]);
    vi.spyOn(client.api, 'listMovies').mockResolvedValue(makeList([makeMovie({ has_file: true })]));
    vi.spyOn(client.api, 'listTVShows').mockResolvedValue(makeList([]));

    render(<TestApp>{null}</TestApp>);
    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('stores the item key in localStorage after firing the notification', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([makeRequest({ status: 'added' })]);
    vi.spyOn(client.api, 'listMovies').mockImplementation(async () => {
      callCount++;
      return makeList([makeMovie({ has_file: callCount > 1 })]);
    });
    vi.spyOn(client.api, 'listTVShows').mockResolvedValue(makeList([]));

    render(<TestApp>{null}</TestApp>);
    await act(flushMicrotasks);
    await act(async () => {
      vi.advanceTimersByTime(46_000);
      await flushMicrotasks();
    });

    // Item key is "movie:movie-1" (itemType:itemId), not the request id
    expect(getSeenNotificationIds().has('movie:movie-1')).toBe(true);
  });
});

// ── Toast component ───────────────────────────────────────────────────────────

describe('ToastProvider', () => {
  function TriggerToast({
    title = 'Hello toast',
    href,
    durationMs,
  }: {
    title?: string;
    href?: string;
    durationMs?: number;
  }) {
    const { addToast } = useToast();
    return (
      <button
        type="button"
        onClick={() =>
          addToast({
            title,
            href,
            actionLabel: href ? 'Watch Now' : undefined,
            durationMs,
          })
        }
      >
        Add
      </button>
    );
  }

  it('renders a toast when addToast is called', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <TriggerToast />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('ready-toast')).toBeInTheDocument();
    expect(screen.getByText('Hello toast')).toBeInTheDocument();
  });

  it('dismisses when the X button is clicked', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <TriggerToast />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByTestId('ready-toast')).not.toBeInTheDocument();
  });

  it('shows an action button when href is provided', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <TriggerToast href="/movies/42" />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('button', { name: 'Watch Now' })).toBeInTheDocument();
  });

  it('auto-dismisses after durationMs', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <ToastProvider>
          <TriggerToast durationMs={500} />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByTestId('ready-toast')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.queryByTestId('ready-toast')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
