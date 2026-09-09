export const TAG_MEDIA = ['movie', 'tv', 'music'] as const;

export type TagMedia = (typeof TAG_MEDIA)[number];

export type LibraryTag = {
  id: string;
  label: string;
  media: TagMedia | string;
  createdAt: string;
};

export type TagsResponse = {
  available: boolean;
  tags: LibraryTag[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeLibraryTag(raw: unknown): LibraryTag {
  const rec = asRecord(raw);
  const media = String(rec.media ?? '');
  return {
    id: String(rec.id ?? ''),
    label: String(rec.label ?? rec.name ?? ''),
    media,
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeTags(raw: unknown): TagsResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.tags) ? rec.tags : [];
  return {
    available: rec.available === true,
    tags: rows.map(normalizeLibraryTag).filter((row) => row.id || row.label),
  };
}

export function tagLabel(tag: LibraryTag): string {
  return tag.label || tag.id || 'Untitled';
}

export function tagWriteBody(input: { label: string; media?: string }): Record<string, unknown> {
  return { label: input.label, media: input.media };
}

export function itemTagsPath(kind: 'movie' | 'tv' | 'artist' | 'music' | 'author', id: string): string {
  if (kind === 'tv') {
    return `/api/tv/${encodeURIComponent(id)}/tags`;
  }
  if (kind === 'artist' || kind === 'music') {
    return `/api/music/${encodeURIComponent(id)}/tags`;
  }
  if (kind === 'author') {
    return `/api/books/${encodeURIComponent(id)}/tags`;
  }
  return `/api/movies/${encodeURIComponent(id)}/tags`;
}
