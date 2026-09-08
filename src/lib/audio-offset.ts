/** Household audio sync offset. Positive delays audio (heard later), matching VLC/Jellyfin. */

export const AUDIO_OFFSET_MIN_MS = -10_000;
export const AUDIO_OFFSET_MAX_MS = 10_000;
export const AUDIO_OFFSET_STEP_MS = 250;
export const AUDIO_DELAY_MAX_SEC = 10;

export function clampAudioOffsetMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(AUDIO_OFFSET_MIN_MS, Math.min(AUDIO_OFFSET_MAX_MS, Math.round(ms)));
}

export function formatAudioOffset(ms: number): string {
  const clamped = clampAudioOffsetMs(ms);
  if (clamped === 0) return '0.00s';
  const sec = clamped / 1000;
  const sign = sec > 0 ? '+' : '';
  return `${sign}${sec.toFixed(2)}s`;
}

/** DelayNode seconds. Negative offsets cannot delay into the past. */
export function audioGraphDelaySeconds(offsetMs: number): number {
  return Math.max(0, clampAudioOffsetMs(offsetMs)) / 1000;
}

/**
 * File time for a second audio element so negative offset plays earlier content
 * than the video clock (direct play only).
 */
export function leadAudioTime(videoTimeSec: number, offsetMs: number): number {
  const lead = Math.min(0, clampAudioOffsetMs(offsetMs)) / 1000;
  return Math.max(0, videoTimeSec + lead);
}
