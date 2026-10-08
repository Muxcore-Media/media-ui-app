import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

// BFF HTTP-fixture scenarios for server-side parental outcomes (ADR-0031, FR-PLAY-007 /
// NFR-A11Y-001/002). They prove how the SPA renders each documented response; they do not
// prove enforcement, which lives in the BFF and needs the household backend run (J-08).

const ORIGIN = 'http://127.0.0.1:4173';
const PLAYER = '/player?src=%2Fstream%2Fmovies%2Ffixture-movie-1&title=The%20Long%20Journey%20Home&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1';

type Answer = { status: number; body: unknown };

const denial = (status: number, code: string, extra: Record<string, unknown> = {}): Answer => ({
  status,
  body: { error: 'fixture denial', code, ...extra },
});

const OK_RESOLVE: Answer = {
  status: 200,
  body: {
    stream_url: '/stream/movies/fixture-movie-1',
    mode: 'direct',
    resume_enabled: true,
    transcoder_enabled: false,
    prefer_direct_play: true,
    max_bitrate_mbps: '80',
    trickplay_enabled: false,
    transcoder_available: false,
  },
};

test.beforeEach(({}, testInfo) => {
  test.skip(
    !['phone', 'desktop'].includes(testInfo.project.name),
    'Parental states are checked at the 375 and 1280 widths',
  );
});

/** Every C-PLAY route answers like the BFF would for a denied principal; telemetry stays exempt. */
async function playbackAnswers(page: Page, ...answers: Answer[]) {
  const resolves: string[] = [];
  let call = 0;
  await page.route(`${ORIGIN}/api/playback/**`, (route) => {
    const request = route.request();
    if (request.method() !== 'GET') return route.fulfill({ json: { ok: true } });
    const isResolve = new URL(request.url()).pathname === '/api/playback/resolve';
    let answer: Answer;
    if (isResolve) {
      resolves.push(request.url());
      answer = answers[Math.min(call++, answers.length - 1)];
    } else {
      answer = answers[Math.min(Math.max(call - 1, 0), answers.length - 1)];
      if (answer.status === 200) return route.fulfill({ json: { src: '', enabled: false, tracks: [] } });
    }
    return route.fulfill({
      status: answer.status,
      headers: { 'Cache-Control': 'no-store' },
      json: answer.body,
    });
  });
  await page.route(`${ORIGIN}/stream/**`, (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));
  return resolves;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'The state must fit the viewport without sideways scrolling').toBeLessThanOrEqual(0);
}

const PLAYER_STATES = [
  {
    name: 'blocked',
    answer: denial(403, 'playback.parental_blocked', { parental_code: 'parental.blocked' }),
    heading: 'Not available for this profile',
    message: /isn't available for this profile/i,
  },
  {
    name: 'policy_unconfigured',
    answer: denial(403, 'parental.policy_unconfigured'),
    heading: "Parental controls aren't set up",
    message: /ask an administrator/i,
  },
  {
    name: 'policy_unverifiable',
    answer: denial(403, 'parental.policy_unverifiable'),
    heading: 'Sign in with a password',
    message: /password instead of Quick Connect/i,
  },
];

for (const state of PLAYER_STATES) {
  test(`Playback ${state.name} shows a specific announced state and no player`, async ({ page }) => {
    const resolves = await playbackAnswers(page, state.answer);
    await page.goto(PLAYER);

    const heading = page.getByRole('heading', { level: 1, name: state.heading });
    await expect(heading).toBeVisible();
    // Focus moves to the heading and the message sits in a polite status region.
    await expect(heading).toBeFocused();
    await expect(page.getByRole('status')).toContainText(state.message);
    await expect(page.locator('video')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);
    await expectNoHorizontalScroll(page);

    // Keyboard: the only way out is the next Tab stop.
    await page.keyboard.press('Tab');
    const back = page.getByRole('link', { name: 'Go back' });
    await expect(back).toBeFocused();
    await expect(back).toHaveAttribute('href', '/movies/fixture-movie-1');

    // The page asked once and did not retry or fall back on its own.
    await page.waitForTimeout(500);
    expect(resolves).toHaveLength(1);
  });
}

test('Playback 503 is a retryable alert, never auto-plays, and recovers only when asked', async ({ page }) => {
  const resolves = await playbackAnswers(
    page,
    denial(503, 'parental.policy_unavailable'),
    OK_RESOLVE,
  );
  await page.goto(PLAYER);

  const alert = page.getByRole('alert');
  await expect(alert).toContainText(/try again in a moment/i);
  await expect(page.locator('video')).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await page.waitForTimeout(500);
  expect(resolves).toHaveLength(1);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const retry = page.getByRole('button', { name: /retry/i });
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('video')).toHaveCount(1);
  expect(resolves.length).toBeGreaterThanOrEqual(2);
});

test('Restricted-route search is a calm status, and the search entry points are hidden', async ({ page }) => {
  await page.route(`${ORIGIN}/api/search**`, (route) => route.fulfill({
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
    json: { error: 'fixture denial', code: 'parental.restricted_route' },
  }));
  await page.goto('/search?q=Journey');

  const notice = page.getByTestId('parental-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('role', 'status');
  await expect(notice).toContainText(/isn't available for restricted accounts/i);
  await expect(page.getByTestId('page-error')).toHaveCount(0);
  await expectNoHorizontalScroll(page);

  // The response also removes the dead-end entry points (cosmetic; the BFF already refused).
  if (page.viewportSize()!.width < 1024) {
    await expect(
      page.getByRole('navigation', { name: 'Mobile primary navigation' }).getByRole('link', { name: 'Search' }),
    ).toHaveCount(0);
  } else {
    await expect(page.getByTestId('header-search')).toHaveCount(0);
  }
  // Library results the server did allow are still reachable.
  await expect(page.getByRole('link', { name: /The Long Journey Home/ }).first()).toBeVisible();
});

test('Blocked detail replaces "not found" with the not-available state', async ({ page }) => {
  await page.route(`${ORIGIN}/api/movies/fixture-movie-1`, (route) => route.fulfill({
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
    json: { error: 'fixture denial', code: 'parental.blocked' },
  }));
  await page.goto('/movies/fixture-movie-1');
  await expect(page.getByRole('heading', { level: 1, name: 'Not available for this profile' })).toBeVisible();
  await expect(page.getByTestId('parental-notice')).toHaveAttribute('role', 'status');
  await expect(page.getByText('Movie not found')).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});
