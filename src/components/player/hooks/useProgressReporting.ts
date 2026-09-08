import { useEffect, useRef } from 'react';
import { emitPlaybackSession } from '../../../lib/playback-session';
import { upsertProgress, type MediaKind } from '../../../lib/userdata';

export type UseProgressReportingOptions = {
  mediaId?: string;
  mediaKind: MediaKind;
  title: string;
  posterUrl?: string;
  href: string;
  src: string;
  enabled: boolean;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  /** Suppress writes while a resume-decision dialog is pending, or right after a transcode restart. */
  suppress?: boolean;
  /** Content rating forwarded from the player URL so later resume links can gate. */
  contentRating?: string;
  /** True when the active stream is a transcode (playback-monitor stream type). */
  isTranscode?: boolean;
  /** Household Now watching stop — pause this tab when the monitor reports a kick. */
  onRemoteStop?: () => void;
};

const REPORT_INTERVAL_MS = 4000;

type SessionPhase = 'none' | 'started' | 'progress' | 'stopped';

/** Frequent, accurate watch-progress persistence: on an interval while playing,
 * and immediately on pause/seek-settle/unmount so a tab close never loses more
 * than a few seconds of progress. Also publishes native sessions to
 * playback-monitor via POST /api/playback/session. */
export function useProgressReporting(opts: UseProgressReportingOptions) {
  const latest = useRef(opts);
  latest.current = opts;
  const sessionPhase = useRef<SessionPhase>('none');

  const persist = () => {
    const o = latest.current;
    if (!o.enabled || !o.mediaId || o.suppress) return;
    if (!Number.isFinite(o.positionSec)) return;
    upsertProgress({
      id: o.mediaId,
      kind: o.mediaKind,
      title: o.title || 'Playback',
      poster_url: o.posterUrl,
      href: o.href || '/',
      stream_url: o.src,
      positionSec: o.positionSec,
      durationSec: Number.isFinite(o.durationSec) ? o.durationSec : 0,
      content_rating: o.contentRating,
    });
  };

  const emit = (eventType: 'started' | 'progress' | 'stopped') => {
    const o = latest.current;
    if (!o.mediaId || o.suppress) return;
    if (eventType === 'started') sessionPhase.current = 'started';
    else if (eventType === 'progress') sessionPhase.current = 'progress';
    else sessionPhase.current = 'stopped';
    void emitPlaybackSession({
      eventType,
      mediaId: o.mediaId,
      title: o.title,
      mediaType: o.mediaKind,
      positionSec: o.positionSec,
      durationSec: o.durationSec,
      isPaused: eventType === 'stopped' || !o.playing,
      isTranscode: o.isTranscode,
    }).then((stopped) => {
      if (!stopped) return;
      sessionPhase.current = 'stopped';
      latest.current.onRemoteStop?.();
    });
  };

  useEffect(() => {
    if (!opts.mediaId) return;
    const interval = window.setInterval(() => {
      if (!latest.current.playing) return;
      persist();
      if (sessionPhase.current === 'none' || sessionPhase.current === 'stopped') {
        emit('started');
      } else {
        emit('progress');
      }
    }, REPORT_INTERVAL_MS);
    const onHide = () => {
      persist();
      if (sessionPhase.current === 'started' || sessionPhase.current === 'progress') {
        emit('stopped');
      }
    };
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      persist();
      if (sessionPhase.current === 'started' || sessionPhase.current === 'progress') {
        emit('stopped');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.mediaId, opts.src]);

  const everPlayedRef = useRef(false);
  useEffect(() => {
    if (opts.playing) {
      everPlayedRef.current = true;
      if (sessionPhase.current === 'none' || sessionPhase.current === 'stopped') {
        emit('started');
      }
      return;
    }
    // Skip the initial mount (nothing has played yet, so there's nothing new
    // to persist) — otherwise this would immediately clobber saved progress
    // with position 0 before the resume-vs-start-over prompt can act on it.
    if (everPlayedRef.current) {
      persist();
      if (sessionPhase.current === 'started' || sessionPhase.current === 'progress') {
        emit('stopped');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.playing]);

  return { persistNow: persist };
}
