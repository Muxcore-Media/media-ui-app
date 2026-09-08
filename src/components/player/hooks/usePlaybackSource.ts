import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPlaybackSubtitles,
  friendlyPlaybackError,
  resolvePlayback,
  type PlaybackSubtitleTrack,
} from '../../../api/client';
import { QUALITY_OPTIONS } from '../../../lib/player/types';
import { toHlsPlaySrc, transcodePlaySrc } from '../../../lib/player/hls';
import { resolveOfflinePlaySrc } from '../../../lib/offline-library';

export type PlaybackSourceState = {
  loading: boolean;
  error: string | null;
  playSrc: string;
  playMode: 'direct' | 'transcode' | string;
  remoteTracks: PlaybackSubtitleTrack[];
  transcoderAvailable: boolean;
  /** Wall-clock seconds the current transcode stream's t=0 maps to (seek offset tracking). */
  transcodeOffsetSec: number;
  retryCount: number;
  maxBitrateMbps: string;
  trickplayEnabled: boolean;
  /** ffprobe container stream index used for the active transcode audio track. */
  audioStreamIndex: number;
  /** ffprobe container stream index burned in during transcode (PGS/VobSub). */
  subtitleStreamIndex: number;
  /** Absolute seconds to seek after an HLS remount (quality / audio / burn-in). */
  pendingSeekSec: number;
};

const INITIAL_STATE: PlaybackSourceState = {
  loading: false,
  error: null,
  playSrc: '',
  playMode: 'direct',
  remoteTracks: [],
  transcoderAvailable: false,
  transcodeOffsetSec: 0,
  retryCount: 0,
  maxBitrateMbps: '',
  trickplayEnabled: false,
  audioStreamIndex: -1,
  subtitleStreamIndex: -1,
  pendingSeekSec: 0,
};

function appendQuery(url: string, key: string, value: string | number) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
}

/**
 * Resolves a raw media src into a playable URL (direct or transcode-proxied),
 * loads sidecar subtitle tracks, and supports:
 *  - manual quality overrides (forces a transcode at a capped height)
 *  - seeking mid-transcode (in-buffer HLS uses native currentTime; seek-ahead
 *    remounts ffmpeg at start= so the new playlist begins at the scrub point)
 *  - audio stream selection during transcode (ffmpeg -map)
 *  - image-subtitle burn-in during transcode (ffmpeg overlay, subtitle_index)
 *  - automatic retry with backoff on resolve failure
 */
