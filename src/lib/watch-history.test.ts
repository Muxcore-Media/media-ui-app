import { describe, expect, it } from 'vitest';
import {
  historyWatched,
  inProgressOnly,
  inProgressSessions,
  mergeWatchProgress,
  normalizeWatchHistory,
  progressFromMonitor,
  sessionToProgress,
  watchedOnly,
} from './watch-history';
import type { ProgressEntry } from './userdata';

describe('watch-history', () => {
  it('marks near-end monitor plays as watched', () => {
    expect(historyWatched(8800, 9000)).toBe(true);
    expect(historyWatched(120, 9000)).toBe(false);
  });

  it('merges remote Jellyfin plays over older local rows', () => {
    const local: ProgressEntry[] = [
      {
        id: 'm1',
        kind: 'movie',
        title: 'Dune',
        href: '/movies/m1',
        positionSec: 10,
        durationSec: 9000,
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];
    const remote: ProgressEntry[] = [
      {
        id: 'm1',
        kind: 'movie',
        title: 'Dune',
        href: '/movies/m1',
        positionSec: 8800,
        durationSec: 9000,
        updatedAt: '2026-09-08T00:00:00Z',
        watched: true,
      },
    ];
    const merged = mergeWatchProgress(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.watched).toBe(true);
    expect(watchedOnly(merged)).toHaveLength(1);
    expect(inProgressOnly(merged)).toHaveLength(0);
  });

  it('maps monitor history onto progress cards', () => {
    const res = normalizeWatchHistory({
      available: true,
      total: 1,
      items: [
        {
          id: 'h1',
          title: 'Dune',
          mediaId: 'm1',
          mediaType: 'movie',
          href: '/movies/m1',
          positionSeconds: 400,
          durationSeconds: 9000,
          updatedAt: '2026-09-08T00:00:00Z',
          watched: false,
        },
      ],
    });
    const rows = progressFromMonitor(res);
    expect(sessionToProgress(res.items[0]!)?.href).toBe('/movies/m1');
    expect(inProgressOnly(rows)[0]?.title).toBe('Dune');
  });

  it('keeps live Now watching sessions in continue watching', () => {
    const rows = inProgressSessions({
      available: true,
      total: 1,
      items: [
        {
          id: 'live-1',
          title: 'Dune',
          user: 'sam',
          userId: 'u-sam',
          mediaId: 'm1',
          mediaType: 'movie',
          player: 'Jellyfin',
          platform: 'tv',
          device: 'Living room',
          state: 'playing',
          paused: false,
          transcode: false,
          positionSeconds: 12,
          durationSeconds: 9000,
          href: '/movies/m1',
          updatedAt: '2026-09-08T03:00:00Z',
        },
      ],
    });
    expect(rows[0]?.title).toBe('Dune');
    expect(rows[0]?.watched).toBe(false);
  });
});
