export type WatchStat = {
  key: string;
  label: string;
  value: number;
};

export type WatchTopTitle = {
  title: string;
  mediaType: string;
  playCount: number;
  watchMinutes: number;
};

export type WatchPlayDay = {
  date: string;
  count: number;
};

export type WatchLibraryStat = {
  name: string;
  playCount: number;
  watchMinutes: number;
};

export type WatchStatsResponse = {
  available: boolean;
  days: number;
  stats: WatchStat[];
  topMovies: WatchTopTitle[];
  topShows: WatchTopTitle[];
  plays: WatchPlayDay[];
  libraries: WatchLibraryStat[];
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

export function normalizeWatchStats(raw: Record<string, unknown> | null | undefined): WatchStatsResponse {
  return {
    available: raw?.available === true,
    days: asNumber(raw?.days) || 30,
    stats: asRows(raw?.stats).map((row) => ({
      key: String(row.key ?? ''),
      label: String(row.label ?? row.key ?? ''),
      value: asNumber(row.value),
    })),
    topMovies: asRows(raw?.topMovies ?? raw?.top_movies).map(normalizeTopTitle),
    topShows: asRows(raw?.topShows ?? raw?.top_shows).map(normalizeTopTitle),
    plays: asRows(raw?.plays).map((row) => ({
      date: String(row.date ?? ''),
      count: asNumber(row.count),
    })).filter((row) => row.date),
    libraries: asRows(raw?.libraries).map((row) => ({
      name: String(row.name ?? ''),
      playCount: asNumber(row.playCount ?? row.play_count),
      watchMinutes: asNumber(row.watchMinutes ?? row.watch_minutes),
    })).filter((row) => row.name),
  };
}

function normalizeTopTitle(row: Record<string, unknown>): WatchTopTitle {
  return {
    title: String(row.title ?? ''),
    mediaType: String(row.mediaType ?? row.media_type ?? ''),
    playCount: asNumber(row.playCount ?? row.play_count),
    watchMinutes: asNumber(row.watchMinutes ?? row.watch_minutes),
  };
}

export function formatWatchMinutes(minutes: number): string {
  if (!(minutes > 0)) return '';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatWatchStatValue(stat: WatchStat): string {
  if (stat.key === 'watch_minutes') {
    return formatWatchMinutes(stat.value) || '0m';
  }
  return String(Math.round(stat.value));
}

export type ItemWatchStats = {
  available: boolean;
  itemId: string;
  playCount: number;
  uniqueUsers: number;
  watchMinutes: number;
  neverWatched: boolean;
  hasActivity: boolean;
  lastWatchedAt: string;
  daysSinceLastWatch: number;
};

export function normalizeItemWatchStats(raw: Record<string, unknown> | null | undefined): ItemWatchStats {
  return {
    available: raw?.available === true,
    itemId: String(raw?.itemId ?? raw?.item_id ?? ''),
    playCount: asNumber(raw?.playCount ?? raw?.play_count),
    uniqueUsers: asNumber(raw?.uniqueUsers ?? raw?.unique_users),
    watchMinutes: asNumber(raw?.watchMinutes ?? raw?.watch_minutes),
    neverWatched: raw?.neverWatched === true || raw?.never_watched === true,
    hasActivity: raw?.hasActivity === true || raw?.has_activity === true,
    lastWatchedAt: String(raw?.lastWatchedAt ?? raw?.last_watched_at ?? ''),
    daysSinceLastWatch: asNumber(raw?.daysSinceLastWatch ?? raw?.days_since_last_watch),
  };
}

export type StaleLibraryItem = {
  title: string;
  itemId: string;
  mediaType: string;
  library: string;
  category: string;
  daysStale: number;
  watchCount: number;
};

export type StaleLibraryResponse = {
  available: boolean;
  items: StaleLibraryItem[];
  neverWatched: number;
  stale: number;
};

export function normalizeStaleLibrary(raw: Record<string, unknown> | null | undefined): StaleLibraryResponse {
  return {
    available: raw?.available === true,
    neverWatched: asNumber(raw?.neverWatched ?? raw?.never_watched),
    stale: asNumber(raw?.stale),
    items: asRows(raw?.items).map((row) => ({
      title: String(row.title ?? ''),
      itemId: String(row.itemId ?? row.item_id ?? ''),
      mediaType: String(row.mediaType ?? row.media_type ?? ''),
      library: String(row.library ?? ''),
      category: String(row.category ?? ''),
      daysStale: asNumber(row.daysStale ?? row.days_stale),
      watchCount: asNumber(row.watchCount ?? row.watch_count),
    })).filter((row) => row.title),
  };
}

export function staleItemLabel(row: StaleLibraryItem): string {
  const kind = row.category === 'never_watched' ? 'Never watched' : 'Stale';
  const days = row.daysStale > 0 ? ` · ${Math.round(row.daysStale)}d` : '';
  return `${kind}${days}`;
}

export type TautulliImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  totalFetched: number;
  error: string;
  dryRun: boolean;
};

export function normalizeTautulliImport(raw: Record<string, unknown> | null | undefined): TautulliImportResult {
  return {
    imported: asNumber(raw?.imported),
    skipped: asNumber(raw?.skipped),
    failed: asNumber(raw?.failed),
    totalFetched: asNumber(raw?.totalFetched ?? raw?.total_fetched),
    error: String(raw?.error ?? ''),
    dryRun: raw?.dryRun === true || raw?.dry_run === true,
  };
}

export function tautulliImportLabel(res: TautulliImportResult): string {
  const verb = res.dryRun ? 'Dry run' : 'Imported';
  return `${verb}: ${Math.round(res.imported)} imported, ${Math.round(res.skipped)} skipped of ${Math.round(res.totalFetched)} fetched`;
}

export type HistoryImportResult = TautulliImportResult;
export const normalizeHistoryImport = normalizeTautulliImport;
export const historyImportLabel = tautulliImportLabel;

export type DuplicateCopy = {
  title: string;
  itemId: string;
  library: string;
  path: string;
  bytes: number;
};

export type DuplicateGroup = {
  title: string;
  groupKey: string;
  copyCount: number;
  copies: DuplicateCopy[];
};

export type DuplicatesResponse = {
  available: boolean;
  groups: DuplicateGroup[];
};

export function normalizeDuplicates(raw: Record<string, unknown> | null | undefined): DuplicatesResponse {
  return {
    available: raw?.available === true,
    groups: asRows(raw?.groups).map((row) => ({
      title: String(row.title ?? ''),
      groupKey: String(row.groupKey ?? row.group_key ?? ''),
      copyCount: asNumber(row.copyCount ?? row.copy_count),
      copies: asRows(row.copies).map((copy) => ({
        title: String(copy.title ?? ''),
        itemId: String(copy.itemId ?? copy.item_id ?? ''),
        library: String(copy.library ?? ''),
        path: String(copy.path ?? ''),
        bytes: asNumber(copy.bytes),
      })),
    })).filter((row) => row.title),
  };
}

export type StorageLibrary = {
  name: string;
  itemCount: number;
  bytes: number;
};

export type StorageResponse = {
  available: boolean;
  totalItems: number;
  totalBytes: number;
  duplicateWasteBytes: number;
  totalHuman: string;
  duplicateWasteHuman: string;
  libraries: StorageLibrary[];
};

export function normalizeStorage(raw: Record<string, unknown> | null | undefined): StorageResponse {
  return {
    available: raw?.available === true,
    totalItems: asNumber(raw?.totalItems ?? raw?.total_items),
    totalBytes: asNumber(raw?.totalBytes ?? raw?.total_bytes),
    duplicateWasteBytes: asNumber(raw?.duplicateWasteBytes ?? raw?.duplicate_waste_bytes),
    totalHuman: String(raw?.totalHuman ?? raw?.total_human ?? ''),
    duplicateWasteHuman: String(raw?.duplicateWasteHuman ?? raw?.duplicate_waste_human ?? ''),
    libraries: asRows(raw?.libraries).map((row) => ({
      name: String(row.name ?? ''),
      itemCount: asNumber(row.itemCount ?? row.item_count),
      bytes: asNumber(row.bytes),
    })).filter((row) => row.name),
  };
}

export function formatLibraryBytes(bytes: number): string {
  if (!(bytes > 0)) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export type StorageHistoryPoint = {
  day: string;
  bytes: number;
  itemCount: number;
};

export type StorageHistoryResponse = {
  available: boolean;
  days: number;
  history: StorageHistoryPoint[];
  prediction: { growthBytesPerDay: number; projectedBytes: number; horizonDays: number };
};

export function normalizeStorageHistory(raw: Record<string, unknown> | null | undefined): StorageHistoryResponse {
  const pred = raw?.prediction && typeof raw.prediction === 'object' ? (raw.prediction as Record<string, unknown>) : {};
  return {
    available: raw?.available === true,
    days: asNumber(raw?.days) || 90,
    history: asRows(raw?.history).map((row) => ({
      day: String(row.day ?? ''),
      bytes: asNumber(row.bytes ?? row.totalBytes ?? row.total_bytes),
      itemCount: asNumber(row.itemCount ?? row.item_count),
    })).filter((row) => row.day),
    prediction: {
      growthBytesPerDay: asNumber(pred.growthBytesPerDay ?? pred.growth_bytes_per_day),
      projectedBytes: asNumber(pred.projectedBytes ?? pred.projected_bytes),
      horizonDays: asNumber(pred.horizonDays ?? pred.horizon_days) || 90,
    },
  };
}

export function storageHistoryLabel(res: StorageHistoryResponse): string {
  if (!res.available || res.history.length === 0) return '';
  const last = res.history[res.history.length - 1];
  const horizon = Math.round(res.prediction.horizonDays) || 90;
  const projected = res.prediction.projectedBytes > 0
    ? ` · ${formatLibraryBytes(res.prediction.projectedBytes)} in ${horizon}d`
    : '';
  return `${res.history.length} snapshots · ${formatLibraryBytes(last.bytes)}${projected}`;
}

export function storageSummaryLabel(res: StorageResponse): string {
  const total = res.totalHuman || formatLibraryBytes(res.totalBytes);
  const waste = res.duplicateWasteHuman || formatLibraryBytes(res.duplicateWasteBytes);
  return `${Math.round(res.totalItems)} titles · ${total} · ${waste} duplicate waste`;
}

export type WatchChartBucket = {
  key: string;
  label: string;
  count: number;
};

export type WatchConcurrentSeries = {
  name: string;
  peak: number;
};

export type WatchChartsResponse = {
  available: boolean;
  days: number;
  hours: WatchChartBucket[];
  users: WatchChartBucket[];
  platforms: WatchChartBucket[];
  daysOfWeek: WatchChartBucket[];
  months: WatchChartBucket[];
  streamTypes: WatchChartBucket[];
  streamResolutions: WatchChartBucket[];
  sourceResolutions: WatchChartBucket[];
  platformResolutions: WatchChartBucket[];
  concurrent: { peak: number; series: WatchConcurrentSeries[] };
};

function chartBuckets(raw: unknown, requireCount = false): WatchChartBucket[] {
  return asRows(raw)
    .map(normalizeChartBucket)
    .filter((row) => row.label && (!requireCount || row.count > 0));
}

export function normalizeWatchCharts(raw: Record<string, unknown> | null | undefined): WatchChartsResponse {
  const concurrent = raw?.concurrent && typeof raw.concurrent === 'object' ? (raw.concurrent as Record<string, unknown>) : {};
  return {
    available: raw?.available === true,
    days: asNumber(raw?.days) || 30,
    hours: chartBuckets(raw?.hours, true),
    users: chartBuckets(raw?.users),
    platforms: chartBuckets(raw?.platforms),
    daysOfWeek: chartBuckets(raw?.daysOfWeek ?? raw?.days_of_week, true),
    months: chartBuckets(raw?.months, true),
    streamTypes: chartBuckets(raw?.streamTypes ?? raw?.stream_types),
    streamResolutions: chartBuckets(raw?.streamResolutions ?? raw?.stream_resolutions),
    sourceResolutions: chartBuckets(raw?.sourceResolutions ?? raw?.source_resolutions),
    platformResolutions: chartBuckets(raw?.platformResolutions ?? raw?.platform_resolutions),
    concurrent: {
      peak: asNumber(concurrent.peak),
      series: asRows(concurrent.series).map((row) => ({
        name: String(row.name ?? ''),
        peak: asNumber(row.peak),
      })).filter((row) => row.name),
    },
  };
}

function normalizeChartBucket(row: Record<string, unknown>): WatchChartBucket {
  return {
    key: String(row.key ?? ''),
    label: String(row.label ?? row.key ?? ''),
    count: asNumber(row.count),
  };
}

export function itemWatchStatsLabel(stats: ItemWatchStats): string {
  if (!stats.available) return '';
  if (stats.neverWatched || !stats.hasActivity) return 'Never watched';
  const plays = stats.playCount === 1 ? '1 play' : `${Math.round(stats.playCount)} plays`;
  const watchers = stats.uniqueUsers === 1 ? '1 watcher' : `${Math.round(stats.uniqueUsers)} watchers`;
  const watched = stats.watchMinutes > 0 ? ` · ${formatWatchMinutes(stats.watchMinutes)}` : '';
  return `${plays} · ${watchers}${watched}`;
}
