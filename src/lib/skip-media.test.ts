import { describe, expect, it } from 'vitest';
import { normalizeSkipMedia } from './skip-media';

describe('skip-media', () => {
  it('normalizes intro-outro ListMedia ids', () => {
    const res = normalizeSkipMedia({
      available: true,
      items: [{ id: 'm1' }, { id: '  ep1  ' }, { id: '' }, 'tv-2'],
    });
    expect(res.available).toBe(true);
    expect(res.items.map((row) => row.id)).toEqual(['m1', 'ep1', 'tv-2']);
    expect(res.total).toBe(3);
  });

  it('marks missing intro-outro as unavailable', () => {
    expect(normalizeSkipMedia(null)).toEqual({ available: false, items: [], total: 0 });
  });
});
