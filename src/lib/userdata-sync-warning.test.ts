import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCurrentSession } from './session';
import {
  getPreferenceLoadStatus,
  getUserdataPullFailed,
  pullUserdataFromServer,
  pushUserdataToServer,
  subscribeUserdataPull,
} from './userdata';

const blob = { user_id: 'fixture-user', prefs: { display: { theme: 'light' } } };

function transport() {
  const requests: {
    method: string;
    reply: (status?: number) => void;
    reject: () => void;
    invalidJSON: () => void;
  }[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    expect(url).toBe('/api/userdata');
    return new Promise<Response>((resolve, reject) => {
      requests.push({
        method: init?.method ?? 'GET',
        reply: (status = 200) => resolve(new Response(JSON.stringify(blob), { status })),
        reject: () => reject(new Error('Fixture disconnected')),
        invalidJSON: () => resolve(new Response('{')),
      });
    });
  }));
  return requests;
}

describe('userdata pull warning', () => {
  const subscriptions: (() => void)[] = [];
  beforeEach(() => {
    clearCurrentSession();
    localStorage.clear();
  });
  afterEach(() => {
    subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    vi.unstubAllGlobals();
  });

  it('starts without a warning regardless of persisted sync metadata', async () => {
    localStorage.setItem('muxcore.userdata.meta.v1', JSON.stringify({ serverAuthoritative: false }));
    expect(getUserdataPullFailed()).toBe(false);
    const requests = transport();
    const read = pullUserdataFromServer();
    expect(getUserdataPullFailed()).toBe(false);
    requests[0].reply();
    expect(await read).toBe(true);
    expect(getUserdataPullFailed()).toBe(false);
  });

  it('retains the warning through pending and failed retries, then notifies recovery', async () => {
    const snapshots: boolean[] = [];
    subscriptions.push(subscribeUserdataPull(() => snapshots.push(getUserdataPullFailed())));
    const requests = transport();
    const read = pullUserdataFromServer();
    requests[0].reply(503);
    expect(await read).toBe(false);
    expect(getUserdataPullFailed()).toBe(true);
    expect(snapshots).toContain(true);
    const failedRetry = pullUserdataFromServer();
    expect(getUserdataPullFailed()).toBe(true);
    requests[1].reply(503);
    expect(await failedRetry).toBe(false);
    expect(getUserdataPullFailed()).toBe(true);
    const recovery = pullUserdataFromServer();
    expect(getUserdataPullFailed()).toBe(true);
    requests[2].reply();
    expect(await recovery).toBe(true);
    expect(getUserdataPullFailed()).toBe(false);
    expect(snapshots.at(-1)).toBe(false);
    expect(requests.map((request) => request.method)).toEqual(['GET', 'GET', 'GET']);
  });

  it.each(['reject', 'invalidJSON'] as const)('reports %s failures and recovers on a successful read', async (failure) => {
    const requests = transport();
    const read = pullUserdataFromServer();
    requests[0][failure]();
    expect(await read).toBe(false);
    expect(getUserdataPullFailed()).toBe(true);
    const recovery = pullUserdataFromServer();
    requests[1].reply();
    await recovery;
    expect(getUserdataPullFailed()).toBe(false);
  });

  it('reports later read failure even after Display has become ready to save', async () => {
    const requests = transport();
    const initial = pullUserdataFromServer();
    requests[0].reply();
    await initial;
    const refresh = pullUserdataFromServer();
    requests[1].reply(503);
    await refresh;
    expect(getPreferenceLoadStatus()).toBe('ready');
    expect(getUserdataPullFailed()).toBe(true);
  });

  it.each([
    { older: 503, newer: 200, failed: false },
    { older: 200, newer: 503, failed: true },
  ])('ignores older $older after newer $newer completes', async ({ older, newer, failed }) => {
    const requests = transport();
    const first = pullUserdataFromServer();
    const second = pullUserdataFromServer();
    requests[1].reply(newer);
    await second;
    expect(getUserdataPullFailed()).toBe(failed);
    requests[0].reply(older);
    await first;
    expect(getUserdataPullFailed()).toBe(failed);
  });

  it('does not let an older successful read clear the warning while a newer read is pending', async () => {
    const requests = transport();
    const initial = pullUserdataFromServer();
    requests[0].reply(503);
    await initial;
    const older = pullUserdataFromServer();
    const newer = pullUserdataFromServer();
    requests[1].reply();
    await older;
    expect(getUserdataPullFailed()).toBe(true);
    requests[2].reply();
    await newer;
    expect(getUserdataPullFailed()).toBe(false);
  });

  it.each([200, 503])('does not treat a PUT %i as a read recovery', async (status) => {
    const requests = transport();
    const read = pullUserdataFromServer();
    requests[0].reply(503);
    await read;
    const write = pushUserdataToServer();
    requests[1].reply(status);
    await write;
    expect(requests[1].method).toBe('PUT');
    expect(getUserdataPullFailed()).toBe(true);
  });

  it('notifies session invalidation and ignores an obsolete failed read', async () => {
    const snapshots: boolean[] = [];
    subscriptions.push(subscribeUserdataPull(() => snapshots.push(getUserdataPullFailed())));
    const requests = transport();
    const initial = pullUserdataFromServer();
    requests[0].reply(503);
    await initial;
    const obsolete = pullUserdataFromServer();
    clearCurrentSession();
    expect(getUserdataPullFailed()).toBe(false);
    expect(snapshots.at(-1)).toBe(false);
    requests[1].reply(503);
    await obsolete;
    expect(getUserdataPullFailed()).toBe(false);
  });

  it('does not let a successful prior-session read clear a current failure', async () => {
    const requests = transport();
    const obsolete = pullUserdataFromServer();
    clearCurrentSession();
    const current = pullUserdataFromServer();
    requests[1].reply(503);
    await current;
    requests[0].reply();
    await obsolete;
    expect(getUserdataPullFailed()).toBe(true);
  });

  it('invalidates the warning on a cross-tab session event without another request', async () => {
    const snapshots: boolean[] = [];
    subscriptions.push(subscribeUserdataPull(() => snapshots.push(getUserdataPullFailed())));
    const requests = transport();
    const initial = pullUserdataFromServer();
    requests[0].reply(503);
    await initial;
    window.dispatchEvent(new StorageEvent('storage', { key: 'muxcore.session.roles.v1' }));
    expect(getUserdataPullFailed()).toBe(false);
    expect(snapshots.at(-1)).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it('unsubscribes from read outcomes and session invalidation', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeUserdataPull(listener);
    unsubscribe();
    const requests = transport();
    const initial = pullUserdataFromServer();
    requests[0].reply(503);
    await initial;
    clearCurrentSession();
    window.dispatchEvent(new StorageEvent('storage', { key: 'muxcore.session.roles.v1' }));
    expect(listener).not.toHaveBeenCalled();
  });
});
