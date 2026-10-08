import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { DEFAULT_CAPABILITIES } from '../src/lib/capabilities';

// BFF HTTP-fixture scenarios for the operator-only controls (T-M5-12, C-30, BFF-API.md "Operator
// route roles"). They prove which controls the SPA offers each cached role and how it reacts to a
// 403 `operator.*`; they do not prove enforcement, which lives in the BFF.

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const ORIGIN = 'http://127.0.0.1:4173';
const PLAYER = '/player?src=%2Fstream%2Fmovies%2Ffixture-movie-1&title=The%20Long%20Journey%20Home&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1';

test.beforeEach(({}, testInfo) => {
  test.skip(
    !['phone', 'desktop'].includes(testInfo.project.name),
    'Operator gating is checked at the 375 and 1280 widths',
  );
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'The page must fit the viewport without sideways scrolling').toBeLessThanOrEqual(0);
}

// Scoped to the page content (`main`): the shell's notification stack carries a pre-existing
// aria-label on a role-less div, which is outside this change.
async function expectNoAxeViolations(page: Page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (window as typeof window & { axe: typeof import('axe-core') }).axe;
    const results = await axe.run({ include: [['main']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    return results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }));
  });
  expect(violations, 'axe wcag2a/wcag2aa violations').toEqual([]);
}

async function expectNoOrphanFocusTargets(page: Page, scope: string) {
  const dead = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return ['missing scope'];
    return [...root.querySelectorAll('button, a[href], input, select, textarea')]
      .filter((el) => !el.getAttribute('aria-label') && !(el.textContent || '').trim() && !(el as HTMLInputElement).labels?.length)
      .map((el) => el.outerHTML.slice(0, 80));
  }, scope);
  expect(dead, 'Every focus target needs a name; none may be left empty').toEqual([]);
}

// --- Activity ---------------------------------------------------------------------------------

async function activityFixture(page: Page) {
  const mutations: string[] = [];
  await page.route(/\/api\/activity(\?|$)/, (route) => route.fulfill({
    json: {
      available: true,
      total: 1,
      items: [{
        id: 'h-fail',
        wanted_item_id: 'q-1',
        guid: 'g-fail',
        title: 'Broken Import',
        status: 'import_failed',
        status_label: 'Import failed',
        status_detail: 'path not watched',
        stuck: true,
        warning: true,
      }],
    },
  }));
  await page.route(/\/api\/wanted(\?|$)/, (route) => route.fulfill({
    json: {
      available: true,
      total: 1,
      items: [{ id: 'q-miss', item_type: 'movie', item_id: 'm-miss', title: 'Still Missing', year: 2024, monitored: true, missing: true }],
    },
  }));
  await page.route(/\/api\/import\/candidates(\?|$)/, (route) => route.fulfill({
    json: { available: true, total: 1, items: [{ path: '/downloads/Dune.2021.mkv', name: 'Dune.2021.mkv', title: 'Dune', media_type: 'movie', year: 2021, size: 1048576 }] },
  }));
  for (const path of ['/api/activity/retry', '/api/releases/search-now', '/api/wanted/remove', '/api/wanted', '/api/releases/block', '/api/import']) {
    await page.route(`${ORIGIN}${path}`, (route) => {
      if (route.request().method() === 'POST') {
        mutations.push(path);
        return route.fulfill({ json: { ok: true } });
      }
      return route.fallback();
    });
  }
  return mutations;
}

