import { describe, expect, it } from 'vitest';
import { missingEpisodeLabel, normalizeMissing } from './missing';

describe('missing', () => {
  it('normalizes library ListMissing movies and episodes', () => {
    const res = normalizeMissing({
      available: true,
      movies: {
        available: true,
        total: 1,
        items: [{ kind: 'movie', id: 'm1', title: 'Dune', year: 2021, href: '/movies/m1' }],
      },
      tv: {
        available: true,
        total: 1,
        items: [{
          kind: 'tv',
          id: 'ep1',
          itemId: 's1',
          seriesId: 's1',
          title: 'Severance',
          seasonNumber: 1,
          episodeNumber: 2,
          airDate: '2022-02-25',
          href: '/tv/s1',
        }],
      },
    });
    expect(res.movies.items[0]?.title).toBe('Dune');
    expect(res.tv.items[0]?.seasonNumber).toBe(1);
    expect(missingEpisodeLabel(res.tv.items[0]!)).toBe('S01E02 · 2022-02-25');
  });

  it('normalizes missing albums', () => {
    const res = normalizeMissing({
      available: true,
      movies: { available: false, items: [] },
      tv: { available: false, items: [] },
      music: {
        available: true,
        total: 1,
        items: [{
          kind: 'music',
          id: 'al1',
          itemId: 'al1',
          artistId: 'ar1',
          artistName: 'Radiohead',
          title: 'OK Computer',
          year: 1997,
          href: '/music/ar1',
        }],
      },
    });
    expect(res.music.items[0]?.title).toBe('OK Computer');
    expect(missingEpisodeLabel(res.music.items[0]!)).toBe('Radiohead · 1997');
  });

  it('marks both lists unavailable when the BFF is down', () => {
    const res = normalizeMissing({ available: false, movies: { items: [] }, tv: { items: [] } });
    expect(res.available).toBe(false);
    expect(res.movies.items).toEqual([]);
  });

  it('normalizes missing books, comics, and audiobooks', () => {
    const res = normalizeMissing({
      available: true,
      books: {
        available: true,
        total: 1,
        items: [{
          kind: 'book',
          id: 'b1',
          itemId: 'b1',
          authorId: 'a1',
          artistName: 'Herbert',
          title: 'Dune',
          year: 1965,
          href: '/books/a1',
        }],
      },
      comics: {
        available: true,
        total: 1,
        items: [{
          kind: 'comic',
          id: 'i1',
          itemId: 'i1',
          seriesId: 's1',
          artistName: 'Saga',
          title: 'Chapter One',
          issueNumber: '1',
          year: 2012,
          href: '/comics/s1',
        }],
      },
      audiobooks: {
        available: true,
        total: 1,
        items: [{
          kind: 'audiobook',
          id: 'ab1',
          itemId: 'ab1',
          authorId: 'a2',
          artistName: 'Herbert',
          title: 'Dune (narrated)',
          year: 1965,
          href: '/audiobooks/ab1',
        }],
      },
    });
    expect(res.books.items[0]?.href).toBe('/books/a1');
    expect(missingEpisodeLabel(res.books.items[0]!)).toBe('Herbert · 1965');
    expect(res.comics.items[0]?.href).toBe('/comics/s1');
    expect(missingEpisodeLabel(res.comics.items[0]!)).toBe('Saga · #1 · 2012');
    expect(res.audiobooks.items[0]?.href).toBe('/audiobooks/ab1');
  });
});
