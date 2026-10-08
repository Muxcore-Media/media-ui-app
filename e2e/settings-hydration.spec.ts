import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';
const savedDisplay = { theme: 'light', libraryPageSize: 96, showWatchedIndicators: false };
const savedUserdata = {
  user_id: 'fixture-member',
  prefs: { display: savedDisplay, playback: { autoplayNext: false, audioOffsetMs: 250 } },
  favorites: { 'saved-movie': { id: 'saved-movie', kind: 'movie', title: 'Saved Film', href: '/movies/saved-movie' } },
};

async function holdPreferences(page: Page, response: { status: number; json: unknown } = { status: 200, json: savedUserdata }) {
  let release!: () => void;
  let requested = false;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const writes: Record<string, unknown>[] = [];
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      writes.push(body);
      return route.fulfill({ json: body });
    }
    if (route.request().method() !== 'GET') return route.fallback();
    requested = true;
    await held;
    return route.fulfill(response);
  });
  return { release, writes, wait: () => expect.poll(() => requested).toBe(true) };
}

function displayFields(page: Page) {
  return {
    theme: page.getByRole('combobox', { name: 'Theme', exact: true }),
    pageSize: page.getByLabel('Titles per page', { exact: true }),
    indicators: page.getByLabel('Show watched indicators', { exact: true }),
    save: page.getByRole('button', { name: 'Save', exact: true }),
  };
}

async function remountDisplay(page: Page) {
  const sections = page.getByRole('navigation', { name: 'Settings sections' });
  await sections.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL('/settings/home');
  await sections.getByRole('link', { name: 'Display', exact: true }).click();
  await expect(page).toHaveURL('/settings/display');
}

for (const edited of [false, true]) {
  test(`delayed Display preferences hydrate untouched fields with an edited draft ${edited}`, async ({ page }, info) => {
    const prefs = await holdPreferences(page);
    await page.goto('/settings/display');
    const { theme, pageSize, indicators, save } = displayFields(page);
    await expect(pageSize).toBeVisible();
    await prefs.wait();
    if (edited) await pageSize.fill('127');
    prefs.release();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const beforeSave = { theme: await theme.inputValue(), libraryPageSize: await pageSize.inputValue(), showWatchedIndicators: await indicators.isChecked() };
    await expect.soft(theme).toHaveValue('light');
    await expect.soft(pageSize).toHaveValue(edited ? '127' : '96');
    await expect.soft(indicators).not.toBeChecked();
    if (edited) await expect(pageSize).toBeFocused();
    expect(prefs.writes).toEqual([]);
    await save.click();
    await expect.poll(() => prefs.writes.length).toBe(1);
    await info.attach('hydration-and-save', { body: JSON.stringify({ edited, beforeSave, writes: prefs.writes }, null, 2), contentType: 'application/json' });
    expect(prefs.writes[0].prefs).toMatchObject({
      display: { theme: 'light', libraryPageSize: edited ? 127 : 96, showWatchedIndicators: false },
      playback: savedUserdata.prefs.playback,
    });
    expect(prefs.writes[0].favorites).toEqual(savedUserdata.favorites);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await remountDisplay(page);
    await expect(theme).toHaveValue('light');
    await expect(pageSize).toHaveValue(edited ? '127' : '96');
    await expect(indicators).not.toBeChecked();
    expect(prefs.writes).toHaveLength(1);
  });
}

test('hydration preserves edit-then-revert choices and an empty numeric draft without applying an unsaved theme', async ({ page }) => {
  const prefs = await holdPreferences(page);
  await page.goto('/settings/display');
  const { theme, pageSize, indicators, save } = displayFields(page);
  await expect(pageSize).toBeVisible();
  await prefs.wait();
  await theme.selectOption('light');
  await theme.selectOption('dark');
  await indicators.uncheck();
  await indicators.check();
  await pageSize.fill('');
  prefs.release();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(theme).toHaveValue('dark');
  await expect(indicators).toBeChecked();
  await expect(pageSize).toHaveValue('');
  await expect(pageSize).toBeFocused();
  expect(prefs.writes).toEqual([]);
  await pageSize.fill('127');
  await save.click();
  await expect.poll(() => prefs.writes.length).toBe(1);
  expect(prefs.writes[0].prefs).toMatchObject({ display: {
    theme: 'dark', libraryPageSize: 127, showWatchedIndicators: true,
  } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('a PUT merge hydrates pristine fields while retaining edits made after Save', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  let acknowledge!: () => void;
  const held = new Promise<void>((resolve) => { acknowledge = resolve; });
  const writes: Record<string, unknown>[] = [];
  await page.route(`${ORIGIN}/api/userdata`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { prefs: { display: savedDisplay } } });
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON() as Record<string, unknown>;
    writes.push(body);
    if (writes.length === 1) {
      await held;
      return route.fulfill({ json: { prefs: { display: { ...savedDisplay, libraryPageSize: 100, showWatchedIndicators: true } } } });
    }
    return route.fulfill({ json: body });
  });
  await page.goto('/settings/display');
  const { theme, pageSize, indicators, save } = displayFields(page);
  await expect(pageSize).toHaveValue('96');
  await pageSize.fill('127');
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  await theme.selectOption('system');
  await pageSize.fill('143');
  acknowledge();
  await expect(indicators).toBeChecked();
  await expect(theme).toHaveValue('system');
  await expect(pageSize).toHaveValue('143');
  await expect(pageSize).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(writes).toHaveLength(1);
  await save.click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].prefs).toMatchObject({ display: {
    theme: 'system', libraryPageSize: 143, showWatchedIndicators: true,
  } });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('an unavailable userdata response preserves the Display draft and does not save it', async ({ page }) => {
  const prefs = await holdPreferences(page, { status: 503, json: { error: 'Fixture userdata unavailable' } });
  await page.goto('/settings/display');
  const { theme, pageSize, indicators } = displayFields(page);
  await pageSize.fill('127');
  await prefs.wait();
  prefs.release();
  await expect(page.getByTestId('userdata-sync-warning')).toBeVisible();
  await expect(pageSize).toHaveValue('127');
  await expect(pageSize).toBeFocused();
  await expect(theme).toHaveValue('dark');
  await expect(indicators).toBeChecked();
  expect(prefs.writes).toEqual([]);
});
