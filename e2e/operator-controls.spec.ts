import type { Page } from '@playwright/test';
import { test, expect, movies } from './fixtures';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

async function operatorFixture(page: Page) {
  const mutations: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    const personalWrite = request.method() === 'PUT' && path === '/api/userdata';
    if (path.startsWith('/api/') && !['GET', 'HEAD'].includes(request.method()) && !personalWrite) {
      mutations.push(`${request.method()} ${path}`);
    }
    if (request.method() === 'PATCH') mutations.push(`PATCH body ${request.postData()}`);
  });
  await page.route('**/api/capabilities', (route) => route.fulfill({ json: {
    ...DEFAULT_CAPABILITIES,
    features: { ...DEFAULT_CAPABILITIES.features, formats: true, debrid: true, activity: true, livetv: true, playbackMonitor: true },
  } }));
  await page.route('**/api/formats', (route) => route.fulfill({ json: { profiles: [{ id: 'hd', name: 'Fixture HD' }], formats: [] } }));
  await page.route('**/api/roots?*', (route) => route.fulfill({ json: { roots: [{ id: 'root', name: 'Fixture movies', path: '/fixture/movies' }] } }));
  await page.route('**/api/sessions', (route) => route.fulfill({ json: { available: true, items: [{ id: 'native-self', title: movies[0].title, user: 'fixture-member', href: `/movies/${movies[0].id}` }] } }));
  await page.route('**/api/sessions/events', (route) => route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' }));
  await page.route('**/api/debrid/vfs', (route) => route.fulfill({ json: { items: [{ id: 'cloud-fixture', filename: 'Fixture cloud film' }] } }));
  await page.route('**/api/livetv', (route) => route.fulfill({ json: { channels: [{ id: 'channel', name: 'Fixture channel', number: '1' }], timers: [{ id: 'timer', title: 'Fixture timer' }], recordings: [] } }));
  await page.route(`**/api/movies/${movies[0].id}`, (route) => {
    if (route.request().method() === 'PATCH') return route.fulfill({ json: { monitored: true } });
    return route.fallback();
  });
  return mutations;
}

for (const role of ['user', 'viewer', 'approver', 'manager', 'admin']) {
  test.describe(role, () => {
    test.use({ sessionRoles: [role] });
    test('retains consumer journeys and shows only permitted operator controls', async ({ page }) => {
      const mutations = await operatorFixture(page);
      const operator = role === 'admin' || role === 'manager';
      await page.goto(`/movies/${movies[0].id}`);
      await expect(page.getByRole('link', { name: `Play ${movies[0].title}`, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Monitor', exact: true })).toHaveCount(operator ? 1 : 0);
      await expect(page.getByTestId('remove-library')).toHaveCount(operator ? 1 : 0);
      await expect(page.getByTestId('refresh-metadata')).toHaveCount(operator ? 1 : 0);
      await expect(page.getByTestId('delete-movie-file')).toHaveCount(operator ? 1 : 0);
      await expect(page.getByRole('combobox', { name: 'Quality profile' })).toHaveCount(operator ? 1 : 0);
      await expect(page.getByRole('combobox', { name: 'Root folder' })).toHaveCount(role === 'admin' ? 1 : 0);
      await page.getByRole('button', { name: 'Mark watched', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Mark unwatched', exact: true })).toBeVisible();
      if (operator) {
        await page.getByRole('button', { name: 'Monitor', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Monitoring', exact: true })).toBeVisible();
      }
      await page.goto('/sessions');
      await expect(page.getByRole('link', { name: 'Open', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: `Stop ${movies[0].title}` })).toHaveCount(operator ? 1 : 0);
      await page.goto('/settings/debrid');
      await expect(page.getByText('Fixture cloud film')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Play', exact: true })).toHaveAttribute('href', /cloud-fixture/);
      await expect(page.getByRole('button', { name: 'Add to debrid' })).toHaveCount(operator ? 1 : 0);
      await page.goto('/livetv');
      await expect(page.getByRole('button', { name: '1 Fixture channel' })).toBeVisible();
      await page.getByRole('tab', { name: 'Timers' }).click();
      await expect(page.getByText('Fixture timer')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Schedule', exact: true })).toHaveCount(operator ? 1 : 0);
      expect(mutations).toEqual(operator ? [`PATCH /api/movies/${movies[0].id}`, 'PATCH body {"monitored":true}'] : []);
    });
  });
}

for (const cached of [false, true]) {
  test(`movie controls react to delayed current identity with cached admin ${cached}`, async ({ page }) => {
    const mutations = await operatorFixture(page);
    if (cached) await page.addInitScript(() => {
      localStorage.setItem('muxcore.session.roles.v1', JSON.stringify(['admin']));
      localStorage.setItem('muxcore.session.userId.v1', 'cached-member');
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/session', async (route) => {
      await held;
      await route.fulfill({ json: { user_id: 'fixture-member', roles: cached ? ['viewer'] : ['manager'] } });
    });
    await page.goto(`/movies/${movies[0].id}`);
    await expect(page.getByRole('link', { name: `Play ${movies[0].title}`, exact: true })).toBeVisible();
    await expect(page.getByTestId('remove-library')).toHaveCount(cached ? 1 : 0);
    if (cached) {
      await page.getByTestId('remove-library').click();
      await expect(page.getByTestId('remove-library-confirm')).toBeVisible();
    }
    release();
    await expect(page.getByRole('button', { name: 'Monitor', exact: true })).toHaveCount(cached ? 0 : 1);
    await expect(page.getByTestId('remove-library-confirm')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Root folder' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark watched', exact: true })).toBeVisible();
    expect(mutations).toEqual([]);
  });
}
