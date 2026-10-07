import { test as base, expect } from '@playwright/test';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

export const movies = Array.from({ length: 12 }, (_, index) => ({
  id: `fixture-movie-${index + 1}`,
  title: index === 0 ? 'The Long Journey Home' : `Household Film ${index + 1}`,
  year: 2025,
  overview: 'A family explores a distant world and finds their way home together.',
  runtime: 102,
  vote_average: 7.5,
  genres: ['Adventure'],
  content_rating: 'PG',
  has_file: true,
  stream_url: `/stream/movies/fixture-movie-${index + 1}`,
  poster_url: 'http://127.0.0.1:4173/fixture-poster.svg',
  backdrop_url: '',
  created_at: '2026-01-01T12:00:00Z',
}));

// These are BFF HTTP response fixtures, not substitutes for backend journey tests.
// Unknown API calls and all external traffic fail the test instead of reaching peers.
export const test = base.extend<{ fixtureApi: { redemptions: unknown[] } }>({
  fixtureApi: [async ({ context }, use) => {
    const unexpected: string[] = [];
    const runtimeErrors: string[] = [];
    context.on('weberror', (error) => runtimeErrors.push(error.error().message));
    const redemptions: unknown[] = [];
    let userdata: Record<string, unknown> = {};
    const capabilities = {
      ...DEFAULT_CAPABILITIES,
      features: Object.fromEntries(Object.keys(DEFAULT_CAPABILITIES.features).map((key) => [
        key, ['search', 'formats', 'activity'].includes(key),
      ])),
    };
    const optionalDetailResponses: Record<string, unknown> = {
      '/api/formats': { available: false, formats: [], profiles: [], release_profiles: [] },
      '/api/tags': { available: false, tags: [] },
      '/api/roots': { available: false, roots: [] },
      '/api/roots/pick': { available: false, root: null },
      '/api/rename/preview': { available: false, items: [] },
      '/api/watch-stats/item': { available: false, plays: 0, users: [] },
    };
    for (const movie of movies) {
      for (const section of ['tags', 'titles', 'history', 'artwork', 'subtitles', 'files']) {
        optionalDetailResponses[`/api/movies/${movie.id}/${section}`] = {
          available: false, [section]: [], items: [],
        };
      }
    }

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });

      if (url.origin !== 'http://127.0.0.1:4173') {
        unexpected.push(`${method} ${url.origin}${path}`);
        return route.abort();
      }
      if (path === '/fixture-poster.svg') {
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="300" height="450" fill="#24364a"/><circle cx="150" cy="180" r="70" fill="#f4c16e"/></svg>',
        });
      }
      if (!path.startsWith('/api/') && !path.startsWith('/stream/')) return route.continue();
      if (method === 'GET') {
        if (path === '/api/capabilities') return json(capabilities);
        if (path === '/api/session' || path === '/api/me') return json({ user_id: 'fixture-viewer', roles: ['viewer'] });
        if (path === '/api/userdata') return json(userdata);
        if (path === '/api/movies') return json({ items: movies, total: movies.length, page: 1, page_size: 48 });
        const movie = movies.find((item) => path === `/api/movies/${item.id}`);
        if (movie) return json({ movie });
        if (path === '/api/requests') return json([]);
        if (path === '/api/jellyfin/play') return json({ url: '' });
        if (path === '/api/playback/analysis') return json({ src: url.searchParams.get('src'), enabled: false });
        if (path in optionalDetailResponses) return json(optionalDetailResponses[path]);
        if (['/api/tv', '/api/collections', '/api/history', '/api/sessions', '/api/music', '/api/books', '/api/comics', '/api/audiobooks', '/api/calendar', '/api/playback/segments/media'].includes(path)) {
          return json({ available: false, items: [], total: 0 });
        }
        if (path === '/api/invite/peek') {
          return url.searchParams.get('token') === 'fixture-invite'
            ? json({ valid: true, role: 'user' })
            : json({ error: 'Invite not valid' }, 400);
        }
      }
      if (method === 'PUT' && path === '/api/userdata') {
        userdata = request.postDataJSON() as Record<string, unknown>;
        return json({ ok: true });
      }
      if (method === 'POST' && path === '/api/invite/redeem') {
        redemptions.push(request.postDataJSON());
        return json({ username: 'family-member' });
      }
      unexpected.push(`${method} ${path}`);
      return json({ error: 'No fixture for this request' }, 501);
    });

    await use({ redemptions });
    expect(unexpected, 'All HTTP calls must have an explicit local fixture').toEqual([]);
    expect(runtimeErrors, 'Pages must render without uncaught JavaScript errors').toEqual([]);
  }, { auto: true }],
});

export { expect };
