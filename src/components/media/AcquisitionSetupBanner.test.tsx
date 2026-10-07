import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CapabilitiesContext, ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { AcquisitionSetupBanner } from './AcquisitionSetupBanner';
import { setCurrentRoles } from '../../lib/session';

const getAcquisition = vi.fn();

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>('../../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      getAcquisition: (...args: unknown[]) => getAcquisition(...args),
    },
  };
});

function renderBanner(caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider
      value={{ caps, loading: false, error: null, retry: () => {} }}
    >
      <MemoryRouter>
        <AcquisitionSetupBanner />
      </MemoryRouter>
    </CapabilitiesContext.Provider>,
  );
}

describe('AcquisitionSetupBanner', () => {
  beforeEach(() => {
    setCurrentRoles([]);
    getAcquisition.mockReset();
    getAcquisition.mockResolvedValue({
      ready: false,
      hasIndexer: false,
      hasDownloader: false,
      peers: [],
      message: 'No indexer or downloader is running.',
    });
  });

  it.each(['admin', 'manager'])('links %s to acquisition settings when the capability is enabled', async (role) => {
    setCurrentRoles([role]);
    renderBanner(ALL_CAPABILITIES);
    expect(await screen.findByTestId('acquisition-setup')).toHaveTextContent(
      'No indexer or downloader is running.',
    );
    expect(screen.getByRole('link', { name: 'Check acquisition' })).toHaveAttribute(
      'href',
      '/settings/acquisition',
    );
  });

  it.each([
    { role: 'viewer', roles: ['viewer'] },
    { role: 'user', roles: ['user'] },
    { role: 'approver', roles: ['approver'] },
    { role: 'no role', roles: [] },
  ])('keeps readiness visible to $role without an operator settings link', async ({ roles }) => {
    setCurrentRoles(roles);
    renderBanner(ALL_CAPABILITIES);
    expect(await screen.findByTestId('acquisition-setup')).toHaveTextContent('No indexer or downloader is running.');
    expect(screen.queryByRole('link', { name: 'Check acquisition' })).not.toBeInTheDocument();
    expect(getAcquisition).toHaveBeenCalledOnce();
  });

  it.each(['admin', 'manager'])('omits the settings link for %s when acquisition is disabled', async (role) => {
    setCurrentRoles([role]);
    renderBanner({ ...ALL_CAPABILITIES, features: { ...ALL_CAPABILITIES.features, acquisition: false } });
    expect(await screen.findByTestId('acquisition-setup')).toHaveTextContent('No indexer or downloader is running.');
    expect(screen.queryByRole('link', { name: 'Check acquisition' })).not.toBeInTheDocument();
    expect(getAcquisition).toHaveBeenCalledOnce();
  });

  it('hides when indexer and downloader are live', async () => {
    getAcquisition.mockResolvedValueOnce({
      ready: true,
      hasIndexer: true,
      hasDownloader: true,
      peers: [],
      message: 'Indexer and downloader are connected.',
    });
    renderBanner();
    await vi.waitFor(() => {
      expect(getAcquisition).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('acquisition-setup')).not.toBeInTheDocument();
  });

  it('falls back to capability flags when the status API fails', async () => {
    getAcquisition.mockRejectedValueOnce(new Error('offline'));
    renderBanner(ALL_CAPABILITIES);
    await vi.waitFor(() => {
      expect(screen.queryByTestId('acquisition-setup')).not.toBeInTheDocument();
    });
  });
});
