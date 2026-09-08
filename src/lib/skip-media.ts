export type SkipMediaItem = {
  id: string;
};

export type SkipMediaResponse = {
  available: boolean;
  items: SkipMediaItem[];
  total: number;
};

export function normalizeSkipMedia(raw: Record<string, unknown> | null | undefined): SkipMediaResponse {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  const items = rows
    .map((row) => {
      if (typeof row === 'string') return { id: row.trim() };
      if (!row || typeof row !== 'object') return { id: '' };
      return { id: String((row as { id?: unknown }).id ?? '').trim() };
    })
    .filter((row) => row.id);
  return {
    available: raw?.available === true,
    items,
    total: items.length,
  };
}
