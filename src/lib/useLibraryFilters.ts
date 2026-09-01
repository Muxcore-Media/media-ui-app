import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type LibrarySortKey = 'title' | 'year' | 'rating';

const SORT_KEYS = new Set<LibrarySortKey>(['title', 'year', 'rating']);

function parseSort(raw: string | null): LibrarySortKey {
  if (raw && SORT_KEYS.has(raw as LibrarySortKey)) return raw as LibrarySortKey;
  return 'title';
}

/** Sync genre + sort filters with `?genre=&sort=` in the URL (AGENTS.md §4.3). */
export function useLibraryFilters() {
  const [params, setParams] = useSearchParams();

  const genre = params.get('genre') || '';
  const sort = parseSort(params.get('sort'));

  const setGenre = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next) out.set('genre', next);
          else out.delete('genre');
          return out;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSort = useCallback(
    (next: LibrarySortKey) => {
      setParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          out.set('sort', next);
          return out;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return useMemo(() => ({ genre, sort, setGenre, setSort }), [genre, sort, setGenre, setSort]);
}
