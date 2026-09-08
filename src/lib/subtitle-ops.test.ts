import { describe, expect, it } from 'vitest';
import {
  appendProfileLanguage,
  groupSubtitleLibrary,
  massEditSubtitleBody,
  normalizeSubtitleBlacklist,
  normalizeSubtitleHistory,
  normalizeSubtitleLanguages,
  normalizeSubtitleLibrary,
  normalizeSubtitleProfiles,
  normalizeSubtitleProviders,
  normalizeWanted,
  profileLanguagesLabel,
  uniqueSubtitleLanguages,
  wantedWriteBody,
} from './subtitle-ops';

describe('subtitle-ops', () => {
  it('normalizes wanted, providers, history, and profiles', () => {
    const wanted = normalizeWanted({
      available: true,
      total: 1,
      wanted: [{ id: 'w1', title: 'Interstellar', media_id: 'm1', language: 'eng', media_type: 'movie' }],
    });
    expect(wanted.available).toBe(true);
    expect(wanted.wanted[0]).toMatchObject({ id: 'w1', title: 'Interstellar', mediaId: 'm1' });

    const providers = normalizeSubtitleProviders({
      available: true,
      providers: [{ id: 'opensubtitles', name: 'OpenSubtitles', enabled: true, implemented: true }],
    });
    expect(providers.providers[0].id).toBe('opensubtitles');

    const history = normalizeSubtitleHistory({
      available: true,
      history: [{ id: 'h1', title: 'Dune', provider: 'opensubtitles', action: 'download', created_at: '2026-01-01' }],
    });
    expect(history.history[0].createdAt).toBe('2026-01-01');

    const profiles = normalizeSubtitleProfiles({
      available: true,
      profiles: [{
        id: 'lp1',
        name: 'English+HI',
        is_default: true,
        languages: [{ language: 'eng', hearing_impaired: true }],
      }],
    });
    expect(profileLanguagesLabel(profiles.profiles[0])).toBe('eng+HI');
    const blocked = normalizeSubtitleBlacklist({
      available: true,
      entries: [{ id: 'bl1', title: 'Dune.2021.1080p', provider: 'opensubtitles', reason: 'wrong hash' }],
    });
    expect(blocked.entries[0]).toMatchObject({ id: 'bl1', title: 'Dune.2021.1080p', reason: 'wrong hash' });

    expect(wantedWriteBody({ title: 'Dune', language: 'eng' })).toEqual({
      title: 'Dune',
      language: 'eng',
      media_type: undefined,
    });
  });

  it('groups subtitle library movies and series', () => {
    const listed = normalizeSubtitleLibrary({
      available: true,
      total: 3,
      items: [
        { id: 'mov1', title: 'Dune', media_type: 'movie', language_profile_id: 'lp_default', monitored: true, year: 2021 },
        { id: 'ep1', title: 'Pilot', media_type: 'episode', series_id: 'show1', series_name: 'Severance', language_profile_id: 'lp_hi', monitored: true },
        { id: 'ep2', title: 'Half Loop', media_type: 'episode', series_id: 'show1', series_name: 'Severance', monitored: false },
      ],
    });
    expect(listed.items).toHaveLength(3);
    const rows = groupSubtitleLibrary(listed.items);
    expect(rows).toEqual([
      expect.objectContaining({ key: 'movie:mov1', title: 'Dune', kind: 'movie', mediaIds: ['mov1'], languageProfileId: 'lp_default' }),
      expect.objectContaining({
        key: 'series:show1',
        title: 'Severance',
        kind: 'series',
        mediaIds: ['ep1', 'ep2'],
        languageProfileId: 'lp_hi',
        monitored: false,
        episodeCount: 2,
      }),
    ]);
    expect(massEditSubtitleBody({ mediaIds: ['ep1', 'ep2'], languageProfileId: 'lp_hi' })).toEqual({
      media_ids: ['ep1', 'ep2'],
      language_profile_id: 'lp_hi',
      set_monitored: false,
      monitored: false,
    });
  });

  it('dedupes catalog aliases and appends profile tokens', () => {
    const listed = normalizeSubtitleLanguages({
      available: true,
      languages: [
        { code: 'en', name: 'English' },
        { code: 'eng', name: 'English' },
        { code: 'spa', name: 'Spanish' },
      ],
    });
    expect(uniqueSubtitleLanguages(listed.languages).map((row) => row.code)).toEqual(['eng', 'spa']);
    expect(appendProfileLanguage('eng', 'spa', { hearingImpaired: true })).toBe('eng, spa+hi');
    expect(appendProfileLanguage('eng, spa+hi', 'spa')).toBe('eng, spa+hi');
  });
});
