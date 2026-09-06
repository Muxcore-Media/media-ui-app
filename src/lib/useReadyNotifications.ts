import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { detailHrefForRequest } from './acquisition';
import { useToast } from '../components/ui/Toast';
import type { MediaRequest, Movie, TVShow } from '../types';

const STORAGE_KEY = 'media-ui:notified-playable';
const POLL_INTERVAL_MS = 45_000;

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

export function getSeenNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markNotificationSeen(keys: string[]): void {
  try {
    const next = [...new Set([...getSeenNotificationIds(), ...keys])];
    // Cap at 500 entries to prevent unbounded localStorage growth.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-500)));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded).
  }
}

// ---------------------------------------------------------------------------
// Playable-signal helpers
// ---------------------------------------------------------------------------

type ItemMap = Map<string, Movie | TVShow>;

function buildItemMap(movies: Movie[], shows: TVShow[]): ItemMap {
  const map: ItemMap = new Map();
  for (const m of movies) {
    if (m.id) map.set(`movie:${m.id}`, m);
  }
  for (const s of shows) {
    if (s.id) map.set(`tv:${s.id}`, s);
  }
  return map;
}

/**
 * Stable deduplication key for a "ready to watch" notification.
 * Keyed on the linked library item ID (not request ID) so that:
 * - Multiple requests for the same title only generate one toast.
 * - A fresh request after a delete+re-add does generate a new toast.
 */
export function playableKey(req: MediaRequest): string {
  if (req.itemId) return `${req.itemType}:${req.itemId}`;
  if (req.tmdbId) return `${req.itemType}:tmdb:${req.tmdbId}`;
  return `${req.itemType}:${req.title.toLowerCase()}`;
}

/**
 * Returns true when the request's linked library item is playable (`has_file`).
 *
 * The tip request-media status vocabulary (`pending`, `denied`, `watchlisted`,
 * `requested`, `added`, `workflow`) does NOT contain a reliable "playable"
 * status — `added` means "in library row" but fulfillment automation is still
 * async.  The only trustworthy playable signal is `has_file: true` on the
 * linked Movie/TVShow record.
 *
 * Music/other item types have no library film entry in the movies/tv feeds; for
 * those we fall back to `status === "available"` (the legacy signal) so they
 * still get a toast if the backend ever emits it.
 */
export function isRequestPlayable(req: MediaRequest, itemMap: ItemMap): boolean {
  if (req.itemId) {
    const key = `${req.itemType}:${req.itemId}`;
    const item = itemMap.get(key);
    if (item !== undefined) return item.has_file;
    // Item not yet in movies/tv feeds (music, comics, etc.): fall through.
  }
  // Fallback for non-movie/tv types or items not yet indexed.
  return req.status.trim().toLowerCase() === 'available';
}

/**
 * Returns the subset of requests that could still become playable.
 * Denied/failed requests are excluded so we never wait or toast for them.
 */
export function watchableRequests(requests: MediaRequest[]): MediaRequest[] {
  const terminal = new Set(['denied', 'failed', 'import_failed']);
  return requests.filter((r) => !terminal.has(r.status.trim().toLowerCase()));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Background-polls the request list + movie/TV feeds to detect when a
 * requested title becomes playable (`has_file === true` on the linked item).
 *
 * Spam controls:
 *  - **Baseline**: on the first successful poll, records all currently-playable
 *    keys.  Items already playable at mount time are never toasted.
 *  - **localStorage seen-list** (`media-ui:notified-playable`): items that have
 *    already been toasted persist across page reloads.  A bulk scan or reload
 *    will not re-emit notifications for items already seen.
 *
 * Visibility-aware: pauses while the tab is hidden, re-polls on tab focus to
 * avoid stale reads after a long background period.
 *
 * Only render this hook when the `request` feature is enabled (caller's
 * responsibility via the capabilities gate in AppRoutes).
 */
export function useReadyNotifications(): void {
  const { addToast } = useToast();
  // Stable ref so the polling closure never captures a stale addToast.
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  });

  const baselineRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;

    async function poll(): Promise<void> {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        scheduleNext();
        return;
      }

      try {
        const [requests, moviesResp, showsResp] = await Promise.all([
          api.listRequests(),
          api.listMovies(1, 500),
          api.listTVShows(1, 500),
        ]);
        if (cancelled) return;

        const itemMap = buildItemMap(moviesResp.items, showsResp.items);
        const candidates = watchableRequests(requests);

        const nowPlayable = new Set<string>(
          candidates.filter((r) => isRequestPlayable(r, itemMap)).map(playableKey),
        );

        if (baselineRef.current === null) {
          // First successful poll — establish baseline, do not toast.
          baselineRef.current = nowPlayable;
          scheduleNext();
          return;
        }

        const seen = getSeenNotificationIds();
        const newlyPlayable = [...nowPlayable].filter(
          (k) => !baselineRef.current!.has(k) && !seen.has(k),
        );

        if (newlyPlayable.length > 0) {
          markNotificationSeen(newlyPlayable);
          for (const key of newlyPlayable) {
            const req = candidates.find((r) => playableKey(r) === key);
            if (!req) continue;
            const href = detailHrefForRequest(req);
            addToastRef.current({
              title: `${req.title} is ready to watch`,
              body: req.year ? String(req.year) : undefined,
              variant: 'success',
              href: href ?? '/requests',
              actionLabel: href ? 'Watch Now' : 'View Requests',
            });
          }
        }
      } catch {
        // Polling errors are silent — they shouldn't surface as UI errors.
      }

      scheduleNext();
    }

    function scheduleNext(): void {
      if (!cancelled) {
        timerId = setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    }

    void poll();

    function onVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerId);
        void poll();
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, []); // intentionally empty — runs once on mount
}
