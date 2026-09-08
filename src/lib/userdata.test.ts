import { describe, expect, it, beforeEach } from 'vitest';
import { getParentalState, verifyPin } from './parental';
import { getCurrentUserId, setCurrentUserId } from './session';
import {
  continueWatching,
  getParentalPrefs,
  isServerAuthoritative,
  isWantToWatch,
  listProgress,
  listWantToWatch,
  normalizeParentalPrefs,
  parentalForStorage,
  getPreferences,
  pullUserdataFromServer,
  resolveNextUp,
  showIdFromHref,
  toggleWantToWatch,
  updatePreferences,
  upsertProgress,
} from './userdata';

describe('userdata server cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks server authoritative after successful pull and prefers server progress', async () => {
    upsertProgress({
      id: 'm1',
      kind: 'movie',
      title: 'Local',
      href: '/movies/m1',
      positionSec: 5,
      durationSec: 100,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const fetchMock = async () =>
      ({
        ok: true,
        json: async () => ({
          progress: {
            m1: {
              id: 'm1',
              kind: 'movie',
              title: 'Server',
              href: '/movies/m1',
              positionSec: 50,
              durationSec: 100,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
          favorites: {},
        }),
      }) as Response;
    globalThis.fetch = fetchMock as typeof fetch;

    const ok = await pullUserdataFromServer();
    expect(ok).toBe(true);
    expect(isServerAuthoritative()).toBe(true);
    expect(listProgress()[0]?.positionSec).toBe(50);
    expect(continueWatching(1)[0]?.title).toBe('Server');
  });

  it('parses show id from progress href', () => {
    expect(showIdFromHref('/tv/show-42')).toBe('show-42');
    expect(showIdFromHref('/player?back=%2Ftv%2Fabc')).toBe(null);
    expect(showIdFromHref('/movies/m1')).toBe(null);
  });

  it('resolves next episode after a watched episode via TV detail', async () => {
    upsertProgress({
      id: 'ep1',
      kind: 'episode',
      title: 'S01E01',
      href: '/tv/show-1',
      positionSec: 0,
      durationSec: 100,
      watched: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const next = await resolveNextUp(async (id) => {
      expect(id).toBe('show-1');
      return {
        id: 'show-1',
        title: 'Demo Show',
        poster_url: '/p.jpg',
        content_rating: 'TV-14',
        seasons: [
          {
            season_number: 1,
            episodes: [
              { id: 'ep1', season_number: 1, episode_number: 1, title: 'Pilot', has_file: true },
              {
                id: 'ep2',
                season_number: 1,
                episode_number: 2,
                title: 'Next',
                has_file: true,
                stream_url: '/stream/tv/ep2',
              },
            ],
          },
        ],
      };
    });

    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('ep2');
    expect(next[0]?.subtitle).toBe('Next up');
    expect(next[0]?.href).toContain('ep2');
    expect(next[0]?.content_rating).toBe('TV-14');
    expect(next[0]?.href).toContain('content_rating=TV-14');
  });
});

async function adminHashParentalPin(userId: string, pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}:${pin}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('normalizeParentalPrefs', () => {
  it('maps admin snake_case aliases and implies pinEnabled from pin_hash', () => {
    expect(
      normalizeParentalPrefs({
        kids_mode: true,
        max_parental_rating: 'PG',
        pin_hash: 'abc123',
      }),
    ).toEqual({
      kidsMode: true,
      maxRating: 'PG',
      pinHash: 'abc123',
      pinEnabled: true,
      blockedTags: '',
      allowedTags: '',
      allowUnrated: true,
    });
  });

  it('keeps camelCase ParentalPrefs as-is', () => {
    expect(
      normalizeParentalPrefs({
        kidsMode: false,
        maxRating: 'PG-13',
        pinHash: 'deadbeef',
        pinEnabled: true,
      }),
    ).toEqual({
      kidsMode: false,
      maxRating: 'PG-13',
      pinHash: 'deadbeef',
      pinEnabled: true,
      blockedTags: '',
      allowedTags: '',
      allowUnrated: true,
    });
  });

  it('prefers camelCase when both styles are present', () => {
    expect(
      normalizeParentalPrefs({
        kidsMode: false,
        kids_mode: true,
        maxRating: 'R',
        max_parental_rating: 'G',
        pinHash: 'camel',
        pin_hash: 'snake',
        pinEnabled: false,
        pin_enabled: true,
      }),
    ).toEqual({
      kidsMode: false,
      maxRating: 'R',
      pinHash: 'camel',
      pinEnabled: false,
      blockedTags: '',
      allowedTags: '',
      allowUnrated: true,
    });
  });

  it('returns unrestricted defaults for missing parental', () => {
    expect(normalizeParentalPrefs(undefined)).toEqual({
      kidsMode: false,
      maxRating: '',
      pinHash: '',
      pinEnabled: false,
      blockedTags: '',
      allowedTags: '',
      allowUnrated: true,
    });
  });
});

describe('parentalForStorage', () => {
  it('writes both aliases and keeps admin extras', () => {
    expect(
      parentalForStorage(
        { kidsMode: true, maxRating: 'PG', pinHash: 'x', pinEnabled: true },
        { blocked_tags: ['horror'], allow_unrated: false },
      ),
    ).toMatchObject({
      kidsMode: true,
      kids_mode: true,
      maxRating: 'PG',
      max_parental_rating: 'PG',
      pinHash: 'x',
      pin_hash: 'x',
      pinEnabled: true,
      pin_enabled: true,
      blocked_tags: ['horror'],
      allow_unrated: false,
    });
  });
});

describe('umbrella#85 admin snake_case userdata round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
    setCurrentUserId('');
  });

  it('activates kids/maxRating/PIN after a snake_case userdata pull', async () => {
    const userId = 'household-user-42';
    const pin = '2468';
    const pinHash = await adminHashParentalPin(userId, pin);

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method || 'GET').toUpperCase();
      if (method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            user_id: userId,
            prefs: {
              parental: {
                kids_mode: true,
                max_parental_rating: 'PG',
                pin_hash: pinHash,
                blocked_tags: ['violence'],
                allow_unrated: false,
              },
            },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const ok = await pullUserdataFromServer();
    expect(ok).toBe(true);
    expect(getCurrentUserId()).toBe(userId);

    const prefs = getParentalPrefs();
    expect(prefs).toEqual({
      kidsMode: true,
      maxRating: 'PG',
      pinHash,
      pinEnabled: true,
      blockedTags: 'violence',
      allowedTags: '',
      allowUnrated: false,
    });

    const state = getParentalState();
    expect(state.kidsMode).toBe(true);
    expect(state.maxRating).toBe('PG');
    expect(state.pinEnabled).toBe(true);
    expect(state.pinHash).toBe(pinHash);
    expect(state.anyRestriction).toBe(true);

    expect(await verifyPin(pin, state.pinHash)).toBe(true);
    expect(await verifyPin('0000', state.pinHash)).toBe(false);
  });
});

describe('want-to-watch userdata', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles titles and lists them from local cache', () => {
    const on = toggleWantToWatch({
      id: 'tmdb:movie:550',
      kind: 'movie',
      title: 'Fight Club',
      href: '/discover/movie/550',
      tmdbId: 550,
    });
    expect(on).toBe(true);
    expect(isWantToWatch('tmdb:movie:550')).toBe(true);
    expect(listWantToWatch()).toHaveLength(1);
    expect(toggleWantToWatch({
      id: 'tmdb:movie:550',
      kind: 'movie',
      title: 'Fight Club',
      href: '/discover/movie/550',
      tmdbId: 550,
    })).toBe(false);
    expect(listWantToWatch()).toHaveLength(0);
  });

  it('applies wantToWatch from a userdata pull', async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({
          wantToWatch: {
            'tmdb:movie:550': {
              id: 'tmdb:movie:550',
              kind: 'movie',
              title: 'Fight Club',
              href: '/discover/movie/550',
              tmdbId: 550,
            },
          },
        }),
      }) as Response) as typeof fetch;

    const ok = await pullUserdataFromServer();
    expect(ok).toBe(true);
    expect(listWantToWatch()[0]?.title).toBe('Fight Club');
    expect(isWantToWatch('tmdb:movie:550')).toBe(true);
  });

  it('defaults subtitle sync offset and clamps stored values', () => {
    expect(getPreferences().subtitles.offsetMs).toBe(0);
    expect(getPreferences().subtitles.textColor).toBe('#ffffff');
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ subtitles: { language: 'spa', offsetMs: 50_000, textColor: 'red' } }),
    );
    expect(getPreferences().subtitles.language).toBe('spa');
    expect(getPreferences().subtitles.offsetMs).toBe(10_000);
    expect(getPreferences().subtitles.textColor).toBe('#ffffff');
    expect(
      updatePreferences({
        subtitles: { ...getPreferences().subtitles, offsetMs: -12_000, textColor: '#ffff00' },
      }).subtitles,
    ).toMatchObject({ offsetMs: -10_000, textColor: '#ffff00' });
  });

  it('defaults audio sync offset and clamps stored values', () => {
    expect(getPreferences().playback.audioOffsetMs).toBe(0);
    localStorage.setItem(
      'muxcore.userdata.prefs.v1',
      JSON.stringify({ playback: { audioOffsetMs: 50_000 } }),
    );
    expect(getPreferences().playback.audioOffsetMs).toBe(10_000);
    expect(updatePreferences({ playback: { ...getPreferences().playback, audioOffsetMs: -12_000 } }).playback.audioOffsetMs).toBe(-10_000);
  });
});
