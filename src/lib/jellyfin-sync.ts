export type JellyfinStatus = {
  available: boolean;
  configured: boolean;
  baseUrl: string;
  conflictMode: string;
  itemLinks: number;
  sessionsPollEnabled: boolean;
  userdataSync: boolean;
  sseConnected: boolean;
  error: string;
};

export type JellyfinSyncResult = {
  available: boolean;
  direction: string;
  dryRun: boolean;
  scanned: number;
  matched: number;
  upserted: number;
  removed: number;
  errors: string[];
};

export type JellyfinRefreshResult = {
  ok: boolean;
  itemId: string;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeJellyfinStatus(raw: Record<string, unknown> | null | undefined): JellyfinStatus {
  return {
    available: raw?.available === true,
    configured: raw?.configured === true,
    baseUrl: String(raw?.baseUrl ?? raw?.base_url ?? ''),
    conflictMode: String(raw?.conflictMode ?? raw?.conflict_mode ?? ''),
    itemLinks: asNumber(raw?.itemLinks ?? raw?.item_links),
    sessionsPollEnabled: raw?.sessionsPollEnabled === true || raw?.sessions_poll_enabled === true,
    userdataSync: raw?.userdataSync === true || raw?.userdata_sync === true,
    sseConnected: raw?.sseConnected === true || raw?.sse_connected === true,
    error: String(raw?.error ?? ''),
  };
}

export function normalizeJellyfinSync(raw: Record<string, unknown> | null | undefined): JellyfinSyncResult {
  const errors = Array.isArray(raw?.errors)
    ? raw.errors.filter((row): row is string => typeof row === 'string' && row.trim() !== '')
    : [];
  return {
    available: raw?.available === true,
    direction: String(raw?.direction ?? 'both'),
    dryRun: raw?.dryRun === true || raw?.dry_run === true,
    scanned: asNumber(raw?.scanned),
    matched: asNumber(raw?.matched),
    upserted: asNumber(raw?.upserted),
    removed: asNumber(raw?.removed),
    errors,
  };
}

export function normalizeJellyfinRefresh(raw: Record<string, unknown> | null | undefined): JellyfinRefreshResult {
  return {
    ok: raw?.ok === true,
    itemId: String(raw?.itemId ?? raw?.item_id ?? ''),
  };
}

export function jellyfinStatusLabel(status: JellyfinStatus): string {
  if (!status.available) return status.error || 'Jellyfin bridge is not connected';
  if (!status.configured) return 'Jellyfin is not configured';
  const host = status.baseUrl || 'configured';
  const links = status.itemLinks === 1 ? '1 item link' : `${status.itemLinks} item links`;
  const mode = status.conflictMode ? ` · ${status.conflictMode}` : '';
  return `${host} · ${links}${mode}`;
}

export function jellyfinSyncLabel(result: JellyfinSyncResult): string {
  const prefix = result.dryRun ? 'Dry run' : 'Synced';
  return `${prefix}: scanned ${result.scanned}, matched ${result.matched}, upserted ${result.upserted}, removed ${result.removed}`;
}
