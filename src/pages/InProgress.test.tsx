import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InProgress from './InProgress';
import {
  ALL_CAPABILITIES,
  CapabilitiesContext,
  DEFAULT_CAPABILITIES,
} from '../lib/capabilities';
import { setCurrentRoles } from '../lib/session';

const listRequests = vi.fn();
const listMovies = vi.fn();
const listTVShows = vi.fn();
const listUpgrades = vi.fn();
const searchNow = vi.fn();
const approveRequest = vi.fn();
const denyRequest = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listRequests: (...args: unknown[]) => listRequests(...args),
      listMovies: (...args: unknown[]) => listMovies(...args),
      listTVShows: (...args: unknown[]) => listTVShows(...args),
      listUpgrades: (...args: unknown[]) => listUpgrades(...args),
      searchNow: (...args: unknown[]) => searchNow(...args),
      approveRequest: (...args: unknown[]) => approveRequest(...args),
      denyRequest: (...args: unknown[]) => denyRequest(...args),
      getRequestPolicy: async () => ({ canRequest: true, maxPerWeek: 0, maxPendingPerUser: 0 }),
      getAcquisition: async () => ({
        ready: true,
        hasIndexer: true,
        hasDownloader: true,
        peers: [],
        message: '',
      }),
    },
  };
});

function renderPage(caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <MemoryRouter>
        <InProgress />
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('InProgress page', () => {
  beforeEach(() => {
    listRequests.mockReset();
    listMovies.mockReset();
    listTVShows.mockReset();
    listUpgrades.mockReset();
    searchNow.mockReset();
    approveRequest.mockReset();
    denyRequest.mockReset();
    setCurrentRoles([]);
    listMovies.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
    listTVShows.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
    listUpgrades.mockResolvedValue({ items: [], total: 0, available: true });
    searchNow.mockResolvedValue({ started: true, message: 'wanted search started' });
  });

  it('shows empty state when nothing is in progress', async () => {
    listRequests.mockResolvedValueOnce([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Nothing in progress/i)).toBeInTheDocument();
    });
  });

  it('groups active requests by phase', async () => {
    listRequests.mockResolvedValueOnce([
      {
        id: 'r1',
        itemType: 'movie',
        itemId: 'm1',
        tmdbId: 1,
        title: 'Downloading Movie',
        year: 2020,
        poster: '',
        status: 'downloading',
        qualityProfileId: '4k',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'r2',
        itemType: 'tv',
        itemId: 's1',
        tmdbId: 2,
        title: 'Searching Show',
        year: 2021,
        poster: '',
        status: 'searching',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('in-progress-downloading')).toBeInTheDocument();
      expect(screen.getByTestId('in-progress-searching')).toBeInTheDocument();
    });
    expect(screen.getByText('Downloading Movie')).toBeInTheDocument();
    expect(screen.getByText(/Movie · 2020 · 4K/)).toBeInTheDocument();
    expect(screen.getByText('Searching Show')).toBeInTheDocument();
  });

  it('surfaces import_failed requests in the attention section', async () => {
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-fail',
        itemType: 'movie',
        itemId: 'm9',
        tmdbId: 9,
        title: 'Broken Import',
        year: 2020,
        poster: '',
        status: 'import_failed',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('in-progress-attention')).toBeInTheDocument();
    });
    expect(screen.getByText('Broken Import')).toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText(/could not be added to your library/i)).toBeInTheDocument();
  });

  it('shows API statusLabel and statusDetail on cards when present', async () => {
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
      expect(screen.getByTestId('in-progress-attention')).toBeInTheDocument();
    });
    expect(screen.getByText('Stalled — no peers')).toBeInTheDocument();
    expect(screen.queryByText('no peers')).not.toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
    expect(screen.getByText('path not under a scanner watch directory')).toBeInTheDocument();
  });

  it('lists cutoff-unmet titles and starts a wanted search', async () => {
    listRequests.mockResolvedValueOnce([]);
    listUpgrades.mockResolvedValueOnce({
      available: true,
      total: 1,
      items: [
        {
          queue_id: 'q-far',
          item_type: 'tv',
          item_id: 's-far',
          title: 'Needs Upgrade',
          year: 2021,
          current_score: 10,
          cutoff_score: 200,
        },
      ],
    });

    renderPage(ALL_CAPABILITIES);

    expect(await screen.findByTestId('in-progress-upgrades')).toBeInTheDocument();
    expect(screen.getByText('Needs Upgrade')).toBeInTheDocument();
    expect(screen.getByText(/190 below/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Needs Upgrade/i })).toHaveAttribute(
      'href',
      '/tv/s-far?search=1',
    );

    fireEvent.click(screen.getByRole('button', { name: /search now/i }));
    expect(await screen.findByTestId('upgrade-search-now')).toHaveTextContent(/wanted search started/i);
    expect(searchNow).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: 's-far', item_type: 'tv' }),
    );
  });

  it('lets privileged household users approve a pending request', async () => {
    setCurrentRoles(['admin']);
    const pending = {
      id: 'r-pend',
      itemType: 'movie',
      itemId: '',
      tmdbId: 55,
      title: 'Needs Approval',
      year: 2026,
      poster: '',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };
    listRequests.mockResolvedValueOnce([pending]);
    listRequests.mockResolvedValueOnce([]);
    approveRequest.mockResolvedValueOnce({ status: 'requested' });

    renderPage();

    expect(await screen.findByTestId('in-progress-pending')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for a household admin/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => {
      expect(approveRequest).toHaveBeenCalledWith('r-pend');
    });
    await waitFor(() => {
      expect(screen.queryByTestId('in-progress-pending')).not.toBeInTheDocument();
    });
  });

  it('hides approve/deny from members without an approver role', async () => {
    setCurrentRoles(['member']);
    listRequests.mockResolvedValueOnce([
      {
        id: 'r-pend',
        itemType: 'movie',
        itemId: '',
        tmdbId: 55,
        title: 'Needs Approval',
        year: 2026,
        poster: '',
        status: 'pending',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    renderPage();

    expect(await screen.findByTestId('in-progress-pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });

  it('denies a pending request with an optional reason', async () => {
    setCurrentRoles(['manager']);
    const pending = {
      id: 'r-deny',
      itemType: 'tv',
      itemId: '',
      tmdbId: 9,
      title: 'Skip This',
      year: 2025,
      poster: '',
      status: 'pending',
      createdAt: '',
      updatedAt: '',
    };
    listRequests.mockResolvedValueOnce([pending]);
    listRequests.mockResolvedValueOnce([]);
    denyRequest.mockResolvedValueOnce({ status: 'denied' });
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('already own it');

    renderPage();

    expect(await screen.findByRole('button', { name: 'Deny' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Deny' }));
    await waitFor(() => {
      expect(denyRequest).toHaveBeenCalledWith('r-deny', 'already own it');
    });
    prompt.mockRestore();
  });
});

describe('InProgress accessibility', () => {
  beforeEach(() => {
    listRequests.mockReset();
    listMovies.mockReset();
    listTVShows.mockReset();
    listUpgrades.mockReset();
    searchNow.mockReset();
    approveRequest.mockReset();
    denyRequest.mockReset();
    setCurrentRoles([]);
    listMovies.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
    listTVShows.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
    listUpgrades.mockResolvedValue({ items: [], total: 0, available: true });
    listRequests.mockResolvedValue([]);
  });

  it('has a page h1 and announces loading on initial render', () => {
    listRequests.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'In progress' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading in-progress titles' })).toBeInTheDocument();
  });
});
