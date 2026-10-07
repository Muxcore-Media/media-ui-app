import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

type Mutation = { method: string; path: string; body: unknown };

async function openAcquisitionForSession(page: Page, roles: string[]) {
  // Exercise an established identity through the real session-refresh path.
  // Fresh direct Settings role hydration is a separate rendering regression.
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('muxcore.session.roles.v1') || '[]'))).toEqual(roles);
  await page.goto('/settings/acquisition');
}

async function acquisitionFixture(page: Page) {
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

test.describe('manager Acquisition access', () => {
  test.use({ sessionRoles: ['manager'] });

  test('direct settings navigation keeps readiness and catalog reads without indexer writes', async ({ page, sessionRoles }) => {
    const state = await acquisitionFixture(page);
    await openAcquisitionForSession(page, sessionRoles);
    const pane = page.getByTestId('settings-acquisition');
    await expect(pane.getByTestId('indexer-list')).toContainText('Fixture indexer');
    await expect(pane.getByTestId('acquisition-message')).toHaveText('Fixture indexer and downloader are connected.');
    await expect(pane.getByTestId('acquisition-peers')).toContainText('Fixture downloader');
    await expect(pane.getByTestId('indexer-capabilities')).toContainText('Season packs');
    await expect(page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: 'Acquisition', exact: true })).toHaveAttribute('href', '/settings/acquisition');
    await expect(pane.getByTestId('indexer-add-form')).toHaveCount(0);
    await expect(pane.getByRole('button', { name: /^(Enable|Disable|Remove|Add indexer)/ })).toHaveCount(0);
    expect(state.reads).toBe(1);
    expect(state.mutations).toEqual([]);
    // No indexer mutation response is installed for a manager: any write also
    // fails the shared strict fixture teardown instead of contacting a backend.
  });
});

test.describe('admin Acquisition actions', () => {
  test.use({ sessionRoles: ['admin'] });

  test('indexer create, toggle and remove use the expected HTTP mutations', async ({ page, sessionRoles }) => {
    const state = await acquisitionFixture(page);
    await page.route(/^http:\/\/127\.0\.0\.1:4173\/api\/indexers(?:\/\d+)?$/, (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'PATCH' && path === '/api/indexers/17') {
        state.indexers[0].configured = request.postDataJSON().enable;
        return route.fulfill({ json: state.indexers[0] });
      }
      if (request.method() === 'DELETE' && path === '/api/indexers/17') {
        state.indexers = [];
        return route.fulfill({ json: { deleted: true } });
      }
      if (request.method() === 'POST' && path === '/api/indexers') {
        const body = request.postDataJSON();
        const indexer = { id: 18, name: body.name, protocol: 'torrent', language: 'en', configured: body.enable };
        state.indexers.push(indexer);
        return route.fulfill({ json: indexer });
      }
      return route.fallback();
    });
    await openAcquisitionForSession(page, sessionRoles);
    const pane = page.getByTestId('settings-acquisition');
    await pane.getByRole('button', { name: 'Disable', exact: true }).click();
    await expect(pane.getByTestId('indexer-list')).toContainText('Disabled');
    await pane.getByRole('button', { name: 'Enable', exact: true }).click();
    await expect(pane.getByTestId('indexer-list')).toContainText('Enabled');
    await pane.getByRole('button', { name: 'Remove Fixture indexer', exact: true }).click();
    await expect(pane.getByTestId('indexer-list')).toHaveCount(0);
    await pane.getByLabel('Indexer name', { exact: true }).fill('New fixture indexer');
    await pane.getByLabel('Indexer URL', { exact: true }).fill('https://indexer.fixture.invalid/api');
    await pane.getByRole('button', { name: 'Add indexer', exact: true }).click();
    await expect(pane.getByTestId('indexer-list')).toContainText('New fixture indexer');
    expect(state.mutations).toEqual([
      { method: 'PATCH', path: '/api/indexers/17', body: { enable: false } },
      { method: 'PATCH', path: '/api/indexers/17', body: { enable: true } },
      { method: 'DELETE', path: '/api/indexers/17', body: null },
      { method: 'POST', path: '/api/indexers', body: {
        name: 'New fixture indexer', base_url: 'https://indexer.fixture.invalid/api', implementation: 'torznab', enable: true,
      } },
    ]);
    expect(state.reads).toBe(5);
  });
});
