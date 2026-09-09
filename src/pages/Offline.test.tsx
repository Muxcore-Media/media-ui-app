import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Offline from './Offline';
import { OFFLINE_MANIFEST_KEY, type OfflineTitle } from '../lib/offline-library';

const listPlexSyncLists = vi.fn();
const plexPlayURL = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listPlexSyncLists: (...args: unknown[]) => listPlexSyncLists(...args),
      plexPlayURL: (...args: unknown[]) => plexPlayURL(...args),
    },
  };
});

function seed(row: OfflineTitle) {
  localStorage.setItem(OFFLINE_MANIFEST_KEY, JSON.stringify({ [row.id]: row }));
}

beforeEach(() => {
  listPlexSyncLists.mockReset();
  plexPlayURL.mockReset();
  plexPlayURL.mockResolvedValue('https://plex.example/web/#!/details');
  listPlexSyncLists.mockResolvedValue({
    available: false,
    machineIdentifier: '',
    updatedAt: '',
    lists: [],
    total: 0,
    error: '',
  });
});

afterEach(() => {
  localStorage.removeItem(OFFLINE_MANIFEST_KEY);
});

describe('Offline page', () => {
  it('shows an empty state when nothing is saved', () => {
    render(
      <MemoryRouter>
        <Offline />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('offline-page')).toBeInTheDocument();
    expect(screen.getByText(/nothing saved yet/i)).toBeInTheDocument();
  });

  it('lists a saved title with a player link', () => {
    seed({
      id: 'm1',
      title: 'Dune',
      kind: 'movie',
      src: '/stream/movies/m1',
      href: '/movies/m1',
      bytes: 1024,
      savedAt: '2026-09-08T00:00:00.000Z',
      status: 'ready',
    });
    render(
      <MemoryRouter>
        <Offline />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dune')).toBeInTheDocument();
    const play = screen.getByRole('link', { name: 'Play' });
    expect(play.getAttribute('href')).toContain('/player?');
    expect(play.getAttribute('href')).toContain('src=%2Fstream%2Fmovies%2Fm1');
  });

  it('lists Plex device downloads', async () => {
    listPlexSyncLists.mockResolvedValue({
      available: true,
      machineIdentifier: 'machine-1',
      updatedAt: '',
      total: 1,
      error: '',
      lists: [{
        id: 'list-1',
        clientIdentifier: 'client-1',
        deviceUserId: 'plex-user',
        deviceName: 'Pat iPad',
        devicePlatform: 'iOS',
        deviceProduct: 'Plex for iOS',
        items: [{
          id: 'item-1',
          title: 'Dune',
          rootTitle: 'Movies',
          metadataType: '',
          contentType: '',
          mediaType: '',
          ratingKey: '1',
          state: 'downloaded',
          failure: '',
          itemsCount: 1,
          itemsCompleteCount: 1,
          itemsDownloadedCount: 1,
          totalSizeBytes: 1024,
          videoResolution: '1080',
        }],
      }],
    });
    render(
      <MemoryRouter>
        <Offline />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Pat iPad · iOS · 1 title')).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Plex' }));
    await waitFor(() => {
      expect(listPlexSyncLists).toHaveBeenCalledWith({ refresh: true });
    });
  });

  it('opens a Plex device download in Plex', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    listPlexSyncLists.mockResolvedValue({
      available: true,
      machineIdentifier: 'machine-1',
      updatedAt: '',
      total: 1,
      error: '',
      lists: [{
        id: 'list-1',
        clientIdentifier: 'client-1',
        deviceUserId: 'plex-user',
        deviceName: 'Pat iPad',
        devicePlatform: 'iOS',
        deviceProduct: 'Plex for iOS',
        items: [{
          id: 'item-1',
          title: 'Dune',
          rootTitle: 'Movies',
          metadataType: '',
          contentType: '',
          mediaType: '',
          ratingKey: '1',
          state: 'downloaded',
          failure: '',
          itemsCount: 1,
          itemsCompleteCount: 1,
          itemsDownloadedCount: 1,
          totalSizeBytes: 1024,
          videoResolution: '1080',
        }],
      }],
    });
    render(
      <MemoryRouter>
        <Offline />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Open Dune in Plex' }));
    await waitFor(() => {
      expect(plexPlayURL).toHaveBeenCalledWith('1');
    });
    expect(open).toHaveBeenCalledWith(
      'https://plex.example/web/#!/details',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});
