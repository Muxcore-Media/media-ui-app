import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { api } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { sessionProgressLabel, type PlaybackSession } from '../lib/sessions';
import { watchSessionEvents } from '../lib/session-events';

export default function Sessions() {
  const [items, setItems] = useState<PlaybackSession[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return api
      .listSessions()
      .then((res) => {
        setItems(res.items);
        setAvailable(res.available);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load sessions');
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const stopEvents = watchSessionEvents(() => {
      if (!cancelled) void refresh();
    });
    const timer = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => {
      cancelled = true;
      stopEvents();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <div className="space-y-6" data-testid="sessions-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Now watching</h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Live household streams from the native player, Jellyfin, and Plex — stop a device the same way the Jellyfin dashboard does.
        </p>
        <Link to="/watch-stats" className="inline-block text-sm font-semibold text-[var(--accent-color)] hover:underline">
          Watch stats
        </Link>
      </header>
      {loading ? (
        <div aria-busy="true">
          <LoadingStatus label="Loading sessions" />
          <ShelfSkeleton count={3} />
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      {!loading && !available ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Playback monitor is not listing sessions right now.
        </p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="Nobody is watching"
          message="Native player sessions appear here while someone in the house is playing a title."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
          {items.map((row) => (
            <li key={row.id || row.title} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text-primary)]">{row.title}</p>
                <p className="truncate text-xs text-[var(--text-tertiary)]">
                  {row.user || 'Household'}
                  {row.player ? ` · ${row.player}` : ''}
                  {row.serverType ? ` · ${row.serverType}` : ''}
                  {row.transcode ? ' · Transcode' : ''}
                  {` · ${sessionProgressLabel(row)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {row.serverType === 'plex' && row.mediaId ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--accent-color)] hover:underline disabled:opacity-50"
                    disabled={opening === row.id}
                    aria-label={`Open ${row.title} in Plex`}
                    onClick={() => {
                      setOpening(row.id);
                      void api
                        .plexPlayURL(row.mediaId)
                        .then((url) => {
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                          else setError('Plex play link is not available');
                        })
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : 'Could not open Plex');
                        })
                        .finally(() => setOpening(null));
                    }}
                  >
                    Open in Plex
                  </button>
                ) : null}
                {row.id ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent-color)] disabled:opacity-50"
                    disabled={stopping === row.id}
                    aria-label={`Stop ${row.title}`}
                    onClick={() => {
                      setStopping(row.id);
                      void api
                        .stopSession(row.id)
                        .then(() => refresh())
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : 'Could not stop session');
                        })
                        .finally(() => setStopping(null));
                    }}
                  >
                    Stop
                  </button>
                ) : null}
                {row.href ? (
                  <Link
                    to={row.href}
                    className="text-sm font-semibold text-[var(--accent-color)] hover:underline"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
