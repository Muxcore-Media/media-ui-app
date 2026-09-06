/**
 * Derives genre rails from the already-loaded movie/show library lists.
 * Applies parental filtering so restricted titles don't inflate genre counts
 * or appear on landing pages without being gated.
 *
 * umbrella#105
 */

import { useMemo } from 'react';
import { applyParentalFilter } from '../lib/parental';
import type { Movie, TVShow } from '../types';

export type GenreRailEntry = {
  /** Genre display name as returned by the BFF (Title Case from metadata). */
  name: string;
  /** Parental-filtered item count (movies + shows combined). */
  count: number;
  /** Up to `itemsPerGenre` parental-filtered items for preview cards. */
  items: (Movie | TVShow)[];
  /** Kind per item, aligned with `items` array. */
  kinds: ('movie' | 'tv')[];
};

/**
 * Build genre rails from pre-fetched library lists.
 *
 * @param allMovies   Raw movie list from the BFF (un-filtered).
 * @param allShows    Raw show list from the BFF (un-filtered).
 * @param maxGenres   Maximum number of genre rails to return (default 12).
 * @param itemsPerGenre  Max preview items per genre (default 16).
 */
export function useGenreRails(
  allMovies: Movie[],
  allShows: TVShow[],
  maxGenres = 12,
  itemsPerGenre = 16,
): GenreRailEntry[] {
  return useMemo(() => {
    const filteredMovies = applyParentalFilter(allMovies);
    const filteredShows = applyParentalFilter(allShows);

    // Map genre name → { movies, shows } so we can sort by total count.
    const genreMovies = new Map<string, Movie[]>();
    const genreShows = new Map<string, TVShow[]>();

    for (const movie of filteredMovies) {
      for (const g of movie.genres) {
        if (!g) continue;
        const bucket = genreMovies.get(g);
        if (bucket) bucket.push(movie);
        else genreMovies.set(g, [movie]);
      }
    }

    for (const show of filteredShows) {
      for (const g of show.genres) {
        if (!g) continue;
        const bucket = genreShows.get(g);
        if (bucket) bucket.push(show);
        else genreShows.set(g, [show]);
      }
    }

    const allGenres = new Set([...genreMovies.keys(), ...genreShows.keys()]);

    const rails: GenreRailEntry[] = [];
    for (const name of allGenres) {
      const movies = genreMovies.get(name) ?? [];
      const shows = genreShows.get(name) ?? [];
      const count = movies.length + shows.length;
      // Interleave movies and shows for variety in the preview row.
      const items: (Movie | TVShow)[] = [];
      const kinds: ('movie' | 'tv')[] = [];
      let mi = 0;
      let si = 0;
      while (items.length < itemsPerGenre && (mi < movies.length || si < shows.length)) {
        if (mi < movies.length) {
          items.push(movies[mi++]);
          kinds.push('movie');
        }
        if (items.length < itemsPerGenre && si < shows.length) {
          items.push(shows[si++]);
          kinds.push('tv');
        }
      }
      rails.push({ name, count, items, kinds });
    }

    return rails.sort((a, b) => b.count - a.count).slice(0, maxGenres);
  }, [allMovies, allShows, maxGenres, itemsPerGenre]);
}
