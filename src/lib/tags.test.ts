import { describe, expect, it } from 'vitest';
import { normalizeTags, tagLabel, tagWriteBody } from './tags';

describe('library tags', () => {
  it('normalizes movie and TV catalog rows', () => {
    const next = normalizeTags({
      available: true,
      tags: [
        { id: 'm1', label: '4K', media: 'movie' },
        { id: 't1', name: 'anime', media: 'tv' },
        { id: '' },
      ],
    });
    expect(next.tags).toHaveLength(2);
    expect(tagLabel(next.tags[1])).toBe('anime');
  });

  it('soft-fails when library modules are down', () => {
    expect(normalizeTags({ available: false, tags: [] })).toEqual({ available: false, tags: [] });
  });

  it('writes create bodies', () => {
    expect(tagWriteBody({ label: 'kids', media: 'movie' })).toEqual({ label: 'kids', media: 'movie' });
  });
});
