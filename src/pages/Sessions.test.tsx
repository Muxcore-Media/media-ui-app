import { setCurrentRoles } from '../lib/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
