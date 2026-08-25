import { describe, expect, it } from 'vitest';
import { DEFAULT_CAPABILITIES } from './capabilities';
import { parseSearchScope, searchScopesForCaps } from './unified-search';

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
