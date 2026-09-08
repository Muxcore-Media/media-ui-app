import { describe, expect, it } from 'vitest';
import { shouldAutoSkipSegment } from './auto-skip';

describe('shouldAutoSkipSegment', () => {
  it('skips intro and recap when autoSkipIntro is on', () => {
    expect(shouldAutoSkipSegment('intro', { autoSkipIntro: true })).toBe(true);
    expect(shouldAutoSkipSegment('recap', { autoSkipIntro: true })).toBe(true);
    expect(shouldAutoSkipSegment('intro', { autoSkipIntro: false })).toBe(false);
  });

  it('skips outro and credits when autoSkipCredits is on', () => {
    expect(shouldAutoSkipSegment('outro', { autoSkipCredits: true })).toBe(true);
    expect(shouldAutoSkipSegment('credits', { autoSkipCredits: true })).toBe(true);
    expect(shouldAutoSkipSegment('outro', {})).toBe(false);
  });
});
