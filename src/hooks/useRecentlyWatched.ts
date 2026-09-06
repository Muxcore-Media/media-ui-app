/**
 * Derives the "Recently Watched" home shelf from all watched progress entries.
 *
 * Deduplicates against IDs already shown in Continue Watching or Next Up so the
 * same title never appears in two rails simultaneously.
 *
 * Returns an empty array when there are no qualifying items — the caller (Home)
 * should soft-hide the shelf in that case.
 */

import { useMemo } from 'react';
import type { ProgressEntry } from '../lib/userdata';

const SHELF_CAP = 12;

/**
 * Filter and deduplicate recently-watched entries for the home rail.
 *
 * @param watched    Progress entries with `watched: true`, sorted newest-first.
 * @param excludeIds IDs already shown in Continue Watching or Next Up.
 */
export function useRecentlyWatched(
  watched: ProgressEntry[],
  excludeIds: ReadonlySet<string>,
): ProgressEntry[] {
  return useMemo(
    () => watched.filter((p) => !excludeIds.has(p.id)).slice(0, SHELF_CAP),
    [watched, excludeIds],
  );
}
