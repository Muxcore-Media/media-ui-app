export type LibraryRoot = {
  id: string;
  path: string;
  name: string;
  mediaKind: string;
  accessible: boolean;
  freeBytes: number;
  totalBytes: number;
  isDefault: boolean;
};

export type RootsCatalog = {
  available: boolean;
  roots: LibraryRoot[];
};

export type RootBrowseEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

export type RootBrowseListing = {
  available: boolean;
  path: string;
  parent: string;
  entries: RootBrowseEntry[];
};

export type RootProbe = {
  available: boolean;
  path: string;
  accessible: boolean;
  freeBytes: number;
  totalBytes: number;
  error: string;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeRootsCatalog(raw: unknown): RootsCatalog {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.roots) ? rec.roots : [];
  return {
    available: rec.available === true,
    roots: rows.map(normalizeLibraryRoot).filter((row): row is LibraryRoot => Boolean(row)),
  };
}

export function normalizeLibraryRoot(raw: unknown): LibraryRoot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const path = String(row.path ?? '');
  if (!path) return null;
  return {
    id: String(row.id ?? ''),
    path,
    name: String(row.name ?? row.path ?? ''),
    mediaKind: String(row.media_kind ?? row.mediaKind ?? ''),
    accessible: row.accessible !== false,
    freeBytes: asNumber(row.free_bytes ?? row.freeBytes),
    totalBytes: asNumber(row.total_bytes ?? row.totalBytes),
    isDefault: row.is_default === true || row.isDefault === true,
  };
}

export function normalizeRootBrowse(raw: unknown): RootBrowseListing {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.entries) ? rec.entries : [];
  return {
    available: rec.available === true,
    path: String(rec.path ?? ''),
    parent: String(rec.parent ?? ''),
    entries: rows
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map((row) => ({
        name: String(row.name ?? ''),
        path: String(row.path ?? ''),
        isDir: row.is_dir === true || row.isDir === true,
      }))
      .filter((row) => row.path),
  };
}

export type RootPick = {
  available: boolean;
  root: LibraryRoot | null;
  error: string;
};

export function normalizeRootPick(raw: unknown): RootPick {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    available: rec.available === true,
    root: normalizeLibraryRoot(rec.root),
    error: String(rec.error ?? ''),
  };
}

export function normalizeRootProbe(raw: unknown): RootProbe {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    available: rec.available === true,
    path: String(rec.path ?? ''),
    accessible: rec.accessible === true,
    freeBytes: asNumber(rec.free_bytes ?? rec.freeBytes),
    totalBytes: asNumber(rec.total_bytes ?? rec.totalBytes),
    error: String(rec.error ?? ''),
  };
}

export function formatRootBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function rootProbeLabel(probe: RootProbe): string {
  if (!probe.available) {
    return probe.error || 'Could not test this folder.';
  }
  if (!probe.accessible) {
    return probe.error || 'Folder is not accessible.';
  }
  const free = formatRootBytes(probe.freeBytes);
  return free ? `Folder is accessible · ${free} free` : 'Folder is accessible.';
}

export function rootLabel(root: LibraryRoot): string {
  const name = root.name && root.name !== root.path ? root.name : '';
  const suffix = root.isDefault ? ' (default)' : '';
  return name ? `${name} — ${root.path}${suffix}` : `${root.path}${suffix}`;
}

export const ROOT_MEDIA_KINDS = ['movies', 'tv', 'music', 'books', 'audiobooks', 'comics', 'any'] as const;

export function rootWriteBody(input: {
  name?: string;
  mediaKind?: string;
  isDefault?: boolean;
}): Record<string, unknown> {
  return {
    name: input.name,
    media_kind: input.mediaKind,
    is_default: input.isDefault,
  };
}
