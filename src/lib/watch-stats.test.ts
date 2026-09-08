import { describe, expect, it } from 'vitest';
import {
  formatWatchMinutes,
  formatWatchStatValue,
  itemWatchStatsLabel,
  normalizeDuplicates,
  normalizeItemWatchStats,
  normalizeStaleLibrary,
  normalizeStorage,
  normalizeStorageHistory,
  normalizeTautulliImport,
  normalizeWatchCharts,
  staleItemLabel,
  storageHistoryLabel,
  storageSummaryLabel,
  tautulliImportLabel,
  normalizeWatchStats,
} from './watch-stats';

describe('watch-stats', () => {
  it('normalizes household Tautulli-style totals', () => {
    const res = normalizeWatchStats({
      available: true,
      days: 14,
      stats: [{ key: 'plays', label: 'Plays', value: 12 }],
      topMovies: [{ title: 'Dune', mediaType: 'movie', playCount: 4, watchMinutes: 90 }],
      top_shows: [{ title: 'Severance', play_count: 6 }],
      plays: [{ date: '2026-09-01', count: 3 }],
      libraries: [{ name: 'movies', play_count: 8, watch_minutes: 200 }],
    });
    expect(res.available).toBe(true);
    expect(res.days).toBe(14);
    expect(res.stats[0].value).toBe(12);
    expect(res.topMovies[0].title).toBe('Dune');
    expect(res.topShows[0].playCount).toBe(6);
    expect(res.plays[0].count).toBe(3);
    expect(res.libraries[0].watchMinutes).toBe(200);
    expect(formatWatchMinutes(90)).toBe('1h 30m');
    expect(formatWatchStatValue({ key: 'plays', label: 'Plays', value: 12 })).toBe('12');
    expect(formatWatchStatValue({ key: 'watch_minutes', label: 'Watch minutes', value: 90 })).toBe('1h 30m');
  });

  it('labels per-title watch stats', () => {
    const stats = normalizeItemWatchStats({
      available: true,
      itemId: 'm1',
      playCount: 4,
      uniqueUsers: 2,
      watchMinutes: 90,
      hasActivity: true,
      neverWatched: false,
    });
    expect(itemWatchStatsLabel(stats)).toBe('4 plays · 2 watchers · 1h 30m');
    expect(itemWatchStatsLabel(normalizeItemWatchStats({ available: true, never_watched: true }))).toBe(
      'Never watched',
    );
  });

  it('normalizes stale library rows and Tautulli import totals', () => {
    const stale = normalizeStaleLibrary({
      available: true,
      neverWatched: 1,
      stale: 1,
      items: [{ title: 'Old Movie', category: 'never_watched', daysStale: 400 }],
    });
    expect(stale.items[0].title).toBe('Old Movie');
    expect(staleItemLabel(stale.items[0])).toBe('Never watched · 400d');
    const imported = normalizeTautulliImport({ imported: 2, skipped: 1, total_fetched: 3, dry_run: true });
    expect(tautulliImportLabel(imported)).toBe('Dry run: 2 imported, 1 skipped of 3 fetched');
    const dups = normalizeDuplicates({
      available: true,
      groups: [{ title: 'Dune', copyCount: 2, copies: [{ title: 'Dune', library: 'movies', bytes: 1000 }] }],
    });
    expect(dups.groups[0].copyCount).toBe(2);
    const storage = normalizeStorage({
      available: true,
      totalItems: 12,
      totalHuman: '931.3 MB',
      duplicateWasteHuman: '476.8 MB',
      libraries: [{ name: 'movies', itemCount: 8, bytes: 800 }],
    });
    expect(storageSummaryLabel(storage)).toBe('12 titles · 931.3 MB · 476.8 MB duplicate waste');
    const history = normalizeStorageHistory({
      available: true,
      history: [{ day: '2026-09-01', bytes: 1_000_000_000, itemCount: 12 }],
      prediction: { projectedBytes: 1_580_645_000, horizonDays: 90 },
    });
    expect(storageHistoryLabel(history)).toContain('1 snapshots');
    expect(storageHistoryLabel(history)).toContain('90d');
    const charts = normalizeWatchCharts({
      available: true,
      hours: [{ label: '20:00', count: 4 }, { label: '03:00', count: 0 }],
      users: [{ label: 'pat', count: 6 }],
      platforms: [{ label: 'Web', count: 5 }],
      daysOfWeek: [{ label: 'Saturday', count: 7 }],
      months: [{ label: '2026-09', count: 12 }],
      streamTypes: [{ label: 'Direct play', count: 9 }],
      streamResolutions: [{ label: '1080p', count: 8 }],
      sourceResolutions: [{ label: '2160p', count: 3 }],
      platformResolutions: [{ label: 'Web · 1080p', count: 4 }],
      concurrent: { peak: 3, series: [{ name: 'direct', peak: 3 }] },
    });
    expect(charts.hours).toHaveLength(1);
    expect(charts.users[0].label).toBe('pat');
    expect(charts.daysOfWeek[0].label).toBe('Saturday');
    expect(charts.streamTypes[0].label).toBe('Direct play');
    expect(charts.concurrent.peak).toBe(3);
  });

  it('soft-fails when the monitor is down', () => {
    expect(normalizeWatchStats({ available: false })).toMatchObject({
      available: false,
      stats: [],
      topMovies: [],
      plays: [],
    });
  });
});
