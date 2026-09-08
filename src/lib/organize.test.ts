import { describe, expect, it } from 'vitest';
import { normalizeOrganize, organizeFolderOptions } from './organize';

describe('organize', () => {
  it('normalizes a household BatchRename payload', () => {
    const next = normalizeOrganize({
      available: true,
      directory: '/data/movies',
      media_type: 'movie',
      dry_run: true,
      total: 1,
      renamed: 1,
      errors: 0,
      items: [{ original: 'Fight.Club.1999.mkv', renamed_to: '/data/movies/Fight Club (1999).mkv', success: true }],
    });
    expect(next.directory).toBe('/data/movies');
    expect(next.dryRun).toBe(true);
    expect(next.items[0].renamedTo).toContain('Fight Club');
  });

  it('dedupes folder options and drops filesystem root', () => {
    expect(organizeFolderOptions(['/data/movies', '/data/movies', '/', '', '/downloads'])).toEqual([
      '/data/movies',
      '/downloads',
    ]);
  });
});
