export type PlexSyncItem = {
  id: string;
  title: string;
  rootTitle: string;
  metadataType: string;
  contentType: string;
  mediaType: string;
  ratingKey: string;
  state: string;
  failure: string;
  itemsCount: number;
  itemsCompleteCount: number;
  itemsDownloadedCount: number;
  totalSizeBytes: number;
  videoResolution: string;
};

export type PlexSyncList = {
  id: string;
  clientIdentifier: string;
  deviceUserId: string;
  deviceName: string;
  devicePlatform: string;
  deviceProduct: string;
  items: PlexSyncItem[];
};

export type PlexSyncListsResponse = {
  available: boolean;
  machineIdentifier: string;
  updatedAt: string;
  lists: PlexSyncList[];
  total: number;
  error: string;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asItems(raw: unknown): PlexSyncItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      id: String(row.id ?? ''),
      title: String(row.title ?? 'Untitled'),
      rootTitle: String(row.rootTitle ?? row.root_title ?? ''),
      metadataType: String(row.metadataType ?? row.metadata_type ?? ''),
      contentType: String(row.contentType ?? row.content_type ?? ''),
      mediaType: String(row.mediaType ?? row.media_type ?? ''),
      ratingKey: String(row.ratingKey ?? row.rating_key ?? ''),
      state: String(row.state ?? ''),
      failure: String(row.failure ?? ''),
      itemsCount: asNumber(row.itemsCount ?? row.items_count),
      itemsCompleteCount: asNumber(row.itemsCompleteCount ?? row.items_complete_count),
      itemsDownloadedCount: asNumber(row.itemsDownloadedCount ?? row.items_downloaded_count),
      totalSizeBytes: asNumber(row.totalSizeBytes ?? row.total_size_bytes),
      videoResolution: String(row.videoResolution ?? row.video_resolution ?? ''),
    }))
    .filter((row) => row.id || row.title);
}

export function normalizePlexSyncLists(raw: Record<string, unknown> | null | undefined): PlexSyncListsResponse {
  const lists = (Array.isArray(raw?.lists) ? raw.lists : [])
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      id: String(row.id ?? ''),
      clientIdentifier: String(row.clientIdentifier ?? row.client_identifier ?? ''),
      deviceUserId: String(row.deviceUserId ?? row.device_user_id ?? ''),
      deviceName: String(row.deviceName ?? row.device_name ?? 'Plex device'),
      devicePlatform: String(row.devicePlatform ?? row.device_platform ?? ''),
      deviceProduct: String(row.deviceProduct ?? row.device_product ?? ''),
      items: asItems(row.items),
    }));
  return {
    available: raw?.available === true,
    machineIdentifier: String(raw?.machineIdentifier ?? raw?.machine_identifier ?? ''),
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? ''),
    lists,
    total: asNumber(raw?.total) || lists.length,
    error: String(raw?.error ?? ''),
  };
}

export function plexSyncListLabel(list: PlexSyncList): string {
  const bits = [list.deviceName];
  if (list.devicePlatform) bits.push(list.devicePlatform);
  const n = list.items.length;
  bits.push(n === 1 ? '1 title' : `${n} titles`);
  return bits.join(' · ');
}

export function plexSyncItemLabel(item: PlexSyncItem): string {
  const bits = [item.state || 'queued'];
  if (item.videoResolution) bits.push(item.videoResolution);
  if (item.failure) bits.push(item.failure);
  return bits.join(' · ');
}
