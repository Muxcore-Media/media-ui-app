/**
 * Derives studio and TV-network rails from the already-loaded movie/show library lists.
 * Applies parental filtering so restricted titles don't inflate counts or appear without gates.
 *
 * Studios: built from movies (and shows that carry a `studio` field).
 * Networks: built from TV shows that carry a `network` field.
 *
 * Both rails are empty when the corresponding metadata is absent from the library —
 * this is the expected soft-empty path for servers that don't return studio/network fields.
 *
 * umbrella#107
 */

import { useMemo } from 'react';
import { applyParentalFilter } from '../lib/parental';
import type { Movie, TVShow } from '../types';

export type StudioRailEntry = {
  /** Studio display name as returned by the BFF. */
  name: string;
  /** Parental-filtered item count (movies + shows combined). */
  count: number;
  /** Up to `itemsPerEntry` parental-filtered items for preview cards. */
  items: (Movie | TVShow)[];
  /** Kind per item, aligned with `items` array. */
  kinds: ('movie' | 'tv')[];
};

export type NetworkRailEntry = {
  /** Network display name as returned by the BFF. */
  name: string;
  /** Parental-filtered show count. */
  count: number;
  /** Up to `itemsPerEntry` parental-filtered shows for preview cards. */
  items: TVShow[];
  kinds: 'tv'[];
};

/**
 * Build studio and network rails from pre-fetched library lists.
 *
 * @param allMovies      Raw movie list from the BFF (un-filtered).
 * @param allShows       Raw show list from the BFF (un-filtered).
 * @param maxEntries     Maximum rails to return per category (default 12).
 * @param itemsPerEntry  Max preview items per rail (default 16).
 */
export function useStudioNetworkRails(
  allMovies: Movie[],
  allShows: TVShow[],
  maxEntries = 12,
  itemsPerEntry = 16,
): { studioRails: StudioRailEntry[]; networkRails: NetworkRailEntry[] } {
  return useMemo(() => {
    const filteredMovies = applyParentalFilter(allMovies);
    const filteredShows = applyParentalFilter(allShows);

    // ─── Studio rails (movies + shows) ───────────────────────────────────────
    const studioMovies = new Map<string, Movie[]>();
    const studioShows = new Map<string, TVShow[]>();

    for (const movie of filteredMovies) {
      if (!movie.studio) continue;
      const bucket = studioMovies.get(movie.studio);
      if (bucket) bucket.push(movie);
      else studioMovies.set(movie.studio, [movie]);
    }

    for (const show of filteredShows) {
      if (!show.studio) continue;
      const bucket = studioShows.get(show.studio);
      if (bucket) bucket.push(show);
      else studioShows.set(show.studio, [show]);
    }

    const allStudios = new Set([...studioMovies.keys(), ...studioShows.keys()]);
    const studioRails: StudioRailEntry[] = [];

    for (const name of allStudios) {
      const movies = studioMovies.get(name) ?? [];
      const shows = studioShows.get(name) ?? [];
      const count = movies.length + shows.length;

      const items: (Movie | TVShow)[] = [];
      const kinds: ('movie' | 'tv')[] = [];
      let mi = 0;
      let si = 0;
      while (items.length < itemsPerEntry && (mi < movies.length || si < shows.length)) {
        if (mi < movies.length) {
          items.push(movies[mi++]);
          kinds.push('movie');
        }
        if (items.length < itemsPerEntry && si < shows.length) {
          items.push(shows[si++]);
          kinds.push('tv');
        }
      }
      studioRails.push({ name, count, items, kinds });
    }

    studioRails.sort((a, b) => b.count - a.count);

    // ─── Network rails (TV shows only) ───────────────────────────────────────
    const networkShowsMap = new Map<string, TVShow[]>();

    for (const show of filteredShows) {
      if (!show.network) continue;
      const bucket = networkShowsMap.get(show.network);
      if (bucket) bucket.push(show);
      else networkShowsMap.set(show.network, [show]);
    }

    const networkRails: NetworkRailEntry[] = [];

    for (const [name, shows] of networkShowsMap) {
      const count = shows.length;
      const items = shows.slice(0, itemsPerEntry);
      const kinds = items.map((): 'tv' => 'tv');
      networkRails.push({ name, count, items, kinds });
    }

    networkRails.sort((a, b) => b.count - a.count);

    return {
      studioRails: studioRails.slice(0, maxEntries),
      networkRails: networkRails.slice(0, maxEntries),
    };
  }, [allMovies, allShows, maxEntries, itemsPerEntry]);
}