export function usePlaybackSource(src: string) {
  const [state, setState] = useState<PlaybackSourceState>(INITIAL_STATE);
  const qualityRef = useRef<string>('auto');
  const audioStreamIndexRef = useRef(-1);
  const subtitleStreamIndexRef = useRef(-1);
  const retryTimerRef = useRef<number | null>(null);
  const offlineBlobRef = useRef<string | null>(null);

  const adoptOfflineBlob = (url: string | null) => {
    if (offlineBlobRef.current && offlineBlobRef.current !== url) {
      URL.revokeObjectURL(offlineBlobRef.current);
    }
    offlineBlobRef.current = url;
  };

  const load = useCallback(
    async (opts?: {
      seekToSec?: number;
      quality?: string;
      audioStreamIndex?: number;
      subtitleStreamIndex?: number;
    }) => {
      if (!src) {
        setState(INITIAL_STATE);
        return;
      }
      if (opts?.quality !== undefined) qualityRef.current = opts.quality;
      if (opts?.audioStreamIndex !== undefined) audioStreamIndexRef.current = opts.audioStreamIndex;
      if (opts?.subtitleStreamIndex !== undefined) {
        subtitleStreamIndexRef.current = opts.subtitleStreamIndex;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const cached = await resolveOfflinePlaySrc(src);
        if (cached) {
          adoptOfflineBlob(cached);
          const subs = await fetchPlaybackSubtitles(src).catch(() => ({
            tracks: [] as PlaybackSubtitleTrack[],
          }));
          setState({
            loading: false,
            error: null,
            playSrc: cached,
            playMode: 'direct',
            remoteTracks: subs.tracks ?? [],
            transcoderAvailable: false,
            transcodeOffsetSec: 0,
            retryCount: 0,
            maxBitrateMbps: '',
            trickplayEnabled: false,
            audioStreamIndex: audioStreamIndexRef.current,
            subtitleStreamIndex: subtitleStreamIndexRef.current,
            pendingSeekSec: 0,
          });
          return;
        }
        adoptOfflineBlob(null);

        const [resolved, subs] = await Promise.all([
          resolvePlayback(src),
          fetchPlaybackSubtitles(src).catch(() => ({ tracks: [] as PlaybackSubtitleTrack[] })),
        ]);
        let streamUrl = resolved.stream_url || src;
        let mode = resolved.mode || 'direct';
        let offset = 0;
        let pendingSeek = 0;

        const quality = qualityRef.current;
        const qualityOpt = QUALITY_OPTIONS.find((q) => q.id === quality);
        const burnSubs = subtitleStreamIndexRef.current >= 0 && resolved.transcoder_available;
        const forceTranscode =
          (quality !== 'auto' && qualityOpt?.maxHeight && resolved.transcoder_available) || burnSubs;

        if (forceTranscode && qualityOpt?.maxHeight && quality !== 'auto') {
          streamUrl = transcodePlaySrc(src, { maxHeight: qualityOpt.maxHeight });
          mode = 'transcode';
        } else if (burnSubs) {
          streamUrl = transcodePlaySrc(src);
          mode = 'transcode';
        } else if (mode === 'transcode') {
          streamUrl = toHlsPlaySrc(streamUrl);
        }

        if (mode === 'transcode') {
          if (audioStreamIndexRef.current >= 0) {
            streamUrl = appendQuery(streamUrl, 'audio_index', audioStreamIndexRef.current);
          }
          if (subtitleStreamIndexRef.current >= 0) {
            streamUrl = appendQuery(streamUrl, 'subtitle_index', subtitleStreamIndexRef.current);
          }
          if (opts?.seekToSec != null && opts.seekToSec > 0) {
            streamUrl = appendQuery(streamUrl, 'start', opts.seekToSec.toFixed(2));
            offset = opts.seekToSec;
            pendingSeek = 0;
          }
        }

        setState({
          loading: false,
          error: null,
          playSrc: streamUrl,
          playMode: mode,
          remoteTracks: subs.tracks ?? [],
          transcoderAvailable: Boolean(resolved.transcoder_available),
          transcodeOffsetSec: offset,
          retryCount: 0,
          maxBitrateMbps: resolved.max_bitrate_mbps || '',
          trickplayEnabled: Boolean(resolved.trickplay_enabled),
          audioStreamIndex: audioStreamIndexRef.current,
          subtitleStreamIndex: subtitleStreamIndexRef.current,
          pendingSeekSec: pendingSeek,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: friendlyPlaybackError(err),
          playSrc: '',
          remoteTracks: [],
        }));
      }
    },
    [src],
  );

  useEffect(() => {
    audioStreamIndexRef.current = -1;
    subtitleStreamIndexRef.current = -1;
    void load();
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      if (offlineBlobRef.current) {
        URL.revokeObjectURL(offlineBlobRef.current);
        offlineBlobRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  /** True if the seek was handled by restarting the transcode at a new offset. */
  const seekWithinTranscode = useCallback(
    (absoluteSeconds: number) => {
      if (state.playMode !== 'transcode') return false;
      void load({ seekToSec: absoluteSeconds });
      return true;
    },
    [state.playMode, load],
  );

  const setQuality = useCallback(
    (quality: string, seekToSec?: number) => {
      void load({ quality, seekToSec });
    },
    [load],
  );

  const setAudioStreamIndex = useCallback(
    (streamIndex: number, seekToSec?: number) => {
      void load({ audioStreamIndex: streamIndex, seekToSec });
    },
    [load],
  );

  const setSubtitleStreamIndex = useCallback(
    (streamIndex: number, seekToSec?: number) => {
      void load({ subtitleStreamIndex: streamIndex, seekToSec });
    },
    [load],
  );

  const retry = useCallback(() => {
    setState((s) => ({ ...s, retryCount: s.retryCount + 1 }));
    void load();
  }, [load]);

  /** Schedules an automatic retry with exponential backoff (network stall / resolve failure recovery). */
  const scheduleRetry = useCallback(
    (attempt: number) => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      const delayMs = Math.min(1000 * 2 ** attempt, 15000);
      retryTimerRef.current = window.setTimeout(() => void load(), delayMs);
    },
    [load],
  );

  return {
    ...state,
    quality: qualityRef.current,
    seekWithinTranscode,
    setQuality,
    setAudioStreamIndex,
    setSubtitleStreamIndex,
    retry,
    scheduleRetry,
  };
}
