import { describe, expect, it } from 'vitest';
import { formatMovieFileSize, movieFileLabel, normalizeMovieFiles } from './item-files';

describe('movie files', () => {
  it('normalizes household file rows', () => {
    const next = normalizeMovieFiles({
      available: true,
      items: [{ id: 'f1', filename: 'Fight.Club.1999.mkv', quality: 'Bluray-1080p', size_bytes: 12000000000, container: 'mkv' }],
    });
    expect(next.available).toBe(true);
    expect(next.items[0]).toMatchObject({
      id: 'f1',
      filename: 'Fight.Club.1999.mkv',
      quality: 'Bluray-1080p',
      sizeBytes: 12_000_000_000,
      container: 'mkv',
    });
    expect(movieFileLabel(next.items[0])).toBe('Fight.Club.1999.mkv · Bluray-1080p · MKV');
    expect(formatMovieFileSize(12_000_000_000)).toBe('11 GB');
  });

  it('soft-fails when the catalog is unavailable', () => {
    expect(normalizeMovieFiles({ available: false, items: [] })).toEqual({ available: false, items: [] });
  });
});
