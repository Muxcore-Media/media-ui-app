import { useEffect, useRef, useState } from 'react';
import type { StatsSnapshot } from '../../../lib/player/types';

type VideoPlaybackQualityLike = {
  droppedVideoFrames: number;
  totalVideoFrames: number;
  corruptedVideoFrames?: number;
};

type VideoWithQuality = HTMLVideoElement & {
  getVideoPlaybackQuality?: () => VideoPlaybackQualityLike;
  webkitDecodedFrameCount?: number;
  webkitDroppedFrameCount?: number;
  webkitVideoDecodedByteCount?: number;
};

export type UseStatsOptions = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mode: 'direct' | 'transcode' | string;
  maxBitrateMbps?: string;
  streamUrl?: string;
  enabled: boolean;
};

/** "Stats for nerds" overlay data source (Jellyfin/YouTube-style): resolution,
 * estimated bitrate, dropped frames, and buffer health, polled at ~1Hz. */
export function useStats({
  videoRef,
  mode,
  maxBitrateMbps,
  streamUrl,
  enabled,
}: UseStatsOptions): StatsSnapshot | null {
  const [snapshot, setSnapshot] = useState<StatsSnapshot | null>(null);
  const lastBytesRef = useRef<{ t: number; bytes: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      return;
    }
    const interval = window.setInterval(() => {
      const video = videoRef.current as VideoWithQuality | null;
      if (!video) return;

      let dropped = 0;
      let total = 0;
      if (typeof video.getVideoPlaybackQuality === 'function') {
        const q = video.getVideoPlaybackQuality();
        dropped = q.droppedVideoFrames;
        total = q.totalVideoFrames;
      } else {
        dropped = video.webkitDroppedFrameCount ?? 0;
        total = video.webkitDecodedFrameCount ?? 0;
      }

      let bufferedAheadSec = 0;
      try {
        for (let i = 0; i < video.buffered.length; i++) {
          if (
            video.buffered.start(i) <= video.currentTime &&
            video.currentTime <= video.buffered.end(i)
          ) {
            bufferedAheadSec = video.buffered.end(i) - video.currentTime;
            break;
          }
        }
      } catch {
        // buffered ranges can throw before metadata loads; ignore
      }

      let estimatedBitrateMbps: number | null = null;
      const decodedBytes = video.webkitVideoDecodedByteCount;
      if (typeof decodedBytes === 'number') {
        const now = performance.now();
        if (lastBytesRef.current) {
          const dt = (now - lastBytesRef.current.t) / 1000;
          const dBytes = decodedBytes - lastBytesRef.current.bytes;
          if (dt > 0.4 && dBytes >= 0) estimatedBitrateMbps = (dBytes * 8) / dt / 1_000_000;
        }
        lastBytesRef.current = { t: now, bytes: decodedBytes };
      }

      setSnapshot({
        resolutionWidth: video.videoWidth || 0,
        resolutionHeight: video.videoHeight || 0,
        mode: mode === 'transcode' ? 'transcode' : 'direct',
        estimatedBitrateMbps,
        targetBitrateMbps: maxBitrateMbps ? Number(maxBitrateMbps) : null,
        droppedFrames: dropped,
        totalFrames: total,
        bufferedAheadSec,
        streamUrl: streamUrl ?? null,
        playbackRate: video.playbackRate,
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, videoRef, mode, maxBitrateMbps, streamUrl]);

  return snapshot;
}
