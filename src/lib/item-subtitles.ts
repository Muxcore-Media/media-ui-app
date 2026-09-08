export type ItemSubtitleFile = {
  id: string;
  mediaFileId: string;
  language: string;
  format: string;
  forced: boolean;
  hearingImpaired: boolean;
  source: string;
  provider: string;
  score: number;
  sizeBytes: number;
  filename: string;
};

export type ItemSubtitleTarget = {
  id: string;
  title: string;
  season: number;
  episode: number;
};

export type ItemSubtitlesResponse = {
  available: boolean;
  items: ItemSubtitleFile[];
  files: ItemSubtitleTarget[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeItemSubtitle(raw: unknown): ItemSubtitleFile {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    mediaFileId: String(rec.media_file_id ?? rec.mediaFileId ?? ''),
    language: String(rec.language ?? ''),
    format: String(rec.format ?? ''),
    forced: rec.forced === true,
    hearingImpaired: rec.hearing_impaired === true || rec.hearingImpaired === true,
    source: String(rec.source ?? ''),
    provider: String(rec.provider ?? ''),
    score: asNumber(rec.score),
    sizeBytes: asNumber(rec.size_bytes ?? rec.sizeBytes),
    filename: String(rec.filename ?? ''),
  };
}

export function normalizeItemSubtitleTarget(raw: unknown): ItemSubtitleTarget {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    title: String(rec.title ?? ''),
    season: asNumber(rec.season),
    episode: asNumber(rec.episode),
  };
}

export function normalizeItemSubtitles(raw: unknown): ItemSubtitlesResponse {
  const rec = asRecord(raw);
  const items = Array.isArray(rec.items) ? rec.items : [];
  const files = Array.isArray(rec.files) ? rec.files : [];
  return {
    available: rec.available === true,
    items: items.map(normalizeItemSubtitle).filter((row) => row.id),
    files: files.map(normalizeItemSubtitleTarget).filter((row) => row.id),
  };
}

export function itemSubtitlesPath(kind: 'movie' | 'tv', id: string): string {
  const root = kind === 'tv' ? '/api/tv' : '/api/movies';
  return `${root}/${encodeURIComponent(id)}/subtitles`;
}

export function uploadSubtitleBody(input: {
  language: string;
  filename: string;
  data: string;
  mediaFileId?: string;
  forced?: boolean;
  hearingImpaired?: boolean;
}): Record<string, unknown> {
  return {
    language: input.language.trim() || 'eng',
    filename: input.filename.trim() || 'subtitle.srt',
    data: input.data,
    media_file_id: input.mediaFileId?.trim() || '',
    forced: input.forced === true,
    hearing_impaired: input.hearingImpaired === true,
  };
}

export function subtitleFileLabel(row: ItemSubtitleFile): string {
  const lang = row.language.trim().toUpperCase() || 'UND';
  const bits = [lang];
  if (row.format) bits.push(row.format.replace(/^\./, ''));
  if (row.forced) bits.push('forced');
  if (row.hearingImpaired) bits.push('HI');
  if (row.source && row.source !== 'sidecar') bits.push(row.source);
  return bits.join(' · ');
}

export function subtitleTargetLabel(row: ItemSubtitleTarget): string {
  if (row.season > 0 && row.episode > 0) {
    const ep = `S${String(row.season).padStart(2, '0')}E${String(row.episode).padStart(2, '0')}`;
    return row.title ? `${ep} · ${row.title}` : ep;
  }
  return row.title || 'Video file';
}
