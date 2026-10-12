import { Buffer } from 'node:buffer';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';
const STREAM = '/stream/movies/fixture-movie-1';
const PLAYER = `/player?src=${encodeURIComponent(STREAM)}&title=Keyboard%20fixture&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1`;

type FocusMediaEvent = {
  event: string;
  at: number;
  id: number;
  src: string | null;
  code: number | null;
  message: string | null;
  networkState: number;
  readyState: number;
  currentSrc: string;
  currentTime: number;
  duration: number;
};
type MediaSourceEvent = {
  event: string;
  at: number;
  id: number;
  src: string | null;
  previousSrc?: string | null;
};
type FocusMediaWindow = Window & {
  __focusMediaEvents?: FocusMediaEvent[];
  __mediaSourceEvents?: MediaSourceEvent[];
};
const focusResolveEvents = new WeakMap<Page, { event: string; at: number; url: string; status?: number }[]>();

test.afterEach(async ({ page }, testInfo) => {
  const mediaEvents = await page.evaluate(() => (window as FocusMediaWindow).__focusMediaEvents ?? null);
  if (!mediaEvents) return;
  const sourceEvents = await page.evaluate(() => (window as FocusMediaWindow).__mediaSourceEvents);
  await testInfo.attach('native-media-diagnostics', {
    contentType: 'application/json',
    body: JSON.stringify({
      browser: page.context().browser()?.version(),
      fixture: { format: 'PCM WAV', duration: 60, sampleRate: 8000, channels: 1, bitsPerSample: 16 },
      resolveEvents: focusResolveEvents.get(page),
      sourceEvents,
      mediaEvents,
    }, null, 2),
  });
  expect(mediaEvents.filter((event) => event.event === 'error'), 'Native media errors must not be hidden by an automatic source retry').toEqual([]);
});

// Valid, deterministic local media lets native HTMLMediaElement state distinguish
// an accidental play shortcut from the requested button action. No external file,
// backend, codec tool, or mocked media method participates in these checks.
function silentWav() {
  const sampleRate = 8000;
  const sampleBytes = 2;
  const dataBytes = 60 * sampleRate * sampleBytes;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * sampleBytes, 28);
  wav.writeUInt16LE(sampleBytes, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataBytes, 40);
  return wav;
}

