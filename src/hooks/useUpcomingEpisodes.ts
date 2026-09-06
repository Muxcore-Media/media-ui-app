/**
 * Derives the "Upcoming / On The Air" home rail from an already-fetched show list.
 *
 * Fetches detailed show data (seasons + episodes with `air_date`) for each
 * show in `allShows`, then filters to episodes whose air date falls within a
 * [−LOOK_BACK_DAYS, +LOOK_AHEAD_DAYS] window relative to today.
 *
 * - Applies parental filter on shows before scanning episodes.
 * - Deduplicates against `excludeIds` (show id OR episode id) so the same
 *   title does not appear in both Continue Watching / Next Up and here.
 * - Returns an empty rows array on any fetch error — caller soft-hides the shelf.
 *
 * The window intentionally includes recently-aired episodes so household
 * members can catch up on episodes that just dropped (umbrella #100).
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { applyParentalFilter } from '../lib/parental';
import type { Episode, TVShow } from '../types';

export type UpcomingEpisodeRow = {
  show: TVShow;
  episode: Episode;
  /** ISO date string slice (YYYY-MM-DD) */
  air: string;
};

const SHELF_CAP = 12;
/** Days before today to include recently-aired (potentially unwatched) episodes. */
const LOOK_BACK_DAYS = 7;
/** Days ahead of today to show upcoming episodes. */
const LOOK_AHEAD_DAYS = 30;
/** Max shows to fetch detail for — bounds the number of BFF requests on Home. */
const MAX_DETAIL_FETCHES = 20;

export function useUpcomingEpisodes(
  allShows: TVShow[],
  excludeIds: ReadonlySet<string>,
): { rows: UpcomingEpisodeRow[]; loading: boolean } {
  const [detailedShows, setDetailedShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable key that changes only when the set of show IDs changes.
  const showIds = useMemo(() => allShows.map((s) => s.id).join(','), [allShows]);

  useEffect(() => {
    if (allShows.length === 0) {
      // Home hasn't loaded its show list yet — keep loading indicator up.
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const slice = allShows.slice(0, MAX_DETAIL_FETCHES);
        const detailed: TVShow[] = [];
        for (const s of slice) {
          if (cancelled) return;
          try {
            const detail = await api.getTVShow(s.id);
            // Guard against a mock or BFF returning null/undefined.
            detailed.push(detail ?? s);
          } catch {
            // Soft-fail individual show — push shallow copy so other shows still run.
            detailed.push(s);
          }
        }
        if (!cancelled) setDetailedShows(detailed);
      } catch {
        // Soft-fail the entire batch — rows will be empty, shelf will be hidden.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // showIds is derived from allShows; intentionally not listing allShows directly
    // to avoid re-triggering on every Home render tick while the array stabilises.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIds]);

  const rows = useMemo(() => {
    const now = Date.now();
    const earliest = now - LOOK_BACK_DAYS * 24 * 60 * 60 * 1000;
    const latest = now + LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000;

    const out: UpcomingEpisodeRow[] = [];
    for (const show of applyParentalFilter(detailedShows)) {
      if (excludeIds.has(show.id)) continue;
      for (const season of show.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
          if (!ep.air_date) continue;
          if (excludeIds.has(ep.id)) continue;
          const t = Date.parse(ep.air_date);
          if (!Number.isFinite(t) || t < earliest || t > latest) continue;
          out.push({ show, episode: ep, air: ep.air_date });
        }
      }
    }
    return out
      .sort((a, b) => a.air.localeCompare(b.air))
      .slice(0, SHELF_CAP);
  }, [detailedShows, excludeIds]);

  return { rows, loading };
}
