import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCurrentSession,
  getCurrentRoles,
  getCurrentUserId,
  getSessionSnapshot,
  refreshCurrentUserId,
  setCurrentRoles,
  setCurrentUserId,
  subscribeSession,
} from './session';
import { pullUserdataFromServer } from './userdata';

const ROLES_KEY = 'muxcore.session.roles.v1';
const cleanups: (() => void)[] = [];

function observeSession(listener: () => void) {
  const unsubscribe = subscribeSession(listener);
  cleanups.push(unsubscribe);
  return unsubscribe;
}

function identity(userId: string, roles: string[]) {
  return new Response(JSON.stringify({ user_id: userId, roles }));
}

describe('reactive session cache', () => {
  beforeEach(() => {
    clearCurrentSession();
    localStorage.clear();
  });

  afterEach(() => {
    for (const unsubscribe of cleanups.splice(0)) unsubscribe();
    vi.unstubAllGlobals();
  });

  it('keeps snapshot references stable until stored identity changes', () => {
    const empty = getSessionSnapshot();
    expect(getSessionSnapshot()).toBe(empty);
    setCurrentUserId(' member ');
    setCurrentRoles(['manager']);
    const current = getSessionSnapshot();
    expect(current).toEqual({ userId: 'member', roles: ['manager'] });
    expect(current).not.toBe(empty);
    expect(getSessionSnapshot()).toBe(current);
    setCurrentRoles(['manager']);
    expect(getSessionSnapshot()).toBe(current);
    expect(Object.isFrozen(current.roles)).toBe(true);
    localStorage.clear();
    expect(getSessionSnapshot()).toEqual({ userId: '', roles: [] });
  });

  it('notifies same-document subscribers and publishes refreshed ID and roles together', async () => {
    setCurrentUserId('old-user');
    setCurrentRoles(['admin']);
    const seen: ReturnType<typeof getSessionSnapshot>[] = [];
    observeSession(() => seen.push(getSessionSnapshot()));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(identity('new-user', ['viewer'])));
    expect(await refreshCurrentUserId()).toBe('new-user');
    expect(seen).toEqual([{ userId: 'new-user', roles: ['viewer'] }]);
    setCurrentRoles([]);
    expect(seen.at(-1)).toEqual({ userId: 'new-user', roles: [] });
  });

  it('observes relevant cross-tab writes and clears without fetching or retaining a subscription', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const changed = vi.fn();
    const unsubscribe = observeSession(changed);
    localStorage.setItem(ROLES_KEY, JSON.stringify(['manager']));
    window.dispatchEvent(new StorageEvent('storage', { key: ROLES_KEY }));
    expect(changed).toHaveBeenCalledOnce();
    expect(getSessionSnapshot().roles).toEqual(['manager']);
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(changed).toHaveBeenCalledOnce();
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(changed).toHaveBeenCalledTimes(2);
    expect(getSessionSnapshot().roles).toEqual([]);
    unsubscribe();
    setCurrentRoles(['admin']);
    window.dispatchEvent(new StorageEvent('storage', { key: ROLES_KEY }));
    expect(changed).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shares an in-flight refresh between app bootstrap and userdata', async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const first = refreshCurrentUserId();
    const second = refreshCurrentUserId();
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledOnce();
    finish(identity('member', ['manager']));
    await expect(first).resolves.toBe('member');
    expect(getCurrentRoles()).toEqual(['manager']);
  });

  it('uses the alternate identity endpoint when the first is unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(identity('member', ['manager']));
    vi.stubGlobal('fetch', fetchMock);
    await expect(refreshCurrentUserId()).resolves.toBe('member');
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/session', '/api/me']);
    expect(getCurrentRoles()).toEqual(['manager']);
  });

  it('removes cached privileges when a successful identity response has no roles', async () => {
    setCurrentRoles(['admin']);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: 'member' }))));
    await refreshCurrentUserId();
    expect(getSessionSnapshot()).toEqual({ userId: 'member', roles: [] });
  });

  it.each([401, 403])('clears expired cached identity on explicit auth denial %s', async (status) => {
    setCurrentUserId('cached-admin');
    setCurrentRoles(['admin']);
    const changed = vi.fn();
    observeSession(changed);
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(refreshCurrentUserId()).resolves.toBe('');
    expect(getCurrentRoles()).toEqual([]);
    expect(getCurrentUserId()).toBe('');
    expect(changed).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('retains cosmetic offline cache on transient failures', async () => {
    setCurrentUserId('cached-member');
    setCurrentRoles(['manager']);
    const cached = getSessionSnapshot();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(refreshCurrentUserId()).resolves.toBe('cached-member');
    expect(getSessionSnapshot()).toBe(cached);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not restore a signed-out identity when an older request finishes', async () => {
    setCurrentUserId('member');
    setCurrentRoles(['admin']);
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; })));
    const pending = refreshCurrentUserId();
    clearCurrentSession();
    finish(identity('member', ['admin']));
    await expect(pending).resolves.toBe('');
    expect(getSessionSnapshot()).toEqual({ userId: '', roles: [] });
  });

  it.each([{ user_id: 'member' }, {}])('does not restore identity from userdata started before logout: %j', async (userdata) => {
    setCurrentUserId('member');
    setCurrentRoles(['admin']);
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve; }))
      .mockResolvedValue(identity('member', ['admin']));
    vi.stubGlobal('fetch', fetchMock);
    const pending = pullUserdataFromServer();
    clearCurrentSession();
    finish(new Response(JSON.stringify(userdata)));
    await pending;
    expect(getSessionSnapshot()).toEqual({ userId: '', roles: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('invalidates pending identity after a cross-tab logout', async () => {
    setCurrentRoles(['admin']);
    observeSession(() => {});
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; })));
    const pending = refreshCurrentUserId();
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    finish(identity('member', ['admin']));
    await pending;
    expect(getSessionSnapshot()).toEqual({ userId: '', roles: [] });
  });
});
