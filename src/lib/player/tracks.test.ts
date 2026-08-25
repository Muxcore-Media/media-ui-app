import { describe, expect, it } from 'vitest';
import {
  audioTracksFromAnalysis,
  formatAudioTrackLabel,
  mergeAudioTracks,
  subtitleTracksFromAnalysis,
} from './tracks';
import type { PlayerTrackInfo } from './types';

describe('audioTracksFromAnalysis', () => {
  it('maps ffprobe audio into player tracks', () => {
    const tracks = audioTracksFromAnalysis([
      { index: 2, language: 'eng', channel_layout: '5.1', codec: 'ac3', label: 'ENG · 5.1 · AC3' },
    ]);
    expect(tracks[0].streamIndex).toBe(2);
    expect(tracks[0].kind).toBe('audio');
  });
});

describe('mergeAudioTracks', () => {
  it('prefers probe tracks over native', () => {
    const native: PlayerTrackInfo[] = [{ id: 'a0', label: 'Track 2', kind: 'audio', index: 0 }];
    const probe: PlayerTrackInfo[] = [
      { id: 'p0', label: 'ENG · 5.1', kind: 'audio', index: 0, streamIndex: 2 },
    ];
    expect(mergeAudioTracks(native, probe)[0].label).toBe('ENG · 5.1');
  });
});

describe('subtitleTracksFromAnalysis', () => {
  it('flags picture subtitles', () => {
    const tracks = subtitleTracksFromAnalysis([
      {
        index: 5,
        codec: 'hdmv_pgs_subtitle',
        language: 'eng',
        picture_based: true,
        text_based: false,
      },
    ]);
    expect(tracks[0].pictureBased).toBe(true);
  });
});

describe('formatAudioTrackLabel', () => {
  it('builds a readable label', () => {
    expect(
      formatAudioTrackLabel({
        id: 'a',
        label: 'Audio',
        kind: 'audio',
        index: 0,
        language: 'jpn',
        channelLayout: '5.1',
        codec: 'dts',
      }),
    ).toBe('JPN · 5.1 · DTS');
  });
});
