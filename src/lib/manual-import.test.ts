import { describe, expect, it } from 'vitest';
import {
  formatImportSize,
  importCandidateDetail,
  importCandidateMatch,
  importPathBody,
  normalizeImportCandidates,
  normalizeImportResult,
} from './manual-import';

describe('manual-import', () => {
  it('normalizes scanner candidates', () => {
    const res = normalizeImportCandidates({
      available: true,
      total: 1,
      items: [{ path: '/downloads/Dune.2021.mkv', title: 'Dune', year: 2021, media_type: 'movie', size: 1048576 }],
    });
    expect(res.items[0]?.title).toBe('Dune');
    expect(importCandidateDetail(res.items[0]!)).toContain('movie');
    expect(formatImportSize(1048576)).toBe('1.0 MB');
  });

  it('shows parsed quality on a Manual Import row', () => {
    const res = normalizeImportCandidates({
      available: true,
      items: [
        {
          path: '/downloads/Dune.2021.1080p.REMUX.mkv',
          title: 'Dune',
          year: 2021,
          media_type: 'movie',
          quality: { label: '1080p Remux', resolution: '1080p', source: 'Remux', hdr: true },
        },
      ],
    });
    expect(res.items[0]?.quality?.label).toBe('1080p Remux');
    expect(importCandidateDetail(res.items[0]!)).toContain('1080p Remux');
  });

  it('shows a library episode match for Manual Import', () => {
    const res = normalizeImportCandidates({
      available: true,
      items: [{
        path: '/downloads/Severance.S01E01.mkv',
        title: 'Severance',
        media_type: 'tv',
        season_number: 1,
        episode_number: 1,
        matched: true,
        series_name: 'Severance',
        episode_title: 'Good News About Hell',
      }],
    });
    expect(importCandidateMatch(res.items[0]!)).toBe('Severance · S01E01 · Good News About Hell');
    expect(importPathBody(res.items[0]!)).toEqual({
      path: '/downloads/Severance.S01E01.mkv',
      title: 'Severance',
      media_type: 'tv',
      year: undefined,
      season_number: 1,
      episode_number: 1,
    });
  });

  it('summarizes an import', () => {
    expect(normalizeImportResult({ imported: 1, skipped: 0, found: 1, message: 'imported=1 skipped=0 found=1' }).imported).toBe(
      1,
    );
  });
});
