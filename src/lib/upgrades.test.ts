import { describe, expect, it } from 'vitest';
import { cutoffScoreGap, upgradeDetailHref, upgradeKindLabel } from './upgrades';

describe('upgrade helpers', () => {
  it('computes the cutoff gap', () => {
    expect(cutoffScoreGap({ current_score: 10, cutoff_score: 200 })).toBe(190);
  });

  it('links movies and shows to interactive search', () => {
    expect(upgradeDetailHref({ item_type: 'movie', item_id: 'm1' })).toBe('/movies/m1?search=1');
    expect(upgradeDetailHref({ item_type: 'tv', item_id: 's1' })).toBe('/tv/s1?search=1');
    expect(upgradeDetailHref({ item_type: 'music', item_id: 'a1' })).toBeNull();
  });

  it('labels kinds for the upgrades list', () => {
    expect(upgradeKindLabel('tv')).toBe('TV Show');
    expect(upgradeKindLabel('movie')).toBe('Movie');
  });
});
