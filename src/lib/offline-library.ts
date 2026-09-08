export type OfflineTitle = {
  id: string;
  title: string;
  kind: string;
  src: string;
  poster?: string;
  href?: string;
  bytes: number;
  savedAt: string;
  status: 'ready' | 'downloading' | 'error';
  error?: string;
};

export const OFFLINE_CACHE = 'muxcore-offline-v1';
export const OFFLINE_MANIFEST_KEY = 'muxcore.offline.v1';

export function offlineCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

function readManifest(): Record<string, OfflineTitle> {
  try {
    const raw = localStorage.getItem(OFFLINE_MANIFEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, OfflineTitle>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeManifest(map: Record<string, OfflineTitle>): void {
  localStorage.setItem(OFFLINE_MANIFEST_KEY, JSON.stringify(map));
}

export function listOfflineTitles(): OfflineTitle[] {
  return Object.values(readManifest()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getOfflineTitle(id: string): OfflineTitle | null {
  return readManifest()[id] || null;
}

export function upsertOfflineTitle(row: OfflineTitle): OfflineTitle {
  const map = readManifest();
  map[row.id] = row;
  writeManifest(map);
  return row;
}

export async function openOfflineCache(): Promise<Cache | null> {
  if (!offlineCacheAvailable()) return null;
  return caches.open(OFFLINE_CACHE);
}

export async function isOfflineCached(src: string): Promise<boolean> {
  const cache = await openOfflineCache();
  if (!cache) return false;
  const hit = await cache.match(src);
  return Boolean(hit);
}

export async function resolveOfflinePlaySrc(src: string): Promise<string | null> {
  const cache = await openOfflineCache();
  if (!cache) return null;
  const hit = await cache.match(src);
  if (!hit) return null;
  const blob = await hit.blob();
  return URL.createObjectURL(blob);
}

export async function downloadOfflineTitle(input: {
  id: string;
  title: string;
  kind: string;
  src: string;
  poster?: string;
  href?: string;
}): Promise<OfflineTitle> {
  const src = input.src.trim();
  if (!src) throw new Error('Nothing to save — this title has no stream yet.');
  const cache = await openOfflineCache();
  if (!cache) throw new Error('This browser cannot save titles offline.');

  const pending: OfflineTitle = {
    id: input.id,
    title: input.title,
    kind: input.kind,
    src,
    poster: input.poster,
    href: input.href,
    bytes: 0,
    savedAt: new Date().toISOString(),
    status: 'downloading',
  };
  upsertOfflineTitle(pending);

  try {
    const res = await fetch(src, { credentials: 'include' });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
    const clone = res.clone();
    await cache.put(src, clone);
    const blob = await res.blob();
    return upsertOfflineTitle({
      ...pending,
      bytes: blob.size,
      savedAt: new Date().toISOString(),
      status: 'ready',
    });
  } catch (err) {
    const failed = upsertOfflineTitle({
      ...pending,
      status: 'error',
      error: err instanceof Error ? err.message : 'Save failed',
    });
    throw Object.assign(new Error(failed.error), { title: failed });
  }
}

export async function removeOfflineTitle(id: string): Promise<void> {
  const map = readManifest();
  const row = map[id];
  if (row?.src) {
    const cache = await openOfflineCache();
    await cache?.delete(row.src);
  }
  delete map[id];
  writeManifest(map);
}

export function formatOfflineBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
