import { describe, expect, it } from 'vitest';
import {
  normalizeRenamePreview,
  normalizeRenameResult,
  renameChangedCount,
  renameQuery,
} from './rename';

describe('rename preview', () => {
  it('normalizes household Preview Rename rows', () => {
    const preview = normalizeRenamePreview({
      available: true,
      items: [
        {
          file_id: 'f1',
          current_path: '/data/movies/Fight.Club.1999.mkv',
          new_path: '/data/movies/Fight Club (1999)/Fight Club (1999) [1080p].mkv',
          new_filename: 'Fight Club (1999) [1080p].mkv',
          changed: true,
        },
        { file_id: 'skip' },
      ],
    });
    expect(preview.available).toBe(true);
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].fileId).toBe('f1');
    expect(renameChangedCount(preview.items)).toBe(1);
  });

  it('soft-fails when rename is down', () => {
    expect(normalizeRenamePreview({ available: false, items: [] })).toEqual({
      available: false,
      items: [],
    });
  });

  it('builds preview query strings', () => {
    expect(renameQuery({ movieId: 'm1' })).toBe('movie_id=m1');
    expect(renameQuery({ tvId: 's1', episodeId: 'e1' })).toBe('tv_id=s1&episode_id=e1');
  });

  it('normalizes apply results', () => {
    const result = normalizeRenameResult({ available: true, renamed: 2, errors: 0, items: [] });
    expect(result.renamed).toBe(2);
    expect(result.errors).toBe(0);
  });
});
