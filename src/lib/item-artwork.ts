export type ArtworkType = 'poster' | 'background' | 'logo' | 'banner' | 'thumb' | 'still' | string;

export type ItemArtwork = {
  id: string;
  itemId: string;
  type: ArtworkType;
  url: string;
  width: number;
  height: number;
  mimeType: string;
};

export type ItemArtworkResponse = {
  available: boolean;
  items: ItemArtwork[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeItemArtwork(raw: unknown): ItemArtwork {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    itemId: String(rec.item_id ?? rec.itemId ?? ''),
    type: String(rec.type ?? ''),
    url: String(rec.url ?? ''),
    width: asNumber(rec.width),
    height: asNumber(rec.height),
    mimeType: String(rec.mime_type ?? rec.mimeType ?? ''),
  };
}

export function normalizeItemArtworkList(raw: unknown): ItemArtworkResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeItemArtwork).filter((row) => row.id || row.url),
  };
}

export function artworkPath(kind: 'movie' | 'tv' | 'artist' | 'music', id: string): string {
  const root = kind === 'tv' ? '/api/tv' : kind === 'artist' || kind === 'music' ? '/api/music' : '/api/movies';
  return `${root}/${encodeURIComponent(id)}/artwork`;
}

export function replaceArtworkBody(input: {
  type: string;
  filename: string;
  data: string;
}): { type: string; filename: string; data: string } {
  return {
    type: input.type.trim() || 'poster',
    filename: input.filename.trim() || 'artwork.jpg',
    data: input.data,
  };
}

export function artworkTypeLabel(type: ArtworkType): string {
  switch (type) {
    case 'poster':
      return 'Poster';
    case 'background':
      return 'Backdrop';
    case 'logo':
      return 'Logo';
    case 'banner':
      return 'Banner';
    case 'thumb':
      return 'Thumb';
    case 'still':
      return 'Still';
    default:
      return type || 'Artwork';
  }
}
