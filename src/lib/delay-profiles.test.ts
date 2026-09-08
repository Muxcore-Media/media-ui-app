import { describe, expect, it } from 'vitest';
import { normalizeDelayProfiles, withDefaultDelayProfiles } from './delay-profiles';

describe('delay profiles', () => {
  it('normalizes BFF rows', () => {
    const res = normalizeDelayProfiles({
      available: true,
      profiles: [
        { protocol: 'Torrent', wait_minutes: 30 },
        { protocol: 'usenet', waitMinutes: 0 },
      ],
    });
    expect(res.available).toBe(true);
    expect(res.profiles).toEqual([
      { protocol: 'torrent', waitMinutes: 30 },
      { protocol: 'usenet', waitMinutes: 0 },
    ]);
  });

  it('fills torrent and usenet defaults', () => {
    expect(withDefaultDelayProfiles([{ protocol: 'usenet', waitMinutes: 5 }])).toEqual([
      { protocol: 'torrent', waitMinutes: 15 },
      { protocol: 'usenet', waitMinutes: 5 },
    ]);
  });
});
