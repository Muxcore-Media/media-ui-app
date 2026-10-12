import { Buffer } from 'node:buffer';
import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';

const ORIGIN = 'http://127.0.0.1:4173';
const STREAM = '/stream/movies/fixture-movie-1';
const PLAYER = `/player?src=${encodeURIComponent(STREAM)}&title=Keyboard%20fixture&id=fixture-movie-1&kind=movie&back=%2Fmovies%2Ffixture-movie-1`;

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
