export type WatchTogetherRoom = {
  id: string;
  host: string;
  mediaId: string;
  src: string;
  title: string;
  positionSeconds: number;
  playing: boolean;
  updatedAt: string;
  youAreHost: boolean;
  hostToken?: string;
};

const HOST_KEY_PREFIX = 'muxcore.watchTogether.host.';

export function normalizeWatchTogether(raw: Record<string, unknown> = {}): WatchTogetherRoom {
  return {
    id: String(raw.id ?? ''),
    host: String(raw.host ?? ''),
    mediaId: String(raw.mediaId ?? raw.media_id ?? ''),
    src: String(raw.src ?? ''),
    title: String(raw.title ?? ''),
    positionSeconds: Number(raw.positionSeconds ?? raw.position_seconds ?? 0) || 0,
    playing: raw.playing === true,
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ''),
    youAreHost: raw.youAreHost === true || raw.you_are_host === true,
    hostToken: raw.hostToken != null || raw.host_token != null
      ? String(raw.hostToken ?? raw.host_token)
      : undefined,
  };
}

export function watchTogetherHostKey(roomId: string): string {
  return HOST_KEY_PREFIX + roomId.trim();
}

export function storeWatchTogetherHostToken(roomId: string, token: string): void {
  const id = roomId.trim();
  const tok = token.trim();
  if (!id || !tok) return;
  try {
    sessionStorage.setItem(watchTogetherHostKey(id), tok);
  } catch {
    /* private mode */
  }
}

export function readWatchTogetherHostToken(roomId: string): string {
  try {
    return sessionStorage.getItem(watchTogetherHostKey(roomId)) || '';
  } catch {
    return '';
  }
}

export function joinWatchTogetherHref(search: string, roomId: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.set('together', roomId);
  return `/player?${params.toString()}`;
}

/** Guests should snap when they drift more than this many seconds from the host. */
export const WATCH_TOGETHER_FOLLOW_SEC = 1.5;

export function shouldFollowHost(localSec: number, hostSec: number, threshold = WATCH_TOGETHER_FOLLOW_SEC): boolean {
  return Math.abs(localSec - hostSec) > threshold;
}
