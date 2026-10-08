import { test, expect } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';

for (const edited of [false, true]) {
  test(`delayed Display preferences hydrate untouched fields with an edited draft ${edited}`, async ({ page }, info) => {
    let release!: () => void;
    let requested = false;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const writes: Record<string, unknown>[] = [];
    await page.route(`${ORIGIN}/api/userdata`, async (route) => {
      if (route.request().method() === 'PUT') {
        writes.push(route.request().postDataJSON() as Record<string, unknown>);
        return route.fulfill({ json: { ok: true } });
      }
      requested = true;
      await held;
      return route.fulfill({ json: {
        user_id: 'fixture-member',
        prefs: { display: { theme: 'light', libraryPageSize: 96, showWatchedIndicators: false } },
      } });
    });
    await page.goto('/settings/display');
    const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
    const pageSize = page.getByLabel('Titles per page', { exact: true });
    const indicators = page.getByLabel('Show watched indicators', { exact: true });
    await expect(pageSize).toBeVisible();
    await expect.poll(() => requested).toBe(true);
    if (edited) await pageSize.fill('127');
    release();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const beforeSave = { theme: await theme.inputValue(), libraryPageSize: await pageSize.inputValue(), showWatchedIndicators: await indicators.isChecked() };
    await expect.soft(theme).toHaveValue('light');
    await expect.soft(pageSize).toHaveValue(edited ? '127' : '96');
    await expect.soft(indicators).not.toBeChecked();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    await info.attach('hydration-and-save', { body: JSON.stringify({ edited, beforeSave, writes }, null, 2), contentType: 'application/json' });
    expect(writes[0].prefs).toMatchObject({ display: {
      theme: 'light', libraryPageSize: edited ? 127 : 96, showWatchedIndicators: false,
    } });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
}
