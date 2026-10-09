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

test('saving before the initial userdata GET preserves the submitted field and unread preferences', async ({ page }, info) => {
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
  await pageSize.fill('127');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata` && response.request().method() === 'GET');
  release();
  await (await response).finished();
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
  await save.click();
  await expect.poll(() => writes.length).toBe(2);
  await expect(pageSize).toHaveValue('143');
  const response = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata` && response.request().method() === 'PUT');
  releaseFirst();
  await (await response).finished();
  // Let the received response's promise callbacks and React rendering finish.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await info.attach('reversed-write-acknowledgments', {
    body: JSON.stringify({ writes, cache: await page.evaluate(() => localStorage.getItem('muxcore.userdata.prefs.v1')), displayedPageSize: await pageSize.inputValue() }, null, 2),
    contentType: 'application/json',
  });
  await expect(pageSize).toHaveValue('143');
});
