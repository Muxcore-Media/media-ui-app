import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { Movie } from '../types';

/** Home Videos library via BFF `?library=homevideos` (path prefixes / tags; heuristic when config empty). */
export default function HomeVideos() {
  const libraryHeadingId = useId();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listMovies(1, 200, { library: 'homevideos' });
        if (!cancelled) {
          setMovies(list.items);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="homevideos-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Home Videos
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">Personal videos from your library.</p>
      </div>
      {loading && (
        <div aria-busy="true" data-testid="homevideos-loading">
          <LoadingStatus label="Loading home videos" />
          <PosterGridSkeleton />
        </div>
      )}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && movies.length === 0 && (
        <EmptyState
          icon={Video}
          message="No home videos in your library yet."
          action={
            <Link
              to="/movies"
              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              Browse movies
            </Link>
          }
        />
      )}
      {!loading && !error && movies.length > 0 && (
        <section className="space-y-4" aria-labelledby={libraryHeadingId}>
          <h2 id={libraryHeadingId} className="sr-only">
            Home video library
          </h2>
          <PosterGrid>
            {movies.map((item) => (
              <MediaCard key={item.id} item={item} type="movie" />
            ))}
          </PosterGrid>
        </section>
      )}
    </div>
  );
}
