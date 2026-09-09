import { describe, expect, it } from 'vitest';
import { itemTagsPath, normalizeTags, tagLabel, tagWriteBody } from './tags';

describe('library tags', () => {
  it('normalizes movie, TV, and music catalog rows', () => {
    const next = normalizeTags({
      available: true,
      tags: [
        { id: 'm1', label: '4K', media: 'movie' },
        { id: 't1', name: 'anime', media: 'tv' },
        { id: 'u1', label: 'live', media: 'music' },
        { id: '' },
      ],
    });
    expect(next.tags).toHaveLength(3);
    expect(tagLabel(next.tags[1])).toBe('anime');
    expect(next.tags[2].media).toBe('music');
  });

  it('soft-fails when library modules are down', () => {
    expect(normalizeTags({ available: false, tags: [] })).toEqual({ available: false, tags: [] });
  });

  it('writes create bodies', () => {
    expect(tagWriteBody({ label: 'kids', media: 'movie' })).toEqual({ label: 'kids', media: 'movie' });
  });

  it('routes per-item tags by library', () => {
    expect(itemTagsPath('movie', 'mov1')).toBe('/api/movies/mov1/tags');
    expect(itemTagsPath('tv', 'show1')).toBe('/api/tv/show1/tags');
    expect(itemTagsPath('artist', 'ar1')).toBe('/api/music/ar1/tags');
    expect(itemTagsPath('music', 'ar1')).toBe('/api/music/ar1/tags');
    expect(itemTagsPath('author', 'au1')).toBe('/api/books/au1/tags');
  });
});
