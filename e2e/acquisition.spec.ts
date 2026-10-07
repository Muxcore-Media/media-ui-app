import { test, expect } from './fixtures';
import { acquisitionFixture } from './acquisition-fixture';

test.describe('manager Acquisition access', () => {
  test.use({ sessionRoles: ['manager'] });

  test('direct settings navigation keeps readiness and catalog reads without indexer writes', async ({ page }) => {
    const state = await acquisitionFixture(page);
    await page.goto('/settings/acquisition');
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

  test('indexer create, toggle and remove use the expected HTTP mutations', async ({ page }) => {
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
    await page.goto('/settings/acquisition');
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
