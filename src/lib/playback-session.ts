import {
  reportPlaybackSession,
  type PlaybackSessionEventType,
} from '../api/client';

const SESSION_KEY_PREFIX = 'muxcore.playback.session.';

export function nativePlaybackSessionId(mediaId: string): string {
  const id = mediaId.trim();
  if (!id) return '';
  const key = SESSION_KEY_PREFIX + id;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `web:${id}`;
  }
}

export async function emitPlaybackSession(input: {
  eventType: PlaybackSessionEventType;
  mediaId: string;
  title?: string;
  mediaType?: string;
  positionSec?: number;
  durationSec?: number;
  isPaused?: boolean;
  isTranscode?: boolean;
}): Promise<boolean> {
  const mediaId = input.mediaId.trim();
  if (!mediaId) return false;
  const sessionId = nativePlaybackSessionId(mediaId);
  if (!sessionId) return false;
  try {
    const res = await reportPlaybackSession({
      event_type: input.eventType,
      session_id: sessionId,
      media_id: mediaId,
      title: input.title,
      media_type: input.mediaType,
      position_seconds: Number.isFinite(input.positionSec) ? Math.round(input.positionSec ?? 0) : 0,
      duration_seconds: Number.isFinite(input.durationSec) ? Math.round(input.durationSec ?? 0) : 0,
      is_paused: input.isPaused,
      is_transcode: input.isTranscode,
      player: 'media-ui',
      platform: 'web',
    });
    return res.stopped === true;
  } catch {
    // Monitor outages must not interrupt playback.
    return false;
  }
}
