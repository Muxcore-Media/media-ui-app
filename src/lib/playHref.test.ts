import { describe, expect, it } from 'vitest';
import {
  buildProgressPlayerHref,
  buildMoviePlayerHref,
  withPlayerContentRating,
} from './playHref';

describe('buildProgressPlayerHref', () => {
  const base = {
    id: 'movie-42',
    kind: 'movie' as const,
    title: 'Inception',
    stream_url: '/stream/movies/movie-42',
    poster_url: '/poster.jpg',
    href: '/movies/movie-42',
  };

  it('forwards content_rating so the player PIN gate can run', () => {
    const href = buildProgressPlayerHref({ ...base, content_rating: 'R' });
    expect(href).toContain('/player');
    expect(href).toContain('content_rating=R');
    expect(href).not.toContain('restart=1');
  });

  it('omits content_rating when the join found none (soft-fail open)', () => {
    const href = buildProgressPlayerHref(base);
    expect(href).toContain('/player');
    expect(href).not.toContain('content_rating');
  });

  it('returns null when there is no stream to resume', () => {
    expect(buildProgressPlayerHref({ ...base, stream_url: undefined })).toBeNull();
  });
});

describe('withPlayerContentRating', () => {
  it('appends content_rating to a player URL that lacks one', () => {
    const href = withPlayerContentRating(
      '/player?src=%2Fstream%2Ftv%2Fep-2&id=ep-2&kind=episode',
      'TV-MA',
    );
    expect(href).toContain('content_rating=TV-MA');
    expect(href).toContain('id=ep-2');
  });

  it('leaves an existing content_rating untouched', () => {
    const href = withPlayerContentRating('/player?id=ep-2&content_rating=PG', 'TV-MA');
    expect(href).toContain('content_rating=PG');
    expect(href).not.toContain('TV-MA');
  });

  it('does not rewrite non-player hrefs', () => {
    expect(withPlayerContentRating('/tv/show-1', 'TV-MA')).toBe('/tv/show-1');
  });
});

describe('buildMoviePlayerHref', () => {
  it('still forwards movie content_rating (detail / hero path)', () => {
    const href = buildMoviePlayerHref({
      id: 'm1',
      title: 'Demo',
      stream_url: '/stream/movies/m1',
      content_rating: 'PG-13',
    });
    expect(href).toContain('content_rating=PG-13');
  });
});
