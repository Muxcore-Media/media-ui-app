import { describe, expect, it } from 'vitest';
import {
  audioGraphDelaySeconds,
  clampAudioOffsetMs,
  formatAudioOffset,
  leadAudioTime,
} from './audio-offset';
import { applyHouseholdAudioOffset } from './audio-delay';

function fakeMedia(overrides: Partial<HTMLMediaElement> = {}): HTMLMediaElement {
  return {
    currentTime: 12,
    muted: false,
    paused: true,
    volume: 0.8,
    playbackRate: 1,
    crossOrigin: '',
    ...overrides,
  } as HTMLMediaElement;
}

function fakeAudio(): HTMLAudioElement {
  const audio = {
    preload: '',
    src: '',
    volume: 0,
    muted: false,
    playbackRate: 1,
    currentTime: 0,
    paused: true,
    getAttribute(name: string) {
      return name === 'src' ? audio.src : null;
    },
    pause() {
      audio.paused = true;
    },
    play() {
      audio.paused = false;
      return Promise.resolve();
    },
    removeAttribute() {
      audio.src = '';
    },
    load() {},
  };
  return audio as unknown as HTMLAudioElement;
}

describe('audio offset', () => {
  it('clamps and rejects non-finite values', () => {
    expect(clampAudioOffsetMs(Number.NaN)).toBe(0);
    expect(clampAudioOffsetMs(12_000)).toBe(10_000);
    expect(clampAudioOffsetMs(-12_500)).toBe(-10_000);
    expect(clampAudioOffsetMs(250.4)).toBe(250);
  });

  it('formats signed seconds', () => {
    expect(formatAudioOffset(0)).toBe('0.00s');
    expect(formatAudioOffset(250)).toBe('+0.25s');
    expect(formatAudioOffset(-1000)).toBe('-1.00s');
  });

  it('maps positive offsets onto a DelayNode and negative onto an earlier file time', () => {
    expect(audioGraphDelaySeconds(500)).toBe(0.5);
    expect(audioGraphDelaySeconds(-500)).toBe(0);
    expect(leadAudioTime(10, -500)).toBe(9.5);
    expect(leadAudioTime(10, 500)).toBe(10);
    expect(leadAudioTime(0.2, -1000)).toBe(0);
  });
});

describe('applyHouseholdAudioOffset', () => {
  it('leads a second audio element for negative direct-play offsets', () => {
    const video = fakeMedia();
    const audio = fakeAudio();
    const result = applyHouseholdAudioOffset({
      video,
      playSrc: '/stream/movies/m1',
      offsetMs: -500,
      canLead: true,
      createAudio: () => audio,
    });
    expect(result).toEqual({ mode: 'lead', appliedSec: 11.5 });
    expect(audio.src).toBe('/stream/movies/m1');
    expect(audio.currentTime).toBe(11.5);
    expect(video.muted).toBe(true);
  });

  it('delays through a Web Audio graph for positive offsets', () => {
    const video = fakeMedia();
    const delay = {
      applied: 0,
      delayTime: { setValueAtTime: (value: number) => { delay.applied = value; } },
      connect: () => {},
    };
    const ctx = {
      currentTime: 1,
      resume: () => Promise.resolve(),
      createMediaElementSource: () => ({ connect: () => {} }),
      createDelay: () => delay,
      destination: {},
    };
    const result = applyHouseholdAudioOffset({
      video,
      playSrc: '/stream/movies/m1',
      offsetMs: 750,
      canLead: true,
      createContext: () => ctx as unknown as AudioContext,
    });
    expect(result).toEqual({ mode: 'delay', appliedSec: 0.75 });
    expect(delay.applied).toBe(0.75);
  });
});
