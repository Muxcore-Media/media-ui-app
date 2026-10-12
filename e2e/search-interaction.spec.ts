import { test, expect, movies } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';

test('Search navigation exposes one keyboard-usable query input at every width', async ({ page }) => {
  const queries: string[] = [];
  await page.route(`${ORIGIN}/api/search**`, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q') || '');
    return route.fulfill({ json: { results: [] } });
  });
  await page.goto('/');
  await expect(page.getByTestId('home-page')).toBeVisible();
  if (page.viewportSize()!.width < 1024) {
    const searchLink = page.getByRole('navigation', { name: 'Mobile primary navigation' })
      .getByRole('link', { name: 'Search', exact: true });
    await searchLink.focus();
    await page.keyboard.press('Enter');
  } else {
    await page.goto('/search');
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Search', exact: true })).toBeVisible();

  const input = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(input).toHaveCount(1);
  await expect(input).toBeVisible();
  await input.focus();
  await expect(input).toBeFocused();
  await page.keyboard.type('Journey');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/search?q=Journey');
  await expect(page.getByRole('link', { name: new RegExp(movies[0].title) }).first()).toBeVisible();
  await expect(input).toBeFocused();
  expect(queries).toEqual(['Journey']);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Search query edits, history and clearing preserve the selected scope', async ({ page }) => {
  const queries: string[] = [];
  await page.route(`${ORIGIN}/api/search**`, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q') || '');
    return route.fulfill({ json: { results: [] } });
  });
  await page.goto('/search?q=Journey&scope=movies');
  await expect(page.getByRole('link', { name: new RegExp(movies[0].title) }).first()).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(input).toHaveCount(1);
  await expect(input).toHaveValue('Journey');
  await input.fill('Household Film');
  await input.press('Enter');
  await expect(page).toHaveURL('/search?q=Household+Film&scope=movies');
  await expect(page.getByRole('radio', { name: 'Movies', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('link', { name: new RegExp(movies[1].title) }).first()).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/search?q=Journey&scope=movies');
  await expect(input).toHaveValue('Journey');
  await expect(page.getByRole('link', { name: new RegExp(movies[0].title) }).first()).toBeVisible();

  const searchesBeforeClear = queries.length;
  await input.fill('');
  await input.press('Enter');
  await expect(page).toHaveURL('/search?scope=movies');
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Movies', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('link', { name: new RegExp(movies[0].title) })).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Searching' })).toHaveCount(0);
  expect(queries).toHaveLength(searchesBeforeClear);
});

test('A restricted search response removes query entry at every width', async ({ page }) => {
  await page.route(`${ORIGIN}/api/search**`, (route) => route.fulfill({
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
    json: { error: 'fixture denial', code: 'parental.restricted_route' },
  }));
  await page.goto('/search');
  const input = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(input).toHaveCount(1);
  await input.fill('Journey');
  await input.press('Enter');
  await expect(page.getByTestId('parental-notice')).toHaveAttribute('role', 'status');
  await expect(input).toHaveCount(0);
  await expect(page.getByTestId('header-search')).toHaveCount(0);
  await expect(page.getByRole('link', { name: new RegExp(movies[0].title) }).first()).toBeVisible();
});
