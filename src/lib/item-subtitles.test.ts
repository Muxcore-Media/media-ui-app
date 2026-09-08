import { describe, expect, it } from 'vitest';
import {
  itemSubtitlesPath,
  normalizeItemSubtitles,
  subtitleFileLabel,
  subtitleTargetLabel,
  uploadSubtitleBody,
} from './item-subtitles';

describe('item-subtitles', () => {
  it('normalizes household subtitle files', () => {
    const next = normalizeItemSubtitles({
      available: true,
      items: [{
        id: 'sub1', media_file_id: 'mf1', language: 'eng', format: 'srt',
        forced: true, hearing_impaired: true, source: 'upload', filename: 'Fight.Club.eng.srt',
      }],
      files: [{ id: 'mf1', title: 'Pilot', season: 1, episode: 1 }],
    });
    expect(next.available).toBe(true);
    expect(next.items[0].mediaFileId).toBe('mf1');
    expect(subtitleFileLabel(next.items[0])).toBe('ENG · srt · forced · HI · upload');
    expect(subtitleTargetLabel(next.files[0])).toBe('S01E01 · Pilot');
    expect(itemSubtitlesPath('movie', 'm1')).toBe('/api/movies/m1/subtitles');
    expect(uploadSubtitleBody({ language: 'spa', filename: 'a.srt', data: 'abc', mediaFileId: 'mf1' })).toEqual({
      language: 'spa',
      filename: 'a.srt',
      data: 'abc',
      media_file_id: 'mf1',
      forced: false,
      hearing_impaired: false,
    });
  });
});
