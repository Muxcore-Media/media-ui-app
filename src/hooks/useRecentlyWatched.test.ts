import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecentlyWatched } from './useRecentlyWatched';
import type { ProgressEntry } from '../lib/userdata';

function makeEntry(id: string, updatedAt: string, extra?: Partial<ProgressEntry>): ProgressEntry {
  return {
    id,
    kind: 'movie',
    title: `Title ${id}`,
    href: `/movies/${id}`,
    positionSec: 0,
    durationSec: 120,
    updatedAt,
    watched: true,
    ...extra,
  };
}

describe('useRecentlyWatched', () => {
  it('returns empty array when no watched entries', () => {
    const { result } = renderHook(() =>
      useRecentlyWatched([], new Set()),
    );
    expect(result.current).toEqual([]);
  });

  it('returns watched entries in provided order', () => {
    const entries = [
      makeEntry('a', '2026-09-01T10:00:00Z'),
      makeEntry('b', '2026-09-02T10:00:00Z'),
    ];
    const { result } = renderHook(() =>
      useRecentlyWatched(entries, new Set()),
    );
    expect(result.current.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('deduplicates against excludeIds', () => {
    const entries = [
      makeEntry('cw-1', '2026-09-01T10:00:00Z'),
      makeEntry('watched-1', '2026-09-02T10:00:00Z'),
      makeEntry('cw-2', '2026-09-03T10:00:00Z'),
    ];
    const { result } = renderHook(() =>
      useRecentlyWatched(entries, new Set(['cw-1', 'cw-2'])),
    );
    expect(result.current.map((e) => e.id)).toEqual(['watched-1']);
  });

  it('caps output at 12 items', () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      makeEntry(`m${i}`, `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    );
    const { result } = renderHook(() =>
      useRecentlyWatched(entries, new Set()),
    );
    expect(result.current).toHaveLength(12);
  });

  it('excludes all items when all IDs are in the exclude set', () => {
    const entries = [
      makeEntry('a', '2026-09-01T00:00:00Z'),
      makeEntry('b', '2026-09-02T00:00:00Z'),
    ];
    const { result } = renderHook(() =>
      useRecentlyWatched(entries, new Set(['a', 'b'])),
    );
    expect(result.current).toEqual([]);
  });

  it('returns stable reference when inputs do not change', () => {
    const entries = [makeEntry('a', '2026-09-01T00:00:00Z')];
    const excludeIds = new Set<string>();
    const { result, rerender } = renderHook(
      ({ w, e }) => useRecentlyWatched(w, e),
      { initialProps: { w: entries, e: excludeIds } },
    );
    const first = result.current;
    rerender({ w: entries, e: excludeIds });
    expect(result.current).toBe(first);
  });
});
