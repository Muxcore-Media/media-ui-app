/**
 * Polls /api/requests and fires in-app toasts when a user-requested title transitions
 * to "available" status (umbrella#78). Scoped only to the user's own request list
 * — not triggered by bulk library scans.
 *
 * Spam prevention:
 *  - First poll establishes a baseline; already-available items are silently marked seen.
 *  - Seen request IDs persist in localStorage so a page reload never re-fires.
 *  - Respects `prefs.notifications.downloadReady` toggle (default on).
 *  - Only polls when the document is visible.
 */
import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { detailHrefForRequest } from './acquisition';
import { getPreferences } from './userdata';
import { useToast } from '../components/ui/Toast';
import type { MediaRequest } from '../types';

const POLL_INTERVAL_MS = 30_000;
const SEEN_KEY = 'muxcore.notifications.seen.v1';
const MAX_SEEN_ENTRIES = 500;

// ── seen-id helpers (localStorage) ──────────────────────────────────────────

export function getSeenNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markNotificationSeen(id: string): void {
  const seen = getSeenNotificationIds();
  seen.add(id);
  const arr = Array.from(seen).slice(-MAX_SEEN_ENTRIES);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    /* storage full — silently skip */
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useReadyNotifications(): void {
  const { addToast } = useToast();
  // Stable ref so the polling closure never captures a stale addToast
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  });

  useEffect(() => {
    /** id → last-known status */
    const lastStatus = new Map<string, string>();
    let isFirstPoll = true;
    let aborted = false;

    async function poll(): Promise<void> {
      if (aborted || document.visibilityState === 'hidden') return;

      const prefs = getPreferences();
      if (!prefs.notifications.downloadReady) return;

      let requests: MediaRequest[];
      try {
        requests = await api.listRequests();
      } catch {
        return;
      }
      if (aborted) return;

      const seen = getSeenNotificationIds();

      for (const req of requests) {
        const prevStatus = lastStatus.get(req.id);
        const nowAvailable = req.status.trim().toLowerCase() === 'available';

        if (isFirstPoll) {
          // Baseline: mark pre-existing available items as seen so reloads are silent.
          if (nowAvailable) markNotificationSeen(req.id);
          lastStatus.set(req.id, req.status);
          continue;
        }

        // Only fire when: not already notified AND just transitioned to available.
        if (!seen.has(req.id) && nowAvailable && prevStatus !== req.status) {
          markNotificationSeen(req.id);
          const detailHref = detailHrefForRequest(req);
          addToastRef.current({
            title: `${req.title} is ready to watch`,
            body: req.year ? String(req.year) : undefined,
            variant: 'success',
            href: detailHref ?? '/requests',
            actionLabel: detailHref ? 'Watch Now' : 'View Requests',
          });
        }
        lastStatus.set(req.id, req.status);
      }

      isFirstPoll = false;
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === 'visible') void poll();
    }

    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      aborted = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []); // intentionally empty — runs once on mount
}
