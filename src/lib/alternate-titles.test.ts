import { describe, expect, it } from 'vitest';
import { normalizeAlternateTitles, titlesPath } from './alternate-titles';

describe('alternate titles', () => {
  it('normalizes household title rows', () => {
    const next = normalizeAlternateTitles({
      available: true,
      titles: [
        { id: 'mt1', title: 'Fight Club', source: 'primary' },
        { id: 'mt2', title: 'El club de la lucha', source: 'user', user: true },
        { id: '' },
      ],
    });
    expect(next.titles).toHaveLength(2);
    expect(next.titles[1].user).toBe(true);
    expect(titlesPath('movie', 'm1')).toBe('/api/movies/m1/titles');
    expect(titlesPath('tv', 's1')).toBe('/api/tv/s1/titles');
  });

  it('soft-fails when the catalog is down', () => {
    expect(normalizeAlternateTitles({ available: false, titles: [] })).toEqual({
      available: false,
      titles: [],
    });
  });
});
