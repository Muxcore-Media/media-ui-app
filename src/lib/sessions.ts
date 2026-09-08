export type PlaybackSession = {
  id: string;
  title: string;
  user: string;
  userId: string;
  mediaId: string;
  mediaType: string;
  player: string;
  platform: string;
  device: string;
  state: string;
  paused: boolean;
  transcode: boolean;
  positionSeconds: number;
  durationSeconds: number;
  href: string;
  serverType: string;
  updatedAt: string;
  watched?: boolean;
};

export type SessionsResponse = {
  items: PlaybackSession[];
  total: number;
  available: boolean;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeSessions(raw: Record<string, unknown> | null | undefined): SessionsResponse {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  return {
    available: raw?.available === true,
    total: asNumber(raw?.total),
    items: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        id: String(row.id ?? ''),
        title: String(row.title ?? 'Untitled'),
        user: String(row.user ?? ''),
        userId: String(row.userId ?? row.user_id ?? ''),
        mediaId: String(row.mediaId ?? row.media_id ?? ''),
        mediaType: String(row.mediaType ?? row.media_type ?? ''),
        player: String(row.player ?? ''),
        platform: String(row.platform ?? ''),
        device: String(row.device ?? ''),
        state: String(row.state ?? ''),
        paused: row.paused === true,
        transcode: row.transcode === true,
        positionSeconds: asNumber(row.positionSeconds ?? row.position_seconds),
        durationSeconds: asNumber(row.durationSeconds ?? row.duration_seconds),
        href: String(row.href ?? ''),
        serverType: String(row.serverType ?? row.server_type ?? ''),
        updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
        watched: row.watched === true,
      })),
  };
}

export function sessionProgressLabel(session: PlaybackSession): string {
  if (session.durationSeconds <= 0) return session.paused ? 'Paused' : 'Watching';
  const pct = Math.min(100, Math.round((session.positionSeconds / session.durationSeconds) * 100));
  return session.paused ? `Paused · ${pct}%` : `Watching · ${pct}%`;
}

export function calendarSearchNowBody(item: {
  kind?: string;
  id?: string;
  parent_id?: string;
}): { item_type: string; item_id: string } {
  const kind = item.kind === 'movie' ? 'movie' : 'tv';
  const id = kind === 'tv' ? item.parent_id || item.id || '' : item.id || '';
  return { item_type: kind, item_id: id };
}
