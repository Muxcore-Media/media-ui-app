import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Play, Trash2, X } from 'lucide-react';
import { api, friendlyFetchError } from '../api/client';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { LoadingStatus } from '../components/ui/LoadingStatus';
import { Badge } from '../components/ui/Badge';
import {
  isActiveRequestStatus,
  requestDisplayDetail,
  requestDisplayLabel,
  requestStatusTone,
} from '../lib/acquisition';
import {
  clearQueue,
  continueWatching,
  dequeue,
  listFavorites,
  listQueue,
  type QueueItem,
} from '../lib/userdata';
import { buildProgressPlayerHref, withPlayerContentRating } from '../lib/playHref';
import {
  applyUserdataParentalFilter,
  expandLibraryRatingsForUserdata,
  getParentalState,
} from '../lib/parental';
import type { MediaRequest } from '../types';

function attentionHint(status: string): string | null {
  switch (status.trim().toLowerCase()) {
    case 'import_failed':
      return 'Download finished but could not be added to your library yet.';
    case 'failed':
      return 'The grab did not complete successfully.';
    case 'stalled':
      return 'Download is stuck and may need attention.';
    case 'denied':
      return 'This request was not approved.';
    default:
      return null;
  }
}

function queueItemRequestKey(item: QueueItem): string | null {
  if (item.kind === 'tv') return `tv:${item.id}`;
  if (item.kind === 'movie') return `movie:${item.id}`;
  return null;
}

function queuePlayHref(item: QueueItem & { content_rating?: string }): string {
  return (
    buildProgressPlayerHref(item) ||
    withPlayerContentRating(item.href, item.content_rating) ||
    item.href
  );
}

function buildActiveRequestMap(requests: MediaRequest[]): Map<string, MediaRequest> {
  const map = new Map<string, MediaRequest>();
  for (const req of requests) {
    if (!isActiveRequestStatus(req.status) || !req.itemId) continue;
    const key = req.itemType === 'tv' ? `tv:${req.itemId}` : `movie:${req.itemId}`;
    const existing = map.get(key);
    if (!existing || req.updatedAt > existing.updatedAt) map.set(key, req);
  }
  return map;
}

