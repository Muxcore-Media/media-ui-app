export type RenamePreviewItem = {
  fileId: string;
  episodeId: string;
  title: string;
  currentPath: string;
  newPath: string;
  newFilename: string;
  changed: boolean;
  quality: string;
};

export type RenamePreview = {
  available: boolean;
  items: RenamePreviewItem[];
};

export type RenameResult = RenamePreview & {
  renamed: number;
  errors: number;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeRenameItem(raw: unknown): RenamePreviewItem {
  const row = asRecord(raw);
  return {
    fileId: String(row.file_id ?? row.fileId ?? ''),
    episodeId: String(row.episode_id ?? row.episodeId ?? ''),
    title: String(row.title ?? ''),
    currentPath: String(row.current_path ?? row.currentPath ?? ''),
    newPath: String(row.new_path ?? row.newPath ?? ''),
    newFilename: String(row.new_filename ?? row.newFilename ?? ''),
    changed: row.changed === true,
    quality: String(row.quality ?? ''),
  };
}

export function normalizeRenamePreview(raw: unknown): RenamePreview {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeRenameItem).filter((row) => row.currentPath || row.newPath),
  };
}

export function normalizeRenameResult(raw: unknown): RenameResult {
  const rec = asRecord(raw);
  const preview = normalizeRenamePreview(raw);
  return {
    ...preview,
    renamed: Number(rec.renamed) || 0,
    errors: Number(rec.errors) || 0,
  };
}

export function renameChangedCount(items: RenamePreviewItem[]): number {
  return items.filter((row) => row.changed).length;
}

export function renameQuery(input: { movieId?: string; tvId?: string; episodeId?: string }): string {
  const q = new URLSearchParams();
  if (input.movieId) q.set('movie_id', input.movieId);
  if (input.tvId) q.set('tv_id', input.tvId);
  if (input.episodeId) q.set('episode_id', input.episodeId);
  return q.toString();
}
