import type { PlaybackSegment } from '../api/client';
import { formatTime } from './player/format';

export const SKIP_SEGMENT_KINDS = ['intro', 'outro', 'credits', 'recap'] as const;
export type SkipSegmentKind = (typeof SKIP_SEGMENT_KINDS)[number];

export function isSkipSegmentKind(kind: string): kind is SkipSegmentKind {
  return (SKIP_SEGMENT_KINDS as readonly string[]).includes(kind.toLowerCase());
}

/** Replace one kind in a skip-point set. Other kinds are kept. */
export function upsertSegmentKind(
  segments: PlaybackSegment[],
  kind: SkipSegmentKind,
  startSeconds: number,
  endSeconds: number,
): PlaybackSegment[] {
  const next = segments.filter((seg) => seg.kind.toLowerCase() !== kind);
  if (!(endSeconds > startSeconds) || startSeconds < 0) return next;
  next.push({
    kind,
    start_seconds: startSeconds,
    end_seconds: endSeconds,
    confidence: 1,
    source: 'manual',
  });
  return next.sort((a, b) => a.start_seconds - b.start_seconds);
}

export function removeSegmentKind(segments: PlaybackSegment[], kind: SkipSegmentKind): PlaybackSegment[] {
  return segments.filter((seg) => seg.kind.toLowerCase() !== kind);
}

export function persistedSkipSegments(segments: PlaybackSegment[]): PlaybackSegment[] {
  return segments.filter((seg) => seg.source !== 'user-preference');
}

export function skipPointsSummary(segments: PlaybackSegment[]): string {
  const persisted = persistedSkipSegments(segments);
  if (persisted.length === 0) return 'Not set';
  const parts = persisted.map((seg) => {
    const label = seg.kind.charAt(0).toUpperCase() + seg.kind.slice(1);
    return `${label} ${formatTime(seg.start_seconds)}–${formatTime(seg.end_seconds)}`;
  });
  return parts.join(' · ');
}
