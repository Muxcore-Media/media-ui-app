import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStudioNetworkRails } from './useStudioNetworkRails';
import * as parentalLib from '../lib/parental';
import type { Movie, TVShow } from '../types';

const makeMovie = (id: string, studio?: string, content_rating?: string): Movie => ({
  id,
  title: `Movie ${id}`,
  year: 2024,
  overview: '',
  runtime: 90,
  vote_average: 7,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: `/stream/${id}`,
  created_at: '2024-01-01T00:00:00Z',
  content_rating,
  studio,
});

const makeShow = (
  id: string,
  opts: { network?: string; studio?: string; content_rating?: string } = {},
): TVShow => ({
  id,
  title: `Show ${id}`,
  year: 2024,
  overview: '',
  vote_average: 8,
  genres: ['Drama'],
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  content_rating: opts.content_rating,
  network: opts.network,
  studio: opts.studio,
});

describe('useStudioNetworkRails — studio rails', () => {
  it('returns empty studio rails when no movies or shows have a studio field', () => {
    const { result } = renderHook(() => useStudioNetworkRails([], []));
    expect(result.current.studioRails).toEqual([]);
  });

  it('groups movies by studio', () => {
    const movies = [makeMovie('m1', 'Pixar'), makeMovie('m2', 'Pixar'), makeMovie('m3', 'Warner Bros.')];
    const { result } = renderHook(() => useStudioNetworkRails(movies, []));

    const pixar = result.current.studioRails.find((s) => s.name === 'Pixar');
    const wb = result.current.studioRails.find((s) => s.name === 'Warner Bros.');

    expect(pixar).toBeDefined();
    expect(pixar!.count).toBe(2);
    expect(wb).toBeDefined();
    expect(wb!.count).toBe(1);
  });

  it('groups shows by studio alongside movies', () => {
    const movies = [makeMovie('m1', 'HBO')];
    const shows = [makeShow('s1', { studio: 'HBO' })];
    const { result } = renderHook(() => useStudioNetworkRails(movies, shows));

    const hbo = result.current.studioRails.find((s) => s.name === 'HBO');
    expect(hbo).toBeDefined();
    expect(hbo!.count).toBe(2);
    expect(hbo!.kinds).toContain('movie');
    expect(hbo!.kinds).toContain('tv');
  });

  it('sorts studio rails by count descending', () => {
    const movies = [
      makeMovie('m1', 'A24'),
      makeMovie('m2', 'A24'),
      makeMovie('m3', 'Blumhouse'),
    ];
    const { result } = renderHook(() => useStudioNetworkRails(movies, []));
    expect(result.current.studioRails[0].name).toBe('A24');
    expect(result.current.studioRails[1].name).toBe('Blumhouse');
  });

  it('respects maxEntries cap for studio rails', () => {
    const movies = Array.from({ length: 20 }, (_, i) => makeMovie(`m${i}`, `Studio${i}`));
    const { result } = renderHook(() => useStudioNetworkRails(movies, [], 5));
    expect(result.current.studioRails).toHaveLength(5);
  });

  it('caps items per studio to itemsPerEntry', () => {
    const movies = Array.from({ length: 30 }, (_, i) => makeMovie(`m${i}`, 'Pixar'));
    const { result } = renderHook(() => useStudioNetworkRails(movies, [], 12, 10));
    const pixar = result.current.studioRails.find((s) => s.name === 'Pixar');
    expect(pixar!.items.length).toBeLessThanOrEqual(10);
  });

  it('ignores movies with no studio field', () => {
    const movies = [makeMovie('m1'), makeMovie('m2', 'Disney')];
    const { result } = renderHook(() => useStudioNetworkRails(movies, []));
    expect(result.current.studioRails).toHaveLength(1);
    expect(result.current.studioRails[0].name).toBe('Disney');
  });
});

