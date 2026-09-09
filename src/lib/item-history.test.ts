import { describe, expect, it } from 'vitest';
import { historyEventLabel, historyPath, normalizeItemHistory } from './item-history';

describe('item history', () => {
  it('normalizes a household ListHistory payload', () => {
    const next = normalizeItemHistory({
      available: true,
      total: 1,
      items: [
        {
          id: 'mh1',
          event_type: 'grab',
          item_id: 'm1',
          source_title: 'Fight.Club.1999.1080p',
          indexer: 'Knaben',
          created_at: '2026-09-08T10:00:00Z',
        },
      ],
    });
    expect(next.available).toBe(true);
    expect(next.items[0].sourceTitle).toContain('Fight.Club');
    expect(historyEventLabel(next.items[0].eventType)).toBe('Grabbed');
  });

  it('builds movie, TV, and music history paths', () => {
    expect(historyPath('movie', 'm1')).toBe('/api/movies/m1/history');
    expect(historyPath('tv', 's/1')).toBe('/api/tv/s%2F1/history');
    expect(historyPath('artist', 'ar1')).toBe('/api/music/ar1/history');
  });
});
