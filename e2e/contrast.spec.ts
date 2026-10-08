import { createRequire } from 'node:module';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from './fixtures';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const ORIGIN = 'http://127.0.0.1:4173';
const PLAYER = '/player?src=%2Fstream%2Fmovies%2Ffixture-movie-1&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1';

async function themeFixture(page: Page, theme: 'dark' | 'light') {
  await page.route(`${ORIGIN}/api/userdata`, (route) => route.fulfill({
    json: { user_id: 'fixture-member', prefs: { display: { theme } } },
  }));
}

async function audit(page: Page, theme: 'dark' | 'light', info: TestInfo) {
  // Set the theme through the real bootstrap response, before measuring rendered paint.
  // Changing data-theme between axe runs can otherwise leave stale computed paint.
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('body')).toHaveCSS('color', theme === 'dark' ? 'rgb(245, 245, 247)' : 'rgb(20, 21, 26)');
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => {
    const axe = (window as typeof window & { axe: typeof import('axe-core') }).axe;
    return axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
  });
  // Images, gradients and overlays can be indeterminate; preserve them for manual review.
  // A zero-violation result is only acceptance of axe's determinate text comparisons.
  await info.attach('rendered-contrast', {
    body: JSON.stringify({ violations: results.violations, incomplete: results.incomplete }, null, 2),
    contentType: 'application/json',
  });
  return results;
}

async function expectFilledControlContrast(control: Locator) {
  const ratio = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    // The danger hover applies brightness to both ink and fill. Computed RGB alone
    // excludes that filter, so include it in the actual rendered color comparison.
    const brightness = style.filter === 'none' ? 1 : Number(/^brightness\(([\d.]+)\)$/.exec(style.filter)?.[1]);
    if (!Number.isFinite(brightness)) throw new Error(`Unmeasured filter: ${style.filter}`);
    const luminance = (color: string) => {
      const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(color)?.slice(1).map(Number);
      if (!channels) throw new Error(`Expected an opaque color, received ${color}`);
      return channels.map((channel) => {
        const value = Math.min(255, channel * brightness) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
    };
    const [dark, light] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => a - b);
    return (light + 0.05) / (dark + 0.05);
  });
  expect(ratio, 'Filled control text must pass both default and hover paint').toBeGreaterThanOrEqual(4.5);
}

const routes = [
  ['Home', '/', '[data-testid="home-page"] h1'],
  ['Movies', '/movies', 'label[for="movies-genre"]'],
  ['Movie detail', '/movies/fixture-movie-1', '[data-testid="movie-detail-page"]'],
  ['Member movie detail', '/movies/fixture-movie-1', '[data-testid="movie-detail-page"]'],
  ['Display settings', '/settings/display', '#settings-display-heading'],
  ['Playback settings', '/settings/playback', '#settings-playback-heading'],
  ['Invite', '/invite/fixture-invite', '[data-testid="invite-join-form"]'],
  ['Invalid invite', '/invite/invalid-fixture', '[data-testid="invite-join-invalid"]'],
] as const;

for (const theme of ['dark', 'light'] as const) {
  for (const [name, path, ready] of routes) {
    test(`${name} has no definite text contrast failures in ${theme}`, async ({ page }, info) => {
      await themeFixture(page, theme);
      // The destructive-control paint check needs the role that can see it.
      // Keep a separate member detail audit for the ordinary household surface.
      if (name === 'Movie detail') {
        await page.route(`${ORIGIN}/api/session`, (route) => route.fulfill({
          json: { user_id: 'fixture-operator', roles: ['admin'] },
        }));
      }
      await page.goto(path);
      await expect(page.locator(ready)).toBeVisible();
      const results = await audit(page, theme, info);
      expect(results.violations).toEqual([]);
      if (name === 'Home' || name === 'Movie detail') {
        const control = name === 'Home'
          ? page.getByRole('link', { name: 'Play', exact: true })
          : page.getByTestId('remove-library');
        await expectFilledControlContrast(control);
        await control.hover();
        if (name === 'Home') await expect(control).toHaveCSS('background-color', 'rgb(86, 208, 192)');
        else await expect(control).toHaveCSS('filter', 'brightness(1.1)');
        await expectFilledControlContrast(control);
      }
    });
  }

  for (const code of ['parental.session_invalid', 'parental.policy_unavailable'] as const) {
    test(`Parental detail ${code} text contrast in ${theme}`, async ({ page }, info) => {
      await themeFixture(page, theme);
      await page.route(`${ORIGIN}/api/movies/fixture-movie-1`, (route) => route.fulfill({
        status: code === 'parental.session_invalid' ? 401 : 503,
        json: { error: 'Fixture parental response', code },
      }));
      await page.goto('/movies/fixture-movie-1');
      await expect(page.getByTestId('parental-notice')).toBeVisible();
      expect((await audit(page, theme, info)).violations).toEqual([]);
    });

    test(`Parental player ${code} controls contrast in ${theme}`, async ({ page }, info) => {
      await themeFixture(page, theme);
      await page.route(`${ORIGIN}/api/playback/**`, (route) => route.fulfill({
        status: route.request().method() === 'GET' ? (code === 'parental.session_invalid' ? 401 : 503) : 200,
        json: { error: 'Fixture parental response', code },
      }));
      await page.goto(PLAYER);
      await expect(page.getByTestId('player-parental-state')).toBeVisible();
      await expect(page.locator('video')).toHaveCount(0);
      expect((await audit(page, theme, info)).violations).toEqual([]);
    });
  }

  test(`Invite success and sign-in handoff contrast in ${theme}`, async ({ page }, info) => {
    await themeFixture(page, theme);
    await page.goto('/invite/fixture-invite');
    await page.getByLabel('Username', { exact: true }).fill('family-member');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password-only');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByTestId('invite-join-success')).toBeVisible();
    const login = page.getByRole('link', { name: 'Go to login', exact: true });
    await expect(login).toBeFocused();
    expect((await audit(page, theme, info)).violations).toEqual([]);
    await expectFilledControlContrast(login);
    await login.hover();
    await expect(login).toHaveCSS('background-color', 'rgb(86, 208, 192)');
    await expectFilledControlContrast(login);
  });

  test(`rendered contrast gate detects a failing control in ${theme}`, async ({ page }, info) => {
    await themeFixture(page, theme);
    await page.goto('/settings/display');
    await expect(page.locator('#settings-display-heading')).toBeVisible();
    await page.evaluate(() => {
      const control = document.createElement('p');
      control.id = 'contrast-negative-control';
      control.textContent = 'This deliberately low-contrast fixture must fail.';
      control.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;color:#888;background:#999;font:16px sans-serif;padding:16px';
      document.body.append(control);
    });
    const results = await audit(page, theme, info);
    expect(results.violations.some((violation) => violation.nodes.some((node) =>
      node.target.includes('#contrast-negative-control'),
    ))).toBe(true);
  });
}
