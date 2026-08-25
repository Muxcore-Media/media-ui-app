import { Bookmark } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, searchResultKey } from '../api/client';
import RequestableCard from '../components/search/RequestableCard';
import { PosterGridSkeleton } from '../components/media/PosterGrid';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import type { SearchResult } from '../types';

export default function Watchlist() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchResult[]>([]);
  const [requested, setRequested] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const rows = await api.watchlist();
        if (cancelled) return;
        setItems(rows);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load watchlist');
        setItems([]);
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

  return (
    <div className="space-y-8" data-testid="watchlist-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Watchlist</h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Titles synced from your external lists (Trakt, Plex, Jellyfin, and other list-sync
          sources).
        </p>
      </header>

      {error ? <ErrorBanner message={error} /> : null}

      <section className="space-y-4" aria-labelledby="watchlist-items-heading">
        <h2
          id="watchlist-items-heading"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Synced titles
        </h2>
        {loading ? (
          <>
            <LoadingStatus label="Loading watchlist" />
            <PosterGridSkeleton count={12} />
          </>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <RequestableCard
                key={searchResultKey(item)}
                item={item}
                requested={requested[searchResultKey(item)]}
                onRequest={(row) => void request(row)}
                returnTo="/watchlist"
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No watchlist items"
            message="Add import-list sources in admin and sync watchlist actions to see titles here."
            testId="watchlist-empty"
          />
        )}
      </section>
    </div>
  );
}
