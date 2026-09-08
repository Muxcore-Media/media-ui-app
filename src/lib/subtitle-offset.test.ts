import { describe, expect, it } from 'vitest';
import {
  clampSubtitleOffsetMs,
  formatSubtitleOffset,
  normalizeSubtitleTextColor,
  subtitleLookupTime,
} from './subtitle-offset';

describe('subtitle offset', () => {
  it('clamps and rejects non-finite values', () => {
    expect(clampSubtitleOffsetMs(Number.NaN)).toBe(0);
    expect(clampSubtitleOffsetMs(12_000)).toBe(10_000);
    expect(clampSubtitleOffsetMs(-12_500)).toBe(-10_000);
    expect(clampSubtitleOffsetMs(250.4)).toBe(250);
  });

  it('formats signed seconds', () => {
    expect(formatSubtitleOffset(0)).toBe('0.00s');
    expect(formatSubtitleOffset(250)).toBe('+0.25s');
    expect(formatSubtitleOffset(-1000)).toBe('-1.00s');
  });

  it('delays captions by subtracting offset from playback time', () => {
    expect(subtitleLookupTime(10, 500)).toBe(9.5);
    expect(subtitleLookupTime(10, -500)).toBe(10.5);
    expect(subtitleLookupTime(10, 0)).toBe(10);
  });

  it('accepts hex subtitle colors and falls back to white', () => {
    expect(normalizeSubtitleTextColor('#FfEecc')).toBe('#ffeecc');
    expect(normalizeSubtitleTextColor('red')).toBe('#ffffff');
    expect(normalizeSubtitleTextColor('')).toBe('#ffffff');
  });
});
