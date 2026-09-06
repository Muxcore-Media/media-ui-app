import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import MediaCard from '../components/MediaCard';
import { PosterGrid } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { api } from '../api/client';
import { listFavorites, type FavoriteEntry } from '../lib/userdata';
import {
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
  getParentalState,
} from '../lib/parental';
import type { Movie, TVShow } from '../types';

function asCardItem(f: FavoriteEntry): Movie | TVShow {
  return {
    id: f.id,
    title: f.title,
    year: f.year || 0,
    overview: '',
    runtime: 0,
    vote_average: 0,
    genres: [],
    poster_url: f.poster_url || '',
    has_file: false,
    stream_url: '',
    created_at: '',
    content_rating: f.content_rating,
  };
}

export default function Favorites() {
  const [tick, setTick] = useState(0);
  const [joinMovies, setJoinMovies] = useState<Array<{ id: string; content_rating?: string }>>(
    [],
  );
  const [joinShows, setJoinShows] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinReady, setJoinReady] = useState(() => !getParentalState().anyRestriction);

  const rawItems = useMemo(() => {
    void tick;
    return listFavorites();
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
    return applyUserdataParentalFilter(rawItems, joinMovies, joinShows);
  }, [rawItems, joinMovies, joinShows, joinReady]);

  return (
    <div className="space-y-6" data-testid="favorites-page">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Favorites
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Movies and shows you&apos;ve saved to watch later.
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh favorites"
          className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh
        </button>
      </header>

      <section className="space-y-4" aria-labelledby="favorites-items-heading">
        <h2
          id="favorites-items-heading"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Saved titles ({items.length})
        </h2>
        {!joinReady ? (
          <LoadingStatus label="Loading favorites" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            message="Use the star on a movie or TV detail page to save titles here."
            action={
              <Link
                to="/movies"
                className="text-sm font-medium text-[var(--accent-color)] hover:underline"
              >
                Browse movies
              </Link>
            }
            testId="favorites-empty"
          />
        ) : (
          <PosterGrid>
            {items.map((f) => (
              <MediaCard key={f.id} item={asCardItem(f)} type={f.kind === 'tv' ? 'tv' : 'movie'} />
            ))}
          </PosterGrid>
        )}
      </section>
    </div>
  );
}
