import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { RelatedItem } from '../types';

const getRelated = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      ...actual.api,
      getRelated: (...args: unknown[]) => getRelated(...args),
    },
  };
});

// Isolate parental state for each test.
vi.mock('../lib/parental', async () => {
  const actual = await vi.importActual<typeof import('../lib/parental')>('../lib/parental');
  return {
    ...actual,
    applyParentalFilter: <T,>(items: T[]) => items,
  };
});

import { useRelated } from './useRelated';

const relatedMovie: RelatedItem = {
  id: 550,
  title: 'Fight Club',
  year: 1999,
  overview: 'A classic.',
  poster: '/fc.jpg',
  voteAvg: 8.4,
  mediaType: 'movie',
  relation: 'related_to',
};

describe('useRelated', () => {
  beforeEach(() => {
    getRelated.mockReset();
  });

  it('returns items when graph is available', async () => {
    getRelated.mockResolvedValue({ items: [relatedMovie], available: true });

    const { result } = renderHook(() => useRelated('movie', 550));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.available).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('Fight Club');
    expect(getRelated).toHaveBeenCalledWith('tmdb:movie:550');
  });

  it('returns available=false when the graph module is not installed', async () => {
    getRelated.mockResolvedValue({ items: [], available: false });

    const { result } = renderHook(() => useRelated('movie', 550));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.available).toBe(false);
    expect(result.current.items).toHaveLength(0);
  });

  it('returns error=true when the fetch rejects', async () => {
    getRelated.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useRelated('movie', 550));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.items).toHaveLength(0);
    // Page is not broken: available stays true (error is a transient issue)
    expect(result.current.available).toBe(true);
  });

  it('is a no-op when tmdbId is undefined', async () => {
    const { result } = renderHook(() => useRelated('movie', undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toHaveLength(0);
    expect(getRelated).not.toHaveBeenCalled();
  });

  it('refetches when tmdbId changes', async () => {
    getRelated.mockResolvedValue({ items: [relatedMovie], available: true });

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) => useRelated('movie', id),
      { initialProps: { id: 550 } },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(getRelated).toHaveBeenCalledWith('tmdb:movie:550');

    getRelated.mockResolvedValue({
      items: [{ ...relatedMovie, id: 999, title: 'Se7en' }],
      available: true,
    });
    rerender({ id: 999 });

    await waitFor(() => expect(result.current.items[0]?.title).toBe('Se7en'));
    expect(getRelated).toHaveBeenCalledWith('tmdb:movie:999');
  });

  it('respects the limit parameter', async () => {
    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      ...relatedMovie,
      id: i + 1,
      title: `Movie ${i + 1}`,
    }));
    getRelated.mockResolvedValue({ items: manyItems, available: true });

    const { result } = renderHook(() => useRelated('movie', 550, 5));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(5);
  });

  it('uses tmdb:tv: prefix for TV shows', async () => {
    getRelated.mockResolvedValue({ items: [], available: true });

    const { result } = renderHook(() => useRelated('tv', 1396));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getRelated).toHaveBeenCalledWith('tmdb:tv:1396');
  });
});