test.describe('Activity as viewer', () => {
  test.use({ sessionRoles: ['viewer'] });

  test('shows the queue and history with no operator action', async ({ page }) => {
    const mutations = await activityFixture(page);
    await page.goto('/activity');
    await expect(page.getByText('Still Missing')).toBeVisible();
    await expect(page.getByText('Broken Import')).toBeVisible();
    await expect(page.locator('main').getByRole('button')).toHaveCount(0);
    await expect(page.getByTestId('wanted-add-form')).toHaveCount(0);
    await expect(page.getByTestId('activity-import')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    expect(mutations).toEqual([]);
  });
});

test.describe('Activity as manager', () => {
  test.use({ sessionRoles: ['manager'] });

  test('offers search now, remove, retry, block, add and manual import', async ({ page }) => {
    const mutations = await activityFixture(page);
    await page.goto('/activity');
    await expect(page.getByRole('button', { name: 'Search all wanted' })).toBeVisible();
    await expect(page.getByRole('button', { name: /remove still missing from wanted/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /retry import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Block' })).toBeVisible();
    await expect(page.getByTestId('wanted-add-form')).toBeVisible();
    await expect(page.getByTestId('activity-import')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    expect(mutations).toEqual([]);
  });

  test('a stale-role 403 is explained calmly, not retried, and a session re-read hides the controls', async ({ page }) => {
    await activityFixture(page);
    let roles = ['manager'];
    await page.route(`${ORIGIN}/api/session`, (route) => route.fulfill({ json: { user_id: 'fixture-member', roles } }));
    let retries = 0;
    await page.route(`${ORIGIN}/api/activity/retry`, (route) => {
      retries += 1;
      roles = ['viewer']; // The household changed this member's role after the SPA cached it.
      return route.fulfill({ status: 403, json: { error: 'admin or manager role required', code: 'operator.forbidden' } });
    });
    await page.goto('/activity');
    await page.getByRole('button', { name: /retry import/i }).click();
    await expect(page.getByTestId('activity-flash')).toHaveText("You don't have permission for this action.");
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.locator('main').getByRole('button')).toHaveCount(0);
    expect(retries).toBe(1);
    await expectNoAxeViolations(page);
  });
});

// --- Library item page ------------------------------------------------------------------------

async function rootsFixture(page: Page) {
  const patches: string[] = [];
  await page.route(/\/api\/roots(\?|$)/, (route) => route.fulfill({
    json: { available: true, roots: [{ id: 'r1', path: '/data/movies', name: 'Movies', media_kind: 'movies', accessible: true, is_default: true }] },
  }));
  await page.route(`${ORIGIN}/api/movies/fixture-movie-1`, (route) => {
    if (route.request().method() === 'PATCH') {
      patches.push(route.request().postData() || '');
      return route.fulfill({ json: { ok: true } });
    }
    return route.fallback();
  });
  return patches;
}

const MEMBER_CONTROLS = [
  /^Monitor/,
  'Add to wanted',
  'Refresh metadata',
  'Remove from library',
];

test.describe('Library item as viewer', () => {
  test.use({ sessionRoles: ['viewer'] });

  test('offers no remove, file delete, refresh, monitor, wanted or root-folder control', async ({ page }) => {
    await rootsFixture(page);
    await page.goto('/movies/fixture-movie-1');
    await expect(page.getByTestId('movie-detail-page')).toBeVisible();
    for (const name of MEMBER_CONTROLS) await expect(page.getByRole('button', { name })).toHaveCount(0);
    await expect(page.getByTestId('delete-movie-file')).toHaveCount(0);
    await expect(page.getByTestId('remove-library')).toHaveCount(0);
    await expect(page.getByLabel('Root folder')).toHaveCount(0);
    await expect(page.getByLabel('Quality profile')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
  });
});

test.describe('Library item as manager', () => {
  test.use({ sessionRoles: ['manager'] });

  test('offers monitor, wanted, refresh, remove and file delete but not the root folder', async ({ page }) => {
    const patches = await rootsFixture(page);
    await page.goto('/movies/fixture-movie-1');
    await expect(page.getByTestId('movie-detail-page')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Monitor/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to wanted' })).toBeVisible();
    await expect(page.getByTestId('refresh-metadata')).toBeVisible();
    await expect(page.getByTestId('delete-movie-file')).toBeVisible();
    await expect(page.getByTestId('remove-library')).toBeVisible();
    // The BFF answers operator.admin_required to a manager that names root_folder_path.
    await expect(page.getByLabel('Root folder')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    expect(patches).toEqual([]);
  });
});

test.describe('Library item as admin', () => {
  test.use({ sessionRoles: ['admin'] });

  test('also offers the root-folder picker', async ({ page }) => {
    await rootsFixture(page);
    await page.goto('/movies/fixture-movie-1');
    await expect(page.getByLabel('Root folder')).toBeVisible();
    await expect(page.getByTestId('remove-library')).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

// --- /sessions --------------------------------------------------------------------------------

async function sessionsFixture(page: Page) {
  const stops: string[] = [];
  await page.route(`${ORIGIN}/api/capabilities`, (route) => route.fulfill({
    json: {
      ...DEFAULT_CAPABILITIES,
      features: Object.fromEntries(Object.keys(DEFAULT_CAPABILITIES.features).map((key) => [
        key, ['search', 'formats', 'activity', 'playbackMonitor'].includes(key),
      ])),
    },
  }));
  await page.route(`${ORIGIN}/api/sessions`, (route) => route.fulfill({
    json: {
      available: true,
      total: 1,
      items: [{ id: 's1', title: 'Dune', user: 'sam', href: '/movies/fixture-movie-1', player: 'MuxCore', paused: false, position_seconds: 120, duration_seconds: 600 }],
    },
  }));
  await page.route(`${ORIGIN}/api/sessions/events`, (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }));
  await page.route(`${ORIGIN}/api/sessions/s1/stop`, (route) => {
    stops.push(route.request().method());
    return route.fulfill({ json: { stopped: true } });
  });
  return stops;
}

test.describe('/sessions as viewer', () => {
  test.use({ sessionRoles: ['viewer'] });

  test('lists the stream with no Stop and no empty action group', async ({ page }) => {
    const stops = await sessionsFixture(page);
    await page.goto('/sessions');
    const row = page.getByRole('listitem').filter({ hasText: 'Dune' });
    await expect(row).toBeVisible();
    await expect(page.getByRole('button', { name: /stop|end|kick/i })).toHaveCount(0);
    // The one remaining action is the Open link, so keyboard focus lands on it first.
    await expect(row.locator('button, a')).toHaveCount(1);
    await expect(row.getByRole('link', { name: 'Open' })).toBeVisible();
    await expect(page.getByText(/stop a device/i)).toHaveCount(0);
    await expectNoOrphanFocusTargets(page, '[data-testid="sessions-page"]');
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    expect(stops).toEqual([]);
  });
});

test.describe('/sessions as manager', () => {
  test.use({ sessionRoles: ['manager'] });

  test('offers Stop on the stream', async ({ page }) => {
    const stops = await sessionsFixture(page);
    await page.goto('/sessions');
    const stop = page.getByRole('button', { name: 'Stop Dune' });
    await expect(stop).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
    await stop.click();
    await expect.poll(() => stops).toEqual(['POST']);
  });

  test('a stale-role 403 on Stop is explained calmly and not retried', async ({ page }) => {
    await sessionsFixture(page);
    let stops = 0;
    await page.route(`${ORIGIN}/api/sessions/s1/stop`, (route) => {
      stops += 1;
      return route.fulfill({ status: 403, json: { error: 'admin or manager role required', code: 'operator.forbidden' } });
    });
    await page.goto('/sessions');
    await page.getByRole('button', { name: 'Stop Dune' }).click();
    const notice = page.getByTestId('operator-notice');
    await expect(notice).toContainText("You don't have permission for this action.");
    await expect(notice).toHaveAttribute('role', 'status');
    expect(stops).toBe(1);
    await expectNoHorizontalScroll(page);
    await expectNoAxeViolations(page);
  });
});

// --- Player subtitle download -----------------------------------------------------------------

async function playerFixture(page: Page, download: { status: number; json: unknown }) {
  const downloads: string[] = [];
  await page.route(`${ORIGIN}/api/playback/**`, (route) => {
    const request = route.request();
    if (request.method() !== 'GET') return route.fulfill({ json: { ok: true } });
    if (new URL(request.url()).pathname === '/api/playback/resolve') {
      return route.fulfill({
        json: {
          stream_url: '/stream/movies/fixture-movie-1',
          mode: 'direct',
          resume_enabled: true,
          transcoder_enabled: false,
          prefer_direct_play: true,
          max_bitrate_mbps: '80',
          trickplay_enabled: false,
          transcoder_available: false,
        },
      });
    }
    return route.fulfill({ json: { src: '', enabled: false, tracks: [], segments: [] } });
  });
  await page.route(`${ORIGIN}/stream/**`, (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));
  await page.route(/\/api\/subtitles\/search(\?|$)/, (route) => route.fulfill({
    json: { available: true, results: [{ id: 'sub42', provider: 'opensubtitles', title: 'Journey 2025', language: 'en', format: 'srt', release: 'WEB' }] },
  }));
  await page.route(`${ORIGIN}/api/subtitles/files/sub42.vtt`, (route) => route.fulfill({ contentType: 'text/vtt', body: 'WEBVTT\n' }));
  await page.route(`${ORIGIN}/api/subtitles/download`, (route) => {
    downloads.push(route.request().method());
    return route.fulfill(download);
  });
  return downloads;
}

async function openSubtitles(page: Page) {
  await page.goto(PLAYER);
  await page.getByLabel('Settings').click();
  const menu = page.getByTestId('player-settings-menu');
  // The fixture serves an empty video, so the player sits in its "format not supported" state with
  // a transparent play overlay above the menu. Dispatch the click on the menu item itself.
  await menu.getByText('Subtitles').dispatchEvent('click');
  return menu;
}

test.describe('Player subtitles as viewer', () => {
  test.use({ sessionRoles: ['viewer'] });

  test('offers appearance but no Find online (download is operator-only)', async ({ page }) => {
    const downloads = await playerFixture(page, { status: 200, json: {} });
    const menu = await openSubtitles(page);
    await expect(menu.getByRole('button', { name: 'Appearance…' })).toBeVisible();
    await expect(menu.getByTestId('subtitle-find-online-btn')).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    expect(downloads).toEqual([]);
  });
});

test.describe('Player subtitles as manager', () => {
  test.use({ sessionRoles: ['manager'] });

  test('offers Find online and downloads a result', async ({ page }) => {
    const downloads = await playerFixture(page, {
      status: 200,
      json: { track_url: '/api/subtitles/files/sub42.vtt', language: 'en', label: 'English' },
    });
    const menu = await openSubtitles(page);
    await menu.getByTestId('subtitle-find-online-btn').dispatchEvent('click');
    await expect(menu.getByTestId('subtitle-find-results')).toBeVisible();
    await menu.getByLabel(/Download Journey 2025/i).dispatchEvent('click');
    await expect.poll(() => downloads).toEqual(['POST']);
    await expectNoHorizontalScroll(page);
  });

  test('a stale-role 403 on download is explained calmly, not retried, and stops offering the entry', async ({ page }) => {
    const downloads = await playerFixture(page, {
      status: 403,
      json: { error: 'admin or manager role required', code: 'operator.forbidden' },
    });
    const menu = await openSubtitles(page);
    await menu.getByTestId('subtitle-find-online-btn').dispatchEvent('click');
    await menu.getByLabel(/Download Journey 2025/i).dispatchEvent('click');
    await expect(menu.getByText("You don't have permission for this action.")).toBeVisible();
    await expect(menu.getByRole('alert')).toHaveCount(0);
    expect(downloads).toEqual(['POST']);
    await expectNoHorizontalScroll(page);
  });
});
