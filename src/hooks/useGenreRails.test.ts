import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGenreRails } from './useGenreRails';
import * as parentalLib from '../lib/parental';
import type { Movie, TVShow } from '../types';

const makeMovie = (id: string, genres: string[], content_rating?: string): Movie => ({
  id,
  title: `Movie ${id}`,
  year: 2024,
  overview: '',
  runtime: 90,
  vote_average: 7,
  genres,
  poster_url: '',
  has_file: true,
  stream_url: `/stream/${id}`,
  created_at: '2024-01-01T00:00:00Z',
  content_rating,
});

const makeShow = (id: string, genres: string[], content_rating?: string): TVShow => ({
  id,
  title: `Show ${id}`,
  year: 2024,
  overview: '',
  vote_average: 8,
  genres,
  poster_url: '',
  has_file: true,
  stream_url: '',
  created_at: '2024-01-01T00:00:00Z',
  content_rating,
});

describe('useGenreRails', () => {
  it('returns an empty array when no movies or shows have genres', () => {
    const { result } = renderHook(() => useGenreRails([], []));
    expect(result.current).toEqual([]);
  });

  it('returns an empty array when all items have empty genres arrays', () => {
    const { result } = renderHook(() =>
      useGenreRails([makeMovie('m1', [])], [makeShow('s1', [])]),
    );
    expect(result.current).toEqual([]);
  });

  it('groups movies and shows by genre', () => {
    const movies = [makeMovie('m1', ['Drama']), makeMovie('m2', ['Drama', 'Action'])];
    const shows = [makeShow('s1', ['Action'])];
    const { result } = renderHook(() => useGenreRails(movies, shows));

    const drama = result.current.find((g) => g.name === 'Drama');
    const action = result.current.find((g) => g.name === 'Action');

    expect(drama).toBeDefined();
    expect(drama!.count).toBe(2); // m1 + m2
    expect(action).toBeDefined();
    expect(action!.count).toBe(2); // m2 + s1
  });

  it('sorts genres by count descending', () => {
    const movies = [
      makeMovie('m1', ['Drama']),
      makeMovie('m2', ['Drama']),
      makeMovie('m3', ['Action']),
    ];
    const { result } = renderHook(() => useGenreRails(movies, []));

    expect(result.current[0].name).toBe('Drama');
    expect(result.current[1].name).toBe('Action');
  });

  it('respects maxGenres cap', () => {
    const movies = Array.from({ length: 20 }, (_, i) =>
      makeMovie(`m${i}`, [`Genre${i}`]),
    );
    const { result } = renderHook(() => useGenreRails(movies, [], 5));
    expect(result.current).toHaveLength(5);
  });

  it('caps items per genre to itemsPerGenre', () => {
    const movies = Array.from({ length: 30 }, (_, i) =>
      makeMovie(`m${i}`, ['Drama']),
    );
    const { result } = renderHook(() => useGenreRails(movies, [], 12, 10));
    const drama = result.current.find((g) => g.name === 'Drama');
    expect(drama!.items.length).toBeLessThanOrEqual(10);
    expect(drama!.kinds).toHaveLength(drama!.items.length);
  });

  it('includes both movie and tv kinds in a genre that spans both', () => {
    const movies = [makeMovie('m1', ['Comedy'])];
    const shows = [makeShow('s1', ['Comedy'])];
    const { result } = renderHook(() => useGenreRails(movies, shows));

    const comedy = result.current.find((g) => g.name === 'Comedy')!;
    expect(comedy.kinds).toContain('movie');
    expect(comedy.kinds).toContain('tv');
  });

  it('records correct count as the total across movies and shows', () => {
    const movies = [makeMovie('m1', ['Sci-Fi']), makeMovie('m2', ['Sci-Fi'])];
    const shows = [makeShow('s1', ['Sci-Fi'])];
    const { result } = renderHook(() => useGenreRails(movies, shows));

    const scifi = result.current.find((g) => g.name === 'Sci-Fi')!;
    expect(scifi.count).toBe(3);
  });
});

describe('useGenreRails — parental filtering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('excludes restricted items from genre counts when parental filter is active', () => {
    // Spy on applyParentalFilter to simulate kids mode filtering out R items.
    vi.spyOn(parentalLib, 'applyParentalFilter').mockImplementation(<T extends { content_rating?: string }>(items: T[]): T[] =>
      items.filter((i) => i.content_rating !== 'R'),
    );

    const movies = [
      makeMovie('m1', ['Thriller'], 'R'),   // should be filtered
      makeMovie('m2', ['Thriller'], 'PG'),   // should pass
    ];
    const { result } = renderHook(() => useGenreRails(movies, []));

    const thriller = result.current.find((g) => g.name === 'Thriller');
    expect(thriller).toBeDefined();
    expect(thriller!.count).toBe(1);
    expect(thriller!.items.every((item) => (item as Movie).content_rating !== 'R')).toBe(true);
  });

  it('returns empty when all genres are fully filtered by parental controls', () => {
    vi.spyOn(parentalLib, 'applyParentalFilter').mockReturnValue([]);

    const movies = [makeMovie('m1', ['Horror'], 'R')];
    const { result } = renderHook(() => useGenreRails(movies, []));

    expect(result.current).toEqual([]);
  });
});
