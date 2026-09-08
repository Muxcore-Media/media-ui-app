import Hls from 'hls.js';

export function isHlsPlaySrc(src: string): boolean {
  return src.includes('/stream/hls');
}

/** Prefer the seekable HLS playlist; keep the fMP4 pipe as an explicit fallback. */
export function toHlsPlaySrc(url: string): string {
  return url.replace('/stream/transcode', '/stream/hls');
}

export function transcodePlaySrc(
  src: string,
  extras?: { maxHeight?: number; audioIndex?: number; subtitleIndex?: number; startSec?: number },
): string {
  const params = new URLSearchParams({ src });
  if (extras?.maxHeight && extras.maxHeight > 0) {
    params.set('max_height', String(extras.maxHeight));
  }
  if (extras?.audioIndex != null && extras.audioIndex >= 0) {
    params.set('audio_index', String(extras.audioIndex));
  }
  if (extras?.subtitleIndex != null && extras.subtitleIndex >= 0) {
    params.set('subtitle_index', String(extras.subtitleIndex));
  }
  if (extras?.startSec != null && extras.startSec > 0) {
    params.set('start', extras.startSec.toFixed(2));
  }
  return `/stream/hls?${params.toString()}`;
}

/** Relative time still inside the current HLS EVENT buffer — use native currentTime. */
export function hlsSeekIsBuffered(relativeSec: number, seekableEnd: number): boolean {
  return relativeSec >= 0 && seekableEnd > 0 && relativeSec <= seekableEnd + 1.5;
}

export function finitePlaybackDuration(videoDuration: number, fallback = 0): number {
  if (Number.isFinite(videoDuration) && videoDuration > 0) return videoDuration;
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

/** Attach HLS to a video element. Safari can play the playlist natively. */
export function attachHls(video: HTMLVideoElement, src: string): () => void {
  if (!src) return () => {};
  const native = video.canPlayType('application/vnd.apple.mpegurl');
  if (native) {
    video.src = src;
    return () => {
      video.removeAttribute('src');
      video.load();
    };
  }
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      liveDurationInfinity: false,
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => {
      hls.destroy();
    };
  }
  video.src = src;
  return () => {
    video.removeAttribute('src');
  };
}
