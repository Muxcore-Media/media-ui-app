export const LIST_SOURCE_TYPES = ['trakt', 'imdb', 'plex', 'jellyfin', 'radarr', 'sonarr'] as const;

export type ListSourceType = (typeof LIST_SOURCE_TYPES)[number];

export type ListSource = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  username: string;
  clientId: string;
  listUrl: string;
  syncIntervalMinutes: number;
  lastSynced: string;
  baseUrl: string;
  qualityProfileId: string;
  rootFolderPath: string;
  hasApiKey: boolean;
};

export type ListSourcesResponse = {
  available: boolean;
  sources: ListSource[];
};

export type ListSyncLog = {
  id: string;
  sourceId: string;
  sourceName: string;
  status: string;
  itemsFound: number;
  itemsNew: number;
  error: string;
  startedAt: string;
  completedAt: string;
};

export type ListSyncHistoryResponse = {
  available: boolean;
  entries: ListSyncLog[];
  total: number;
};

export type ListSyncItem = {
  id: string;
  sourceId: string;
  title: string;
  year: number;
  mediaType: string;
  status: string;
  action: string;
  tmdbId: number;
  imdbId: string;
  matchedItemId: string;
};

export type ListSyncItemsResponse = {
  available: boolean;
  items: ListSyncItem[];
  total: number;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeListSource(raw: unknown): ListSource {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    type: String(rec.type ?? ''),
    enabled: rec.enabled !== false,
    username: String(rec.username ?? ''),
    clientId: String(rec.client_id ?? rec.clientId ?? ''),
    listUrl: String(rec.list_url ?? rec.listUrl ?? ''),
    syncIntervalMinutes: Number(rec.sync_interval_minutes ?? rec.syncIntervalMinutes) || 0,
    lastSynced: String(rec.last_synced ?? rec.lastSynced ?? ''),
    baseUrl: String(rec.base_url ?? rec.baseUrl ?? ''),
    qualityProfileId: String(rec.quality_profile_id ?? rec.qualityProfileId ?? ''),
    rootFolderPath: String(rec.root_folder_path ?? rec.rootFolderPath ?? ''),
    hasApiKey: rec.has_api_key === true || rec.hasApiKey === true,
  };
}

export function normalizeListSources(raw: unknown): ListSourcesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.sources) ? rec.sources : [];
  return {
    available: rec.available === true,
    sources: rows.map(normalizeListSource).filter((row) => row.id || row.name),
  };
}

export function listSourceLabel(src: ListSource): string {
  const kind = src.type || 'list';
  const paused = src.enabled ? '' : ' · paused';
  return `${src.name || 'Untitled'} (${kind})${paused}`;
}

export function normalizeListSyncLog(raw: unknown): ListSyncLog {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    sourceId: String(rec.source_id ?? rec.sourceId ?? ''),
    sourceName: String(rec.source_name ?? rec.sourceName ?? ''),
    status: String(rec.status ?? ''),
    itemsFound: Number(rec.items_found ?? rec.itemsFound) || 0,
    itemsNew: Number(rec.items_new ?? rec.itemsNew) || 0,
    error: String(rec.error ?? ''),
    startedAt: String(rec.started_at ?? rec.startedAt ?? ''),
    completedAt: String(rec.completed_at ?? rec.completedAt ?? ''),
  };
}

export function normalizeListSyncHistory(raw: unknown): ListSyncHistoryResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.entries) ? rec.entries : [];
  return {
    available: rec.available === true,
    entries: rows.map(normalizeListSyncLog).filter((row) => row.id || row.sourceName),
    total: Number(rec.total) || 0,
  };
}

export function normalizeListSyncItem(raw: unknown): ListSyncItem {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    sourceId: String(rec.source_id ?? rec.sourceId ?? ''),
    title: String(rec.title ?? ''),
    year: Number(rec.year) || 0,
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    status: String(rec.status ?? ''),
    action: String(rec.action ?? ''),
    tmdbId: Number(rec.tmdb_id ?? rec.tmdbId) || 0,
    imdbId: String(rec.imdb_id ?? rec.imdbId ?? ''),
    matchedItemId: String(rec.matched_item_id ?? rec.matchedItemId ?? ''),
  };
}

export function normalizeListSyncItems(raw: unknown): ListSyncItemsResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeListSyncItem).filter((row) => row.id || row.title),
    total: Number(rec.total) || 0,
  };
}

export function listSyncLogLabel(entry: ListSyncLog): string {
  const name = entry.sourceName || 'List';
  const status = entry.status || 'unknown';
  return `${name}: ${entry.itemsNew} new of ${entry.itemsFound} (${status})`;
}

export function listSyncItemLabel(item: ListSyncItem): string {
  const year = item.year ? ` (${item.year})` : '';
  const kind = item.mediaType ? ` · ${item.mediaType}` : '';
  const status = item.status ? ` · ${item.status}` : '';
  return `${item.title || 'Untitled'}${year}${kind}${status}`;
}

export function listSourceWriteBody(input: {
  name: string;
  type?: string;
  username?: string;
  clientId?: string;
  listUrl?: string;
  syncIntervalMinutes?: number;
  baseUrl?: string;
  apiKey?: string;
  qualityProfileId?: string;
  rootFolderPath?: string;
}): Record<string, unknown> {
  return {
    name: input.name,
    type: input.type,
    username: input.username,
    client_id: input.clientId,
    list_url: input.listUrl,
    sync_interval_minutes: input.syncIntervalMinutes,
    base_url: input.baseUrl,
    api_key: input.apiKey,
    quality_profile_id: input.qualityProfileId,
    root_folder_path: input.rootFolderPath,
  };
}

export function listSourceUpdateBody(input: {
  enabled?: boolean;
  name?: string;
  username?: string;
  clientId?: string;
  listUrl?: string;
  syncIntervalMinutes?: number;
  baseUrl?: string;
  apiKey?: string;
  qualityProfileId?: string;
  rootFolderPath?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.enabled !== undefined) body.enabled = input.enabled;
  if (input.name !== undefined) body.name = input.name;
  if (input.username !== undefined) body.username = input.username;
  if (input.clientId !== undefined) body.client_id = input.clientId;
  if (input.listUrl !== undefined) body.list_url = input.listUrl;
  if (input.syncIntervalMinutes !== undefined) body.sync_interval_minutes = input.syncIntervalMinutes;
  if (input.baseUrl !== undefined) body.base_url = input.baseUrl;
  if (input.apiKey !== undefined) body.api_key = input.apiKey;
  if (input.qualityProfileId !== undefined) body.quality_profile_id = input.qualityProfileId;
  if (input.rootFolderPath !== undefined) body.root_folder_path = input.rootFolderPath;
  return body;
}
