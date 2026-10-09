import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCurrentSession, getSessionGeneration, subscribeSession } from './session';
import {
  getPreferenceLoadStatus,
  getPreferences,
  pullUserdataFromServer,
  pushUserdataToServer,
  updatePreferences,
} from './userdata';

const PREFS = 'muxcore.userdata.prefs.v1';
const display = (libraryPageSize: number) => ({ theme: 'light' as const, libraryPageSize, showWatchedIndicators: false });
const blob = (libraryPageSize: number) => ({ user_id: 'fixture-user', prefs: { display: display(libraryPageSize) } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function transport() {
  const requests: {
    method: string;
    body: Record<string, unknown>;
    reply: (body: unknown, status?: number) => Promise<void>;
  }[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (url !== '/api/userdata') return Promise.resolve(new Response(JSON.stringify({ user_id: 'fixture-user' })));
    const response = deferred<Response>();
    requests.push({
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : {},
      async reply(body, status = 200) {
        response.resolve(new Response(JSON.stringify(body), { status }));
        // Complete the fixture response and its promise callbacks before asserting cache state.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      },
    });
    return response.promise;
  }));
  return requests;
}

describe('preference request ordering', () => {
  beforeEach(() => {
    clearCurrentSession();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('requires a current-document read even if persisted metadata says authoritative', async () => {
    localStorage.setItem('muxcore.userdata.meta.v1', JSON.stringify({ serverAuthoritative: true }));
    expect(getPreferenceLoadStatus()).toBe('idle');
    const requests = transport();
    const read = pullUserdataFromServer();
    await requests[0].reply(blob(96));
    await read;
    expect(getPreferenceLoadStatus()).toBe('ready');
    expect(getPreferences().display.libraryPageSize).toBe(96);
  });

  it('accepts a successful empty preference read without replacing existing cache', async () => {
    localStorage.setItem(PREFS, JSON.stringify({ display: display(96) }));
    const requests = transport();
    const read = pullUserdataFromServer();
    await requests[0].reply({ user_id: 'fixture-user' });
    await read;
    expect(getPreferenceLoadStatus()).toBe('ready');
    expect(getPreferences().display.libraryPageSize).toBe(96);
  });

  it.each([null, [], { prefs: [] }, { prefs: 'invalid' }])('does not enable saving after malformed preference data %j', async (body) => {
    const requests = transport();
    const read = pullUserdataFromServer();
    await requests[0].reply(body);
    await read;
    expect(getPreferenceLoadStatus()).toBe('error');
    expect(getPreferences().display.libraryPageSize).toBe(48);
  });

  it('supports failure and explicit read retry without an unsolicited write', async () => {
    const requests = transport();
    const failed = pullUserdataFromServer();
    await requests[0].reply({}, 503);
    await failed;
    expect(getPreferenceLoadStatus()).toBe('error');
    const retry = pullUserdataFromServer();
    expect(getPreferenceLoadStatus()).toBe('loading');
    await requests[1].reply(blob(96));
    await retry;
    expect(getPreferenceLoadStatus()).toBe('ready');
    expect(requests.map((request) => request.method)).toEqual(['GET', 'GET']);
  });

  it('ignores an older GET success after a newer GET has supplied preferences', async () => {
    const requests = transport();
    const first = pullUserdataFromServer();
    const second = pullUserdataFromServer();
    await requests[1].reply(blob(143));
    await second;
    await requests[0].reply(blob(96));
    await first;
    expect(getPreferences().display.libraryPageSize).toBe(143);
    expect(getPreferenceLoadStatus()).toBe('ready');
  });

  it('ignores an older read failure after a newer read succeeds', async () => {
    const requests = transport();
    const first = pullUserdataFromServer();
    const second = pullUserdataFromServer();
    await requests[1].reply(blob(143));
    await second;
    await requests[0].reply({}, 503);
    await first;
    expect(getPreferenceLoadStatus()).toBe('ready');
  });

  it('does not let an older PUT acknowledgment overwrite a newer saved edit', async () => {
    const requests = transport();
    updatePreferences({ display: display(127) });
    updatePreferences({ display: display(143) });
    await requests[1].reply(blob(143));
    await requests[0].reply(blob(127));
    expect(getPreferences().display.libraryPageSize).toBe(143);
  });

  it('orders responses from duplicate writes with the same local preference edit revision', async () => {
    const requests = transport();
    const first = pushUserdataToServer();
    const second = pushUserdataToServer();
    await requests[1].reply(blob(143));
    await second;
    await requests[0].reply(blob(127));
    await first;
    expect(getPreferences().display.libraryPageSize).toBe(143);
  });

  it('retains a newer failed save across an older acknowledgment and GET until a matching retry succeeds', async () => {
    const requests = transport();
    updatePreferences({ display: display(127) });
    updatePreferences({ display: display(143) });
    await requests[1].reply({}, 503);
    await requests[0].reply(blob(127));
    const read = pullUserdataFromServer();
    await requests[2].reply(blob(96));
    await read;
    expect(getPreferences().display.libraryPageSize).toBe(143);
    const retry = pushUserdataToServer();
    expect(requests[3].body.prefs).toMatchObject({ display: display(143) });
    await requests[3].reply(blob(144));
    await retry;
    expect(getPreferences().display.libraryPageSize).toBe(144);
    const fresh = pullUserdataFromServer();
    await requests[4].reply(blob(150));
    await fresh;
    expect(getPreferences().display.libraryPageSize).toBe(150);
  });

  it.each(['before', 'after'])('rejects an overlapping GET started %s a saved edit even after its PUT finishes', async (when) => {
    const requests = transport();
    let read: Promise<boolean>;
    if (when === 'before') {
      read = pullUserdataFromServer();
      updatePreferences({ display: display(143) });
    } else {
      updatePreferences({ display: display(143) });
      read = pullUserdataFromServer();
    }
    await requests.find((request) => request.method === 'PUT')!.reply(blob(144));
    await requests.find((request) => request.method === 'GET')!.reply(blob(96));
    await read;
    expect(getPreferences().display.libraryPageSize).toBe(144);
  });

  it.each([{}, { prefs: [] }])('does not treat an acknowledgment without valid preferences as clearing the pending edit: %j', async (ack) => {
    const requests = transport();
    updatePreferences({ display: display(143) });
    await requests[0].reply(ack);
    const read = pullUserdataFromServer();
    await requests[1].reply(blob(96));
    await read;
    expect(getPreferences().display.libraryPageSize).toBe(143);
  });

  it.each(['GET', 'PUT'])('ignores old-session %s preferences and read readiness', async (method) => {
    const requests = transport();
    const pending = method === 'GET' ? pullUserdataFromServer() : pushUserdataToServer();
    clearCurrentSession();
    localStorage.setItem(PREFS, JSON.stringify({ display: display(143) }));
    await requests[0].reply(blob(96));
    await pending;
    expect(getPreferences().display.libraryPageSize).toBe(143);
    expect(getPreferenceLoadStatus()).toBe('idle');
  });

  it('keeps a new-session successful read ready when an old-session read later fails', async () => {
    const requests = transport();
    const old = pullUserdataFromServer();
    clearCurrentSession();
    const current = pullUserdataFromServer();
    await requests[1].reply(blob(143));
    await current;
    await requests[0].reply({}, 503);
    await old;
    expect(getPreferenceLoadStatus()).toBe('ready');
  });

  it('checks the session generation after asynchronous response JSON parsing', async () => {
    const parsed = deferred<unknown>();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => parsed.promise }));
    const read = pullUserdataFromServer();
    await Promise.resolve();
    clearCurrentSession();
    parsed.resolve(blob(96));
    await read;
    expect(getPreferenceLoadStatus()).toBe('idle');
    expect(getPreferences().display.libraryPageSize).toBe(48);
  });

  it('checks the session generation after awaiting identity refresh', async () => {
    const identity = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn((url: string) => url === '/api/userdata'
      ? Promise.resolve(new Response(JSON.stringify({ prefs: { display: display(96) } })))
      : identity.promise));
    const read = pullUserdataFromServer();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    clearCurrentSession();
    identity.resolve(new Response(JSON.stringify({ user_id: 'old-user' })));
    await read;
    expect(getPreferenceLoadStatus()).toBe('idle');
  });

  it('uses existing cross-tab invalidation to reject a pending preference response', async () => {
    const requests = transport();
    const unsubscribe = subscribeSession(() => {});
    try {
      const generation = getSessionGeneration();
      const read = pullUserdataFromServer();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      expect(getSessionGeneration()).toBeGreaterThan(generation);
      await requests[0].reply(blob(96));
      await read;
      expect(getPreferenceLoadStatus()).toBe('idle');
      expect(getPreferences().display.libraryPageSize).toBe(48);
    } finally { unsubscribe(); }
  });

  it('preserves raw unknown preference sections and nested extras while normalizing known values', async () => {
    const stored = {
      futureSection: { value: ['preserve'] },
      display: { ...display(96), futureDisplay: { enabled: true } },
      playback: { audioOffsetMs: 250, futurePlayback: 'preserve' },
      subtitles: { offsetMs: 100, futureSubtitles: 'preserve' },
      home: { futureHome: 'preserve' }, controls: { futureControls: 'preserve' },
      notifications: { futureNotifications: 'preserve' }, player: { futurePlayer: 'preserve' },
      parental: { kids_mode: true, max_parental_rating: 'PG', futureParental: 'preserve' },
    };
    localStorage.setItem(PREFS, JSON.stringify(stored));
    const requests = transport();
    updatePreferences({ display: display(127) });
    const expected = { ...stored, display: { ...stored.display, libraryPageSize: 127 } };
    expect(JSON.parse(localStorage.getItem(PREFS)!)).toMatchObject(expected);
    expect(requests[0].body.prefs).toMatchObject(expected);
    expect(requests[0].body.prefs).toMatchObject({ parental: { kidsMode: true, kids_mode: true, maxRating: 'PG', max_parental_rating: 'PG' } });
    await requests[0].reply(requests[0].body);
  });
});
