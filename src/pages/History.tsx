import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History as HistoryIcon } from 'lucide-react';
import { api } from '../api/client';
import { ProgressCard } from '../components/media/ProgressCard';
import { PosterGrid } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import {
  pullUserdataFromServer,
  recentlyWatched,
  type ProgressEntry,
} from '../lib/userdata';
import {
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
  getParentalState,
} from '../lib/parental';
import { formatWatchedRelative } from '../lib/relativeDate';

export default function History() {
  const [rawItems, setRawItems] = useState<ProgressEntry[]>([]);
  const [joinMovies, setJoinMovies] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinShows, setJoinShows] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinReady, setJoinReady] = useState(() => !getParentalState().anyRestriction);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await pullUserdataFromServer();
        if (cancelled) return;
        const watched = recentlyWatched(100);
        if (cancelled) return;

        let ratingMovies: Array<{ id: string; content_rating?: string }> = [];
        let ratingShows: Array<{ id: string; content_rating?: string }> = [];
        try {
          const [movies, shows] = await Promise.all([
            api.listMovies(1, 48),
            api.listTVShows(1, 48),
          ]);
          if (cancelled) return;
          const expanded = await expandLibraryRatingsForUserdata(
            watched,
            movies.items,
            shows.items,
            {
              getMovie: (id) => api.getMovie(id).catch(() => null),
              getTVShow: (id) => api.getTVShow(id).catch(() => null),
            },
          );
          if (cancelled) return;
          ratingMovies = expanded.movies;
          ratingShows = expanded.shows;
        } catch {
          // Soft-fail open: show with unknown ratings.
        }
        if (cancelled) return;
        setRawItems(watched);
        setJoinMovies(ratingMovies);
        setJoinShows(ratingShows);
        setJoinReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(
    () => (joinReady ? applyUserdataParentalFilter(rawItems, joinMovies, joinShows) : []),
    [rawItems, joinMovies, joinShows, joinReady],
  );

  return (
    <div className="space-y-6" data-testid="history-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Watch History
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Recently finished movies and episodes.
        </p>
      </header>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingStatus label="Loading watch history" />
      ) : !joinReady ? (
        <LoadingStatus label="Loading watch history" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No watch history yet"
          message="Finished movies and episodes will appear here."
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
                Browse TV
              </Link>
            </div>
          }
          testId="history-empty"
        />
      ) : (
        <section aria-labelledby="history-items-heading">
          <h2
            id="history-items-heading"
            className="mb-4 text-lg font-semibold text-[var(--text-primary)]"
          >
            Watched titles ({items.length})
          </h2>
          <PosterGrid>
            {items.map((p) => (
              <ProgressCard
                key={p.id}
                title={p.title}
                posterUrl={p.poster_url}
                href={p.href}
                subtitle={formatWatchedRelative(p.updatedAt)}
                ariaLabel={`${p.title}, ${formatWatchedRelative(p.updatedAt)}`}
              />
            ))}
          </PosterGrid>
        </section>
      )}
    </div>
  );
}
