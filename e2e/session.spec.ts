import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { acquisitionFixture } from './acquisition-fixture';

const USER_ID_KEY = 'muxcore.session.userId.v1';
const ROLES_KEY = 'muxcore.session.roles.v1';

async function holdIdentity(page: Page, response: { status?: number; json: unknown }) {
  let release!: () => void;
  let requested = false;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('http://127.0.0.1:4173/api/session', async (route) => {
    requested = true;
    await held;
    await route.fulfill(response);
  });
  return { release, wait: () => expect.poll(() => requested).toBe(true) };
}

async function cacheAdmin(page: Page) {
  await page.addInitScript(({ userIdKey, rolesKey }) => {
    localStorage.setItem(userIdKey, 'cached-member');
    localStorage.setItem(rolesKey, JSON.stringify(['admin']));
  }, { userIdKey: USER_ID_KEY, rolesKey: ROLES_KEY });
}

for (const role of ['admin', 'manager']) {
  test(`fresh direct Acquisition updates after delayed ${role} identity`, async ({ page }) => {
    const state = await acquisitionFixture(page);
    const identity = await holdIdentity(page, { json: { user_id: 'fixture-member', roles: [role] } });
    const capabilities = page.waitForResponse('http://127.0.0.1:4173/api/capabilities');
    await page.goto('/settings/acquisition');
    await (await capabilities).finished();
    await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
    await identity.wait();
    expect(state.reads).toBe(0);
    identity.release();
    await expect(page.getByTestId('indexer-list')).toContainText('Fixture indexer');
    await expect(page).toHaveURL('/settings/acquisition');
    await expect(page.getByTestId('indexer-add-form')).toHaveCount(role === 'admin' ? 1 : 0);
    expect(state.reads).toBe(1);
    expect(state.mutations).toEqual([]);
  });
}

for (const userdata of ['contains identity', 'unavailable']) {
  test(`session roles hydrate when userdata is ${userdata}`, async ({ page }) => {
    const state = await acquisitionFixture(page);
    await page.route('http://127.0.0.1:4173/api/userdata', (route) => route.fulfill(
      userdata === 'contains identity'
        ? { json: { user_id: 'fixture-member' } }
        : { status: 503, json: { error: 'Fixture userdata unavailable' } },
    ));
    const identity = await holdIdentity(page, { json: { user_id: 'fixture-member', roles: ['admin'] } });
    await page.goto('/settings/acquisition');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
    await identity.wait();
    identity.release();
    await expect(page.getByTestId('indexer-add-form')).toBeVisible();
    await expect(page).toHaveURL('/settings/acquisition');
    expect(state.mutations).toEqual([]);
    if (userdata === 'unavailable') await expect(page.getByTestId('userdata-sync-warning')).toBeVisible();
  });
}

for (const role of ['manager', 'viewer']) {
  test(`cached admin controls update when the current session is ${role}`, async ({ page }) => {
    await cacheAdmin(page);
    const state = await acquisitionFixture(page);
    const identity = await holdIdentity(page, { json: { user_id: 'fixture-member', roles: [role] } });
    await page.goto('/settings/acquisition');
    await expect(page.getByTestId('indexer-add-form')).toBeVisible();
    await expect(page.getByTestId('indexer-list')).toContainText('Fixture indexer');
    await identity.wait();
    identity.release();
    await expect(page.getByTestId('indexer-add-form')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Enable|Disable|Remove Fixture)/ })).toHaveCount(0);
    if (role === 'manager') {
      await expect(page.getByTestId('settings-acquisition')).toBeVisible();
      await expect(page.getByTestId('indexer-list')).toContainText('Fixture indexer');
    } else {
      await expect(page.getByTestId('settings-acquisition')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
    }
    await expect(page).toHaveURL('/settings/acquisition');
    expect(state.reads).toBe(1);
    expect(state.mutations).toEqual([]);
  });
}

