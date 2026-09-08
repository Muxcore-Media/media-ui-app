export const MIGRATE_SERVICES = ['radarr', 'sonarr', 'lidarr'] as const;

export type MigrateService = (typeof MIGRATE_SERVICES)[number];

export type MigratePreviewItem = {
  source: string;
  arrId: number;
  title: string;
  year: number;
  tmdbId: number;
  tvdbId: number;
  musicbrainzId: string;
  monitored: boolean;
  qualityProfileName: string;
  rootFolderPath: string;
};

export type MigrateResult = {
  dryRun: boolean;
  fetched: number;
  imported: number;
  skipped: number;
  errors: string[];
  preview: MigratePreviewItem[];
  scanNote: string;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeMigrateItem(raw: unknown): MigratePreviewItem {
  const rec = asRecord(raw);
  return {
    source: String(rec.source ?? ''),
    arrId: Number(rec.arr_id ?? rec.arrId) || 0,
    title: String(rec.title ?? ''),
    year: Number(rec.year) || 0,
    tmdbId: Number(rec.tmdb_id ?? rec.tmdbId) || 0,
    tvdbId: Number(rec.tvdb_id ?? rec.tvdbId) || 0,
    musicbrainzId: String(rec.musicbrainz_id ?? rec.musicbrainzId ?? ''),
    monitored: rec.monitored === true,
    qualityProfileName: String(rec.quality_profile_name ?? rec.qualityProfileName ?? ''),
    rootFolderPath: String(rec.root_folder_path ?? rec.rootFolderPath ?? ''),
  };
}

export function normalizeMigrateResult(raw: unknown): MigrateResult {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.preview) ? rec.preview : [];
  const errors = Array.isArray(rec.errors) ? rec.errors.filter((e): e is string => typeof e === 'string') : [];
  return {
    dryRun: rec.dry_run === true || rec.dryRun === true,
    fetched: Number(rec.fetched) || 0,
    imported: Number(rec.imported) || 0,
    skipped: Number(rec.skipped) || 0,
    errors,
    preview: rows.map(normalizeMigrateItem).filter((row) => row.title || row.arrId),
    scanNote: String(rec.scan_note ?? rec.scanNote ?? ''),
  };
}

export function migrateWriteBody(input: {
  service: string;
  baseUrl: string;
  apiKey: string;
  dryRun: boolean;
  remapFrom?: string;
  remapTo?: string;
}): Record<string, unknown> {
  return {
    service: input.service,
    base_url: input.baseUrl,
    api_key: input.apiKey,
    dry_run: input.dryRun,
    remap_from: input.remapFrom,
    remap_to: input.remapTo,
  };
}