async function openPlayer(page: Page) {
  const reads: Record<string, unknown> = {
    '/api/playback/resolve': {
      stream_url: STREAM, mode: 'direct', resume_enabled: true,
      transcoder_enabled: false, transcoder_available: false, trickplay_enabled: false,
    },
    '/api/playback/subtitles': { tracks: [] },
    '/api/playback/segments': { media_id: 'fixture-movie-1', enabled: false, segments: [] },
    '/api/playback/chapters': { src: STREAM, enabled: false, chapters: [] },
  };
  await page.route(`${ORIGIN}/api/playback/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === 'GET' && path in reads) return route.fulfill({ json: reads[path] });
    if (method === 'POST' && path === '/api/playback/session') {
      return route.fulfill({ json: { ok: true, forwarded: false, stopped: false } });
    }
    return route.fallback();
  });
  await page.route(`${ORIGIN}${STREAM}`, (route) => route.fulfill({
    contentType: 'audio/wav', body: silentWav(),
  }));
  await page.goto(PLAYER);
  const video = page.locator('video');
  await expect(video).toHaveAttribute('src', STREAM);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => ({
    duration: element.duration, loaded: element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
    error: element.error?.code ?? null,
  }))).toEqual({ duration: 60, loaded: true, error: null });
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveJSProperty('muted', false);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
  return video;
}

async function focusAndCountClicks(button: Locator) {
  await button.evaluate((element) => {
    element.setAttribute('data-fixture-clicks', '0');
    element.addEventListener('click', () => {
      element.setAttribute('data-fixture-clicks', String(Number(element.getAttribute('data-fixture-clicks')) + 1));
    });
  });
  await button.focus();
  await expect(button).toBeFocused();
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

async function startPlayingWithoutFocus(page: Page) {
  // Capture native errors before navigation and across automatic video remounts.
  await page.addInitScript(() => {
    const mediaEvents: FocusMediaEvent[] = [];
    const sourceEvents: MediaSourceEvent[] = [];
    (window as FocusMediaWindow).__focusMediaEvents = mediaEvents;
    (window as FocusMediaWindow).__mediaSourceEvents = sourceEvents;
    const ids = new WeakMap<HTMLMediaElement, number>();
    let nextId = 0;
    const mediaId = (media: HTMLMediaElement) => {
      if (!ids.has(media)) ids.set(media, ++nextId);
      return ids.get(media)!;
    };
    const recordSource = (media: HTMLMediaElement, event: string, previousSrc?: string | null) => {
      sourceEvents.push({
        event, at: Date.now(), id: mediaId(media), src: media.getAttribute('src'), previousSrc,
      });
    };
    // Records retain removed nodes, including the brief initial video that can
    // disappear before Chromium has time to dispatch its empty-source error.
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof HTMLMediaElement) {
          recordSource(record.target, 'src', record.oldValue);
        }
        for (const [event, nodes] of [['added', record.addedNodes], ['removed', record.removedNodes]] as const) {
          for (const node of nodes) {
            if (node instanceof HTMLMediaElement) recordSource(node, event);
            if (node instanceof Element) {
              for (const media of node.querySelectorAll('video')) recordSource(media, event);
            }
          }
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'], attributeOldValue: true });
    for (const name of ['loadstart', 'loadedmetadata', 'playing', 'pause', 'emptied', 'error']) {
      document.addEventListener(name, (event) => {
        const media = event.target;
        if (!(media instanceof HTMLMediaElement)) return;
        mediaEvents.push({
          event: name, at: Date.now(), id: mediaId(media), src: media.getAttribute('src'),
          code: media.error?.code ?? null,
          message: media.error?.message ?? null, networkState: media.networkState,
          readyState: media.readyState, currentSrc: media.currentSrc,
          currentTime: media.currentTime, duration: media.duration,
        });
      }, true);
    }
  });
  const resolveEvents: { event: string; at: number; url: string; status?: number }[] = [];
  focusResolveEvents.set(page, resolveEvents);
  page.on('request', (request) => {
    if (request.url().startsWith(`${ORIGIN}/api/playback/resolve?`)) {
      resolveEvents.push({ event: 'request', at: Date.now(), url: request.url() });
    }
  });
  page.on('response', (response) => {
    if (response.url().startsWith(`${ORIGIN}/api/playback/resolve?`)) {
      resolveEvents.push({ event: 'response', at: Date.now(), url: response.url(), status: response.status() });
    }
  });
  const video = await openPlayer(page);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Space');
  await expect(video).toHaveJSProperty('paused', false);
  const startedAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(startedAt);
  await page.mouse.move(10, 10);
  await expectPlayerOpacity(page, '1');
  return video;
}

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 30; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function expectPlayerOpacity(page: Page, opacity: string) {
  // Playwright visibility includes opacity:0; inspect the actual rendered chrome.
  await expect(page.getByTestId('player-top-bar')).toHaveCSS('opacity', opacity);
  await expect(page.getByTestId('player-osd-overlay')).toHaveCSS('opacity', opacity);
}

test('Player startup never attaches an empty source or retries healthy native playback', async ({ page }) => {
  const video = await startPlayingWithoutFocus(page);
  const loadedVideo = await video.elementHandle();
  expect(loadedVideo).not.toBeNull();
  const started = await loadedVideo!.evaluate((element: HTMLVideoElement) => ({
    time: element.currentTime, at: Date.now(),
  }));
  // Observe advancing native playback beyond the known 1000ms retry interval.
  // A retained handle prevents a Locator from silently accepting a replacement.
  await expect.soft.poll(() => loadedVideo!.evaluate((element: HTMLVideoElement, start) => ({
    sameVideo: element.isConnected && document.querySelector('video') === element,
    playing: !element.paused,
    advanced: element.currentTime > start.time + 1.25,
    beyondRetryInterval: Date.now() - start.at > 1250,
  }), started)).toEqual({ sameVideo: true, playing: true, advanced: true, beyondRetryInterval: true });
  const sourceEvents = await page.evaluate(() => (window as FocusMediaWindow).__mediaSourceEvents ?? []);
  expect(sourceEvents.length).toBeGreaterThan(0);
  expect.soft(sourceEvents.filter((event) => event.src === '' || event.previousSrc === ''),
    'No initial or subsequent video source assignment may be empty').toEqual([]);
  const mediaEvents = await page.evaluate(() => (window as FocusMediaWindow).__focusMediaEvents ?? []);
  expect.soft(mediaEvents.filter((event) => event.at >= started.at && ['pause', 'emptied', 'loadedmetadata'].includes(event.event)),
    'Healthy playback must not stop or reload').toEqual([]);
  const resolveEvents = focusResolveEvents.get(page) ?? [];
  expect.soft(resolveEvents.filter((event) => event.event === 'request'), 'Healthy startup resolves once').toHaveLength(1);
  expect.soft(resolveEvents.filter((event) => event.event === 'response').map((event) => event.status)).toEqual([200]);
  await expectNoOverflow(page);
});

test('Player chrome stays opaque while Mute retains keyboard focus past idle', async ({ page }) => {
  const video = await startPlayingWithoutFocus(page);
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await tabTo(page, mute);
  // Exercise the real 3500ms idle timer and its 300ms fade, without pointer input.
  await page.waitForTimeout(4000);
  await expect(mute).toBeFocused();
  await expect.soft(page.getByTestId('player-top-bar')).toHaveCSS('opacity', '1');
  await expect.soft(page.getByTestId('player-osd-overlay')).toHaveCSS('opacity', '1');
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveJSProperty('muted', false);
  await expect(page.getByTestId('player-settings-menu')).toHaveCount(0);
  await expectNoOverflow(page);
});

test('Tab into the Back link reveals idle-hidden Player chrome', async ({ page }) => {
  const video = await startPlayingWithoutFocus(page);
  await expectPlayerOpacity(page, '0');
  const back = page.getByRole('link', { name: 'Back', exact: true });
  await tabTo(page, back);
  await expect(back).toBeFocused();
  await expect.soft(page.getByTestId('player-top-bar')).toHaveCSS('opacity', '1');
  await expect.soft(page.getByTestId('player-osd-overlay')).toHaveCSS('opacity', '1');
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveJSProperty('muted', false);
  await expectNoOverflow(page);
});

test('Player focus movement and native actions preserve playback; blur permits idle hiding and pointer reveal', async ({ page }) => {
  const video = await startPlayingWithoutFocus(page);
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await tabTo(page, mute);
  await page.keyboard.press('Space');
  await expect(video).toHaveJSProperty('muted', true);
  await page.keyboard.press('Enter');
  await expect(video).toHaveJSProperty('muted', false);
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Forward 10 seconds', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(mute).toBeFocused();
  await expectPlayerOpacity(page, '1');
  await expect(video).toHaveJSProperty('paused', false);

  await mute.evaluate((element: HTMLButtonElement) => element.blur());
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expectPlayerOpacity(page, '0');
  await page.mouse.move(20, 20);
  await expectPlayerOpacity(page, '1');
  await expectPlayerOpacity(page, '0');
  await expect(video).toHaveJSProperty('paused', false);
  await expect(page.getByTestId('player-settings-menu')).toHaveCount(0);
  await expectNoOverflow(page);
});

test('Space opens focused Player Settings once without starting playback', async ({ page }) => {
  const video = await openPlayer(page);
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await focusAndCountClicks(settings);
  await page.keyboard.press('Space');
  await expect.soft(settings).toHaveAttribute('data-fixture-clicks', '1');
  await expect.soft(settings).toHaveAttribute('aria-expanded', 'true');
  await expect.soft(page.getByTestId('player-settings-menu')).toBeVisible();
  await expect.soft(video).toHaveJSProperty('paused', true);
  await expect(settings).toBeFocused();
  await expectNoOverflow(page);
});

test('Space activates focused Player Mute once without starting playback', async ({ page }) => {
  const video = await openPlayer(page);
  const mute = page.getByTestId('player-osd').locator('button[aria-label="Mute"]');
  await focusAndCountClicks(mute);
  // Keep the same DOM element as its accessible name changes to Unmute.
  const countedMute = page.getByTestId('player-osd').locator('button[data-fixture-clicks]');
  await page.keyboard.press('Space');
  await expect.soft(countedMute).toHaveAttribute('data-fixture-clicks', '1');
  await expect.soft(countedMute).toHaveAccessibleName('Unmute');
  await expect.soft(video).toHaveJSProperty('muted', true);
  await expect.soft(video).toHaveJSProperty('paused', true);
  await expect(countedMute).toBeFocused();
  await expectNoOverflow(page);
});

test('Enter activates Settings and Mute once without starting playback', async ({ page }) => {
  const video = await openPlayer(page);
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await focusAndCountClicks(settings);
  await page.keyboard.press('Enter');
  await expect(settings).toHaveAttribute('data-fixture-clicks', '1');
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('player-settings-menu')).toBeVisible();
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Close settings', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  const mute = page.getByRole('button', { name: 'Mute', exact: true });
  await focusAndCountClicks(mute);
  await page.keyboard.press('Enter');
  const unmute = page.getByRole('button', { name: 'Unmute', exact: true });
  await expect(unmute).toHaveAttribute('data-fixture-clicks', '1');
  await expect(unmute).toBeFocused();
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('paused', true);
  await expectNoOverflow(page);
});

test('Global Space still starts and pauses real fixture media with no focused button', async ({ page }) => {
  const video = await openPlayer(page);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Space');
  await expect(video).toHaveJSProperty('paused', false);
  await page.keyboard.press('Space');
  await expect(video).toHaveJSProperty('paused', true);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(video).toHaveJSProperty('muted', false);
  await expectNoOverflow(page);
});

for (const escapeTarget of ['trigger', 'menu button'] as const) {
  test(`Settings Escape from the ${escapeTarget} closes the menu and leaves focus on Settings`, async ({ page }) => {
    const video = await openPlayer(page);
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    const menu = page.getByTestId('player-settings-menu');
    await settings.focus();
    await page.keyboard.press('Space');
    await expect(menu).toBeVisible();
    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    await expect(settings).toBeFocused();
    if (escapeTarget === 'menu button') {
      const speed = menu.getByRole('button', { name: /^Speed/ });
      await speed.focus();
      await expect(speed).toBeFocused();
    }
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', true);

    await page.keyboard.press('Escape');
    // Removal matters: the mismatched parent state can fade the OSD while the
    // child popup remains mounted and reports itself as expanded.
    await expect.soft(menu).toHaveCount(0);
    await expect.soft(settings).toHaveAttribute('aria-expanded', 'false');
    await expect.soft(settings).toBeFocused();
    await expect(video).toHaveJSProperty('paused', true);
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', false);
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', true);
    await expectNoOverflow(page);
  });
}

for (const closeTarget of ['trigger', 'close button'] as const) {
  test(`Settings ${closeTarget} closes and reopens the menu while K follows the open state`, async ({ page }) => {
    const video = await openPlayer(page);
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    const menu = page.getByTestId('player-settings-menu');
    await settings.focus();
    await page.keyboard.press('Space');
    await expect(menu).toBeVisible();
    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', true);

    if (closeTarget === 'close button') {
      const close = page.getByRole('button', { name: 'Close settings', exact: true });
      await close.focus();
      await expect(close).toBeFocused();
    }
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(settings).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', false);
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', true);

    await settings.focus();
    await page.keyboard.press('Space');
    await expect(menu).toBeVisible();
    await expect(settings).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('k');
    await expect(video).toHaveJSProperty('paused', true);
    await page.keyboard.press('Space');
    await expect(menu).toHaveCount(0);
    await expect(settings).toHaveAttribute('aria-expanded', 'false');
    await expect(settings).toBeFocused();
    await expectNoOverflow(page);
  });
}