describe('useStudioNetworkRails — network rails', () => {
  it('returns empty network rails when no shows have a network field', () => {
    const { result } = renderHook(() => useStudioNetworkRails([], []));
    expect(result.current.networkRails).toEqual([]);
  });

  it('groups shows by network', () => {
    const shows = [
      makeShow('s1', { network: 'HBO' }),
      makeShow('s2', { network: 'HBO' }),
      makeShow('s3', { network: 'ABC' }),
    ];
    const { result } = renderHook(() => useStudioNetworkRails([], shows));

    const hbo = result.current.networkRails.find((n) => n.name === 'HBO');
    const abc = result.current.networkRails.find((n) => n.name === 'ABC');

    expect(hbo).toBeDefined();
    expect(hbo!.count).toBe(2);
    expect(abc).toBeDefined();
    expect(abc!.count).toBe(1);
  });

  it('network rails contain only tv kinds', () => {
    const shows = [makeShow('s1', { network: 'Netflix' }), makeShow('s2', { network: 'Netflix' })];
    const { result } = renderHook(() => useStudioNetworkRails([], shows));
    const netflix = result.current.networkRails.find((n) => n.name === 'Netflix');
    expect(netflix!.kinds.every((k) => k === 'tv')).toBe(true);
  });

  it('sorts network rails by count descending', () => {
    const shows = [
      makeShow('s1', { network: 'HBO' }),
      makeShow('s2', { network: 'HBO' }),
      makeShow('s3', { network: 'ABC' }),
    ];
    const { result } = renderHook(() => useStudioNetworkRails([], shows));
    expect(result.current.networkRails[0].name).toBe('HBO');
    expect(result.current.networkRails[1].name).toBe('ABC');
  });

  it('respects maxEntries cap for network rails', () => {
    const shows = Array.from({ length: 20 }, (_, i) => makeShow(`s${i}`, { network: `Net${i}` }));
    const { result } = renderHook(() => useStudioNetworkRails([], shows, 5));
    expect(result.current.networkRails).toHaveLength(5);
  });

  it('ignores shows with no network field', () => {
    const shows = [makeShow('s1'), makeShow('s2', { network: 'Disney+' })];
    const { result } = renderHook(() => useStudioNetworkRails([], shows));
    expect(result.current.networkRails).toHaveLength(1);
    expect(result.current.networkRails[0].name).toBe('Disney+');
  });
});

describe('useStudioNetworkRails — parental filtering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('excludes restricted items from studio counts', () => {
    vi.spyOn(parentalLib, 'applyParentalFilter').mockImplementation(
      <T extends { content_rating?: string }>(items: T[]): T[] =>
        items.filter((i) => i.content_rating !== 'R'),
    );

    const movies = [
      makeMovie('m1', 'Pixar', 'R'),  // filtered out
      makeMovie('m2', 'Pixar', 'PG'), // kept
    ];
    const { result } = renderHook(() => useStudioNetworkRails(movies, []));
    const pixar = result.current.studioRails.find((s) => s.name === 'Pixar');
    expect(pixar!.count).toBe(1);
  });

  it('excludes restricted shows from network counts', () => {
    vi.spyOn(parentalLib, 'applyParentalFilter').mockImplementation(
      <T extends { content_rating?: string }>(items: T[]): T[] =>
        items.filter((i) => i.content_rating !== 'TV-MA'),
    );

    const shows = [
      makeShow('s1', { network: 'HBO', content_rating: 'TV-MA' }), // filtered
      makeShow('s2', { network: 'HBO', content_rating: 'TV-14' }), // kept
    ];
    const { result } = renderHook(() => useStudioNetworkRails([], shows));
    const hbo = result.current.networkRails.find((n) => n.name === 'HBO');
    expect(hbo!.count).toBe(1);
  });

  it('returns empty rails when all items are filtered by parental controls', () => {
    vi.spyOn(parentalLib, 'applyParentalFilter').mockReturnValue([]);

    const movies = [makeMovie('m1', 'Pixar', 'R')];
    const shows = [makeShow('s1', { network: 'HBO', content_rating: 'TV-MA' })];
    const { result } = renderHook(() => useStudioNetworkRails(movies, shows));
    expect(result.current.studioRails).toEqual([]);
    expect(result.current.networkRails).toEqual([]);
  });
});
