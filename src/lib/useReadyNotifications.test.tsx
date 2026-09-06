import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useReadyNotifications, getSeenNotificationIds } from './useReadyNotifications';
import { ToastProvider, useToast } from '../components/ui/Toast';
import { updatePreferences } from './userdata';
import * as client from '../api/client';
import type { MediaRequest } from '../types';

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

/**
 * Flush all pending Promises by waiting one real-time tick.
 * We mock setInterval so the poll interval never auto-fires; we control it manually.
 */
const flushAsync = () =>
  act(async () => {
    await new Promise<void>((r) => setTimeout(r, 20));
  });

// ── useReadyNotifications ─────────────────────────────────────────────────────

describe('useReadyNotifications', () => {
  // Real timers so Promise chains resolve; we spy on setInterval to control polls.
  let capturedIntervalCb: (() => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    capturedIntervalCb = null;
    vi.spyOn(window, 'setInterval').mockImplementation((fn: TimerHandler) => {
      capturedIntervalCb = fn as () => void;
      return 1 as unknown as ReturnType<typeof setInterval>;
    });
    vi.spyOn(window, 'clearInterval').mockReturnValue(undefined as unknown as void);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fire toast for already-available requests on first poll (baseline)', async () => {
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([
      makeRequest({ status: 'available' }),
    ]);

    render(<TestApp>{null}</TestApp>);
    await flushAsync();

    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('fires a toast when a request transitions from downloading to available', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockImplementation(async () => {
      callCount++;
      return callCount === 1
        ? [makeRequest({ status: 'downloading' })]
        : [makeRequest({ status: 'available' })];
    });

    render(<TestApp>{null}</TestApp>);

    // First poll → baseline
    await flushAsync();

    // Second poll — triggered manually via captured interval callback
    await act(async () => {
      capturedIntervalCb?.();
      await new Promise<void>((r) => setTimeout(r, 20));
    });

    await waitFor(() => {
      expect(screen.queryAllByTestId('ready-toast').length).toBeGreaterThan(0);
    });

    const toast = screen.getByTestId('ready-toast');
    expect(toast).toHaveTextContent('Test Movie');
    expect(toast).toHaveTextContent('ready to watch');
    expect(screen.getByText('Watch Now')).toBeInTheDocument();
  });

  it('does not re-fire for the same request after remount (seen list)', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockImplementation(async () => {
      callCount++;
      return callCount === 1
        ? [makeRequest({ status: 'downloading' })]
        : [makeRequest({ status: 'available' })];
    });

    const { unmount } = render(<TestApp>{null}</TestApp>);
    await flushAsync();
    await act(async () => {
      capturedIntervalCb?.();
      await new Promise<void>((r) => setTimeout(r, 20));
    });

    unmount();

    // Remount — req-1 is now permanently available
    vi.spyOn(client.api, 'listRequests').mockResolvedValue([
      makeRequest({ status: 'available' }),
    ]);
    capturedIntervalCb = null;

    render(<TestApp>{null}</TestApp>);
    await flushAsync();

    // req-1 was already stored in the seen list — no new toast
    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('respects prefs.notifications.downloadReady = false', async () => {
    updatePreferences({ notifications: { downloadReady: false } });

    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockImplementation(async () => {
      callCount++;
      return callCount === 1
        ? [makeRequest({ status: 'downloading' })]
        : [makeRequest({ status: 'available' })];
    });

    render(<TestApp>{null}</TestApp>);
    await flushAsync();
    await act(async () => {
      capturedIntervalCb?.();
      await new Promise<void>((r) => setTimeout(r, 20));
    });

    expect(screen.queryAllByTestId('ready-toast')).toHaveLength(0);
  });

  it('stores the request id in localStorage after firing the notification', async () => {
    let callCount = 0;
    vi.spyOn(client.api, 'listRequests').mockImplementation(async () => {
      callCount++;
      return callCount === 1
        ? [makeRequest({ status: 'downloading' })]
        : [makeRequest({ status: 'available' })];
    });

    render(<TestApp>{null}</TestApp>);
    await flushAsync();
    await act(async () => {
      capturedIntervalCb?.();
      await new Promise<void>((r) => setTimeout(r, 20));
    });

    expect(getSeenNotificationIds().has('req-1')).toBe(true);
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
