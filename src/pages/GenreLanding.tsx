/**
 * Genre landing page — browse all library titles that match a genre.
 * Route: /genre/:name  (name is URI-encoded)
 *
 * umbrella#105
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import type { Movie, TVShow } from '../types';

type FilterMode = 'all' | 'movies' | 'tv';

export default function GenreLanding() {
  const { name = '' } = useParams<{ name: string }>();
  const genre = decodeURIComponent(name);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    if (!genre) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [movieList, showList] = await Promise.all([
          api.listMovies(1, 250).catch(() => ({ items: [] as Movie[] })),
          api.listTVShows(1, 250).catch(() => ({ items: [] as TVShow[] })),
        ]);
        if (!cancelled) {
          setMovies(movieList.items);
          setShows(showList.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load library');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [genre]);

  const matchingMovies = useMemo(
    () => applyParentalFilter(movies.filter((m) => m.genres.includes(genre))),
    [movies, genre],
  );

  const matchingShows = useMemo(
    () => applyParentalFilter(shows.filter((s) => s.genres.includes(genre))),
    [shows, genre],
  );

  const filtered = useMemo<{ item: Movie | TVShow; kind: 'movie' | 'tv' }[]>(() => {
    const movieRows = matchingMovies.map((m) => ({ item: m as Movie | TVShow, kind: 'movie' as const }));
    const showRows = matchingShows.map((s) => ({ item: s as Movie | TVShow, kind: 'tv' as const }));
    if (filter === 'movies') return movieRows;
    if (filter === 'tv') return showRows;
    // Interleave for variety.
    const out: { item: Movie | TVShow; kind: 'movie' | 'tv' }[] = [];
    let mi = 0;
    let si = 0;
    while (mi < movieRows.length || si < showRows.length) {
      if (mi < movieRows.length) out.push(movieRows[mi++]);
      if (si < showRows.length) out.push(showRows[si++]);
    }
    return out;
  }, [matchingMovies, matchingShows, filter]);

  const filterButton = (mode: FilterMode, label: string) => (
    <button
      key={mode}
      type="button"
      onClick={() => setFilter(mode)}
      aria-pressed={filter === mode}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] ${
        filter === mode
          ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
          : 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6" data-testid="genre-landing-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/" className="text-[var(--text-tertiary)] hover:text-[var(--accent-text)]">
          Home
        </Link>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">Genres</span>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-primary)]" aria-current="page">
          {genre}
        </span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {genre}
        </h1>
        {!loading && !error && (
          <p className="text-sm text-[var(--text-secondary)]">
            {matchingMovies.length + matchingShows.length} title
            {matchingMovies.length + matchingShows.length !== 1 ? 's' : ''} in your library
          </p>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <>
          <LoadingStatus label={`Loading ${genre} titles`} />
          <PosterGridSkeleton count={12} />
        </>
      ) : (
        <>
          {/* Type filter */}
          {(matchingMovies.length > 0 || matchingShows.length > 0) && (
            <div
              role="group"
              aria-label="Filter by content type"
              className="flex flex-wrap gap-2"
            >
              {filterButton('all', `All (${matchingMovies.length + matchingShows.length})`)}
              {matchingMovies.length > 0 &&
                filterButton('movies', `Movies (${matchingMovies.length})`)}
              {matchingShows.length > 0 &&
                filterButton('tv', `TV Shows (${matchingShows.length})`)}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={genre ? `No ${genre} titles` : 'No titles found'}
              message="No titles matching this genre are available in your library."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/movies"
                    className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Browse movies
                  </Link>
                  <Link
                    to="/tv"
                    className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                  >
                    Browse TV shows
                  </Link>
                </div>
              }
              testId="genre-empty"
            />
          ) : (
            <PosterGrid>
              {filtered.map(({ item, kind }) => (
                <MediaCard key={`${kind}-${item.id}`} item={item} type={kind} />
              ))}
            </PosterGrid>
          )}
        </>
      )}
    </div>
  );
}
