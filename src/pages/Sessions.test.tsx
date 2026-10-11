import { clearCurrentSession, getCurrentRoles, setCurrentRoles, setCurrentUserId } from '../lib/session';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sessions from './Sessions';

beforeEach(() => setCurrentRoles(['admin']));

const listSessions = vi.fn();
const stopSession = vi.fn();
const plexPlayURL = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listSessions: (...args: unknown[]) => listSessions(...args),
      stopSession: (...args: unknown[]) => stopSession(...args),
      plexPlayURL: (...args: unknown[]) => plexPlayURL(...args),
    },
  };
});

describe('Sessions feedback across actual-client refreshes', () => {
  let events: EventTarget;

  beforeEach(async () => {
    clearCurrentSession();
    setCurrentUserId('u-member');
    setCurrentRoles(['manager']);
    const { api } = await vi.importActual<typeof import('../api/client')>('../api/client');
    listSessions.mockReset().mockImplementation(api.listSessions);
    stopSession.mockReset().mockImplementation(api.stopSession);
    // Keep Testing Library's timeouts real while controlling the page's polling interval.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    vi.stubGlobal('EventSource', class extends EventTarget {
      onmessage = null;
      constructor() {
        super();
        events = this;
      }
      close() { /* No external stream in the fixture. */ }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearCurrentSession();
  });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const sessions = (title: string) => ({
    available: true,
    items: [{ id: 's1', title, user: 'sam', href: '/movies/m1' }],
  });

  it.each(['timer', 'SSE'] as const)('retains a late Stop denial after a completed %s refresh', async (trigger) => {
    const calls: string[] = [];
    const unexpected: string[] = [];
    let reads = 0;
    let finishStop!: (response: Response) => void;
    const stopResponse = new Promise<Response>((resolve) => { finishStop = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = `${init?.method || 'GET'} ${String(input)}`;
      calls.push(call);
      if (call === 'GET /api/sessions') return json(sessions(++reads === 1 ? 'Dune' : 'Arrival'));
      if (call === 'POST /api/sessions/s1/stop') return stopResponse;
      if (call === 'GET /api/session') return json({ user_id: 'u-member', roles: ['viewer'] });
      unexpected.push(call);
      return json({ error: 'No fixture for this request' }, 501);
    }));
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Stop Dune' }));
    expect(screen.getByRole('button', { name: 'Stop Dune' })).toBeDisabled();
    expect(calls).toEqual(['GET /api/sessions', 'POST /api/sessions/s1/stop']);

    await act(async () => {
      finishStop(json({ code: 'operator.forbidden', error: 'private stop diagnostic' }, 403));
    });
    await waitFor(() => expect(getCurrentRoles()).toEqual(['viewer']));
    expect(await screen.findByTestId('operator-notice')).toHaveTextContent("You don't have permission for this action.");

    await act(async () => {
      if (trigger === 'timer') await vi.advanceTimersByTimeAsync(8000);
      else events.dispatchEvent(new Event('session'));
    });
    // A rendered new title proves that the response, not just the request, completed.
    expect(await screen.findByText('Arrival')).toBeInTheDocument();
    expect(calls).toEqual([
      'GET /api/sessions', 'POST /api/sessions/s1/stop', 'GET /api/session', 'GET /api/sessions',
    ]);
    expect(unexpected).toEqual([]);
    expect(screen.queryByRole('button', { name: /^Stop / })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/movies/m1');
    expect(screen.queryByText('private stop diagnostic')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    const notice = screen.getByTestId('operator-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent("You don't have permission for this action.");
  });

  it('shows a successful empty-list refresh alongside retained Stop denial feedback', async () => {
    const calls: string[] = [];
    let reads = 0;
    let finishStop!: (response: Response) => void;
    const stopResponse = new Promise<Response>((resolve) => { finishStop = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = `${init?.method || 'GET'} ${String(input)}`;
      calls.push(call);
      if (call === 'GET /api/sessions') {
        return json(++reads === 1 ? sessions('Dune') : { available: true, items: [] });
      }
      if (call === 'POST /api/sessions/s1/stop') return stopResponse;
      if (call === 'GET /api/session') return json({ user_id: 'u-member', roles: ['viewer'] });
      return json({ error: 'No fixture for this request' }, 501);
    }));
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Stop Dune' }));
    expect(screen.getByRole('button', { name: 'Stop Dune' })).toBeDisabled();
    await act(async () => {
      finishStop(json({ code: 'operator.forbidden', error: 'private stop diagnostic' }, 403));
    });
    await waitFor(() => expect(getCurrentRoles()).toEqual(['viewer']));
    expect(await screen.findByTestId('operator-notice')).toHaveAttribute('role', 'status');

    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    // Removal of the old title proves that the empty response was applied.
    await waitFor(() => expect(screen.queryByText('Dune')).toBeNull());
    expect(calls).toEqual([
      'GET /api/sessions', 'POST /api/sessions/s1/stop', 'GET /api/session', 'GET /api/sessions',
    ]);
    expect(screen.queryByRole('button', { name: /^Stop / })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open' })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('private stop diagnostic')).toBeNull();
    expect(screen.getByTestId('operator-notice')).toHaveTextContent("You don't have permission for this action.");
    expect(screen.getByText('Nobody is watching')).toBeInTheDocument();
  });

  it('clears a list-fetch failure after the next successful poll', async () => {
    const calls: string[] = [];
    let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = `${init?.method || 'GET'} ${String(input)}`;
      calls.push(call);
      if (call !== 'GET /api/sessions') return json({ error: 'No fixture for this request' }, 501);
      return ++reads === 1
        ? json({ error: 'Session list temporarily unavailable' }, 503)
        : json(sessions('Arrival'));
    }));
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Session list temporarily unavailable');
    expect(screen.queryByText('Nobody is watching')).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    expect(await screen.findByText('Arrival')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('operator-notice')).toBeNull();
    expect(screen.getByRole('button', { name: 'Stop Arrival' })).toBeEnabled();
    expect(calls).toEqual(['GET /api/sessions', 'GET /api/sessions']);
  });
});

