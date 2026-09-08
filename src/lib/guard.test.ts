import { describe, expect, it } from 'vitest';
import {
  guardRuleLabel,
  guardRuleTypeLabel,
  normalizeGuardCatalog,
  parseGuardParams,
  guardParamsText,
} from './guard';

describe('guard', () => {
  it('normalizes household playback-guard catalogs', () => {
    const catalog = normalizeGuardCatalog({
      available: true,
      rules: [{ id: 'r1', type: 'concurrent_streams', name: 'Two streams', enabled: true, params: { max_streams: '2' } }],
      violations: [{ id: 'v1', summary: 'pat has 3 active streams', userName: 'pat' }],
      trust: [{ userId: 'u1', userName: 'pat', score: 80 }],
    });
    expect(catalog.available).toBe(true);
    expect(guardRuleLabel(catalog.rules[0])).toBe('Two streams · Concurrent streams · on');
    expect(catalog.violations[0].summary).toBe('pat has 3 active streams');
    expect(catalog.trust[0].score).toBe(80);
    expect(guardRuleTypeLabel('geo_restriction')).toBe('Geo restriction');
    expect(parseGuardParams(guardParamsText({ max_streams: '2' }))).toEqual({ max_streams: '2' });
  });
});