test('expired session removes cached operator controls', async ({ page }) => {
  await cacheAdmin(page);
  const state = await acquisitionFixture(page);
  const denied = { status: 401, json: { error: 'Session expired' } };
  const identity = await holdIdentity(page, denied);
  await page.route('http://127.0.0.1:4173/api/me', (route) => route.fulfill(denied));
  await page.goto('/settings/acquisition');
  await expect(page.getByTestId('indexer-add-form')).toBeVisible();
  await identity.wait();
  identity.release();
  await expect(page.getByTestId('settings-acquisition')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: 'Acquisition', exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), ROLES_KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), USER_ID_KEY)).toBeNull();
  expect(state.mutations).toEqual([]);
});

test('session correction preserves an unsaved personal settings form', async ({ page }) => {
  await cacheAdmin(page);
  await acquisitionFixture(page);
  const identity = await holdIdentity(page, { json: { user_id: 'fixture-member', roles: ['viewer'] } });
  await page.goto('/settings/display');
  const sections = page.getByRole('navigation', { name: 'Settings sections' });
  await expect(sections.getByRole('link', { name: 'Acquisition', exact: true })).toBeVisible();
  const pageSize = page.getByLabel('Titles per page', { exact: true });
  await pageSize.fill('127');
  await identity.wait();
  identity.release();
  await expect(sections.getByRole('link', { name: 'Acquisition', exact: true })).toHaveCount(0);
  await expect(pageSize).toHaveValue('127');
  await expect(page).toHaveURL('/settings/display');
});

test('successful sign out clears cached roles before the sign-in handoff', async ({ page }) => {
  await page.route('http://127.0.0.1:4173/api/session', (route) => route.fulfill({
    json: { user_id: 'fixture-member', roles: ['admin'] },
  }));
  let logoutMethod = '';
  await page.route('http://127.0.0.1:4173/logout', (route) => {
    logoutMethod = route.request().method();
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('http://127.0.0.1:4173/login', (route) => route.fulfill({
    contentType: 'text/html', body: '<main><h1>Fixture sign in</h1></main>',
  }));
  await page.goto('/settings');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), ROLES_KEY)).toBe('["admin"]');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fixture sign in' })).toBeVisible();
  expect(logoutMethod).toBe('POST');
  expect(await page.evaluate((key) => localStorage.getItem(key), ROLES_KEY)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), USER_ID_KEY)).toBeNull();
});

test('a role correction in another tab removes current controls without refreshing identity', async ({ page, context }) => {
  const state = await acquisitionFixture(page);
  let identityReads = 0;
  await page.route('http://127.0.0.1:4173/api/userdata', (route) => route.fulfill({ json: { user_id: 'fixture-member' } }));
  await page.route('http://127.0.0.1:4173/api/session', (route) => {
    identityReads++;
    return route.fulfill({ json: { user_id: 'fixture-member', roles: ['admin'] } });
  });
  await page.goto('/settings/acquisition');
  await expect(page.getByTestId('indexer-add-form')).toBeVisible();
  await expect(page.getByTestId('indexer-list')).toContainText('Fixture indexer');
  expect(identityReads).toBe(1);
  const otherTab = await context.newPage();
  await otherTab.route('http://127.0.0.1:4173/session-fixture-tab', (route) => route.fulfill({
    contentType: 'text/html', body: '<title>Same-origin session fixture</title>',
  }));
  await otherTab.goto('/session-fixture-tab');
  await otherTab.evaluate((key) => localStorage.setItem(key, JSON.stringify(['viewer'])), ROLES_KEY);
  await expect(page.getByTestId('settings-acquisition')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Profile', exact: true, level: 2 })).toBeVisible();
  await expect(page).toHaveURL('/settings/acquisition');
  expect(identityReads).toBe(1);
  expect(state.reads).toBe(1);
  expect(state.mutations).toEqual([]);
  await otherTab.close();
});
