import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CAPABILITIES } from './capabilities';
import { ParentalError } from '../api/errors';
import { parseSearchScope, runUnifiedSearch, searchScopesForCaps } from './unified-search';

const listMovies = vi.fn();
const listTVShows = vi.fn();
const search = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    listMovies: (...args: unknown[]) => listMovies(...args),
    listTVShows: (...args: unknown[]) => listTVShows(...args),
    search: (...args: unknown[]) => search(...args),
  },
}));

describe('unified-search', () => {
  it('parseSearchScope defaults to all', () => {
    expect(parseSearchScope(null)).toBe('all');
    expect(parseSearchScope('movies')).toBe('movies');
    expect(parseSearchScope('add')).toBe('add');
  });

  it('searchScopesForCaps includes enabled libraries and add when search feature on', () => {
    const scopes = searchScopesForCaps(DEFAULT_CAPABILITIES);
    expect(scopes.map((s) => s.id)).toEqual(['all', 'movies', 'tv', 'add']);
  });

  it('still shows add when movies/tv libraries are enabled', () => {
    const caps = {
      ...DEFAULT_CAPABILITIES,
      features: { ...DEFAULT_CAPABILITIES.features, search: false, request: false },
    };
    const scopes = searchScopesForCaps(caps);
    expect(scopes.map((s) => s.id)).toEqual(['all', 'movies', 'tv', 'add']);
  });

  it('shows add when music library is enabled', () => {
    const caps = {
      ...DEFAULT_CAPABILITIES,
      features: { ...DEFAULT_CAPABILITIES.features, search: false, request: false },
      libraries: { ...DEFAULT_CAPABILITIES.libraries, movies: false, tv: false, music: true },
    };
    const scopes = searchScopesForCaps(caps);
    expect(scopes.map((s) => s.id)).toContain('add');
    expect(scopes.map((s) => s.id)).toContain('music');
  });
});


describe('runUnifiedSearch parental outcomes', () => {
  beforeEach(() => {
    listMovies.mockReset().mockResolvedValue({ items: [] });
    listTVShows.mockReset().mockResolvedValue({ items: [] });
    search.mockReset();
  });

  it('reports a restricted external catalogue and keeps local results', async () => {
    search.mockRejectedValue(new ParentalError('parental.restricted_route', 403));
    const res = await runUnifiedSearch(DEFAULT_CAPABILITIES, 'fight', 'all');
    expect(res.remote).toEqual([]);
    expect(res.remoteParental).toBe('parental.restricted_route');
  });

  it('omits remoteParental for ordinary remote failures and successes', async () => {
    search.mockRejectedValueOnce(new Error('boom'));
    expect(await runUnifiedSearch(DEFAULT_CAPABILITIES, 'fight', 'all')).toEqual({ library: [], remote: [] });
    search.mockResolvedValueOnce([]);
    expect(await runUnifiedSearch(DEFAULT_CAPABILITIES, 'fight', 'all')).toEqual({ library: [], remote: [] });
  });

  it('rejects when a local library list cannot be checked, never returning partial results', async () => {
    search.mockResolvedValue([]);
    listMovies.mockRejectedValue(new ParentalError('parental.policy_unavailable', 503));
    await expect(runUnifiedSearch(DEFAULT_CAPABILITIES, 'fight', 'all')).rejects.toBeInstanceOf(ParentalError);
  });
});
