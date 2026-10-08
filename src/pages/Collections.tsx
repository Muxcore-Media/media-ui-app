import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Layers, X } from 'lucide-react';
import { api } from '../api/client';
import MediaCard from '../components/MediaCard';
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid';
import { Shelf, ShelfItem } from '../components/media/Shelf';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { applyParentalFilter } from '../lib/parental';
import { canManageLibrary } from '../lib/session';
import type { Movie } from '../types';

type Collection = { id: string; name: string; items: Movie[]; source: 'tmdb' | 'genre' };
type ServerCol = { id: string; name: string; movie_count: number; monitored?: boolean };
type ServerDetail = { id: string; name: string; movies: Movie[]; monitored: boolean; searchOnAdd: boolean };

/** A horizontal shelf for a named box-set / genre collection. */
function CollectionShelf({
  collection,
  onClose,
  canEdit,
  busy,
  onMonitor,
  onSync,
}: {
  collection: ServerDetail;
  onClose: () => void;
  canEdit: boolean;
  busy: boolean;
  onMonitor: (monitored: boolean) => void;
  onSync: () => void;
}) {
  const movies = applyParentalFilter(collection.movies);
  return (
    <section
      className="space-y-2"
      aria-labelledby={`collection-shelf-${collection.id}-heading`}
      data-testid="collection-shelf"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id={`collection-shelf-${collection.id}-heading`}
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          {collection.name}
        </h2>
        <button
          type="button"
          aria-label={`Close ${collection.name} collection`}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Close
        </button>
      </div>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="collection-ops">
          <Badge tone={collection.monitored ? 'success' : 'neutral'}>
            {collection.monitored ? 'Monitored' : 'Unmonitored'}
          </Badge>
          <button
            type="button"
            disabled={busy}
            className="text-sm text-[var(--text-primary)]"
            onClick={() => onMonitor(!collection.monitored)}
          >
            {collection.monitored ? 'Pause collection' : 'Monitor collection'}
          </button>
          <button
            type="button"
            disabled={busy}
            className="text-sm text-[var(--text-primary)]"
            onClick={onSync}
          >
            Sync missing
          </button>
        </div>
      ) : null}
      {movies.length > 0 ? (
        <Shelf title={collection.name} testId={`collection-shelf-items-${collection.id}`}>
          {movies.map((item) => (
            <ShelfItem key={item.id}>
              <MediaCard item={item} type="movie" />
            </ShelfItem>
          ))}
        </Shelf>
      ) : (
        <p className="text-sm text-[var(--text-secondary)]">No movies in this collection.</p>
      )}
    </section>
  );
}

/** Box sets from media-movies collections RPC, with genre groups as fallback. */
export default function Collections() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [serverCols, setServerCols] = useState<ServerCol[]>([]);
  const [detail, setDetail] = useState<ServerDetail | null>(null);
  const [opsBusy, setOpsBusy] = useState(false);
  const canEdit = canManageLibrary();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, cols] = await Promise.all([
          api.listMovies(1, 200),
          api
            .listCollections()
            .catch(() => ({ items: [] as ServerCol[] })),
        ]);
        if (!cancelled) {
          setMovies(list.items);
          setServerCols(cols.items || []);
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

  const visibleMovies = useMemo(() => applyParentalFilter(movies), [movies]);

  const genreCollections = useMemo(() => {
    const map = new Map<string, Movie[]>();
    for (const m of visibleMovies) {
      for (const g of m.genres.length ? m.genres : ['Uncategorized']) {
        const arr = map.get(g) || [];
        arr.push(m);
        map.set(g, arr);
      }
    }
    const out: Collection[] = [...map.entries()]
      .filter(([, items]) => items.length >= 2)
      .map(([name, items]) => ({
        id: 'genre-' + name.toLowerCase().replace(/\s+/g, '-'),
        name,
        items: items.slice(0, 24),
        source: 'genre' as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [visibleMovies]);

  async function openServerCollection(id: string) {
    try {
      const d = await api.getCollection(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open collection');
    }
  }

  return (
    <div className="space-y-8" data-testid="collections-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Collections
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Explore movie franchises, box sets, and genres. Admins can monitor a box set and sync missing titles like Radarr.
        </p>
      </header>
      {loading ? (
        <>
          <LoadingStatus label="Loading collections" />
          <PosterGridSkeleton count={6} />
        </>
      ) : null}
      {error && <ErrorBanner message={error} />}

      {detail && (
        <CollectionShelf
          collection={detail}
          onClose={() => setDetail(null)}
          canEdit={canEdit}
          busy={opsBusy}
          onMonitor={(monitored) => {
            setOpsBusy(true);
            void api
              .setCollectionMonitored(detail.id, { monitored })
              .then((next) => {
                setDetail((cur) => (cur ? { ...cur, monitored: next.monitored } : cur));
                setServerCols((prev) =>
                  prev.map((row) => (row.id === detail.id ? { ...row, monitored: next.monitored } : row)),
                );
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not update collection'))
              .finally(() => setOpsBusy(false));
          }}
          onSync={() => {
            setOpsBusy(true);
            void api
              .syncCollection(detail.id)
              .then(async () => {
                const next = await api.getCollection(detail.id);
                setDetail(next);
              })
              .catch((err) => setError(err instanceof Error ? err.message : 'Could not sync collection'))
              .finally(() => setOpsBusy(false));
          }}
        />
      )}

      {!loading && serverCols.length > 0 && (
        <section className="space-y-3" aria-labelledby="collections-boxsets-heading">
          <h2
            id="collections-boxsets-heading"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Box sets
          </h2>
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {serverCols.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openServerCollection(c.id)}
                  aria-label={`Open ${c.name} collection, ${c.movie_count} titles`}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-[var(--bg-elevated-2)]"
                >
                  <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                    <Layers className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden="true" />
                    {c.name}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
                    <Badge tone={c.monitored ? 'success' : 'neutral'}>
                      {c.monitored ? `${c.movie_count} titles · monitored` : `${c.movie_count} titles`}
                    </Badge>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading &&
        !error &&
        genreCollections.length === 0 &&
        serverCols.length === 0 &&
        !detail && (
          <EmptyState
            icon={Layers}
            title="No collections yet"
            message="Box sets and genre groups will appear here as your movie library grows."
            action={
              <Link
                to="/movies"
                className="text-sm font-medium text-[var(--accent-text)] hover:underline"
              >
                Browse movies
              </Link>
            }
            testId="collections-empty"
          />
        )}

      {genreCollections.map((c) => (
        <section key={c.id} className="space-y-3" aria-labelledby={`collection-genre-${c.id}`}>
          <h2
            id={`collection-genre-${c.id}`}
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            {c.name}{' '}
            <span className="text-sm font-normal text-[var(--text-tertiary)]">
              (genre · {c.items.length})
            </span>
          </h2>
          <PosterGrid>
            {c.items.map((item) => (
              <MediaCard key={item.id} item={item} type="movie" />
            ))}
          </PosterGrid>
        </section>
      ))}
    </div>
  );
}
