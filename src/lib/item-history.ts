export type HistoryEventType = 'grab' | 'import' | 'delete_item' | 'delete_file' | string;

export type ItemHistoryEntry = {
  id: string;
  eventType: HistoryEventType;
  itemId: string;
  title: string;
  sourceTitle: string;
  quality: string;
  indexer: string;
  filePath: string;
  downloadId: string;
  createdAt: string;
};

export type ItemHistoryResponse = {
  available: boolean;
  items: ItemHistoryEntry[];
  total: number;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeItemHistoryEntry(raw: unknown): ItemHistoryEntry {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    eventType: String(rec.event_type ?? rec.eventType ?? ''),
    itemId: String(rec.item_id ?? rec.itemId ?? ''),
    title: String(rec.title ?? ''),
    sourceTitle: String(rec.source_title ?? rec.sourceTitle ?? ''),
    quality: String(rec.quality ?? ''),
    indexer: String(rec.indexer ?? ''),
    filePath: String(rec.file_path ?? rec.filePath ?? ''),
    downloadId: String(rec.download_id ?? rec.downloadId ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeItemHistory(raw: unknown): ItemHistoryResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeItemHistoryEntry).filter((row) => row.id || row.eventType),
    total: asNumber(rec.total),
  };
}

export function historyPath(kind: 'movie' | 'tv', id: string): string {
  const root = kind === 'tv' ? '/api/tv' : '/api/movies';
  return `${root}/${encodeURIComponent(id)}/history`;
}

export function historyEventLabel(event: HistoryEventType): string {
  switch (event) {
    case 'grab':
      return 'Grabbed';
    case 'import':
      return 'Imported';
    case 'delete_item':
      return 'Removed';
    case 'delete_file':
      return 'Deleted file';
    default:
      return event || 'Event';
  }
}
