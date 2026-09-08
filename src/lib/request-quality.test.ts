import { describe, expect, it } from 'vitest';
import { normalizeRequestQuality, qualityProfileLabel } from './request-quality';

describe('request quality', () => {
  it('normalizes household labels', () => {
    expect(normalizeRequestQuality('4K')).toBe('4k');
    expect(normalizeRequestQuality('2160p')).toBe('4k');
    expect(normalizeRequestQuality('HD')).toBe('hd');
    expect(normalizeRequestQuality('unknown')).toBeUndefined();
  });

  it('labels stored profile ids for the queue', () => {
    expect(qualityProfileLabel('4k')).toBe('4K');
    expect(qualityProfileLabel('hd')).toBe('HD');
    expect(qualityProfileLabel('qp_uhd')).toBe('qp_uhd');
    expect(qualityProfileLabel('')).toBeNull();
  });
});
