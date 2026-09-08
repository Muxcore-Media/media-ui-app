import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CapabilitiesContext, ALL_CAPABILITIES, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { AcquisitionSetupBanner } from './AcquisitionSetupBanner';

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
  it('asks to connect a downloader when peers are down', async () => {
    getAcquisition.mockResolvedValueOnce({
      ready: false,
      hasIndexer: false,
      hasDownloader: false,
      peers: [],
      message: 'No indexer or downloader is running.',
    });
    renderBanner();
    expect(await screen.findByTestId('acquisition-setup')).toHaveTextContent(
      'No indexer or downloader is running.',
    );
    expect(screen.getByRole('link', { name: 'Check acquisition' })).toHaveAttribute(
      'href',
      '/settings/acquisition',
    );
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
