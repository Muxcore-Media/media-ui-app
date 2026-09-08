import { describe, expect, it } from 'vitest';
import { normalizeRootBrowse, normalizeRootPick, normalizeRootProbe, normalizeRootsCatalog, rootLabel, rootProbeLabel, rootWriteBody } from './roots';

describe('roots catalog', () => {
  it('normalizes household library roots', () => {
    const catalog = normalizeRootsCatalog({
      available: true,
      roots: [
        { id: 'r1', path: '/data/movies', name: 'Movies', media_kind: 'movies', is_default: true, accessible: true },
        { id: 'r2', path: '', name: 'skip' },
      ],
    });
    expect(catalog.available).toBe(true);
    expect(catalog.roots).toHaveLength(1);
    expect(catalog.roots[0].isDefault).toBe(true);
    expect(rootLabel(catalog.roots[0])).toBe('Movies — /data/movies (default)');
    expect(rootWriteBody({ name: 'UHD', mediaKind: 'movies', isDefault: true })).toEqual({
      name: 'UHD',
      media_kind: 'movies',
      is_default: true,
    });
  });

  it('soft-fails when roots are down', () => {
    expect(normalizeRootsCatalog({ available: false, roots: [] })).toEqual({ available: false, roots: [] });
  });

  it('normalizes a directory browse listing', () => {
    const listing = normalizeRootBrowse({
      available: true,
      path: '/data',
      parent: '/',
      entries: [{ name: 'movies', path: '/data/movies', is_dir: true }, { name: 'skip' }],
    });
    expect(listing.entries).toHaveLength(1);
    expect(listing.entries[0].path).toBe('/data/movies');
    expect(listing.entries[0].isDir).toBe(true);
  });

  it('normalizes a picked default root', () => {
    const pick = normalizeRootPick({
      available: true,
      root: { id: 'r1', path: '/data/movies', name: 'Movies', media_kind: 'movies', is_default: true, accessible: true },
    });
    expect(pick.available).toBe(true);
    expect(pick.root?.path).toBe('/data/movies');
    expect(pick.root?.isDefault).toBe(true);
    expect(normalizeRootPick({ available: false }).root).toBeNull();
  });

  it('normalizes a Radarr-style folder probe', () => {
    const probe = normalizeRootProbe({
      available: true,
      path: '/data/movies',
      accessible: true,
      free_bytes: 120_000_000_000,
      total_bytes: 500_000_000_000,
    });
    expect(probe.accessible).toBe(true);
    expect(rootProbeLabel(probe)).toContain('accessible');
    expect(rootProbeLabel(probe)).toContain('GB free');
    expect(rootProbeLabel({ available: true, path: '/missing', accessible: false, freeBytes: 0, totalBytes: 0, error: 'no such file' })).toBe(
      'no such file',
    );
  });
});
