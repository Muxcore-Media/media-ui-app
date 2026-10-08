/**
 * Session-lifetime memory of which entry points the BFF refused with
 * `403 parental.restricted_route` (ADR-0031 C-DENY routes).
 *
 * This only decides what to *hide*: a link that the server already told us leads to a
 * "not available for restricted accounts" dead end. It grants nothing, it is never read to
 * allow anything, and it is not persisted (a reload or new sign-in starts empty, so the
 * server is asked again). Same external-store shape as `session.ts`.
 */

import { useSyncExternalStore } from 'react';
import type { ParentalCode } from '../api/errors';

/** BFF API path prefix -> SPA entry-point paths that only lead to that API. */
const ENTRY_POINTS_BY_API: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['/api/search', ['/search']],
  ['/api/discover', ['/discover']],
  ['/api/watchlist', ['/watchlist']],
  ['/api/request', ['/requests']],
  ['/api/requests', ['/requests']],
  ['/api/livetv', ['/livetv']],
  ['/api/music', ['/music']],
  ['/api/books', ['/books']],
  ['/api/comics', ['/comics']],
  ['/api/audiobooks', ['/audiobooks']],
  ['/api/activity', ['/activity']],
  ['/api/blocklist', ['/blocklist']],
  ['/api/calendar', ['/upcoming']],
  ['/api/missing', ['/missing']],
  ['/api/sessions', ['/sessions']],
  ['/api/watch-stats', ['/watch-stats']],
  ['/api/media-issues', ['/issues']],
];

const EMPTY: ReadonlySet<string> = Object.freeze(new Set<string>()) as ReadonlySet<string>;
let hidden: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();

function apiPathname(path: string): string {
  const cut = path.search(/[?#]/);
  return cut === -1 ? path : path.slice(0, cut);
}

/** Remember a restricted-route refusal for `apiPath`. Other codes are ignored. */
export function recordRestrictedRoute(apiPath: string, code: ParentalCode): void {
  if (code !== 'parental.restricted_route') return;
  const pathname = apiPathname(apiPath);
  const next = new Set(hidden);
  for (const [prefix, entryPoints] of ENTRY_POINTS_BY_API) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      for (const entry of entryPoints) next.add(entry);
    }
  }
  if (next.size === hidden.size) return;
  hidden = next;
  for (const listener of listeners) listener();
}

export function getRestrictedEntryPoints(): ReadonlySet<string> {
  return hidden;
}

/** Test helper and sign-out hook: forget everything. */
export function resetRestrictedRoutes(): void {
  if (hidden.size === 0) return;
  hidden = EMPTY;
  for (const listener of listeners) listener();
}

export function subscribeRestrictedRoutes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Entry-point paths (for example `/search`) the server has refused for this account. */
export function useRestrictedEntryPoints(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeRestrictedRoutes, getRestrictedEntryPoints, getRestrictedEntryPoints);
}

/** True when `to` (a nav path, hash allowed) is a remembered restricted entry point. */
export function isRestrictedEntryPoint(hiddenSet: ReadonlySet<string>, to: string): boolean {
  return hiddenSet.has(apiPathname(to));
}
