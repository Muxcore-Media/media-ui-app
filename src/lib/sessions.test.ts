import { describe, expect, it } from 'vitest';
import { calendarSearchNowBody, normalizeSessions, sessionProgressLabel } from './sessions';

describe('sessions', () => {
  it('normalizes active playback rows', () => {
    const res = normalizeSessions({
      available: true,
      total: 1,
      items: [
        {
          id: 's1',
          title: 'Dune',
          user: 'sam',
          href: '/movies/m1',
          paused: false,
          positionSeconds: 120,
          durationSeconds: 600,
        },
      ],
    });
    expect(res.items[0]?.title).toBe('Dune');
    expect(res.items[0]?.user).toBe('sam');
    expect(res.items[0]?.userId).toBe('');
    expect(sessionProgressLabel(res.items[0]!)).toBe('Watching · 20%');
  });

  it('builds calendar search-now against the series or movie id', () => {
    expect(calendarSearchNowBody({ kind: 'tv', id: 'ep1', parent_id: 'show1' })).toEqual({
      item_type: 'tv',
      item_id: 'show1',
    });
    expect(calendarSearchNowBody({ kind: 'movie', id: 'm1' })).toEqual({
      item_type: 'movie',
      item_id: 'm1',
    });
  });
});
