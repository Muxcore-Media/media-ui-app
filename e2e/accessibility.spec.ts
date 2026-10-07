import type { Locator, Page } from '@playwright/test';
import { test, expect, movies } from './fixtures';

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 20; step++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  await expect(target, 'The control must be reachable in the normal tab sequence').toBeFocused();
}

async function submitInviteWithKeyboard(page: Page) {
  const username = page.getByLabel('Username', { exact: true });
  await expect(username).toBeVisible();
  await tabTo(page, username);
  await page.keyboard.type('family-member');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
  await page.keyboard.type('fixture-password-only');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeFocused();
  await page.keyboard.press('Enter');
}

test('More navigation supports keyboard entry, traversal and Escape focus return', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: movies[0].title, level: 1 })).toBeVisible();
  const mobile = page.viewportSize()!.width < 1024;
  const nav = page.getByRole('navigation', { name: mobile ? 'Mobile primary navigation' : 'Primary navigation', exact: true });
  // Expanded mobile controls change their name from More to Close menu.
  const trigger = nav.locator('button[aria-expanded]');
  await tabTo(page, trigger);
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  if (mobile) {
    const panel = page.getByRole('navigation', { name: 'More navigation', exact: true });
    await expect(panel.getByRole('link', { name: 'TV', exact: true })).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-controls', await panel.getAttribute('id') || '');
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('link', { name: 'Downloads', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  } else {
    const menu = page.getByRole('menu');
    const downloads = menu.getByRole('menuitem', { name: 'Downloads', exact: true });
    const blocklist = menu.getByRole('menuitem', { name: 'Blocklist', exact: true });
    await expect(downloads).toBeFocused();
    await expect(menu).toHaveAccessibleName('More navigation');
    await page.keyboard.press('ArrowDown');
    await expect(blocklist).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(downloads).toBeFocused();
    await page.keyboard.press('End');
    await expect(blocklist).toBeFocused();
    await page.keyboard.press('Home');
    await expect(downloads).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
  }
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  if (!mobile) {
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Blocklist', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Search', exact: true })).toBeFocused();
  }
});

test('Home shelf controls stay visible when focused and scroll from the keyboard', async ({ page }) => {
  await page.goto('/');
  const shelf = page.getByTestId('home-recently-added');
  await expect(shelf).toBeVisible();
  const track = shelf.locator('.overflow-x-auto');
  if (page.viewportSize()!.width < 640) {
    // Phone shelves use native focus scrolling instead of desktop arrow controls.
    await expect(shelf.getByRole('button', { name: 'Scroll right' })).toBeHidden();
    const cards = shelf.getByRole('link', { name: /^View movie:/ });
    await cards.first().focus();
    for (let index = 1; index < 4; index++) await page.keyboard.press('Tab');
    await expect(cards.nth(3)).toBeFocused();
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  } else {
    await page.mouse.move(0, 0);
    const right = shelf.getByRole('button', { name: 'Scroll right', exact: true });
    await right.focus();
    await expect(right).toBeFocused();
    await expect(right).toHaveCSS('opacity', '1');
    await expect(right).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    // Keep focus on the same control when scrolling reaches either endpoint.
    for (let step = 0; step < 3 && await right.getAttribute('aria-disabled') !== 'true'; step++) {
      await page.keyboard.press('Enter');
    }
    await expect(right).toHaveAttribute('aria-disabled', 'true');
    await expect(right).toBeFocused();
    await expect(right).toBeVisible();
    const left = shelf.getByRole('button', { name: 'Scroll left', exact: true });
    await left.focus();
    await expect(left).toHaveCSS('opacity', '1');
    await page.keyboard.press('Enter');
    for (let step = 0; step < 3 && await left.getAttribute('aria-disabled') !== 'true'; step++) {
      await page.keyboard.press('Enter');
    }
    await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBe(0);
    await expect(left).toHaveAttribute('aria-disabled', 'true');
    await expect(left).toBeFocused();
    await expect(left).toBeVisible();
  }
});

test('Keyboard invite signup announces completion and focuses the sign-in handoff', async ({ page, fixtureApi }) => {
  await page.goto('/invite/fixture-invite');
  await submitInviteWithKeyboard(page);
  await expect(page.getByRole('status')).toHaveText('Account created — you can sign in now.');
  const login = page.getByRole('link', { name: 'Go to login' });
  await expect(login).toBeFocused();
  await expect(login).toHaveAccessibleDescription('Account created — you can sign in now.');
  await expect(login).toHaveAttribute('href', '/login');
  expect(fixtureApi.redemptions).toHaveLength(1);
});

test('Failed invite signup focuses an announced error and keeps the keyboard retry usable', async ({ page, fixtureApi }) => {
  let attempts = 0;
  await page.route('http://127.0.0.1:4173/api/invite/redeem', async (route) => {
    if (attempts++ === 0) return route.fulfill({ status: 409, json: { error: 'Username already taken' } });
    return route.fallback();
  });
  await page.goto('/invite/fixture-invite');
  await submitInviteWithKeyboard(page);
  const error = page.getByRole('alert');
  await expect(error).toHaveText('Username already taken');
  await expect(error).toBeFocused();
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('family-member');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Username', { exact: true })).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('another-member');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Go to login' })).toBeFocused();
  expect(fixtureApi.redemptions).toEqual([{
    token: 'fixture-invite', username: 'another-member', password: 'fixture-password-only',
  }]);
});
