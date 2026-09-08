import { describe, expect, it } from 'vitest';
import { normalizeBlocklist } from './blocklist';

describe('blocklist', () => {
  it('normalizes household blocklist rows', () => {
    const res = normalizeBlocklist({
      available: true,
      total: 1,
      items: [{ wanted_item_id: 'q1', guid: 'g-bad', title: 'CAM.Rip', reason: 'household', loop: 2 }],
    });
    expect(res.items[0]?.wantedItemId).toBe('q1');
    expect(res.items[0]?.guid).toBe('g-bad');
    expect(res.items[0]?.loop).toBe(2);
  });
});
