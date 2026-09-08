import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineDownloadButton } from './OfflineDownloadButton';
import { CapabilitiesContext, DEFAULT_CAPABILITIES } from '../../lib/capabilities';
import { OFFLINE_MANIFEST_KEY } from '../../lib/offline-library';

function installCache() {
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (key: string) => store.get(key),
      put: async (key: string, res: Response) => {
        store.set(String(key), res);
      },
      delete: async (key: string) => store.delete(String(key)),
    }),
  });
}

function renderButton(caps = DEFAULT_CAPABILITIES) {
  return render(
    <CapabilitiesContext.Provider value={{ caps, loading: false, error: null, retry: () => {} }}>
      <OfflineDownloadButton
        id="m1"
        title="Dune"
        kind="movie"
        src="/stream/movies/m1"
        href="/movies/m1"
      />
    </CapabilitiesContext.Provider>,
  );
}

afterEach(() => {
  localStorage.removeItem(OFFLINE_MANIFEST_KEY);
  vi.unstubAllGlobals();
});

describe('OfflineDownloadButton', () => {
  it('hides when the offline feature is off', () => {
    renderButton({
      ...DEFAULT_CAPABILITIES,
      features: { ...DEFAULT_CAPABILITIES.features, offline: false },
    });
    expect(screen.queryByTestId('offline-download')).not.toBeInTheDocument();
  });

  it('saves a title into the offline cache', async () => {
    installCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['abcdef']), { status: 200 })),
    );
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByTestId('offline-download'));
    expect(await screen.findByRole('button', { name: /saved offline dune/i })).toBeDisabled();
  });
});
