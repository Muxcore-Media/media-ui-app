import { useEffect, useRef } from 'react';
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
};

const REPORT_INTERVAL_MS = 4000;

/** Frequent, accurate watch-progress persistence: on an interval while playing,
 * and immediately on pause/seek-settle/unmount so a tab close never loses more
 * than a few seconds of progress. */
export function useProgressReporting(opts: UseProgressReportingOptions) {
  const latest = useRef(opts);
  latest.current = opts;

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
    });
  };

  useEffect(() => {
    if (!opts.enabled || !opts.mediaId) return;
    const interval = window.setInterval(() => {
      if (latest.current.playing) persist();
    }, REPORT_INTERVAL_MS);
    const onHide = () => persist();
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
      persist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled, opts.mediaId, opts.src]);

  const everPlayedRef = useRef(false);
  useEffect(() => {
    if (opts.playing) {
      everPlayedRef.current = true;
      return;
    }
    // Skip the initial mount (nothing has played yet, so there's nothing new
    // to persist) — otherwise this would immediately clobber saved progress
    // with position 0 before the resume-vs-start-over prompt can act on it.
    if (everPlayedRef.current) persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.playing]);

  return { persistNow: persist };
}