/** Jellyfin-style play queue with durable userdata + resume/favorites seed. */
export default function Queue() {
  const [queue, setQueue] = useState(() => listQueue());
  const [requests, setRequests] = useState<MediaRequest[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [joinMovies, setJoinMovies] = useState<Array<{ id: string; content_rating?: string }>>(
    [],
  );
  const [joinShows, setJoinShows] = useState<Array<{ id: string; content_rating?: string }>>([]);
  const [joinReady, setJoinReady] = useState(() => !getParentalState().anyRestriction);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listRequests();
        if (!cancelled) {
          setRequests(list);
          setRequestError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setRequests([]);
          setRequestError(friendlyFetchError(err, 'Failed to load request status'));
        }
      }

      const progressRaw = continueWatching(20);
      const favRaw = listFavorites().slice(0, 20);
      const queued = listQueue();
      let ratingMovies: Array<{ id: string; content_rating?: string }> = [];
      let ratingShows: Array<{ id: string; content_rating?: string }> = [];
      try {
        const [movies, shows] = await Promise.all([
          api.listMovies(1, 24),
          api.listTVShows(1, 24),
        ]);
        if (cancelled) return;
        const expanded = await expandLibraryRatingsForUserdata(
          [...progressRaw, ...favRaw, ...queued],
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
        // Soft-fail open: join with empty library (unknown ratings stay visible).
      }
      if (cancelled) return;
      setJoinMovies(ratingMovies);
      setJoinShows(ratingShows);
      setJoinReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeRequests = useMemo(() => buildActiveRequestMap(requests), [requests]);

  const seeded = useMemo(() => {
    if (!joinReady) return { fromProgress: [] as QueueItem[], fromFav: [] as QueueItem[] };
    const fromProgress = applyUserdataParentalFilter(
      continueWatching(20),
      joinMovies,
      joinShows,
    ).map(
      (p): QueueItem => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        href: queuePlayHref(p),
        stream_url: p.stream_url,
        poster_url: p.poster_url,
      }),
    );
    const fromFav = applyUserdataParentalFilter(listFavorites().slice(0, 20), joinMovies, joinShows).map(
      (f): QueueItem => ({
        id: f.id,
        kind: f.kind,
        title: f.title,
        href: withPlayerContentRating(f.href, f.content_rating) || f.href,
        poster_url: f.poster_url,
      }),
    );
    return { fromProgress, fromFav };
  }, [joinMovies, joinShows, joinReady]);

  const visibleQueue = useMemo(() => {
    if (!joinReady) return [];
    return applyUserdataParentalFilter(queue, joinMovies, joinShows).map((item) => ({
      ...item,
      href: queuePlayHref(item),
    }));
  }, [queue, joinMovies, joinShows, joinReady]);

  const display = queue.length > 0 ? visibleQueue : [...seeded.fromProgress, ...seeded.fromFav];
  const showingSuggestions = queue.length === 0 && display.length > 0;
  const listLabel = showingSuggestions
    ? 'Suggested picks from continue watching and favorites'
    : 'Playback queue';

  function remove(id: string) {
    dequeue(id);
    setQueue(listQueue());
  }

  function clear() {
    clearQueue();
    setQueue([]);
  }

  return (
    <div className="space-y-6" data-testid="queue-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Queue</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            What you&apos;re watching next. When empty, we&apos;ll suggest picks from continue
            watching and favorites.
          </p>
        </div>
        {queue.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--danger-color)] hover:underline"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear queue
          </button>
        )}
      </div>
      {requestError && <ErrorBanner message={requestError} testId="queue-request-error" />}
      {!joinReady ? (
        <LoadingStatus label="Loading queue" />
      ) : display.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Queue empty"
          message="Play something, add to queue from a detail page, or add favorites."
          testId="queue-empty"
          action={
            <Link
              to="/search"
              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              Search
            </Link>
          }
        />
      ) : (
        <section className="space-y-3" aria-labelledby="queue-list-heading">
          <h2 id="queue-list-heading" className="text-lg font-semibold text-[var(--text-primary)]">
            {showingSuggestions ? 'Suggested picks' : 'Playback queue'}
          </h2>
          {showingSuggestions ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Suggested from continue watching and favorites while your queue is empty.
            </p>
          ) : null}
          <ol
            aria-label={listLabel}
            className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          >
            {display.map((item, i) => {
              const itemKey = queueItemRequestKey(item);
              const request = itemKey ? activeRequests.get(itemKey) : undefined;
              const statusDetail = request
                ? (requestDisplayDetail(request) ?? attentionHint(request.status))
                : null;

              return (
                <li
                  key={`${item.id}-${i}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated-2)]">
                    {item.poster_url ? (
                      <img src={item.poster_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      <span className="mr-2 text-[var(--text-tertiary)]">{i + 1}.</span>
                      <Link
                        to={item.href}
                        className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)]"
                      >
                        {item.title}
                      </Link>
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {item.kind === 'tv' ? 'TV Show' : 'Movie'}
                    </p>
                    {request ? (
                      <div className="mt-1 space-y-1">
                        <Badge tone={requestStatusTone(request.status)}>
                          {requestDisplayLabel(request)}
                        </Badge>
                        {statusDetail ? (
                          <p className="text-xs leading-snug text-[var(--text-secondary)]">
                            {statusDetail}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={item.href}
                      aria-label={`Play ${item.title}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-text)] transition hover:bg-[var(--bg-elevated-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-color)]"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    </Link>
                    {queue.some((q) => q.id === item.id) && (
                      <button
                        type="button"
                        aria-label={`Remove ${item.title} from queue`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]"
                        onClick={() => remove(item.id)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
