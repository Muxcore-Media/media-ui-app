export type LibraryScanLibrary = {
  library: string;
  available: boolean;
  filesFound: number;
  filesImported: number;
  filesSkipped: number;
};

export type LibraryScanStatus = {
  available: boolean;
  scanner: boolean;
  status: string;
  lastScanAt: string;
  watchDirs: number;
  totalImported: number;
  lastFound: number;
  lastImported: number;
  lastSkipped: number;
  lastError: string;
  libraries: LibraryScanLibrary[];
};

export type LibraryScanResult = {
  type: string;
  filesFound: number;
  filesImported: number;
  filesSkipped: number;
  message: string;
  libraries: LibraryScanLibrary[];
};

export type WatchDir = {
  id: string;
  path: string;
  mediaType: string;
  libraryPath: string;
  enabled: boolean;
  createdAt: string;
};

export type WatchDirsResponse = {
  available: boolean;
  dirs: WatchDir[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeScanLibraries(raw: unknown): LibraryScanLibrary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      library: String(row.library ?? row.name ?? ''),
      available: row.available === true,
      filesFound: asNumber(row.files_found ?? row.filesFound),
      filesImported: asNumber(row.files_imported ?? row.filesImported),
      filesSkipped: asNumber(row.files_skipped ?? row.filesSkipped),
    }))
    .filter((row) => row.library);
}

export function normalizeLibraryScanStatus(raw: unknown): LibraryScanStatus {
  const rec = asRecord(raw);
  return {
    available: rec.available === true,
    scanner: rec.scanner === true,
    status: String(rec.status ?? ''),
    lastScanAt: String(rec.last_scan_at ?? rec.lastScanAt ?? ''),
    watchDirs: asNumber(rec.watch_dirs ?? rec.watchDirs),
    totalImported: asNumber(rec.total_imported ?? rec.totalImported),
    lastFound: asNumber(rec.last_found ?? rec.lastFound),
    lastImported: asNumber(rec.last_imported ?? rec.lastImported),
    lastSkipped: asNumber(rec.last_skipped ?? rec.lastSkipped),
    lastError: String(rec.last_error ?? rec.lastError ?? ''),
    libraries: normalizeScanLibraries(rec.libraries),
  };
}

export function normalizeLibraryScanResult(raw: unknown): LibraryScanResult {
  const rec = asRecord(raw);
  return {
    type: String(rec.type ?? ''),
    filesFound: asNumber(rec.files_found ?? rec.filesFound),
    filesImported: asNumber(rec.files_imported ?? rec.filesImported),
    filesSkipped: asNumber(rec.files_skipped ?? rec.filesSkipped),
    message: String(rec.message ?? ''),
    libraries: normalizeScanLibraries(rec.libraries),
  };
}

export function normalizeWatchDir(raw: unknown): WatchDir {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    path: String(rec.path ?? ''),
    mediaType: String(rec.media_type ?? rec.mediaType ?? ''),
    libraryPath: String(rec.library_path ?? rec.libraryPath ?? ''),
    enabled: rec.enabled !== false,
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeWatchDirs(raw: unknown): WatchDirsResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.dirs) ? rec.dirs : [];
  return {
    available: rec.available === true,
    dirs: rows.map(normalizeWatchDir).filter((row) => row.id || row.path),
  };
}

export function watchDirLabel(dir: WatchDir): string {
  const kind = dir.mediaType || 'both';
  const paused = dir.enabled ? '' : ' · paused';
  return `${dir.path} (${kind})${paused}`;
}

export function libraryScanStatusLabel(status: LibraryScanStatus): string {
  if (!status.available) return 'Scanner not connected';
  if (!status.scanner && status.libraries.some((row) => row.available)) {
    const names = status.libraries.filter((row) => row.available).map((row) => row.library).join(', ');
    return `idle · ${names}`;
  }
  const kind = status.status || 'idle';
  const when = status.lastScanAt ? ` · last ${new Date(status.lastScanAt).toLocaleString()}` : '';
  return `${kind} · imported ${status.totalImported}${when}`;
}
