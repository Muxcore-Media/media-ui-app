/**
 * Unit tests for useMusicShelves — verifies year-descending sort order
 * and null/undefined year handling (umbrella#115).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMusicShelves } from './useMusicShelves';

const listMusic = vi.fn();
const getMusicArtist = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listMusic: (...args: unknown[]) => listMusic(...args),
      getMusicArtist: (...args: unknown[]) => getMusicArtist(...args),
    },
  };
});

describe('useMusicShelves — album sort order', () => {
  beforeEach(() => {
    listMusic.mockResolvedValue({
      items: [{ id: 'a1', name: 'Artist One' }],
      total: 1,
      available: true,
    });
  });

  it('sorts albums by year descending', async () => {
    getMusicArtist.mockResolvedValue({
      artist: { id: 'a1', name: 'Artist One' },
      albums: [
        { id: 'al1', title: 'Oldest', year: 1990, artist_id: 'a1' },
        { id: 'al2', title: 'Newest', year: 2020, artist_id: 'a1' },
        { id: 'al3', title: 'Middle', year: 2005, artist_id: 'a1' },
      ],
    });

    const { result } = renderHook(() => useMusicShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const years = result.current.albums.map((a) => a.year);
    expect(years).toEqual([2020, 2005, 1990]);
  });

  it('places albums with undefined year after albums with a year', async () => {
    getMusicArtist.mockResolvedValue({
      artist: { id: 'a1', name: 'Artist One' },
      albums: [
        { id: 'al1', title: 'Has Year', year: 2010, artist_id: 'a1' },
        { id: 'al2', title: 'No Year', artist_id: 'a1' },
        { id: 'al3', title: 'Also Has Year', year: 2015, artist_id: 'a1' },
      ],
    });

    const { result } = renderHook(() => useMusicShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const titles = result.current.albums.map((a) => a.title);
    expect(titles[0]).toBe('Also Has Year');
    expect(titles[1]).toBe('Has Year');
    expect(titles[2]).toBe('No Year');
  });

  it('handles multiple artists and sorts across them', async () => {
    listMusic.mockResolvedValue({
      items: [
        { id: 'a1', name: 'Artist One' },
        { id: 'a2', name: 'Artist Two' },
      ],
      total: 2,
      available: true,
    });
    getMusicArtist.mockImplementation((id: string) => {
      if (id === 'a1')
        return Promise.resolve({
          artist: { id: 'a1', name: 'Artist One' },
          albums: [
            { id: 'al1', title: 'Early', year: 1995, artist_id: 'a1' },
            { id: 'al2', title: 'Late', year: 2022, artist_id: 'a1' },
          ],
        });
      return Promise.resolve({
        artist: { id: 'a2', name: 'Artist Two' },
        albums: [{ id: 'al3', title: 'Mid', year: 2010, artist_id: 'a2' }],
      });
    });

    const { result } = renderHook(() => useMusicShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const years = result.current.albums.map((a) => a.year);
    // Must be non-increasing
    for (let i = 0; i < years.length - 1; i++) {
      const a = years[i] ?? -Infinity;
      const b = years[i + 1] ?? -Infinity;
      expect(a).toBeGreaterThanOrEqual(b);
    }
    expect(years[0]).toBe(2022);
  });
});
