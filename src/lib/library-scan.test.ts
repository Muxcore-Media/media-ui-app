import { describe, expect, it } from 'vitest';
import {
  libraryScanStatusLabel,
  normalizeLibraryScanResult,
  normalizeLibraryScanStatus,
  normalizeWatchDirs,
  watchDirLabel,
} from './library-scan';

describe('library scan', () => {
  it('normalizes scanner stats', () => {
    const next = normalizeLibraryScanStatus({
      available: true,
      status: 'idle',
      last_scan_at: '2023-11-14T22:13:20Z',
      watch_dirs: 2,
      total_imported: 12,
      last_found: 4,
      last_imported: 3,
      last_skipped: 1,
    });
    expect(next.available).toBe(true);
    expect(next.scanner).toBe(false);
    expect(next.watchDirs).toBe(2);
    expect(next.totalImported).toBe(12);
    expect(libraryScanStatusLabel(next)).toContain('imported 12');
  });

  it('soft-fails when scanner is down', () => {
    expect(normalizeLibraryScanStatus({ available: false })).toMatchObject({
      available: false,
      status: '',
      totalImported: 0,
    });
  });

  it('normalizes a scan result', () => {
    const next = normalizeLibraryScanResult({
      type: 'watch',
      files_found: 5,
      files_imported: 4,
      files_skipped: 1,
      message: 'watch scan complete — found=5 imported=4 skipped=1',
    });
    expect(next.filesImported).toBe(4);
    expect(next.message).toContain('watch scan');
    expect(next.libraries).toEqual([]);
  });

  it('labels plus-only scan status', () => {
    expect(
      libraryScanStatusLabel({
        available: true,
        scanner: false,
        status: 'idle',
        lastScanAt: '',
        watchDirs: 0,
        totalImported: 0,
        lastFound: 0,
        lastImported: 0,
        lastSkipped: 0,
        lastError: '',
        libraries: [{ library: 'books', available: true, filesFound: 0, filesImported: 0, filesSkipped: 0 }],
      }),
    ).toBe('idle · books');
  });

  it('normalizes watch folders', () => {
    const next = normalizeWatchDirs({
      available: true,
      dirs: [{ id: 'wd1', path: '/downloads', media_type: 'both', library_path: '/data/movies', enabled: true }],
    });
    expect(next.dirs).toHaveLength(1);
    expect(watchDirLabel(next.dirs[0])).toBe('/downloads (both)');
  });

  it('labels a paused watch folder', () => {
    expect(
      watchDirLabel({
        id: 'wd1',
        path: '/downloads',
        mediaType: 'both',
        libraryPath: '',
        enabled: false,
        createdAt: '',
      }),
    ).toBe('/downloads (both) · paused');
  });
});
