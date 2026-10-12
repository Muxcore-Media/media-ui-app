import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

// FR-PLAY-012: this is the existing cosmetic prompt, not a profile or a server
// PIN grant. The actual Settings save supplies its hash; the BFF remains denied.
const ORIGIN = 'http://127.0.0.1:4173';
const PLAYER = '/player?src=%2Fstream%2Fmovies%2Ffixture-movie-1&title=The%20Long%20Journey%20Home&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1&content_rating=R';

async function savePINAndOpenPrompt(page: Page, pin: string) {
  const resolves: string[] = [];
  const streams: string[] = [];
  await page.route(`${ORIGIN}/api/playback/**`, (route) => {
    if (route.request().method() !== 'GET') return route.fulfill({ json: { ok: true } });
    if (new URL(route.request().url()).pathname === '/api/playback/resolve') {
      resolves.push(route.request().url());
    }
    return route.fulfill({
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
      json: { error: 'Fixture denial', code: 'playback.parental_blocked', parental_code: 'parental.blocked' },
    });
  });
  await page.route(`${ORIGIN}/stream/**`, (route) => {
    streams.push(route.request().url());
    return route.fulfill({ status: 403, json: { error: 'Fixture denial', code: 'parental.blocked' } });
  });

  const initialRead = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata`
    && response.request().method() === 'GET');
  await page.goto('/settings/parental');
  await initialRead;
  await expect.poll(() => page.evaluate(() => localStorage.getItem('muxcore.session.userId.v1')))
    .toBe('fixture-member');
  await page.getByRole('combobox', { name: 'Maximum rating', exact: true }).selectOption('PG');
  await page.getByLabel('New PIN (4–6 digits)', { exact: true }).fill(pin);
  const saved = page.waitForResponse((response) => response.url() === `${ORIGIN}/api/userdata`
    && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saveResponse = await saved;
  expect(saveResponse.ok()).toBe(true);
  const savedBody = saveResponse.request().postDataJSON();
  const expectedHash = createHash('sha256').update(`fixture-member:${pin}`).digest('hex');
  expect(savedBody.prefs.parental).toMatchObject({ maxRating: 'PG', pinEnabled: true, pinHash: expectedHash });
  await expect(page.getByTestId('parental-flash')).toHaveText('Parental controls saved');

  await page.goto(PLAYER);
  await expect(page.getByTestId('restricted-overlay')).toBeVisible();
  expect(resolves).toHaveLength(0);
  await page.getByRole('button', { name: 'Unlock with PIN', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Parental PIN required' });
  return { dialog, resolves, streams, savedBody, expectedHash };
}

async function expectBFFDenial(page: Page, resolves: string[], streams: string[]) {
  const denial = page.getByTestId('player-parental-state');
  await expect(denial).toContainText('Not available for this profile');
  await expect(page.getByRole('heading', { name: 'Not available for this profile', exact: true })).toBeFocused();
  await expect(page.locator('video')).toHaveCount(0);
  expect(resolves).toHaveLength(1);
  expect(streams).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const pin of ['0123', '01234', '012345']) {
  test(`Settings-saved ${pin.length}-digit PIN unlocks the cosmetic prompt but retains a BFF denial`, async ({ page }, info) => {
    const { dialog, resolves, streams, savedBody, expectedHash } = await savePINAndOpenPrompt(page, pin);
    const inputs = dialog.locator('input[type="password"]');
    const inputCount = await inputs.count();
    await expect(inputs).toHaveCount(1);
    await expect(inputs.first()).toBeFocused();
    const dialogOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(dialogOverflow).toBeLessThanOrEqual(0);
    // Keep the actual keyboard entry from the frozen Settings-to-prompt baseline.
    await page.keyboard.type(pin);
    await expect(dialog).toBeVisible();
    expect(resolves).toEqual([]);
    await dialog.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect.poll(async () => (await page.getByTestId('player-parental-state').count()) > 0
      || (await dialog.getByRole('alert').count()) > 0).toBe(true);
    await info.attach('settings-save-and-prompt', {
      contentType: 'application/json',
      body: JSON.stringify({ pinLength: pin.length, expectedHash, savedParental: savedBody.prefs.parental,
        inputCount, dialogVisible: await dialog.isVisible(), promptError: await dialog.getByRole('alert').allTextContents(),
        resolves, streams }, null, 2),
    });

    await expect(dialog).toHaveCount(0);
    await expectBFFDenial(page, resolves, streams);
  });

  test(`${pin.length}-digit PIN supports retry focus, explicit Enter and keyboard cancellation`, async ({ page }) => {
    const { dialog, resolves, streams } = await savePINAndOpenPrompt(page, pin);
    const input = dialog.getByLabel('PIN', { exact: true });
    const unlock = dialog.getByRole('button', { name: 'Unlock', exact: true });
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(unlock).toBeDisabled();
    await input.fill('123');
    await expect(unlock).toBeDisabled();
    await input.press('Enter');
    await expect(dialog).toBeVisible();
    expect(resolves).toEqual([]);
    await input.fill('1234567');
    await expect(input).toHaveValue('123456');

    await input.fill('9'.repeat(pin.length));
    await input.press('Enter');
    await expect(dialog.getByRole('alert')).toHaveText('Incorrect PIN. Try again.');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    expect(resolves).toEqual([]);

    // A complete four-digit prefix must stay editable for a fifth/sixth digit,
    // and even a correct complete PIN must wait for an explicit submission.
    await page.keyboard.type(pin.slice(0, 4));
    await expect(input).toHaveValue(pin.slice(0, 4));
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await page.keyboard.type(pin.slice(4));
    await expect(input).toHaveValue(pin);
    await expect(dialog).toBeVisible();
    expect(resolves).toEqual([]);
    await input.press('Tab');
    await expect(unlock).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('restricted-overlay')).toBeVisible();
    expect(resolves).toEqual([]);

    await page.getByRole('button', { name: 'Unlock with PIN', exact: true }).click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await input.fill(pin);
    await input.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(resolves).toEqual([]);

    await page.getByRole('button', { name: 'Unlock with PIN', exact: true }).click();
    await expect(input).toBeFocused();
    await input.fill(pin);
    await input.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expectBFFDenial(page, resolves, streams);
  });
}
