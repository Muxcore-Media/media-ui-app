import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  maintainerActionLabel,
  maintainerStatusLabel,
  normalizeMaintainerStatus,
} from './maintainer';

describe('maintainer', () => {
  it('normalizes a household maintainer payload', () => {
    const next = normalizeMaintainerStatus({
      available: true,
      total: 1,
      rules_total: 2,
      rules: [{ id: 'rule1', name: 'Unwatched 90d', enabled: true, scope: 'movie', arr_action: 'delete', collection_id: 'col1' }],
      collections: [{ id: 'col1', name: 'Leaving soon', grace_days: 7, leaving_soon_enabled: true }],
      exclusions: [{ id: 'excl1', name: 'Favorites', type: 'local', tmdb_ids: [550, 603], tmdb_count: 2 }],
      protections: [{ id: 'p1', title: 'Fight Club', item_id: 'm1', reason: 'Household favorite' }],
      candidates: [{ id: 'c1', title: 'Old Movie', status: 'pending', arr_action: 'delete', size_bytes: 1024 }],
      runs: [{ id: 'r1', kind: 'scan', dry_run: true, candidates_found: 1 }],
      storage: [{ path: '/data/movies', free_percent: 8.5, free_bytes: 20 }],
    });
    expect(next.available).toBe(true);
    expect(next.rulesTotal).toBe(2);
    expect(next.rules[0].name).toBe('Unwatched 90d');
    expect(next.rules[0].collectionId).toBe('col1');
    expect(next.collections[0].name).toBe('Leaving soon');
    expect(next.collections[0].graceDays).toBe(7);
    expect(next.exclusions[0].name).toBe('Favorites');
    expect(next.exclusions[0].tmdbCount).toBe(2);
    expect(next.protections[0].title).toBe('Fight Club');
    expect(next.candidates[0].arrAction).toBe('delete');
    expect(maintainerStatusLabel(next.candidates[0].status)).toBe('Pending');
    expect(maintainerActionLabel(next.candidates[0].arrAction)).toBe('Delete');
    expect(next.storage[0].path).toBe('/data/movies');
    expect(formatBytes(1024)).toBe('1 KB');
  });
});
