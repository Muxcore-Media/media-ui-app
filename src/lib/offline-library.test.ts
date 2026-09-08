import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadOfflineTitle,
  formatOfflineBytes,
  getOfflineTitle,
  listOfflineTitles,
  OFFLINE_MANIFEST_KEY,
  removeOfflineTitle,
  resolveOfflinePlaySrc,
} from './offline-library';

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
  return store;
}

afterEach(() => {
  localStorage.removeItem(OFFLINE_MANIFEST_KEY);
  vi.unstubAllGlobals();
});

describe('offline library', () => {
  it('formats byte sizes', () => {
    expect(formatOfflineBytes(0)).toBe('—');
    expect(formatOfflineBytes(2048)).toBe('2.0 KB');
    expect(formatOfflineBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('downloads a title into the cache and lists it', async () => {
    installCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['abcdef']), { status: 200 })),
    );
    const row = await downloadOfflineTitle({
      id: 'm1',
      title: 'Dune',
      kind: 'movie',
      src: '/stream/movies/m1',
      href: '/movies/m1',
    });
    expect(row.status).toBe('ready');
    expect(row.bytes).toBeGreaterThan(0);
    expect(getOfflineTitle('m1')?.title).toBe('Dune');
    expect(listOfflineTitles()).toHaveLength(1);
    const play = await resolveOfflinePlaySrc('/stream/movies/m1');
    expect(play).toMatch(/^blob:/);
  });

  it('marks a failed fetch as an error row', async () => {
    installCache();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })));
    await expect(
      downloadOfflineTitle({
        id: 'm1',
        title: 'Dune',
        kind: 'movie',
        src: '/stream/movies/m1',
      }),
    ).rejects.toThrow(/503/);
    expect(getOfflineTitle('m1')?.status).toBe('error');
  });

  it('removes the cached file and manifest row', async () => {
    installCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Blob(['x']), { status: 200 })),
    );
    await downloadOfflineTitle({
      id: 'm1',
      title: 'Dune',
      kind: 'movie',
      src: '/stream/movies/m1',
    });
    await removeOfflineTitle('m1');
    expect(getOfflineTitle('m1')).toBeNull();
    expect(await resolveOfflinePlaySrc('/stream/movies/m1')).toBeNull();
  });
});
