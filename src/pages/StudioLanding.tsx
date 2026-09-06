/**
 * Studio landing page — browse all library titles from a given studio.
 * Route: /studio/:name  (name is URI-encoded)
 *
 * Movies whose `studio` field matches, plus TV shows whose `studio` field
 * matches, are listed here. Applies parental filtering. Soft-empty when
 * no titles carry studio metadata or none match this studio.
 *
 * umbrella#107
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import type { Movie, TVShow } from '../types';

type FilterMode = 'all' | 'movies' | 'tv';

export default function StudioLanding() {
  const { name = '' } = useParams<{ name: string }>();
  const studio = decodeURIComponent(name);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    if (!studio) return;
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
  }, [studio]);

  const matchingMovies = useMemo(
    () => applyParentalFilter(movies.filter((m) => m.studio === studio)),
    [movies, studio],
  );

  const matchingShows = useMemo(
    () => applyParentalFilter(shows.filter((s) => s.studio === studio)),
    [shows, studio],
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
    <div className="space-y-6" data-testid="studio-landing-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/" className="text-[var(--text-tertiary)] hover:text-[var(--accent-color)]">
          Home
        </Link>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">Studios</span>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-primary)]" aria-current="page">
          {studio}
        </span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {studio}
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
          <LoadingStatus label={`Loading ${studio} titles`} />
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
              icon={Building2}
              title={studio ? `No titles from ${studio}` : 'No titles found'}
              message="No titles from this studio are available in your library."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/movies"
                    className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                  >
                    Browse movies
                  </Link>
                  <Link
                    to="/tv"
                    className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                  >
                    Browse TV shows
                  </Link>
                </div>
              }
              testId="studio-empty"
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
