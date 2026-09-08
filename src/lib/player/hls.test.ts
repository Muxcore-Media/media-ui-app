import { describe, expect, it } from 'vitest';
import {
  finitePlaybackDuration,
  isHlsPlaySrc,
  toHlsPlaySrc,
  transcodePlaySrc,
  hlsSeekIsBuffered,
} from './hls';

describe('hls helpers', () => {
  it('detects household HLS play URLs', () => {
    expect(isHlsPlaySrc('/stream/hls?src=%2Fstream%2Fmovies%2Fm1')).toBe(true);
    expect(isHlsPlaySrc('/stream/transcode?src=%2Fstream%2Fmovies%2Fm1')).toBe(false);
    expect(isHlsPlaySrc('/stream/movies/m1')).toBe(false);
  });

  it('rewrites the piped fallback onto the HLS playlist', () => {
    expect(toHlsPlaySrc('/stream/transcode?src=%2Fm1&max_height=720')).toBe(
      '/stream/hls?src=%2Fm1&max_height=720',
    );
  });

  it('builds a seekable transcode playlist URL', () => {
    expect(transcodePlaySrc('/stream/movies/m1', { maxHeight: 720, audioIndex: 3, startSec: 611.5 })).toBe(
      '/stream/hls?src=%2Fstream%2Fmovies%2Fm1&max_height=720&audio_index=3&start=611.50',
    );
  });

  it('keeps in-buffer HLS scrubs on the current playlist', () => {
    expect(hlsSeekIsBuffered(12, 40)).toBe(true);
    expect(hlsSeekIsBuffered(80, 40)).toBe(false);
    expect(hlsSeekIsBuffered(0, 0)).toBe(false);
  });

  it('ignores Infinity duration from a live EVENT playlist', () => {
    expect(finitePlaybackDuration(Number.POSITIVE_INFINITY, 7200)).toBe(7200);
    expect(finitePlaybackDuration(611.5, 7200)).toBe(611.5);
    expect(finitePlaybackDuration(0, 0)).toBe(0);
  });
});
