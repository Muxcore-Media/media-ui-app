/**
 * Fetches comic series/titles for the Home shelf (umbrella#120).
 * The fetch is wrapped in failure isolation so a missing or unavailable
 * comics library never breaks the Home page — callers receive an empty list
 * and `available` set to false.
 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { LibraryRow } from '../types';

export type UseComicsShelves = {
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /** False when the comics (/api/comics) endpoint is unavailable or returned empty. */
  available: boolean;
  /** Up to MAX_COMICS comic entries from the library. */
  comics: LibraryRow[];
};

const MAX_COMICS = 24;

export function useComicsShelves(): UseComicsShelves {
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [comics, setComics] = useState<LibraryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const emptyList = { items: [] as LibraryRow[], total: 0, available: false as const };
        // Wrap in Promise.resolve().then() so synchronous throws are also caught.
        const res = await Promise.resolve().then(() => api.listComics()).catch(() => emptyList);
        if (cancelled) return;

        if (res.available !== false && res.items.length > 0) {
          setAvailable(true);
          setComics(res.items.slice(0, MAX_COMICS));
        }
      } catch {
        // Leave available false.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, available, comics };
}
