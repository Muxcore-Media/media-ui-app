import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerTrackInfo } from '../../../lib/player/types';

type UseVideoElementOptions = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playSrc: string;
  /** Wall-clock seconds this stream's t=0 represents (transcode seek offset). */
  transcodeOffsetSec: number;
  onEnded?: () => void;
  /** Fired when playback stalls (buffering) for longer than the stall timeout. */
  onStalled?: () => void;
  onFatalError?: (message: string) => void;
  /** Fired once metadata is ready for the current playSrc (e.g. to resume autoplay after a transcode seek/quality restart). */
  onLoadedMetadata?: () => void;
};

export type VideoElementState = {
  playing: boolean;
  /** Position within the currently loaded media element (resets to 0 on transcode restart). */
  current: number;
  duration: number;
  volume: number;
  muted: boolean;
  rate: number;
  buffering: boolean;
  audioTracks: PlayerTrackInfo[];
  textTracks: PlayerTrackInfo[];
  audioIdx: number;
  textIdx: number;
  bufferedAheadSec: number;
  fatalError: string | null;
};

const STALL_TIMEOUT_MS = 12000;

export function useVideoElement({
  videoRef,
  playSrc,
  transcodeOffsetSec,
  onEnded,
  onStalled,
  onFatalError,
  onLoadedMetadata,
}: UseVideoElementOptions) {
  const [state, setState] = useState<VideoElementState>({
    playing: false,
    current: 0,
    duration: 0,
    volume: 1,
    muted: false,
    rate: 1,
    buffering: false,
    audioTracks: [],
    textTracks: [],
    audioIdx: 0,
    textIdx: -1,
    bufferedAheadSec: 0,
    fatalError: null,
  });
  const stallTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !playSrc) return;
    el.load();
    setState((s) => ({
      ...s,
      current: 0,
      duration: 0,
      playing: false,
      buffering: false,
      fatalError: null,
    }));
  }, [videoRef, playSrc]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const clearStallTimer = () => {
      if (stallTimerRef.current) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
    };
    const armStallTimer = () => {
      clearStallTimer();
      stallTimerRef.current = window.setTimeout(() => onStalled?.(), STALL_TIMEOUT_MS);
    };

    const refreshTracks = () => {
      const audio: PlayerTrackInfo[] = [];
      const anyEl = el as HTMLVideoElement & {
        audioTracks?: {
          length: number;
          [i: number]: { label?: string; language?: string; enabled: boolean };
        };
      };
      if (anyEl.audioTracks && anyEl.audioTracks.length > 0) {
        for (let i = 0; i < anyEl.audioTracks.length; i++) {
          const t = anyEl.audioTracks[i];
          audio.push({
            id: `a${i}`,
            label: t.label || t.language || `Audio ${i + 1}`,
            kind: 'audio',
            index: i,
            language: t.language,
          });
        }
      } else {
        audio.push({ id: 'a0', label: 'Default', kind: 'audio', index: 0 });
      }
      const texts: PlayerTrackInfo[] = [];
      for (let i = 0; i < el.textTracks.length; i++) {
        const t = el.textTracks[i];
        if (t.kind === 'metadata' || t.kind === 'chapters') continue;
        texts.push({
          id: `t${i}`,
          label: t.label || t.language || `Subtitle ${i + 1}`,
          kind: 'text',
          index: i,
          language: t.language,
        });
        // Never let the browser render its own cue box — we render subtitles ourselves.
        if (t.mode !== 'hidden') t.mode = 'hidden';
      }
      setState((s) => ({ ...s, audioTracks: audio, textTracks: texts }));
    };
    const onMeta = () => {
      setState((s) => ({ ...s, duration: el.duration || 0 }));
      onLoadedMetadata?.();
    };
    const onTime = () => {
      let bufferedAhead = 0;
      try {
        for (let i = 0; i < el.buffered.length; i++) {
          if (el.buffered.start(i) <= el.currentTime && el.currentTime <= el.buffered.end(i)) {
            bufferedAhead = el.buffered.end(i) - el.currentTime;
            break;
          }
        }
      } catch {
        /* ignore */
      }
      setState((s) => ({
        ...s,
        current: el.currentTime || 0,
        playing: !el.paused,
        bufferedAheadSec: bufferedAhead,
      }));
    };
    const onPlay = () => setState((s) => ({ ...s, playing: true }));
    const onPause = () => {
      clearStallTimer();
      setState((s) => ({ ...s, playing: false }));
    };
    const onWaiting = () => {
      armStallTimer();
      setState((s) => ({ ...s, buffering: true }));
    };
    const onPlaying = () => {
      clearStallTimer();
      setState((s) => ({ ...s, playing: true, buffering: false }));
    };
    const onCanPlay = () => setState((s) => ({ ...s, buffering: false }));
    const onEndedEvt = () => {
      clearStallTimer();
      onEnded?.();
    };
    const onErrorEvt = () => {
      clearStallTimer();
      const mediaErr = el.error;
      const message = mediaErrorMessage(mediaErr?.code);
      setState((s) => ({ ...s, fatalError: message }));
      onFatalError?.(message);
    };

    const trackList = el.textTracks as TextTrackList & {
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    trackList.addEventListener?.('addtrack', refreshTracks);
    el.addEventListener('loadedmetadata', refreshTracks);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('progress', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('ended', onEndedEvt);
    el.addEventListener('error', onErrorEvt);
    refreshTracks();
    return () => {
      clearStallTimer();
      trackList.removeEventListener?.('addtrack', refreshTracks);
      el.removeEventListener('loadedmetadata', refreshTracks);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('progress', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('ended', onEndedEvt);
      el.removeEventListener('error', onErrorEvt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, playSrc, onEnded, onStalled, onFatalError, onLoadedMetadata]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const anyEl = el as HTMLVideoElement & {
      audioTracks?: { length: number; [i: number]: { enabled: boolean } };
    };
    if (anyEl.audioTracks) {
      for (let i = 0; i < anyEl.audioTracks.length; i++)
        anyEl.audioTracks[i].enabled = i === state.audioIdx;
    }
  }, [videoRef, state.audioIdx]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = state.rate;
  }, [videoRef, state.rate]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = state.volume;
    el.muted = state.muted;
  }, [videoRef, state.volume, state.muted]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play()?.catch?.(() => {});
    else el.pause();
  }, [videoRef]);

  /** Seeks within the currently loaded media element (relative time, not absolute). */
  const seekRelative = useCallback(
    (value: number) => {
      const el = videoRef.current;
      if (!el || !Number.isFinite(value)) return;
      el.currentTime = Math.max(0, value);
      setState((s) => ({ ...s, current: Math.max(0, value) }));
    },
    [videoRef],
  );

  return {
    ...state,
    /** Absolute position across transcode restarts, for UI/segment logic. */
    absoluteCurrent: state.current + transcodeOffsetSec,
    togglePlay,
    seekRelative,
    setVolume: (v: number) => setState((s) => ({ ...s, volume: Math.min(1, Math.max(0, v)) })),
    setMuted: (m: boolean) => setState((s) => ({ ...s, muted: m })),
    setRate: (r: number) => setState((s) => ({ ...s, rate: r })),
    setAudioIdx: (i: number) => setState((s) => ({ ...s, audioIdx: i })),
    setTextIdx: (i: number) => setState((s) => ({ ...s, textIdx: i })),
  };
}

// Mirrors the standard MediaError.MEDIA_ERR_* codes (1-4); referenced as
// literals since jsdom's test environment doesn't always expose the global.
function mediaErrorMessage(code: number | undefined): string {
  switch (code) {
    case 2: // MEDIA_ERR_NETWORK
      return 'Playback stopped because of a network error.';
    case 3: // MEDIA_ERR_DECODE
      return 'This file could not be decoded by your browser.';
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return "This format isn't supported for playback.";
    case 1: // MEDIA_ERR_ABORTED
      return 'Playback was aborted.';
    default:
      return 'Playback failed unexpectedly.';
  }
}
