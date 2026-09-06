/**
 * Fetches related titles from media-graph via the BFF /api/graph/related proxy,
 * applies parental controls, and exposes a loading/error state so callers can
 * hide the rail gracefully when the module is unavailable.
 */

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { applyParentalFilter } from '../lib/parental';
import type { RelatedItem } from '../types';

export type UseRelatedState = {
  items: RelatedItem[];
  loading: boolean;
  /** True only when the module is available but a network/parse error occurred. */
  error: boolean;
  /** False when the graph module is not installed — hides the rail entirely. */
  available: boolean;
};

/**
 * Fetch related titles for a library item identified by its TMDB id.
 *
 * @param kind    'movie' | 'tv'
 * @param tmdbId  TMDB numeric id (undefined → hook is a no-op)
 * @param limit   Max items to surface in the rail (default 12)
 */
export function useRelated(
  kind: 'movie' | 'tv',
  tmdbId: number | undefined,
  limit = 12,
): UseRelatedState {
  const [state, setState] = useState<UseRelatedState>({
    items: [],
    loading: false,
    error: false,
    available: true,
  });

  // Stable ref so we can cancel stale fetches on unmount / prop changes.
  const cancelRef = useRef(false);

  useEffect(() => {
    if (tmdbId == null) {
      setState({ items: [], loading: false, error: false, available: true });
      return;
    }

    cancelRef.current = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));

    const externalId = `tmdb:${kind}:${tmdbId}`;

    (async () => {
      try {
        const result = await api.getRelated(externalId);
        if (cancelRef.current) return;
        if (!result.available) {
          setState({ items: [], loading: false, error: false, available: false });
          return;
        }
        // Parental filter: RelatedItem has optional content_rating.
        const filtered = applyParentalFilter(result.items).slice(0, limit);
        setState({ items: filtered, loading: false, error: false, available: true });
      } catch {
        if (cancelRef.current) return;
        setState({ items: [], loading: false, error: true, available: true });
      }
    })();

    return () => {
      cancelRef.current = true;
    };
  }, [kind, tmdbId, limit]);

  return state;
}
