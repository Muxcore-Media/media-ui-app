import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setCurrentRoles } from '../../lib/session';
import { fireEvent, render, screen } from '@testing-library/react';
import InteractiveSearch from './InteractiveSearch';
import { CapabilitiesContext, ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { OperatorError } from '../../api/errors';
import { MEMBER_ROLE_CASES, OPERATOR_ROLE_CASES } from '../../test/operator-roles';

const searchReleases = vi.fn();
const grabRelease = vi.fn();
const blockRelease = vi.fn();
const getAcquisition = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      searchReleases: (...args: unknown[]) => searchReleases(...args),
      grabRelease: (...args: unknown[]) => grabRelease(...args),
      blockRelease: (...args: unknown[]) => blockRelease(...args),
      getAcquisition: (...args: unknown[]) => getAcquisition(...args),
    },
  };
});

function renderSearch(caps = ALL_CAPABILITIES, autoSearch = false) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <InteractiveSearch
        itemType="movie"
        itemId="m1"
        title="Dune"
        year={2021}
        tmdbId={438631}
        autoSearch={autoSearch}
      />
    </CapabilitiesContext.Provider>,
  );
}

describe('InteractiveSearch', () => {
  // The BFF reserves these controls for admin/manager (T-M5-12).
  beforeEach(() => setCurrentRoles(['manager']));

  beforeEach(() => {
    searchReleases.mockReset();
    grabRelease.mockReset();
    blockRelease.mockReset();
    blockRelease.mockResolvedValue({ success: true, guid: 'high' });
    searchReleases.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          guid: 'high',
          title: 'Dune.2021.2160p.BluRay.REMUX',
          indexer_name: 'fixture',
          download_protocol: 'torrent',
          size: 40e9,
          score: 210,
          seeders: 12,
          quality: { label: '2160p Remux', resolution: '2160p', source: 'Remux', hdr: true },
        },
      ],
    });
    grabRelease.mockResolvedValue({ download_id: 'dl-1', status: 'queued' });
    getAcquisition.mockReset();
    getAcquisition.mockResolvedValue({ liveGrabAllowed: true, message: '' });
  });

  it('hides when releases capability is off', () => {
    renderSearch(DEFAULT_CAPABILITIES);
    expect(screen.queryByTestId('interactive-search')).not.toBeInTheDocument();
  });

  it('auto-searches when opened from a quality-upgrade link', async () => {
    renderSearch(ALL_CAPABILITIES, true);
    expect(await screen.findByText('Dune.2021.2160p.BluRay.REMUX')).toBeInTheDocument();
    expect(searchReleases).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'Dune', type: 'movie', year: 2021 }),
    );
  });

  it('lists scored releases and grabs the selected one', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    expect(await screen.findByText('Dune.2021.2160p.BluRay.REMUX')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
    expect(screen.getByTestId('release-quality')).toHaveTextContent('2160p Remux');
    fireEvent.click(screen.getByRole('button', { name: /grab dune.2021/i }));
    expect(await screen.findByTestId('release-grabbed')).toHaveTextContent(/queued/i);
    expect(grabRelease).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'high', item_id: 'm1', item_type: 'movie' }),
    );
  });

  it('blocklists a release so it cannot be grabbed again', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    fireEvent.click(await screen.findByRole('button', { name: /block dune.2021/i }));
    expect(await screen.findByRole('button', { name: /block dune.2021/i })).toHaveTextContent(/blocked/i);
    expect(blockRelease).toHaveBeenCalledWith(
      expect.objectContaining({ guid: 'high', item_id: 'm1' }),
    );
    expect(screen.getByRole('button', { name: /grab dune.2021/i })).toBeDisabled();
  });

  it('searches music releases for a library artist', async () => {
    render(
      <CapabilitiesContext.Provider value={{ caps: ALL_CAPABILITIES, loading: false, error: null, retry: () => {} }}>
        <InteractiveSearch itemType="music" itemId="ar1" title="Radiohead" />
      </CapabilitiesContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    expect(searchReleases).toHaveBeenCalledWith(expect.objectContaining({ q: 'Radiohead', type: 'music' }));
  });

  it('disables grab when live VPN policy blocks it', async () => {
    getAcquisition.mockResolvedValue({
      liveGrabAllowed: false,
      message: 'Live torrent grab needs WireGuard.',
    });
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    expect(await screen.findByTestId('release-grab-blocked')).toHaveTextContent(/wireguard/i);
    expect(screen.getByRole('button', { name: /grab dune.2021/i })).toBeDisabled();
  });
});

describe('InteractiveSearch operator gate (T-M5-12)', () => {
  beforeEach(() => {
    searchReleases.mockReset();
    grabRelease.mockReset();
    blockRelease.mockReset();
    getAcquisition.mockReset();
    getAcquisition.mockResolvedValue({ liveGrabAllowed: true, message: '' });
    searchReleases.mockResolvedValue({
      available: true,
      total: 1,
      items: [
        {
          guid: 'high',
          title: 'Dune.2021.2160p.BluRay.REMUX',
          indexer_name: 'fixture',
          download_protocol: 'torrent',
          size: 40e9,
          score: 210,
          seeders: 12,
          quality: { label: '2160p Remux', resolution: '2160p', source: 'Remux', hdr: true },
        },
      ],
    });
  });

  // GET /api/releases/search is a read, so members still see the scored list; only Grab and Block go.
  it.each(MEMBER_ROLE_CASES)('lists releases without grab, block or an empty actions column for %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    expect(await screen.findByText('Dune.2021.2160p.BluRay.REMUX')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /grab dune/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /block dune/i })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).toBeNull();
    expect(screen.queryByTestId('release-grab-blocked')).toBeNull();
    expect(getAcquisition).not.toHaveBeenCalled();
  });

  it.each(OPERATOR_ROLE_CASES)('offers grab and block to %s', async (_label, roles) => {
    setCurrentRoles(roles);
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    expect(await screen.findByRole('button', { name: /grab dune/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /block dune/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('explains a stale-role 403 on grab calmly and does not retry', async () => {
    setCurrentRoles(['manager']);
    grabRelease.mockRejectedValue(new OperatorError('operator.forbidden', 403));
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /search releases/i }));
    fireEvent.click(await screen.findByRole('button', { name: /grab dune/i }));
    const notice = await screen.findByTestId('release-search-error');
    expect(notice).toHaveTextContent("You don't have permission for this action.");
    expect(notice).toHaveAttribute('role', 'status');
    expect(grabRelease).toHaveBeenCalledTimes(1);
  });
});
