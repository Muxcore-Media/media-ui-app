import { test, expect } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';
const savedDisplay = { theme: 'light', libraryPageSize: 96, showWatchedIndicators: false };
const savedUserdata = {
  user_id: 'fixture-member',
  prefs: {
    display: { ...savedDisplay, futureDisplayOption: 'preserve' },
    playback: { autoplayNext: false, audioOffsetMs: 250 },
    futureSection: { setting: 'preserve' },
  },
  favorites: { 'saved-movie': { id: 'saved-movie', kind: 'movie', title: 'Saved Film', href: '/movies/saved-movie' } },
};

test('Display requires its initial userdata GET before saving and preserves edits and unread preferences', async ({ page }, info) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const writes: Record<string, unknown>[] = [];
  let requested = false;
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'GET') {
      requested = true;
      await held;
      return route.fulfill({ json: savedUserdata });
    }
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    return route.fulfill({ json: body });
  });
  await page.goto('/settings/display');
  await expect.poll(() => requested).toBe(true);
  const pageSize = page.getByLabel('Titles per page', { exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await pageSize.fill('127');
  await expect(save).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Loading saved settings' })).toBeVisible();
  await pageSize.press('Enter');
  // The submit handler must also refuse submission outside normal button activation.
  await page.locator('form[aria-labelledby="settings-display-heading"]').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(writes).toEqual([]);
  const response = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata` && response.request().method() === 'GET');
  release();
  await (await response).finished();
  await expect(save).toBeEnabled();
  await expect(pageSize).toHaveValue('127');
  await expect(pageSize).toBeFocused();
  expect(writes).toEqual([]);
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await info.attach('early-save-request-and-cache', {
    body: JSON.stringify({ writes, cache: await page.evaluate(() => localStorage.getItem('muxcore.userdata.prefs.v1')), displayedPageSize: await pageSize.inputValue() }, null, 2),
    contentType: 'application/json',
  });
  expect.soft(writes[0].prefs).toMatchObject({
    ...savedUserdata.prefs,
    display: { ...savedUserdata.prefs.display, libraryPageSize: 127 },
  });
  expect.soft(writes[0].favorites).toEqual(savedUserdata.favorites);
  await expect(pageSize).toHaveValue('127');
});

test('an older PUT acknowledgment cannot replace the newer saved Display preferences', async ({ page }, info) => {
  let releaseFirst!: () => void;
  const held = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const writes: Record<string, unknown>[] = [];
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: savedUserdata });
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    if (writes.length === 1) await held;
    return route.fulfill({ json: body });
  });
  await page.goto('/settings/display');
  const pageSize = page.getByLabel('Titles per page', { exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(pageSize).toHaveValue('96');
  await pageSize.fill('127');
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  await pageSize.fill('143');
  const secondResponse = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata`
    && response.request().method() === 'PUT'
    && response.request().postDataJSON().prefs.display.libraryPageSize === 143);
  await save.click();
  await (await secondResponse).finished();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(writes).toHaveLength(2);
  await expect(pageSize).toHaveValue('143');
  const response = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata`
    && response.request().method() === 'PUT'
    && response.request().postDataJSON().prefs.display.libraryPageSize === 127);
  releaseFirst();
  await (await response).finished();
  // Let the received response's promise callbacks and React rendering finish.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await info.attach('reversed-write-acknowledgments', {
    body: JSON.stringify({ writes, cache: await page.evaluate(() => localStorage.getItem('muxcore.userdata.prefs.v1')), displayedPageSize: await pageSize.inputValue() }, null, 2),
    contentType: 'application/json',
  });
  await expect(pageSize).toHaveValue('143');
  const sections = page.getByRole('navigation', { name: 'Settings sections' });
  await sections.getByRole('link', { name: 'Home', exact: true }).click();
  await sections.getByRole('link', { name: 'Display', exact: true }).click();
  await expect(pageSize).toHaveValue('143');
  await save.click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2].prefs).toMatchObject({ display: { libraryPageSize: 143 } });
});

test('a failed preference read can be retried without losing edits or submitting automatically', async ({ page }) => {
  let releaseRetry!: () => void;
  const held = new Promise<void>((resolve) => { releaseRetry = resolve; });
  const writes: Record<string, unknown>[] = [];
  let reads = 0;
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'GET') {
      reads += 1;
      if (reads === 1) return route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } });
      await held;
      return route.fulfill({ json: savedUserdata });
    }
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    return route.fulfill({ json: body });
  });
  await page.goto('/settings/display');
  const pageSize = page.getByLabel('Titles per page', { exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(page.getByRole('status').filter({ hasText: 'Couldn’t load saved settings' })).toBeVisible();
  await pageSize.fill('127');
  await expect(save).toBeDisabled();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => reads).toBe(2);
  await expect(save).toBeDisabled();
  await pageSize.fill('143');
  expect(writes).toEqual([]);
  releaseRetry();
  await expect(save).toBeEnabled();
  await expect(pageSize).toHaveValue('143');
  await expect(pageSize).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toHaveValue('light');
  expect(writes).toEqual([]);
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prefs).toMatchObject({ ...savedUserdata.prefs, display: { ...savedUserdata.prefs.display, libraryPageSize: 143 } });
});

test('session invalidation offers an explicit preference reload while retaining the Display draft', async ({ page }) => {
  let releaseReload!: () => void;
  const held = new Promise<void>((resolve) => { releaseReload = resolve; });
  const writes: Record<string, unknown>[] = [];
  let reads = 0;
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'GET') {
      reads += 1;
      if (reads > 1) await held;
      return route.fulfill({ json: savedUserdata });
    }
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    return route.fulfill({ json: body });
  });
  await page.goto('/settings/display');
  const pageSize = page.getByLabel('Titles per page', { exact: true });
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await expect(save).toBeEnabled();
  await pageSize.fill('127');
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'muxcore.session.roles.v1' })));
  await expect(save).toBeDisabled();
  await expect(pageSize).toHaveValue('127');
  await expect(pageSize).toBeFocused();
  expect(reads).toBe(1);
  await page.getByRole('button', { name: 'Reload saved settings', exact: true }).click();
  await expect.poll(() => reads).toBe(2);
  await pageSize.focus();
  await expect(save).toBeDisabled();
  expect(writes).toEqual([]);
  releaseReload();
  await expect(save).toBeEnabled();
  await expect(pageSize).toHaveValue('127');
  await expect(pageSize).toBeFocused();
  expect(writes).toEqual([]);
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].prefs).toMatchObject({ display: { libraryPageSize: 127 } });
});
