import type { MediaKind, ProgressEntry } from './userdata';
import { normalizeSessions, type PlaybackSession, type SessionsResponse } from './sessions';

export type WatchHistoryResponse = SessionsResponse;

export function normalizeWatchHistory(raw: Record<string, unknown> | null | undefined): WatchHistoryResponse {
  const res = normalizeSessions(raw);
  return {
    ...res,
    items: res.items.map((row) => ({
      ...row,
      watched: row.watched === true || historyWatched(row.positionSeconds, row.durationSeconds),
    })),
  };
}

export function historyWatched(positionSeconds: number, durationSeconds: number): boolean {
  if (!(durationSeconds > 0)) return false;
  if (positionSeconds / durationSeconds >= 0.9) return true;
  return durationSeconds - positionSeconds <= 60;
}

export function sessionToProgress(session: PlaybackSession & { watched?: boolean }): ProgressEntry | null {
  const id = session.mediaId || session.id;
  if (!id || !session.href) return null;
  const kind: MediaKind =
    session.mediaType === 'movie' || session.mediaType === 'movies' ? 'movie' : 'episode';
  return {
    id,
    kind,
    title: session.title || 'Untitled',
    href: session.href,
    positionSec: session.positionSeconds,
    durationSec: session.durationSeconds,
    updatedAt: session.updatedAt,
    watched: session.watched === true || historyWatched(session.positionSeconds, session.durationSeconds),
  };
}

export function mergeWatchProgress(local: ProgressEntry[], remote: ProgressEntry[]): ProgressEntry[] {
  const byId = new Map<string, ProgressEntry>();
  for (const row of [...local, ...remote]) {
    if (!row?.id) continue;
    const prev = byId.get(row.id);
    if (!prev || Date.parse(row.updatedAt || '') >= Date.parse(prev.updatedAt || '')) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
}

export function inProgressOnly(rows: ProgressEntry[]): ProgressEntry[] {
  return rows.filter(
    (p) =>
      !p.watched &&
      p.positionSec > 5 &&
      (p.durationSec === 0 || p.positionSec / p.durationSec < 0.92),
  );
}

export function watchedOnly(rows: ProgressEntry[]): ProgressEntry[] {
  return rows.filter((p) => p.watched);
}

export function progressFromMonitor(res: WatchHistoryResponse): ProgressEntry[] {
  if (!res.available) return [];
  return res.items.map(sessionToProgress).filter((row): row is ProgressEntry => row != null);
}

/** Live Now watching rows — include just-started plays that history has not stopped yet. */
export function inProgressSessions(res: SessionsResponse): ProgressEntry[] {
  if (!res.available) return [];
  return res.items
    .filter((s) => s.state !== 'stopped' && !historyWatched(s.positionSeconds, s.durationSeconds))
    .map(sessionToProgress)
    .filter((row): row is ProgressEntry => row != null)
    .map((row) => ({ ...row, watched: false }));
}