describe('Sessions page', () => {
  beforeEach(() => {
    listSessions.mockReset();
    stopSession.mockReset();
    plexPlayURL.mockReset();
    plexPlayURL.mockResolvedValue('https://plex.example/web/#!/details');
  });

  it('lists live household streams', async () => {
    listSessions.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 's1',
          title: 'Dune',
          user: 'sam',
          href: '/movies/m1',
          player: 'MuxCore',
          transcode: false,
          paused: false,
          positionSeconds: 120,
          durationSeconds: 600,
        },
      ],
    });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('sessions-page')).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText(/sam · MuxCore/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/movies/m1');
    expect(screen.getByRole('button', { name: 'Stop Dune' })).toBeInTheDocument();
  });

  it('stops a live household stream', async () => {
    listSessions
      .mockResolvedValueOnce({
        available: true,
        total: 1,
        items: [
          {
            id: 's1',
            title: 'Dune',
            user: 'sam',
            href: '/movies/m1',
            player: 'MuxCore',
            transcode: false,
            paused: false,
            positionSeconds: 120,
            durationSeconds: 600,
          },
        ],
      })
      .mockResolvedValue({ available: true, total: 0, items: [] });
    stopSession.mockResolvedValue({ stopped: true, serverType: 'native' });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Stop Dune' }));
    await waitFor(() => {
      expect(stopSession).toHaveBeenCalledWith('s1');
    });
    expect(await screen.findByText('Nobody is watching')).toBeInTheDocument();
  });

  it('shows empty state when nobody is watching', async () => {
    listSessions.mockResolvedValue({ available: true, total: 0, items: [] });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Nobody is watching')).toBeInTheDocument();
  });

  it('opens a live Plex session in Plex', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    listSessions.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          id: 'ps1',
          title: 'Dune',
          user: 'sam',
          mediaId: '99',
          serverType: 'plex',
          player: 'Plex for iOS',
          paused: false,
          positionSeconds: 30,
          durationSeconds: 600,
        },
      ],
    });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Open Dune in Plex' }));
    await waitFor(() => {
      expect(plexPlayURL).toHaveBeenCalledWith('99');
    });
    expect(open).toHaveBeenCalledWith(
      'https://plex.example/web/#!/details',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});
