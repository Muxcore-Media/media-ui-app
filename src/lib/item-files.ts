export type MovieLibraryFile = {
  id: string;
  filename: string;
  quality: string;
  sizeBytes: number;
  container: string;
  createdAt: string;
};

export type MovieFilesResponse = {
  available: boolean;
  items: MovieLibraryFile[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeMovieFile(raw: unknown): MovieLibraryFile {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    filename: String(rec.filename ?? ''),
    quality: String(rec.quality ?? ''),
    sizeBytes: asNumber(rec.size_bytes ?? rec.sizeBytes),
    container: String(rec.container ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeMovieFiles(raw: unknown): MovieFilesResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.items) ? rec.items : [];
  return {
    available: rec.available === true,
    items: rows.map(normalizeMovieFile).filter((row) => row.id || row.filename),
  };
}

export function movieFileLabel(file: MovieLibraryFile): string {
  const name = file.filename || file.id || 'Movie file';
  const bits = [file.quality, file.container.toUpperCase()].filter(Boolean);
  return bits.length ? `${name} · ${bits.join(' · ')}` : name;
}

export function formatMovieFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const digits = n >= 10 || i === 0 ? 0 : 1;
  return `${n.toFixed(digits)} ${units[i]}`;
}
