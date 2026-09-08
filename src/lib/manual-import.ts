import { normalizeParsedQuality, parsedQualityLabel, type ParsedQuality } from './formats';

export type ImportCandidate = {
  path: string;
  name: string;
  title: string;
  size: number;
  mediaType: string;
  year: number;
  seasonNumber: number;
  episodeNumber: number;
  artist: string;
  album: string;
  matched?: boolean;
  seriesId: string;
  seriesName: string;
  episodeTitle: string;
  airDate: string;
  quality?: ParsedQuality;
};

export type ImportCandidatesResponse = {
  items: ImportCandidate[];
  total: number;
  available: boolean;
};

export type ImportPathResult = {
  imported: number;
  skipped: number;
  found: number;
  message: string;
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeImportCandidates(
  raw: Record<string, unknown> | null | undefined,
): ImportCandidatesResponse {
  const rows = Array.isArray(raw?.items) ? raw.items : [];
  return {
    available: raw?.available === true,
    total: asNumber(raw?.total),
    items: rows
      .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      .map((row) => ({
        path: String(row.path ?? ''),
        name: String(row.name ?? ''),
        title: String(row.title || row.name || 'Untitled'),
        size: asNumber(row.size),
        mediaType: String(row.mediaType ?? row.media_type ?? ''),
        year: asNumber(row.year),
        seasonNumber: asNumber(row.seasonNumber ?? row.season_number),
        episodeNumber: asNumber(row.episodeNumber ?? row.episode_number),
        artist: String(row.artist ?? ''),
        album: String(row.album ?? ''),
        matched: typeof row.matched === 'boolean' ? row.matched : undefined,
        seriesId: String(row.series_id ?? row.seriesId ?? ''),
        seriesName: String(row.series_name ?? row.seriesName ?? ''),
        episodeTitle: String(row.episode_title ?? row.episodeTitle ?? ''),
        airDate: String(row.air_date ?? row.airDate ?? ''),
        quality: row.quality ? normalizeParsedQuality(row.quality) : undefined,
      }))
      .filter((row) => row.path),
  };
}

export function normalizeImportResult(raw: Record<string, unknown> | null | undefined): ImportPathResult {
  return {
    imported: asNumber(raw?.imported),
    skipped: asNumber(raw?.skipped),
    found: asNumber(raw?.found),
    message: String(raw?.message ?? ''),
  };
}

export function formatImportSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function importCandidateDetail(row: ImportCandidate): string {
  const bits = [
    parsedQualityLabel(row.quality),
    row.mediaType,
    row.year > 0 ? String(row.year) : '',
    formatImportSize(row.size),
  ].filter(Boolean);
  if (row.seasonNumber > 0) {
    bits.push(`S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`);
  }
  if (row.artist) bits.push(row.artist);
  return bits.join(' · ');
}

/** Sonarr-style library match line for a download-folder file. */
export function importCandidateMatch(row: ImportCandidate): string {
  if (row.matched === true) {
    const ep = row.seasonNumber > 0
      ? `S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`
      : '';
    return [row.seriesName || row.title, ep, row.episodeTitle].filter(Boolean).join(' · ');
  }
  if (row.matched === false) {
    return 'No library match';
  }
  return '';
}

export function importPathBody(row: ImportCandidate): {
  path: string;
  title?: string;
  media_type?: string;
  year?: number;
  season_number?: number;
  episode_number?: number;
} {
  return {
    path: row.path,
    title: row.seriesName || row.title,
    media_type: row.mediaType || undefined,
    year: row.year || undefined,
    season_number: row.seasonNumber || undefined,
    episode_number: row.episodeNumber || undefined,
  };
}
