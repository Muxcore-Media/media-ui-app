import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../lib/session';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sessions from './Sessions';
import { OperatorError } from '../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../test/operator-roles';

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

describe('Sessions page', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

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

describe('Sessions page operator gate (T-M5-12)', () => {
  const row = {
    id: 's1',
    title: 'Dune',
    user: 'sam',
    href: '/movies/m1',
    player: 'MuxCore',
    transcode: false,
    paused: false,
    positionSeconds: 120,
    durationSeconds: 600,
  };

  beforeEach(() => {
    listSessions.mockReset();
    stopSession.mockReset();
    listSessions.mockResolvedValue({ available: true, total: 1, items: [row] });
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
  }

  // Stop can end any household member's stream and the BFF cannot prove ownership, so members get no
  // Stop at all, and there is deliberately no "stop my own stream" control for them.
  it.each(MEMBER_ROLE_CASES)('lists the stream without any stop control for %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderPage();
    expect(await screen.findByText('Dune')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/movies/m1');
    expect(screen.queryByRole('button', { name: /stop|end|kick|disconnect/i })).toBeNull();
    expect(screen.queryByText(/stop a device/i)).toBeNull();
  });

  it('shows no empty action group for a member when a row has nothing to act on', async () => {
    setCurrentRoles(['viewer']);
    listSessions.mockResolvedValue({ available: true, total: 1, items: [{ ...row, href: '' }] });
    renderPage();
    const item = (await screen.findByText('Dune')).closest('li') as HTMLElement;
    expect(item.querySelectorAll('button, a')).toHaveLength(0);
    expect(item.querySelectorAll('div > div')).toHaveLength(0);
  });

  it.each(OPERATOR_ROLE_CASES)('offers stop to %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderPage();
    expect(await screen.findByRole('button', { name: 'Stop Dune' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 on stop calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    stopSession.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Stop Dune' }));
    const notice = await screen.findByTestId('operator-notice');
    expect(notice).toHaveAttribute('data-operator-code', 'operator.forbidden');
    expect(notice).toHaveTextContent("You don't have permission for this action.");
    expect(stopSession).toHaveBeenCalledTimes(1);
  });
});
