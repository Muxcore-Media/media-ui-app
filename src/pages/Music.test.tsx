import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Music from './Music';
import { NowPlayingProvider } from '../lib/nowPlaying';
import { setCurrentRoles } from '../lib/session';
import type { LibraryListResponse } from '../types';

const listMusic = vi.fn();
const getMusicArtist = vi.fn();
const addMusicArtist = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listMusic: (...args: unknown[]) => listMusic(...args),
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
      addMusicArtist: (...args: unknown[]) => addMusicArtist(...args),
    },
  };
});

describe('Music consumer section', () => {
  beforeEach(() => {
    listMusic.mockReset();
    getMusicArtist.mockReset();
    addMusicArtist.mockReset();
    setCurrentRoles([]);
    getMusicArtist.mockResolvedValue({ artist: { id: 'ar1', name: 'Björk' }, albums: [] });
    addMusicArtist.mockResolvedValue({ added: true, artist: { id: 'ar-new', name: 'Daft Punk' } });
  });

  it('shows unavailable message when BFF reports module unavailable', async () => {
    listMusic.mockResolvedValueOnce({
      items: [],
      total: 0,
      available: false,
      coming_soon: true,
      message: 'Coming soon — enable library-plus',
    } satisfies LibraryListResponse);

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Coming soon — enable library-plus/i)).toBeInTheDocument();
    });
    expect(listMusic).toHaveBeenCalled();
  });

  it('renders fixture artists from BFF list payload', async () => {
    listMusic.mockResolvedValueOnce({
      items: [{ id: 'ar1', name: 'Björk', path: '/lib/Björk', monitored: true }],
      total: 1,
      available: true,
    } satisfies LibraryListResponse);

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Björk' })).toHaveAttribute('href', '/music/ar1');
    });
  });

  it('adds an artist from the library list', async () => {
    setCurrentRoles(['admin']);
    listMusic
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        available: true,
      } satisfies LibraryListResponse)
      .mockResolvedValueOnce({
        items: [{ id: 'ar-new', name: 'Daft Punk', monitored: true }],
        total: 1,
        available: true,
      } satisfies LibraryListResponse);

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    fireEvent.change(await screen.findByLabelText('Artist name'), { target: { value: 'Daft Punk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add artist' }));
    await waitFor(() => {
      expect(addMusicArtist).toHaveBeenCalledWith({ name: 'Daft Punk' });
    });
    expect(await screen.findByRole('link', { name: 'Daft Punk' })).toHaveAttribute('href', '/music/ar-new');
  });
});

describe('Music accessibility', () => {
  beforeEach(() => {
    listMusic.mockReset();
    getMusicArtist.mockReset();
    addMusicArtist.mockReset();
    setCurrentRoles([]);
    getMusicArtist.mockResolvedValue({ artist: { id: 'ar1', name: 'Björk' }, albums: [] });
  });

  it('has a page h1 and announces loading on initial render', () => {
    listMusic.mockImplementation(() => new Promise(() => {}));

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Music' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading music library' })).toBeInTheDocument();
  });

  it('has tablist with artists selected by default', async () => {
    listMusic.mockResolvedValueOnce({
      items: [{ id: 'ar1', name: 'Björk', path: '/lib/Björk', monitored: true }],
      total: 1,
      available: true,
    } satisfies LibraryListResponse);

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('tablist', { name: 'Music library views' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Artists' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { level: 2, name: 'Artists (1)' })).toBeInTheDocument();
  });

  it('shows unavailable empty state when BFF reports module unavailable', async () => {
    listMusic.mockResolvedValueOnce({
      items: [],
      total: 0,
      available: false,
      message: 'Coming soon — enable library-plus',
    } satisfies LibraryListResponse);

    render(
      <NowPlayingProvider>
      <MemoryRouter>
        <Music />
      </MemoryRouter>
      </NowPlayingProvider>,
    );

    expect(await screen.findByText('Music unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('music-empty')).toBeInTheDocument();
  });
});
