import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import { api, searchResultKey } from '../api/client';
import RequestableCard from '../components/search/RequestableCard';
import { Shelf, ShelfItem } from '../components/media/Shelf';
import { PosterGridSkeleton } from '../components/media/PosterGrid';
import { AcquisitionSetupBanner } from '../components/media/AcquisitionSetupBanner';
import { RequestQuotaBanner } from '../components/media/RequestQuotaBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { SearchResult } from '../types';

type BrowseShelf = {
  title: string;
  items: SearchResult[];
};

function BrowseShelfRow({
  title,
  items,
  requested,
  onRequest,
}: {
  title: string;
  items: SearchResult[];
  requested: Record<string, string>;
  onRequest: (item: SearchResult) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Shelf title={title}>
      {items.map((item) => (
        <ShelfItem key={searchResultKey(item)}>
          <RequestableCard
            item={item}
            requested={requested[searchResultKey(item)]}
            onRequest={onRequest}
            returnTo="/discover"
          />
        </ShelfItem>
      ))}
    </Shelf>
  );
}

export default function Discover() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelves, setShelves] = useState<BrowseShelf[]>([]);
  const [requested, setRequested] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [trendingMovies, trendingTV, popularMovies, popularTV] = await Promise.all([
          api.discoverBrowse('trending', 'movie'),
          api.discoverBrowse('trending', 'tv'),
          api.discoverBrowse('popular', 'movie'),
          api.discoverBrowse('popular', 'tv'),
        ]);
        if (cancelled) return;
        setShelves([
          { title: 'Trending movies', items: trendingMovies },
          { title: 'Trending TV', items: trendingTV },
          { title: 'Popular movies', items: popularMovies },
          { title: 'Popular TV', items: popularTV },
        ]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load discover lists');
        setShelves([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function request(item: SearchResult) {
    const res = await api.requestTitle({
      tmdbId: item.id,
      title: item.title,
      year: item.year,
      overview: item.overview,
      poster: item.poster,
      mediaType: item.mediaType,
    });
    setRequested((prev) => ({ ...prev, [searchResultKey(item)]: res.status || 'requested' }));
  }

  const hasItems = shelves.some((s) => s.items.length > 0);

  return (
    <div className="space-y-8" data-testid="discover-page">
      <header className="space-y-2">
        <h1
          id="discover-page-heading"
          className="text-2xl font-bold tracking-tight text-[var(--text-primary)]"
        >
          Discover
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Browse trending and popular titles from TMDB, then open a detail page to request something
          new.
        </p>
      </header>

      <AcquisitionSetupBanner />
      <RequestQuotaBanner />

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <>
          <LoadingStatus label="Loading discover" />
          <PosterGridSkeleton count={12} />
        </>
      ) : hasItems ? (
        shelves.map((shelf) => (
          <BrowseShelfRow
            key={shelf.title}
            title={shelf.title}
            items={shelf.items}
            requested={requested}
            onRequest={(item) => void request(item)}
          />
        ))
      ) : !error ? (
        <EmptyState
          icon={Compass}
          title="Nothing to discover"
          message="No discover results right now. Check back later or search for a specific title."
          testId="discover-empty"
        />
      ) : null}
    </div>
  );
}
