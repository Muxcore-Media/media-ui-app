/**
 * Personalized "Because you watched" shelf hook.
 *
 * Seeds from the most-recently-watched movie/episode in the user's progress
 * log, fetches related titles from the media-graph BFF
 * (`GET /api/graph/related`), then filters, dedupes, and applies parental
 * controls before returning the final shelf items.
 *
 * Returns an empty items array on any fetch error so the caller can
 * soft-hide the shelf without breaking the Home page (umbrella #94).
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { applyParentalFilter } from '../lib/parental';
import { recentlyWatched, continueWatching, tvShowIdFromHref } from '../lib/userdata';
import type { Movie, TVShow } from '../types';

export type BecauseYouWatchedResult = {
  items: Array<Movie | TVShow>;
  /** Title of the seed title, e.g. "Inception" */
  seedTitle: string;
  loading: boolean;
};

const SHELF_CAP = 16;
/** How many recent watched entries to scan before giving up. */
const MAX_SEEDS = 5;

export function useBecauseYouWatched(
  /** IDs already shown in Continue Watching / Next Up — dedupe against these. */
  excludeIds: ReadonlySet<string>,
): BecauseYouWatchedResult {
  const [items, setItems] = useState<Array<Movie | TVShow>>([]);
  const [seedTitle, setSeedTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Re-evaluate watched seeds on each mount; memo avoids re-running the effect
  // when excludeIds reference identity changes but contents are the same.
  const seedsKey = useMemo(() => {
    const seeds = pickSeeds(excludeIds);
    return seeds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Also exclude things already in continue-watching so we don't show duplicates
        const continueIds = new Set(continueWatching(100).map((p) => p.id));
        const allExclude = new Set([...excludeIds, ...continueIds]);
        const seeds = pickSeeds(allExclude);

        if (seeds.length === 0) {
          if (!cancelled) {
            setItems([]);
            setSeedTitle('');
            setLoading(false);
          }
          return;
        }

        const [seedEntry] = seeds;
        const seedType: 'movie' | 'tv' = seedEntry.kind === 'movie' ? 'movie' : 'tv';
        // For episodes/tv progress rows, the "id" is the episode id; we need the show id.
        const seedId =
          seedType === 'tv'
            ? (tvShowIdFromHref(seedEntry.href) ?? seedEntry.id)
            : seedEntry.id;

        const related = await api.getRelatedTitles(seedId, seedType, SHELF_CAP + allExclude.size + 4);

        if (cancelled) return;

        const usedSeedTitle = related.seed_title || seedEntry.title;

        // Filter: watchable, not excluded/seeded, parental
        const filtered = applyParentalFilter(
          related.items.filter(
            (item) => item.has_file && !allExclude.has(item.id) && item.id !== seedId,
          ),
        ).slice(0, SHELF_CAP);

        setItems(filtered);
        setSeedTitle(usedSeedTitle);
      } catch {
        // Soft-hide on any error — do not propagate to Home.
        if (!cancelled) {
          setItems([]);
          setSeedTitle('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedsKey]);

  return { items, seedTitle, loading };
}

/**
 * Pick up to MAX_SEEDS recently-watched progress entries, excluding IDs that
 * are already shown in other shelves.
 */
function pickSeeds(
  excludeIds: ReadonlySet<string>,
) {
  return recentlyWatched(MAX_SEEDS * 4)
    .filter((p) => {
      if (excludeIds.has(p.id)) return false;
      // Only seed from movies or TV episodes (not music/books/etc.)
      return p.kind === 'movie' || p.kind === 'episode' || p.kind === 'tv';
    })
    .slice(0, MAX_SEEDS);
}
