/**
 * Unit tests for useBooksShelves (umbrella#117).
 * Verifies available/unavailable states, soft-empty behaviour, and that
 * individual API failures are isolated (books failure does not hide audiobooks
 * and vice versa).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBooksShelves } from './useBooksShelves';

const listBooks = vi.fn();
const listAudiobooks = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    api: {
      listBooks: (...args: unknown[]) => listBooks(...args),
      listAudiobooks: (...args: unknown[]) => listAudiobooks(...args),
    },
  };
});

describe('useBooksShelves', () => {
  beforeEach(() => {
    listBooks.mockReset();
    listAudiobooks.mockReset();
  });

  it('returns populated authors and audiobooks when both APIs succeed', async () => {
    listBooks.mockResolvedValue({
      items: [
        { id: 'a1', name: 'Author One' },
        { id: 'a2', name: 'Author Two' },
      ],
      total: 2,
      available: true,
    });
    listAudiobooks.mockResolvedValue({
      items: [
        { id: 'ab1', title: 'Audiobook One', narrator: 'Narrator A' },
        { id: 'ab2', title: 'Audiobook Two' },
      ],
      total: 2,
      available: true,
    });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(true);
    expect(result.current.audiobooksAvailable).toBe(true);
    expect(result.current.authors).toHaveLength(2);
    expect(result.current.authors[0].name).toBe('Author One');
    expect(result.current.audiobooks).toHaveLength(2);
    expect(result.current.audiobooks[0].title).toBe('Audiobook One');
  });

  it('sets booksAvailable=false when books API returns available=false', async () => {
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
    listAudiobooks.mockResolvedValue({
      items: [{ id: 'ab1', title: 'Some Audiobook' }],
      total: 1,
      available: true,
    });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(false);
    expect(result.current.authors).toHaveLength(0);
    expect(result.current.audiobooksAvailable).toBe(true);
    expect(result.current.audiobooks).toHaveLength(1);
  });

  it('sets audiobooksAvailable=false when audiobooks API returns empty items', async () => {
    listBooks.mockResolvedValue({
      items: [{ id: 'a1', name: 'Author One' }],
      total: 1,
      available: true,
    });
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: true });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(true);
    expect(result.current.authors).toHaveLength(1);
    expect(result.current.audiobooksAvailable).toBe(false);
    expect(result.current.audiobooks).toHaveLength(0);
  });

  it('isolates a books API rejection — audiobooks still populate', async () => {
    listBooks.mockRejectedValue(new Error('books unavailable'));
    listAudiobooks.mockResolvedValue({
      items: [{ id: 'ab1', title: 'Great Audiobook' }],
      total: 1,
      available: true,
    });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(false);
    expect(result.current.authors).toHaveLength(0);
    expect(result.current.audiobooksAvailable).toBe(true);
    expect(result.current.audiobooks).toHaveLength(1);
  });

  it('isolates an audiobooks API rejection — books still populate', async () => {
    listBooks.mockResolvedValue({
      items: [{ id: 'a1', name: 'Author One' }],
      total: 1,
      available: true,
    });
    listAudiobooks.mockRejectedValue(new Error('audiobooks unavailable'));

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(true);
    expect(result.current.authors).toHaveLength(1);
    expect(result.current.audiobooksAvailable).toBe(false);
    expect(result.current.audiobooks).toHaveLength(0);
  });

  it('both unavailable when both APIs reject — loading resolves false', async () => {
    listBooks.mockRejectedValue(new Error('network error'));
    listAudiobooks.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.booksAvailable).toBe(false);
    expect(result.current.audiobooksAvailable).toBe(false);
    expect(result.current.authors).toHaveLength(0);
    expect(result.current.audiobooks).toHaveLength(0);
  });

  it('caps authors at MAX_AUTHORS (20)', async () => {
    const manyAuthors = Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, name: `Author ${i}` }));
    listBooks.mockResolvedValue({ items: manyAuthors, total: 30, available: true });
    listAudiobooks.mockResolvedValue({ items: [], total: 0, available: false });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.authors).toHaveLength(20);
  });

  it('caps audiobooks at MAX_AUDIOBOOKS (24)', async () => {
    const manyAudiobooks = Array.from({ length: 30 }, (_, i) => ({ id: `ab${i}`, title: `Book ${i}` }));
    listBooks.mockResolvedValue({ items: [], total: 0, available: false });
    listAudiobooks.mockResolvedValue({ items: manyAudiobooks, total: 30, available: true });

    const { result } = renderHook(() => useBooksShelves());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.audiobooks).toHaveLength(24);
  });
});
