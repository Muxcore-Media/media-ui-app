import type { Page } from '@playwright/test';
import { test, expect, movies } from './fixtures';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

// A cached operator role can be stale: the household may demote a member after the SPA cached it.
// The BFF then answers 403 `operator.*` (T-M5-12, C-30). These HTTP-fixture scenarios prove the
// SPA's reaction (calm status, no retry, one session re-read, control removed). They do not prove
// enforcement, which lives in the BFF.

const ORIGIN = 'http://127.0.0.1:4173';
const FORBIDDEN = { status: 403, json: { error: 'admin or manager role required', code: 'operator.forbidden' } };

test.beforeEach(({}, testInfo) => {
  test.skip(!['phone', 'desktop'].includes(testInfo.project.name), 'Checked at the 375 and 1280 widths');
});
test.use({ sessionRoles: ['manager'] });

/** The session the BFF reports; flips to `viewer` once the member is demoted. */
async function demotableSession(page: Page) {
  const state = { roles: ['manager'], reads: 0 };
  await page.route(`${ORIGIN}/api/session`, (route) => {
    state.reads += 1;
    return route.fulfill({ json: { user_id: 'fixture-member', roles: state.roles } });
  });
  return state;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('a stale-role 403 on Monitor is explained calmly, not retried, and the control goes away', async ({ page }) => {
  const session = await demotableSession(page);
  let patches = 0;
  await page.route(`${ORIGIN}/api/movies/${movies[0].id}`, (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    patches += 1;
    session.roles = ['viewer'];
    return route.fulfill(FORBIDDEN);
  });
  await page.goto(`/movies/${movies[0].id}`);
  await expect(page.getByRole('button', { name: 'Monitor', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle'); // the app's own initial identity reads are done
  const readsBefore = session.reads;
  await page.getByRole('button', { name: 'Monitor', exact: true }).click();
  const note = page.getByTestId('monitor-note');
  await expect(note).toHaveText("You don't have permission for this action.");
  await expect(note).toHaveAttribute('role', 'status');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Monitor', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('remove-library')).toHaveCount(0);
  await expect(page.getByRole('link', { name: `Play ${movies[0].title}`, exact: true })).toBeVisible();
  expect(patches).toBe(1);
  expect(session.reads - readsBefore).toBe(1);
  await expectNoHorizontalScroll(page);
});

test('a stale-role 403 on Stop is a calm status, not retried', async ({ page }) => {
  const session = await demotableSession(page);
  await page.route(`${ORIGIN}/api/capabilities`, (route) => route.fulfill({ json: {
    ...DEFAULT_CAPABILITIES,
    features: { ...DEFAULT_CAPABILITIES.features, playbackMonitor: true },
  } }));
  await page.route(`${ORIGIN}/api/sessions`, (route) => route.fulfill({ json: {
    available: true,
    items: [{ id: 's1', title: 'Dune', user: 'sam', href: `/movies/${movies[0].id}` }],
  } }));
  await page.route(`${ORIGIN}/api/sessions/events`, (route) => route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' }));
  let stops = 0;
  await page.route(`${ORIGIN}/api/sessions/s1/stop`, (route) => {
    stops += 1;
    session.roles = ['viewer'];
    return route.fulfill(FORBIDDEN);
  });
  await page.goto('/sessions');
  await page.getByRole('button', { name: 'Stop Dune' }).click();
  const notice = page.getByTestId('operator-notice');
  await expect(notice).toContainText("You don't have permission for this action.");
  await expect(notice).toHaveAttribute('role', 'status');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop Dune' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open', exact: true })).toBeVisible();
  expect(stops).toBe(1);
  await expectNoHorizontalScroll(page);
});
