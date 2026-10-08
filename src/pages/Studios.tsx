import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { applyParentalFilter } from '../lib/parental';
import type { Movie } from '../types';

/** Studio browse from collection_name / genre buckets (Jellyfin studios parity). */
export default function Studios() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('studio') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listMovies(1, 500);
        if (!cancelled) setMovies(res.items);
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

  const parentalFilteredMovies = useMemo(
    () => applyParentalFilter(movies),
    [movies],
  );

  const studios = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of parentalFilteredMovies) {
      const keys = m.collection_name?.trim()
        ? [m.collection_name.trim()]
        : m.genres.length
          ? m.genres
          : ['Unknown'];
      for (const k of keys) counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [parentalFilteredMovies]);

  const filtered = useMemo(() => {
    if (!selected) return [];
    return parentalFilteredMovies.filter((m) => {
      if (m.collection_name?.trim() === selected) return true;
      return m.genres.includes(selected);
    });
  }, [parentalFilteredMovies, selected]);

  return (
    <div className="space-y-6" data-testid="studios-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Studios &amp; collections
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Browse by studio, franchise, or genre.
        </p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {loading && (selected ? <PosterGridSkeleton count={6} /> : <PosterGridSkeleton count={9} />)}

      {!loading && !error && !selected && studios.length === 0 && (
        <EmptyState
          icon={Building2}
          message="No studios or franchises found in your movie library yet."
          action={
            <Link
              to="/movies"
              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              Browse movies
            </Link>
          }
          testId="studios-empty"
        />
      )}

      {!loading && !error && !selected && studios.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {studios.map(([name, count]) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => setParams({ studio: name })}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-left transition hover:border-[var(--accent-color)] hover:bg-[var(--bg-elevated-2)]"
              >
                <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Building2 className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                  {name}
                </span>
                <span className="flex items-center gap-1">
                  <Badge tone="neutral">{count}</Badge>
                  <ChevronRight
                    className="h-4 w-4 text-[var(--text-tertiary)]"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && selected && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setParams({})}
              className="flex items-center gap-1 text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All studios
            </button>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{selected}</h2>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No titles"
              message={`No titles in ${selected} yet.`}
              testId="studios-detail-empty"
            />
          ) : (
            <PosterGrid>
              {filtered.map((m) => (
                <MediaCard key={m.id} item={m} type="movie" />
              ))}
            </PosterGrid>
          )}
          <p className="text-xs text-[var(--text-tertiary)]">
            Also see{' '}
            <Link className="text-[var(--accent-text)]" to="/collections">
              Collections
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
