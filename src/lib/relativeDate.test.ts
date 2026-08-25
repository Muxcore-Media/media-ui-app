import { describe, expect, it } from 'vitest';
import { formatAddedRelative } from './relativeDate';

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
