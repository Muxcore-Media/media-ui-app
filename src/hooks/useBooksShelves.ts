/**
 * Fetches book authors and audiobooks for the Home shelves (umbrella#117).
 * Both fetches run in parallel; errors are swallowed individually so a missing
 * or unavailable books/audiobooks library never breaks the Home page — callers
 * receive empty lists and the corresponding `available` flag set to false.
 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LibraryRow } from '../types';

export type UseBooksShelves = {
  /** True while the initial fetches are in flight. */
  loading: boolean;
  /** False when the books (/api/books) endpoint is unavailable or returned empty. */
  booksAvailable: boolean;
  /** False when the audiobooks (/api/audiobooks) endpoint is unavailable or returned empty. */
  audiobooksAvailable: boolean;
  /** Up to MAX_AUTHORS book authors from the library. */
  authors: LibraryRow[];
  /** Up to MAX_AUDIOBOOKS audiobook entries from the library. */
  audiobooks: LibraryRow[];
};

const MAX_AUTHORS = 20;
const MAX_AUDIOBOOKS = 24;

export function useBooksShelves(): UseBooksShelves {
  const [loading, setLoading] = useState(true);
  const [booksAvailable, setBooksAvailable] = useState(false);
  const [audiobooksAvailable, setAudiobooksAvailable] = useState(false);
  const [authors, setAuthors] = useState<LibraryRow[]>([]);
  const [audiobooks, setAudiobooks] = useState<LibraryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const emptyList = { items: [] as LibraryRow[], total: 0, available: false as const };
        // Wrap each call in Promise.resolve().then() so synchronous throws (e.g. when the
        // API client stub doesn't define the method) are also caught by .catch(), preserving
        // per-endpoint failure isolation.
        const [booksRes, audiobooksRes] = await Promise.all([
          Promise.resolve().then(() => api.listBooks()).catch(() => emptyList),
          Promise.resolve().then(() => api.listAudiobooks()).catch(() => emptyList),
        ]);
        if (cancelled) return;

        if (booksRes.available !== false && booksRes.items.length > 0) {
          setBooksAvailable(true);
          setAuthors(booksRes.items.slice(0, MAX_AUTHORS));
        }
        if (audiobooksRes.available !== false && audiobooksRes.items.length > 0) {
          setAudiobooksAvailable(true);
          setAudiobooks(audiobooksRes.items.slice(0, MAX_AUDIOBOOKS));
        }
      } catch {
        // Both endpoints failed in an unexpected way — leave available flags false.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, booksAvailable, audiobooksAvailable, authors, audiobooks };
}
