import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Music from './Music';
import type { LibraryListResponse } from '../types';

const listMusic = vi.fn();
const getMusicArtist = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      listMusic: (...args: unknown[]) => listMusic(...args),
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
    },
  };
});

describe('Music consumer section', () => {
  beforeEach(() => {
    listMusic.mockReset();
    getMusicArtist.mockReset();
    getMusicArtist.mockResolvedValue({ artist: { id: 'ar1', name: 'Björk' }, albums: [] });
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
      <MemoryRouter>
        <Music />
      </MemoryRouter>,
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
      <MemoryRouter>
        <Music />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Björk' })).toHaveAttribute('href', '/music/ar1');
    });
  });
});

describe('Music accessibility', () => {
  beforeEach(() => {
    listMusic.mockReset();
    getMusicArtist.mockReset();
    getMusicArtist.mockResolvedValue({ artist: { id: 'ar1', name: 'Björk' }, albums: [] });
  });

  it('has a page h1 and announces loading on initial render', () => {
    listMusic.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <Music />
      </MemoryRouter>,
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
      <MemoryRouter>
        <Music />
      </MemoryRouter>,
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
      <MemoryRouter>
        <Music />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Music unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('music-empty')).toBeInTheDocument();
  });
});
