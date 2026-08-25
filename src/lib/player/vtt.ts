import type { SubtitleCue } from './types';

function timestampToSeconds(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const s = Number(m[3]);
  const ms = Number(m[4]);
  return h * 3600 + min * 60 + s + ms / 1000;
}

/**
 * Strip everything except a small, safe allow-list of inline formatting tags.
 * Used both for our own WebVTT parsing and for text pulled from native
 * TextTrack cues (sidecar <track> or in-band container subtitles), so every
 * subtitle source renders through the same custom, styleable overlay instead
 * of the browser's very limited native cue box.
 */
export function sanitizeCueText(raw: string): string {
  return raw
    .replace(/<v[^>]*>/gi, '') // <v Speaker Name>
    .replace(/<\/v>/gi, '')
    .replace(/<c[^>]*>/gi, '') // <c.classname>
    .replace(/<\/c>/gi, '')
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') // inline karaoke timestamps
    .replace(/<(?!\/?(b|i|u)\b)[^>]*>/gi, '') // drop anything not b/i/u
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

/**
 * Minimal WebVTT parser sufficient for rendering styled cues ourselves
 * (instead of relying on the browser's very limited native <track> styling).
 * Ignores cue settings (position/align/size/line) and NOTE/STYLE/REGION
 * blocks; renders text bottom-anchored like every mainstream player does.
 */
export function parseVTT(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];
  let i = 0;
  // Skip WEBVTT header + any leading metadata block.
  while (i < lines.length && !lines[i].includes('-->')) i++;

  while (i < lines.length) {
    const line = lines[i];
    const timing = line.match(/([0-9:.]+)\s*-->\s*([0-9:.]+)/);
    if (timing) {
      const startSec = timestampToSeconds(timing[1]);
      const endSec = timestampToSeconds(timing[2]);
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i]);
        i++;
      }
      if (startSec != null && endSec != null && textLines.length > 0) {
        const html = sanitizeCueText(textLines.join('\n')).replace(/\n/g, '<br/>');
        if (html) cues.push({ startSec, endSec, html });
      }
    }
    i++;
  }
  return cues.sort((a, b) => a.startSec - b.startSec);
}

/** Binary-search the active cue(s) for a given playback time. */
export function activeCues(cues: SubtitleCue[], timeSec: number): SubtitleCue[] {
  if (cues.length === 0) return [];
  let lo = 0;
  let hi = cues.length - 1;
  let start = cues.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].endSec > timeSec) {
      start = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  const out: SubtitleCue[] = [];
  for (let idx = start; idx < cues.length; idx++) {
    const cue = cues[idx];
    if (cue.startSec > timeSec) break;
    if (cue.startSec <= timeSec && timeSec < cue.endSec) out.push(cue);
  }
  return out;
}
