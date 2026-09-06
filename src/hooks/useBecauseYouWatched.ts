/**
 * Personalized "Because you watched" shelf hook.
 *
 * Seeds from the most-recently-watched movie/episode in the user's progress
 * log, resolves the seed's TMDB external id, fetches related titles from the
 * media-graph BFF (`GET /api/graph/related?id=tmdb:{movie|tv}:{n}`), joins
 * the TMDB-shaped neighbors back to watchable library titles, then filters,
 * dedupes, and applies parental controls before returning the final shelf items.
 *
 * Returns an empty items array on any fetch error so the caller can
 * soft-hide the shelf without breaking the Home page (umbrella #94/#96).
 *
 * BFF contract: id MUST be "tmdb:movie:<n>" or "tmdb:tv:<n>".  Sending a
 * library-internal id (e.g. "movie-seed") yields 400 graph.invalid_id and
 * the graph treats the module as unavailable for that request.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * Library snapshot from the caller (Home already fetches movies + shows).
   * Used both to resolve the seed's tmdb_id and to join related TMDB neighbors
   * back to watchable library items.  When undefined or empty the hook falls
   * back to fetching the seed's detail from the BFF.
   */
  library?: { movies: Movie[]; shows: TVShow[] },
): BecauseYouWatchedResult {
  const [items, setItems] = useState<Array<Movie | TVShow>>([]);
  const [seedTitle, setSeedTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Keep library in a ref so the effect can always read the latest snapshot
  // without making the array itself a reactive dependency (avoids double-fetch
  // on every Home render tick while allMovies/allShows are being set).
  const libraryRef = useRef(library);
  libraryRef.current = library;

  // Re-evaluate watched seeds once at mount; stable across renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seedsKey = useMemo(() => pickSeeds(new Set()), []);

  // Trigger re-run when the caller's library transitions from empty → populated
  // so that the join step actually finds library items.
  const hasLibraryData =
    (library?.movies.length ?? 0) + (library?.shows.length ?? 0) > 0;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Also exclude things already in continue-watching so we don't show duplicates.
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

        // ── Step 1: resolve tmdb_id for the seed ──────────────────────────────
        // Try the library snapshot first (zero cost); fall back to a detail fetch.
        const lib = libraryRef.current;
        let seedTmdbId: number | undefined;

        if (seedType === 'movie') {
          seedTmdbId = lib?.movies.find((m) => m.id === seedId)?.tmdb_id;
          if (!seedTmdbId) {
            const detail = await api.getMovie(seedId).catch(() => null);
            if (cancelled) return;
            seedTmdbId = detail?.tmdb_id;
          }
        } else {
          seedTmdbId = lib?.shows.find((s) => s.id === seedId)?.tmdb_id;
          if (!seedTmdbId) {
            const detail = await api.getTVShow(seedId).catch(() => null);
            if (cancelled) return;
            seedTmdbId = detail?.tmdb_id;
          }
        }

        if (!seedTmdbId) {
          // No TMDB id — can't form a valid graph external id.  Soft-hide.
          if (!cancelled) {
            setItems([]);
            setSeedTitle('');
            setLoading(false);
          }
          return;
        }

        // ── Step 2: fetch related via the correct BFF external id format ───────
        // BFF contract: GET /api/graph/related?id=tmdb:{movie|tv}:{n}
        const externalId = `tmdb:${seedType}:${seedTmdbId}`;
        const result = await api.getRelated(externalId);

        if (cancelled) return;

        if (!result.available) {
          // Graph module not installed/reachable — soft-hide.
          if (!cancelled) {
            setItems([]);
            setSeedTitle('');
            setLoading(false);
          }
          return;
        }

        // ── Step 3: join TMDB-shaped neighbors to watchable library items ──────
        // RelatedItem.id is a TMDB numeric id; match it to library items by tmdb_id.
        const currentLib = libraryRef.current;
        const libByTmdb = new Map<number, Movie | TVShow>();
        for (const m of currentLib?.movies ?? []) {
          if (m.tmdb_id != null) libByTmdb.set(m.tmdb_id, m);
        }
        for (const s of currentLib?.shows ?? []) {
          if (s.tmdb_id != null) libByTmdb.set(s.tmdb_id, s);
        }

        const joined: Array<Movie | TVShow> = [];
        for (const relItem of result.items) {
          const libItem = libByTmdb.get(relItem.id); // relItem.id is numeric TMDB id
          if (libItem) joined.push(libItem);
        }

        // ── Step 4: filter — watchable, not excluded/seeded, parental ─────────
        const filtered = applyParentalFilter(
          joined.filter(
            (item) => item.has_file && !allExclude.has(item.id) && item.id !== seedId,
          ),
        ).slice(0, SHELF_CAP);

        if (!cancelled) {
          setItems(filtered);
          setSeedTitle(seedEntry.title);
        }
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
    // seedsKey is stable (computed once at mount).
    // hasLibraryData triggers a re-run when library becomes populated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedsKey, hasLibraryData]);

  return { items, seedTitle, loading };
}

/**
 * Pick up to MAX_SEEDS recently-watched progress entries, excluding IDs that
 * are already shown in other shelves.
 */
function pickSeeds(excludeIds: ReadonlySet<string>) {
  return recentlyWatched(MAX_SEEDS * 4)
    .filter((p) => {
      if (excludeIds.has(p.id)) return false;
      // Only seed from movies or TV episodes (not music/books/etc.)
      return p.kind === 'movie' || p.kind === 'episode' || p.kind === 'tv';
    })
    .slice(0, MAX_SEEDS);
}
