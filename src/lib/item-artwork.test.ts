import { describe, expect, it } from 'vitest';
import { artworkPath, artworkTypeLabel, normalizeItemArtworkList, replaceArtworkBody } from './item-artwork';

describe('item artwork', () => {
  it('normalizes a household ListArtwork payload', () => {
    const next = normalizeItemArtworkList({
      available: true,
      items: [
        {
          id: 'm1_poster',
          item_id: 'm1',
          type: 'poster',
          url: '/images/movies/m1/poster.jpg',
          width: 1000,
          height: 1500,
        },
      ],
    });
    expect(next.available).toBe(true);
    expect(next.items[0].url).toContain('/images/movies/');
    expect(artworkTypeLabel(next.items[0].type)).toBe('Poster');
  });

  it('builds movie and TV artwork paths', () => {
    expect(artworkPath('movie', 'm1')).toBe('/api/movies/m1/artwork');
    expect(artworkPath('tv', 's/1')).toBe('/api/tv/s%2F1/artwork');
    expect(artworkPath('artist', 'ar1')).toBe('/api/music/ar1/artwork');
    expect(artworkPath('author', 'au1')).toBe('/api/books/au1/artwork');
    expect(artworkPath('audiobook', 'ab1')).toBe('/api/audiobooks/ab1/artwork');
    expect(artworkPath('series', 'cs1')).toBe('/api/comics/cs1/artwork');
    expect(replaceArtworkBody({ type: 'poster', filename: 'p.jpg', data: 'abc' })).toEqual({
      type: 'poster',
      filename: 'p.jpg',
      data: 'abc',
    });
  });
});
