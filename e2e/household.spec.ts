import type { Page, TestInfo } from '@playwright/test';
import { test, expect, movies } from './fixtures';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

async function assertLayout(page: Page, testInfo: TestInfo, name: string) {
  await expect(page.getByTestId('userdata-sync-warning')).toHaveCount(0);
  const widths = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      main: main ? { client: main.clientWidth, scroll: main.scrollWidth } : null,
    };
  });
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  if (widths.main) expect(widths.main.scroll).toBeLessThanOrEqual(widths.main.client);
  await testInfo.attach(`${name}-${widths.viewport}px`, {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
}

test('Home shelves and navigation fit the viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('home-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: movies[0].title, level: 1 })).toBeVisible();
  const mobile = page.viewportSize()!.width < 1024;
  const nav = page.getByRole('navigation', { name: mobile ? 'Mobile primary navigation' : 'Primary navigation', exact: true });
  await expect(nav).toBeVisible();
  await assertLayout(page, testInfo, 'home');
});

test('Browse to movie details using the keyboard', async ({ page }, testInfo) => {
  await page.goto('/movies');
  await expect(page.getByRole('heading', { name: 'Movies', exact: true })).toBeVisible();
  const card = page.locator('main').getByRole('link', { name: `View movie: ${movies[0].title}, 2025, available to watch`, exact: true }).first();
  await expect(card).toBeVisible();
  await assertLayout(page, testInfo, 'movies');
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(`/movies/${movies[0].id}`);
  // The URL can settle while the previous library cards are still rendering.
  const detail = page.getByTestId('movie-detail-page');
  await expect(detail.getByRole('heading', { name: movies[0].title, exact: true, level: 1 })).toBeVisible();
  await expect(detail.getByRole('link', { name: `Play ${movies[0].title}`, exact: true })).toHaveAttribute('href', /\/player\?/);
  await assertLayout(page, testInfo, 'movie-detail');
});

test('Personal settings remain accessible and operator policy links stay hidden', async ({ page }, testInfo) => {
  await page.goto('/settings/display');
  await expect(page.getByRole('heading', { name: 'Display', exact: true })).toBeVisible();
  const sections = page.getByRole('navigation', { name: 'Settings sections' });
  await expect(sections.getByRole('link', { name: 'Quality', exact: true })).toHaveCount(0);
  await expect(sections.getByRole('link', { name: 'Delay', exact: true })).toHaveCount(0);
  const playback = sections.getByRole('link', { name: 'Playback', exact: true });
  await playback.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Playback', exact: true })).toBeVisible();
  await assertLayout(page, testInfo, 'settings');
});

for (const role of ['viewer', 'approver']) {
  test.describe(`${role} policy access`, () => {
    test.use({ sessionRoles: [role] });

    test('connected operator settings stay hidden on direct navigation', async ({ page }) => {
      await page.route('http://127.0.0.1:4173/api/capabilities', (route) => route.fulfill({
        json: {
          ...DEFAULT_CAPABILITIES,
          features: { ...DEFAULT_CAPABILITIES.features, acquisition: true, request: true },
        },
      }));
      for (const path of ['acquisition', 'requests']) {
        await page.goto(`/settings/${path}`);
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('muxcore.session.roles.v1') || '[]'))).toEqual([role]);
        await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
        await expect(page.getByTestId(`settings-${path}`)).toHaveCount(0);
        const sections = page.getByRole('navigation', { name: 'Settings sections' });
        await expect(sections.getByRole('link', { name: 'Acquisition', exact: true })).toHaveCount(0);
        await expect(sections.getByRole('link', { name: 'Requests', exact: true })).toHaveCount(0);
      }
      // The strict fixture has no acquisition/request-policy response: either
      // settings pane loading its API would also fail fixture teardown.
    });
  });
}

test('Invite form submits the fixture request and presents the sign-in handoff', async ({ page, fixtureApi }, testInfo) => {
  await page.goto('/invite/fixture-invite');
  await page.getByLabel('Username', { exact: true }).fill('family-member');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password-only');
  await assertLayout(page, testInfo, 'invite');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('invite-join-success')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to login' })).toHaveAttribute('href', '/login');
  expect(fixtureApi.redemptions).toEqual([{
    token: 'fixture-invite', username: 'family-member', password: 'fixture-password-only',
  }]);
});

test('Invalid invite cannot submit an account', async ({ page, fixtureApi }) => {
  await page.goto('/invite/invalid-fixture');
  await expect(page.getByTestId('invite-join-invalid')).toHaveText('Invite not valid');
  await expect(page.getByRole('alert')).toHaveText('Invite not valid');
  await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
  expect(fixtureApi.redemptions).toEqual([]);
});
