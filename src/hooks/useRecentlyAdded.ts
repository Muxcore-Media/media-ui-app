/**
 * Derives the "Recently Added" home shelf from already-fetched library lists.
 *
 * Filters to playable titles only (`has_file`), applies parental controls, then
 * deduplicates against IDs already shown in Continue Watching, Next Up, or
 * Because You Watched so the same title does not appear twice on Home.
 *
 * Sorting is by `created_at` descending (newest first), capped at SHELF_CAP.
 * Returns an empty array when there are no qualifying items — the caller
 * (Home) should soft-hide the shelf in that case.
 */

import { useMemo } from 'react';
import { applyParentalFilter } from '../lib/parental';
import { isWatchable } from '../lib/acquisition';
import type { Movie, TVShow } from '../types';

export type RecentlyAddedRow = {
  kind: 'movie' | 'tv';
  item: Movie | TVShow;
  createdAt: string;
};

const SHELF_CAP = 16;

/**
 * Compose the Recently Added shelf rows.
 *
 * @param allMovies  Full movie list returned by the library API (unfiltered).
 * @param allShows   Full TV-show list returned by the library API (unfiltered).
 * @param excludeIds IDs already occupied by Continue Watching, Next Up, or
 *                   Because You Watched — used to deduplicate the rail.
 */
export function useRecentlyAdded(
  allMovies: Movie[],
  allShows: TVShow[],
  excludeIds: ReadonlySet<string>,
): RecentlyAddedRow[] {
  return useMemo(() => {
    const rows: RecentlyAddedRow[] = [];

    for (const m of applyParentalFilter(allMovies)) {
      if (!isWatchable(m) || !m.created_at || excludeIds.has(m.id)) continue;
      rows.push({ kind: 'movie', item: m, createdAt: m.created_at });
    }

    for (const s of applyParentalFilter(allShows)) {
      if (!isWatchable(s) || !s.created_at || excludeIds.has(s.id)) continue;
      rows.push({ kind: 'tv', item: s, createdAt: s.created_at });
    }

    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, SHELF_CAP);
  }, [allMovies, allShows, excludeIds]);
}
