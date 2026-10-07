import type { Page } from '@playwright/test';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

type Mutation = { method: string; path: string; body: unknown };

export async function acquisitionFixture(page: Page) {
  const state = {
    indexers: [{ id: 17, name: 'Fixture indexer', protocol: 'torrent', language: 'en', configured: true }],
    reads: 0,
    mutations: [] as Mutation[],
  };
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if ((path === '/api/indexers' || path.startsWith('/api/indexers/')) && request.method() !== 'GET') {
      state.mutations.push({ method: request.method(), path, body: request.postData() ? request.postDataJSON() : null });
    }
  });
  await page.route('http://127.0.0.1:4173/api/capabilities', (route) => route.fulfill({
    json: {
      ...DEFAULT_CAPABILITIES,
      features: { ...DEFAULT_CAPABILITIES.features, acquisition: true },
    },
  }));
  await page.route('http://127.0.0.1:4173/api/acquisition', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    state.reads++;
    return route.fulfill({
      json: {
        ready: true,
        hasIndexer: true,
        hasDownloader: true,
        message: 'Fixture indexer and downloader are connected.',
        live_grab_allowed: true,
        indexer_mode: 'fixture',
        downloader_mode: 'fixture',
        vpn: { configured: false, conf_present: false },
        peers: [
          { id: 'fixture-indexer', kind: 'indexer', label: 'Fixture catalog', live: true },
          { id: 'fixture-downloader', kind: 'downloader', label: 'Fixture downloader', live: true },
        ],
        indexers_available: true,
        indexers: state.indexers,
        capabilities_available: true,
        capabilities: { supports_search: true, supports_movie_search: true, supports_season_pack: true },
      },
    });
  });
  return state;
}

