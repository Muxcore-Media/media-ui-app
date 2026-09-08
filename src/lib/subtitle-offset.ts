/** Household subtitle sync offset. Positive delays captions (they appear later), matching VLC/Jellyfin. */

export const SUBTITLE_OFFSET_MIN_MS = -10_000;
export const SUBTITLE_OFFSET_MAX_MS = 10_000;
export const SUBTITLE_OFFSET_STEP_MS = 250;

export function clampSubtitleOffsetMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(SUBTITLE_OFFSET_MIN_MS, Math.min(SUBTITLE_OFFSET_MAX_MS, Math.round(ms)));
}

export function formatSubtitleOffset(ms: number): string {
  const clamped = clampSubtitleOffsetMs(ms);
  if (clamped === 0) return '0.00s';
  const sec = clamped / 1000;
  const sign = sec > 0 ? '+' : '';
  return `${sign}${sec.toFixed(2)}s`;
}

/** Lookup time so a positive offset delays cues relative to playback. */
export function subtitleLookupTime(timeSec: number, offsetMs: number): number {
  return timeSec - clampSubtitleOffsetMs(offsetMs) / 1000;
}

export const SUBTITLE_TEXT_COLORS = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#ffff00', label: 'Yellow' },
  { hex: '#00ffff', label: 'Cyan' },
  { hex: '#00ff00', label: 'Green' },
  { hex: '#ff00ff', label: 'Magenta' },
  { hex: '#ff0000', label: 'Red' },
  { hex: '#000000', label: 'Black' },
] as const;

export function normalizeSubtitleTextColor(raw: unknown): string {
  const hex = String(raw ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  return '#ffffff';
}
