import { describe, expect, it } from 'vitest';
import { normalizePlexSyncLists, plexSyncItemLabel, plexSyncListLabel } from './plex-sync';

describe('plex-sync', () => {
  it('normalizes device download lists', () => {
    const res = normalizePlexSyncLists({
      available: true,
      machine_identifier: 'machine-1',
      lists: [{
        id: 'list-1',
        device_name: 'Pat iPad',
        device_platform: 'iOS',
        items: [{ id: 'item-1', title: 'Dune', state: 'downloaded', video_resolution: '1080' }],
      }],
    });
    expect(res.lists[0]?.deviceName).toBe('Pat iPad');
    expect(plexSyncListLabel(res.lists[0]!)).toBe('Pat iPad · iOS · 1 title');
    expect(plexSyncItemLabel(res.lists[0]!.items[0]!)).toBe('downloaded · 1080');
  });

  it('marks Plex unavailable when the BFF is down', () => {
    const res = normalizePlexSyncLists({ available: false, lists: [] });
    expect(res.available).toBe(false);
    expect(res.lists).toEqual([]);
  });
});
