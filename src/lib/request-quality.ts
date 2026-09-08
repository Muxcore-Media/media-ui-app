export type RequestQuality = 'hd' | '4k';

export function normalizeRequestQuality(raw?: string | null): RequestQuality | undefined {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === '4k' || s === 'uhd' || s === '2160p' || s === '2160') return '4k';
  if (s === 'hd' || s === 'fhd' || s === '1080p' || s === '1080' || s === '720p') return 'hd';
  return undefined;
}

export function qualityProfileLabel(raw?: string | null): string | null {
  const q = normalizeRequestQuality(raw);
  if (q === '4k') return '4K';
  if (q === 'hd') return 'HD';
  const s = String(raw ?? '').trim();
  return s || null;
}
