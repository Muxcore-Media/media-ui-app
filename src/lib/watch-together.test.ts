import { describe, expect, it } from 'vitest';
import {
  joinWatchTogetherHref,
  normalizeWatchTogether,
  shouldFollowHost,
  storeWatchTogetherHostToken,
  readWatchTogetherHostToken,
} from './watch-together';

describe('watch-together helpers', () => {
  it('builds a join URL that keeps the current player query', () => {
    expect(joinWatchTogetherHref('src=%2Fstream%2Fmovies%2Fm1&title=Dune', 'wt_1')).toBe(
      '/player?src=%2Fstream%2Fmovies%2Fm1&title=Dune&together=wt_1',
    );
  });

  it('follows the host when drift is over 1.5s', () => {
    expect(shouldFollowHost(10, 10.4)).toBe(false);
    expect(shouldFollowHost(10, 12)).toBe(true);
  });

  it('maps snake_case room fields and stores the host token', () => {
    const room = normalizeWatchTogether({
      id: 'wt_9',
      host_token: 'h_secret',
      position_seconds: 33,
      you_are_host: true,
      playing: true,
    });
    expect(room.hostToken).toBe('h_secret');
    expect(room.positionSeconds).toBe(33);
    expect(room.youAreHost).toBe(true);
    storeWatchTogetherHostToken(room.id, room.hostToken || '');
    expect(readWatchTogetherHostToken('wt_9')).toBe('h_secret');
  });
});
