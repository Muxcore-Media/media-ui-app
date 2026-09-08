import { describe, expect, it } from 'vitest';
import {
  jellyfinStatusLabel,
  jellyfinSyncLabel,
  normalizeJellyfinRefresh,
  normalizeJellyfinStatus,
  normalizeJellyfinSync,
} from './jellyfin-sync';

describe('jellyfin-sync', () => {
  it('normalizes status and sync counts', () => {
    const status = normalizeJellyfinStatus({
      available: true,
      configured: true,
      base_url: 'https://jellyfin.example',
      conflict_mode: 'jellyfin',
      item_links: 12,
    });
    expect(status.itemLinks).toBe(12);
    expect(jellyfinStatusLabel(status)).toContain('12 item links');

    const sync = normalizeJellyfinSync({
      available: true,
      direction: 'both',
      dry_run: true,
      scanned: 40,
      matched: 12,
      upserted: 3,
      removed: 1,
      errors: ['skipped orphan'],
    });
    expect(sync.errors).toEqual(['skipped orphan']);
    expect(jellyfinSyncLabel(sync)).toBe('Dry run: scanned 40, matched 12, upserted 3, removed 1');
    expect(normalizeJellyfinRefresh({ ok: true, item_id: 'jf-99' }).itemId).toBe('jf-99');
  });

  it('marks the bridge unavailable when the BFF is down', () => {
    const status = normalizeJellyfinStatus({ available: false });
    expect(status.available).toBe(false);
    expect(jellyfinStatusLabel(status)).toBe('Jellyfin bridge is not connected');
  });
});
