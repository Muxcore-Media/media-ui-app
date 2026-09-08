import { describe, expect, it } from 'vitest';
import {
  customFormatWriteBody,
  formatRulesText,
  normalizeFormatScore,
  normalizeFormatsCatalog,
  normalizeParsedQuality,
  parsedQualityLabel,
  parseFormatRules,
  parseReleaseTerms,
  qualityProfileWriteBody,
  releaseProfileWriteBody,
} from './formats';

describe('formats catalog', () => {
  it('normalizes TRaSH pack rows from the BFF', () => {
    const cat = normalizeFormatsCatalog({
      available: true,
      formats: [
        {
          id: 'cf_trash_1',
          name: 'Remux-1080p',
          score: 1850,
          rules: [{ field: 'title', op: 'contains', value: 'REMUX' }],
        },
      ],
      profiles: [
        {
          id: 'qp_hd',
          name: 'HD Bluray + WEB',
          cutoffScore: 10000,
          upgradeAllowed: true,
          formatScores: { cf_trash_1: 1850 },
        },
      ],
      sync: { formatsUpserted: 8, profilesUpserted: 3, guidesPath: 'embedded:guides-fixture' },
    });
    expect(cat.available).toBe(true);
    expect(cat.formats[0]?.name).toBe('Remux-1080p');
    expect(cat.formats[0]?.rules[0]?.value).toBe('REMUX');
    expect(cat.profiles[0]?.cutoffScore).toBe(10000);
    expect(cat.profiles[0]?.formatScores.cf_trash_1).toBe(1850);
    expect(cat.sync?.formatsUpserted).toBe(8);
    expect(cat.releaseProfiles).toEqual([]);
  });

  it('normalizes release restrictions', () => {
    const cat = normalizeFormatsCatalog({
      available: true,
      release_profiles: [
        { id: 'rpg1', name: 'Default Blocklist', must_not_contain: ['cam'], preferred: 'bluray, remux', enabled: true },
      ],
    });
    expect(cat.releaseProfiles[0]).toMatchObject({
      name: 'Default Blocklist',
      mustNotContain: ['cam'],
      preferred: ['bluray', 'remux'],
      enabled: true,
    });
    expect(parseReleaseTerms('cam, telesync')).toEqual(['cam', 'telesync']);
    expect(releaseProfileWriteBody({ name: 'No CAM', mustNotContain: ['cam'], enabled: true })).toEqual({
      name: 'No CAM',
      preferred: [],
      must_contain: [],
      must_not_contain: ['cam'],
      preferred_score: 0,
      enabled: true,
    });
  });

  it('normalizes a score preview', () => {
    const preview = normalizeFormatScore({
      totalScore: 2000,
      formatScore: 1850,
      quality: { label: '1080p Remux HDR', resolution: '1080p', hdr: true },
      matches: [{ name: 'Remux-1080p', score: 1850 }],
    });
    expect(preview.totalScore).toBe(2000);
    expect(preview.matches[0]?.name).toBe('Remux-1080p');
    expect(preview.quality.hdr).toBe(true);
  });

  it('normalizes a parsed quality title', () => {
    const q = normalizeParsedQuality({
      quality: { label: '2160p Remux HDR', resolution: '2160p', source: 'Remux', codec: 'hevc', hdr: true, score: 400 },
    });
    expect(q).toMatchObject({ label: '2160p Remux HDR', resolution: '2160p', hdr: true, score: 400 });
    expect(parsedQualityLabel(q)).toBe('2160p Remux HDR');
    expect(parsedQualityLabel({ label: '', resolution: '1080p', source: 'WEB-DL', codec: 'h264', hdr: false, score: 0 })).toBe(
      '1080p · WEB-DL · h264',
    );
  });

  it('parses and writes custom-format rules', () => {
    const rules = parseFormatRules('title|contains|REMUX\ntitle|matches|HDR|negate');
    expect(rules).toEqual([
      { field: 'title', op: 'contains', value: 'REMUX', negate: false },
      { field: 'title', op: 'matches', value: 'HDR', negate: true },
    ]);
    expect(formatRulesText(rules)).toBe('title|contains|REMUX\ntitle|matches|HDR|negate');
    expect(customFormatWriteBody({ name: 'REMUX', score: 2000, rules })).toEqual({
      name: 'REMUX',
      default_score: 2000,
      score: 2000,
      rules,
    });
  });

  it('writes snake_case profile bodies', () => {
    expect(
      qualityProfileWriteBody({
        name: 'HD',
        minScore: 10,
        cutoffScore: 10000,
        upgradeAllowed: true,
        upgradeDelayMinutes: 15,
        formatScores: { cf1: 1850 },
      }),
    ).toEqual({
      name: 'HD',
      min_score: 10,
      cutoff_score: 10000,
      upgrade_allowed: true,
      upgrade_delay_minutes: 15,
      format_scores: { cf1: 1850 },
    });
  });
});
