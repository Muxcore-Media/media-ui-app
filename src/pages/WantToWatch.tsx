import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, searchResultKey } from '../api/client';
import MediaCard from '../components/MediaCard';
import RequestableCard from '../components/search/RequestableCard';
import { PosterGrid } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import {
  listWantToWatch,
  removeWantToWatch,
  type WantToWatchEntry,
} from '../lib/userdata';
import {
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
  getParentalState,
  isItemRestricted,
} from '../lib/parental';
import type { Movie, SearchResult, TVShow } from '../types';

function asCardItem(entry: WantToWatchEntry): Movie | TVShow {
  return {
    id: entry.id,
    title: entry.title,
    year: entry.year || 0,
    overview: entry.overview || '',
    runtime: 0,
    vote_average: 0,
    genres: [],
    poster_url: entry.poster_url || '',
    has_file: false,
    stream_url: '',
    created_at: '',
    content_rating: entry.content_rating,
  };
}

function asSearchResult(entry: WantToWatchEntry): SearchResult | null {
  if (!entry.tmdbId) return null;
  return {
    id: entry.tmdbId,
    title: entry.title,
    year: entry.year || 0,
    overview: entry.overview || '',
    poster: entry.poster || entry.poster_url || '',
    voteAvg: 0,
    mediaType: entry.kind === 'tv' ? 'tv' : 'movie',
  };
}

export default function WantToWatch() {
  const [tick, setTick] = useState(0);
  const [joinMovies, setJoinMovies] = useState<Array<{ id: string; content_rating?: string }>>(
    [],
  );
  const [joinShows, setJoinShows] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinReady, setJoinReady] = useState(() => !getParentalState().anyRestriction);
  const [requested, setRequested] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const rawItems = useMemo(() => {
    void tick;
    return listWantToWatch();
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let ratingMovies: Array<{ id: string; content_rating?: string }> = [];
      let ratingShows: Array<{ id: string; content_rating?: string }> = [];
      try {
        const [movies, shows] = await Promise.all([
          api.listMovies(1, 24),
          api.listTVShows(1, 24),
        ]);
        if (cancelled) return;
        const expanded = await expandLibraryRatingsForUserdata(rawItems, movies.items, shows.items, {
          getMovie: (id) => api.getMovie(id).catch(() => null),
          getTVShow: (id) => api.getTVShow(id).catch(() => null),
        });
        if (cancelled) return;
        ratingMovies = expanded.movies;
        ratingShows = expanded.shows;
      } catch {
        // Soft-fail open: join with whatever we have (unknown ratings stay visible).
      }
      if (cancelled) return;
      setJoinMovies(ratingMovies);
      setJoinShows(ratingShows);
      setJoinReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawItems]);

  const items = useMemo(() => {
    if (!joinReady) return [];
    const parental = getParentalState();
    return applyUserdataParentalFilter(rawItems, joinMovies, joinShows).filter((entry) => {
      if (!parental.anyRestriction) return true;
      return !isItemRestricted({ content_rating: entry.content_rating }, parental);
    });
  }, [rawItems, joinMovies, joinShows, joinReady]);

  function remove(entry: WantToWatchEntry) {
    removeWantToWatch(entry.id);
    setTick((n) => n + 1);
  }

  async function request(entry: WantToWatchEntry) {
    const result = asSearchResult(entry);
    if (!result) return;
    try {
      setError(null);
      const res = await api.requestTitle({
        tmdbId: result.id,
        title: result.title,
        year: result.year,
        overview: result.overview,
        poster: result.poster,
        mediaType: result.mediaType,
      });
      setRequested((prev) => ({ ...prev, [searchResultKey(result)]: res.status || 'requested' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  return (
    <div className="space-y-6" data-testid="want-to-watch-page">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Want to Watch
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Titles you&apos;ve saved. Request a download when you&apos;re ready.
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh Want to Watch"
          className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh
        </button>
      </header>

      {error ? <ErrorBanner message={error} /> : null}

      <section className="space-y-4" aria-labelledby="want-to-watch-items-heading">
        <h2
          id="want-to-watch-items-heading"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Saved titles ({items.length})
        </h2>
        {!joinReady ? (
          <LoadingStatus label="Loading Want to Watch" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing on your list yet"
            message="Save titles from Discover or a movie or show page, then request them from here."
            action={
              <Link
                to="/discover"
                className="text-sm font-medium text-[var(--accent-text)] hover:underline"
              >
                Browse Discover
              </Link>
            }
            testId="want-to-watch-empty"
          />
        ) : (
          <div className="space-y-4">
            {items.some((entry) => asSearchResult(entry)) ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {items.map((entry) => {
                  const result = asSearchResult(entry);
                  if (!result) return null;
                  return (
                    <div key={entry.id} className="space-y-2">
                      <RequestableCard
                        item={result}
                        requested={requested[searchResultKey(result)]}
                        onRequest={() => void request(entry)}
                        returnTo="/want-to-watch"
                      />
                      <button
                        type="button"
                        onClick={() => remove(entry)}
                        className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        aria-label={`Remove ${entry.title} from Want to Watch`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {items.some((entry) => !asSearchResult(entry)) ? (
              <PosterGrid>
                {items
                  .filter((entry) => !asSearchResult(entry))
                  .map((entry) => (
                    <div key={entry.id} className="space-y-2">
                      <MediaCard
                        item={asCardItem(entry)}
                        type={entry.kind === 'tv' ? 'tv' : 'movie'}
                      />
                      <button
                        type="button"
                        onClick={() => remove(entry)}
                        className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        aria-label={`Remove ${entry.title} from Want to Watch`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </PosterGrid>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
