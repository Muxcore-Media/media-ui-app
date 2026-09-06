/**
 * Network landing page — browse all TV shows from a given broadcast/streaming network.
 * Route: /network/:name  (name is URI-encoded)
 *
 * TV shows whose `network` field matches are listed here. Also includes movies
 * whose `studio` matches the network name as a soft fallback (uncommon but possible
 * for streaming-only networks like Netflix, Disney+).
 * Applies parental filtering. Soft-empty when no titles carry network metadata.
 *
 * umbrella#107
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tv2 } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import type { Movie, TVShow } from '../types';

type FilterMode = 'all' | 'movies' | 'tv';

export default function NetworkLanding() {
  const { name = '' } = useParams<{ name: string }>();
  const network = decodeURIComponent(name);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    if (!network) return;
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
  }, [network]);

  // Primary: shows whose `network` matches. Secondary: movies whose `studio` matches
  // (covers streaming networks like Disney+, Netflix that own both movies and shows).
  const matchingShows = useMemo(
    () => applyParentalFilter(shows.filter((s) => s.network === network)),
    [shows, network],
  );

  const matchingMovies = useMemo(
    () => applyParentalFilter(movies.filter((m) => m.studio === network)),
    [movies, network],
  );

  const filtered = useMemo<{ item: Movie | TVShow; kind: 'movie' | 'tv' }[]>(() => {
    const showRows = matchingShows.map((s) => ({ item: s as Movie | TVShow, kind: 'tv' as const }));
    const movieRows = matchingMovies.map((m) => ({ item: m as Movie | TVShow, kind: 'movie' as const }));
    if (filter === 'tv') return showRows;
    if (filter === 'movies') return movieRows;
    // Shows first, then movies (network is primarily a TV concept).
    const out: { item: Movie | TVShow; kind: 'movie' | 'tv' }[] = [];
    let si = 0;
    let mi = 0;
    while (si < showRows.length || mi < movieRows.length) {
      if (si < showRows.length) out.push(showRows[si++]);
      if (mi < movieRows.length) out.push(movieRows[mi++]);
    }
    return out;
  }, [matchingShows, matchingMovies, filter]);

  const totalCount = matchingShows.length + matchingMovies.length;

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
    <div className="space-y-6" data-testid="network-landing-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link to="/" className="text-[var(--text-tertiary)] hover:text-[var(--accent-color)]">
          Home
        </Link>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-secondary)]">Networks</span>
        <span className="text-[var(--text-tertiary)]" aria-hidden="true">/</span>
        <span className="text-[var(--text-primary)]" aria-current="page">
          {network}
        </span>
      </nav>

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {network}
        </h1>
        {!loading && !error && (
          <p className="text-sm text-[var(--text-secondary)]">
            {totalCount} title{totalCount !== 1 ? 's' : ''} in your library
          </p>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <>
          <LoadingStatus label={`Loading ${network} titles`} />
          <PosterGridSkeleton count={12} />
        </>
      ) : (
        <>
          {/* Type filter */}
          {totalCount > 0 && (
            <div
              role="group"
              aria-label="Filter by content type"
              className="flex flex-wrap gap-2"
            >
              {filterButton('all', `All (${totalCount})`)}
              {matchingShows.length > 0 && filterButton('tv', `TV Shows (${matchingShows.length})`)}
              {matchingMovies.length > 0 && filterButton('movies', `Movies (${matchingMovies.length})`)}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Tv2}
              title={network ? `No titles from ${network}` : 'No titles found'}
              message="No titles from this network are available in your library."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/tv"
                    className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                  >
                    Browse TV shows
                  </Link>
                  <Link
                    to="/movies"
                    className="text-sm font-medium text-[var(--accent-color)] hover:underline"
                  >
                    Browse movies
                  </Link>
                </div>
              }
              testId="network-empty"
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
