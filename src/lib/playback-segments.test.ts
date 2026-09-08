import { describe, expect, it } from 'vitest';
import type { PlaybackSegment } from '../api/client';
import {
  persistedSkipSegments,
  removeSegmentKind,
  skipPointsSummary,
  upsertSegmentKind,
} from './playback-segments';

const intro: PlaybackSegment = {
  kind: 'intro',
  start_seconds: 0,
  end_seconds: 75,
  confidence: 0.8,
  source: 'chapters',
};

const outro: PlaybackSegment = {
  kind: 'outro',
  start_seconds: 1100,
  end_seconds: 1200,
  confidence: 0.8,
  source: 'heuristic',
};

describe('upsertSegmentKind', () => {
  it('replaces one kind and keeps the rest', () => {
    const next = upsertSegmentKind([intro, outro], 'intro', 0, 90);
    expect(next).toEqual([
      { kind: 'intro', start_seconds: 0, end_seconds: 90, confidence: 1, source: 'manual' },
      outro,
    ]);
  });

  it('drops the kind when the range is invalid', () => {
    expect(upsertSegmentKind([intro], 'intro', 10, 10)).toEqual([]);
  });
});

describe('removeSegmentKind / persistedSkipSegments', () => {
  it('removes a kind', () => {
    expect(removeSegmentKind([intro, outro], 'outro')).toEqual([intro]);
  });

  it('hides the client-only preference fallback from writes', () => {
    const pref: PlaybackSegment = {
      kind: 'intro',
      start_seconds: 0,
      end_seconds: 15,
      confidence: 1,
      source: 'user-preference',
    };
    expect(persistedSkipSegments([pref, outro])).toEqual([outro]);
  });
});

describe('skipPointsSummary', () => {
  it('lists persisted ranges', () => {
    expect(skipPointsSummary([intro])).toBe('Intro 0:00–1:15');
  });

  it('returns Not set when empty or preference-only', () => {
    expect(skipPointsSummary([])).toBe('Not set');
    expect(
      skipPointsSummary([
        { kind: 'intro', start_seconds: 0, end_seconds: 10, confidence: 1, source: 'user-preference' },
      ]),
    ).toBe('Not set');
  });
});
