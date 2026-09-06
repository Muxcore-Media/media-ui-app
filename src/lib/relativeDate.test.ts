import { describe, expect, it } from 'vitest';
import { formatAddedRelative, formatTimeRemaining } from './relativeDate';

describe('formatAddedRelative', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');

  it('returns just now for recent timestamps', () => {
    expect(formatAddedRelative('2026-08-23T11:59:30.000Z', now)).toBe('Added just now');
  });

  it('formats minutes and hours', () => {
    expect(formatAddedRelative('2026-08-23T11:30:00.000Z', now)).toBe('Added 30 minutes ago');
    expect(formatAddedRelative('2026-08-23T10:00:00.000Z', now)).toBe('Added 2 hours ago');
  });

  it('formats days and weeks', () => {
    expect(formatAddedRelative('2026-08-20T12:00:00.000Z', now)).toBe('Added 3 days ago');
    expect(formatAddedRelative('2026-08-02T12:00:00.000Z', now)).toBe('Added 3 weeks ago');
  });

  it('returns empty for invalid input', () => {
    expect(formatAddedRelative('not-a-date', now)).toBe('');
  });
});

describe('formatTimeRemaining', () => {
  it('returns null when duration is unknown (zero)', () => {
    expect(formatTimeRemaining(300, 0)).toBeNull();
  });

  it('returns null when under one minute remains', () => {
    expect(formatTimeRemaining(7159, 7200)).toBeNull(); // 41s left
  });

  it('formats minutes when under one hour remains', () => {
    expect(formatTimeRemaining(1200, 7200)).toBe('1h 40m left'); // 6000s = 100min left
    expect(formatTimeRemaining(7080, 7200)).toBe('2 min left');  // 120s = 2min left
  });

  it('formats whole hours when no extra minutes', () => {
    expect(formatTimeRemaining(0, 7200)).toBe('2h left'); // 7200s = 120min = 2h exactly
  });
});
