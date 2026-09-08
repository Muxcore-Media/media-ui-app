import { describe, expect, it } from 'vitest';
import { normalizeSeriesOverride, parseGroupList } from './series-override';

describe('series override', () => {
  it('normalizes BFF rows', () => {
    const res = normalizeSeriesOverride({
      available: true,
      found: true,
      override: { series_id: 's1', delay_minutes: 45, preferred_groups: ['FLUX'], ignored_groups: ['RARBG'] },
    });
    expect(res.found).toBe(true);
    expect(res.override.delayMinutes).toBe(45);
    expect(res.override.preferredGroups).toEqual(['FLUX']);
  });

  it('parses comma-separated groups', () => {
    expect(parseGroupList('FLUX, EMBER\nRARBG')).toEqual(['FLUX', 'EMBER', 'RARBG']);
  });
});
