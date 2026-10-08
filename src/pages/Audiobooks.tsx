import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Pause, Play } from 'lucide-react';
import { api } from '../api/client';
import { AddAudiobookField } from '../components/media/AddAudiobookField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { ShelfSkeleton } from '../components/ui/Skeleton';
import { audiobookFromRow, audiobookHref, audiobookQueue } from '../lib/audiobookPlayback';
import { useNowPlaying } from '../lib/nowPlaying';
import type { Audiobook } from '../types';

export default function Audiobooks() {
  const listHeadingId = useId();
  const [items, setItems] = useState<Audiobook[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [comingSoon, setComingSoon] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nowPlaying = useNowPlaying();
  const playingId = nowPlaying.playing ? nowPlaying.track?.id ?? null : null;

  async function loadLibrary(cancelled?: () => boolean) {
    const list = await api.listAudiobooks();
    if (cancelled?.()) return;
    setItems(list.items.map(audiobookFromRow));
    setAvailable(list.available !== false);
    setComingSoon(Boolean(list.coming_soon) || list.available === false);
    setMessage(list.message || null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadLibrary(() => cancelled);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load library');
          setItems([]);
          setAvailable(false);
          setComingSoon(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6" data-testid="audiobooks-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Audiobooks</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Listen to audiobooks from your library.
        </p>
      </div>

      {error ? <ErrorBanner message={error} testId="library-error" /> : null}
      {!loading && available && !comingSoon ? (
        <AddAudiobookField
          onAdd={async ({ author, title, year }) => {
            await api.addAudiobook({ author, title, year });
            await loadLibrary();
          }}
        />
      ) : null}

      {loading ? (
        <div aria-busy="true" data-testid="library-loading">
          <LoadingStatus label="Loading audiobooks" />
          <ShelfSkeleton count={4} />
        </div>
      ) : error ? null : comingSoon || !available ? (
        <div
          className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-14 text-center"
          data-testid="library-coming-soon"
          role="status"
        >
          <Headphones className="h-7 w-7 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="font-semibold text-[var(--text-primary)]">Coming soon</p>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            {message || "Audiobooks isn't available yet. Check back soon."}
          </p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Headphones}
          message="Add an audiobook or scan your library to get started."
          testId="library-empty"
        />
      ) : (
        <section className="space-y-3" aria-labelledby={listHeadingId}>
          <h2 id={listHeadingId} className="sr-only">
            Audiobooks library
          </h2>
          <ul
            className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
            data-testid="library-list"
            aria-label="Audiobooks items"
          >
            {items.map((ab) => {
              const href = audiobookHref(ab.id);
              const queue = audiobookQueue(ab, href);
              const first = queue[0];
              const isPlaying = Boolean(first && playingId === first.id);
              return (
                <li
                  key={ab.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]"
                >
                  <div className="min-w-0">
                    <Link
                      to={href}
                      className="truncate font-medium text-[var(--accent-text)] hover:underline"
                    >
                      {ab.title}
                    </Link>
                    {ab.narrator || ab.asin ? (
                      <p className="truncate text-xs text-[var(--text-tertiary)]">
                        {[ab.narrator, ab.asin].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {ab.year ? (
                      <Badge tone="neutral" className="shrink-0">
                        {ab.year}
                      </Badge>
                    ) : null}
                    {first ? (
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-text)] transition hover:bg-[var(--bg-elevated-2)]"
                        aria-label={isPlaying ? `Pause ${ab.title}` : `Play ${ab.title}`}
                        aria-pressed={isPlaying}
                        onClick={() => nowPlaying.toggle(first, queue)}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                        ) : (
                          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">Unavailable</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
