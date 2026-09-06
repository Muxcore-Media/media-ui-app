import { useCallback, useEffect, useRef, useState } from 'react';

export type UsePlayerChromeOptions = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  initialTheaterMode: boolean;
  /** Auto-hide is suspended while true (menus open, paused with mouse idle handling elsewhere). */
  keepControlsVisible: boolean;
};

/**
 * Minimal interface for the W3C Remote Playback API (Chrome/Edge).
 * Not yet in TypeScript's DOM lib at the time of writing.
 */
interface RemotePlayback extends EventTarget {
  readonly state: 'connecting' | 'connected' | 'disconnected';
  prompt(): Promise<void>;
}

type VideoWithRemote = HTMLVideoElement & { remote?: RemotePlayback };
type VideoWithAirPlay = HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void };

/** Fullscreen, theater mode, Picture-in-Picture, Cast (Remote Playback API),
 * AirPlay, and the auto-hiding control chrome timer shared by the top bar /
 * bottom bar / center overlay. */
export function usePlayerChrome({
  containerRef,
  videoRef,
  initialTheaterMode,
  keepControlsVisible,
}: UsePlayerChromeOptions) {
  const [fullscreen, setFullscreen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(initialTheaterMode);
  const [pipActive, setPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [castSupported, setCastSupported] = useState(false);
  const [castConnected, setCastConnected] = useState(false);
  const [airPlaySupported, setAirPlaySupported] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setPipSupported(Boolean(document.pictureInPictureEnabled));
    // Prototype-level detection so support flags are set even before the
    // video element is mounted (avoids a flash of wrong button state).
    if (typeof HTMLVideoElement !== 'undefined') {
      setCastSupported('remote' in HTMLVideoElement.prototype);
      setAirPlaySupported('webkitShowPlaybackTargetPicker' in HTMLVideoElement.prototype);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onEnter = () => setPipActive(true);
    const onLeave = () => setPipActive(false);
    el.addEventListener('enterpictureinpicture', onEnter);
    el.addEventListener('leavepictureinpicture', onLeave);

    // Track Remote Playback (Cast) connection state via API events.
    const remote = (el as VideoWithRemote).remote;
    const updateCastState = () => {
      if (!remote) return;
      setCastConnected(remote.state === 'connected' || remote.state === 'connecting');
    };
    if (remote) {
      remote.addEventListener('connecting', updateCastState);
      remote.addEventListener('connect', updateCastState);
      remote.addEventListener('disconnect', updateCastState);
    }

    return () => {
      el.removeEventListener('enterpictureinpicture', onEnter);
      el.removeEventListener('leavepictureinpicture', onLeave);
      if (remote) {
        remote.removeEventListener('connecting', updateCastState);
        remote.removeEventListener('connect', updateCastState);
        remote.removeEventListener('disconnect', updateCastState);
      }
    };
  }, [videoRef]);

  const bumpControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (keepControlsVisible) return;
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3500);
  }, [keepControlsVisible]);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [bumpControls]);

  useEffect(() => {
    if (keepControlsVisible) {
      setShowControls(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    }
  }, [keepControlsVisible]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen?.();
  }, [containerRef]);

  const toggleTheater = useCallback(() => setTheaterMode((t) => !t), []);

  const togglePiP = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void el.requestPictureInPicture?.().catch(() => {});
  }, [videoRef]);

  const toggleCast = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const remote = (el as VideoWithRemote).remote;
    void remote?.prompt().catch(() => {});
  }, [videoRef]);

  const toggleAirPlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    (el as VideoWithAirPlay).webkitShowPlaybackTargetPicker?.();
  }, [videoRef]);

  return {
    fullscreen,
    theaterMode,
    setTheaterMode,
    pipActive,
    pipSupported,
    castSupported,
    castConnected,
    airPlaySupported,
    showControls,
    bumpControls,
    toggleFullscreen,
    toggleTheater,
    togglePiP,
    toggleCast,
    toggleAirPlay,
  };
}
