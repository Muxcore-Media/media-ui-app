/** Current household user id for salted parental PIN hashes (admin-ui contract). */

const USER_ID_KEY = 'muxcore.session.userId.v1';
const ROLES_KEY = 'muxcore.session.roles.v1';

const IDENTITY_PATHS = ['/api/session', '/api/me'] as const;
const sessionListeners = new Set<() => void>();
let identityGeneration = 0;
let pendingIdentity: Promise<string> | null = null;

export type SessionSnapshot = Readonly<{ userId: string; roles: readonly string[] }>;
let snapshot: SessionSnapshot = Object.freeze({ userId: '', roles: Object.freeze([] as string[]) });
let snapshotUserId = '';
let snapshotRoles = '';

function notifySession() {
  for (const listener of sessionListeners) listener();
}

function invalidateIdentityRefresh() {
  identityGeneration++;
  pendingIdentity = null;
}

/** Capture this before an async identity writer; logout or cross-tab changes invalidate it. */
export function getSessionGeneration(): number {
  return identityGeneration;
}

/** Observe same-document updates and other tabs without triggering another refresh. */
export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== USER_ID_KEY && event.key !== ROLES_KEY) return;
    invalidateIdentityRefresh();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    sessionListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function readRolesCache(): string {
  try {
    return localStorage.getItem(ROLES_KEY) || '';
  } catch {
    return '';
  }
}

function parseRolesCache(raw: string): string[] {
  try {
    return rolesFromUnknown({ roles: raw ? JSON.parse(raw) : [] });
  } catch {
    return [];
  }
}

/** Stable immutable snapshot for React's external-store subscription. */
export function getSessionSnapshot(): SessionSnapshot {
  const userId = getCurrentUserId();
  const roles = readRolesCache();
  if (userId !== snapshotUserId || roles !== snapshotRoles) {
    snapshotUserId = userId;
    snapshotRoles = roles;
    snapshot = Object.freeze({ userId, roles: Object.freeze(parseRolesCache(roles)) });
  }
  return snapshot;
}

/** Read the cached auth-local / BFF user id used as the parental PIN salt. */
export function getCurrentUserId(): string {
  try {
    return (localStorage.getItem(USER_ID_KEY) || '').trim();
  } catch {
    return '';
  }
}

/** Persist the current user id (tests and identity refresh). Empty clears the cache. */
export function setCurrentUserId(userId: string): void {
  writeUserId(userId);
  notifySession();
}

function writeUserId(userId: string): void {
  try {
    const id = userId.trim();
    if (!id) {
      localStorage.removeItem(USER_ID_KEY);
      return;
    }
    localStorage.setItem(USER_ID_KEY, id);
  } catch {
    /* private mode / unavailable storage */
  }
}

/** Parse role names from `/api/me` / `/api/session` JSON. */
export function rolesFromUnknown(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const roles = (raw as Record<string, unknown>).roles;
  if (Array.isArray(roles)) {
    return roles
      .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
      .map((r) => r.trim());
  }
  if (typeof roles === 'string' && roles.trim()) {
    return roles
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return [];
}

/** Cached household roles from the last identity refresh. */
export function getCurrentRoles(): string[] {
  return parseRolesCache(readRolesCache());
}

/** Persist household roles (tests and identity refresh). Empty clears the cache. */
export function setCurrentRoles(roles: string[]): void {
  writeRoles(roles);
  notifySession();
}

function writeRoles(roles: string[]): void {
  try {
    const clean = roles.map((r) => r.trim()).filter(Boolean);
    if (clean.length === 0) {
      localStorage.removeItem(ROLES_KEY);
      return;
    }
    localStorage.setItem(ROLES_KEY, JSON.stringify(clean));
  } catch {
    /* private mode / unavailable storage */
  }
}

/** Clear cosmetic identity state and prevent an older request from restoring it. */
export function clearCurrentSession(): void {
  invalidateIdentityRefresh();
  writeUserId('');
  writeRoles([]);
  notifySession();
}

/**
 * True when the household session may approve/deny media requests.
 * Matches BFF `sessionHasPrivilegedRole` (admin/manager) plus an explicit approver role.
 */
export function canApproveRequests(roles: string[] = getCurrentRoles()): boolean {
  return roles.some((role) => {
    switch (role.trim().toLowerCase()) {
      case 'admin':
      case 'manager':
      case 'approver':
        return true;
      default:
        return false;
    }
  });
}

function hasAdminOrManager(roles: readonly string[]): boolean {
  return roles.some((role) => {
    switch (role.trim().toLowerCase()) {
      case 'admin':
      case 'manager':
        return true;
      default:
        return false;
    }
  });
}

/**
 * True when the session may use the state-changing operator controls the BFF role-gates (T-M5-12,
 * BFF-API.md "Operator route roles"): remove/delete/refresh, monitor and quality changes, grab/block,
 * wanted, search-now, retry, import, rename, subtitle download, Live TV timers, session stop.
 * Same predicate as the BFF `sessionHasPrivilegedRole` (admin or manager). Cosmetic only: the cached
 * role can be stale and the BFF is the authority.
 */
export function canOperateLibrary(roles: readonly string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/**
 * True when the session may change a library item's `root_folder_path`. The BFF requires `admin`
 * for it (`operator.admin_required` for a manager); monitored and quality stay manager-capable.
 */
export function canChangeRootFolder(roles: readonly string[] = getCurrentRoles()): boolean {
  return roles.some((role) => role.trim().toLowerCase() === 'admin');
}

/** True when the household session may access shared acquisition settings. */
export function canManageAcquisition(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the session may create, update, or delete indexers (BFF admin-only writes). */
export function canManageIndexers(roles: string[] = getCurrentRoles()): boolean {
  return roles.some((role) => role.trim().toLowerCase() === 'admin');
}

/** True when the household session may change request quotas and auto-approval policy. */
export function canManageRequestPolicy(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create/revoke invite links (Wizarr-style). */
export function canManageInvites(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create/browse/delete library root folders. */
export function canManageLibrary(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may list, role-change, or remove household users. */
export function canManageUsers(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create/edit/delete naming templates. */
export function canManageNaming(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may manage shared quality and grab-delay profiles. */
export function canManageQuality(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may add/remove external import lists. */
export function canManageLists(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may import Radarr/Sonarr/Lidarr libraries. */
export function canManageMigrate(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may configure Discord/Slack/email Connect. */
export function canManageNotifications(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create/assign Arr-style library tags. */
export function canManageTags(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create, delete, or restore backups. */
export function canManageBackups(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may create, rotate, or revoke API keys. */
export function canManageKeys(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** True when the household session may manage wanted subtitles and providers. */
export function canManageSubtitles(roles: string[] = getCurrentRoles()): boolean {
  return hasAdminOrManager(roles);
}

/** Pull a user id from a session, userdata, or identity JSON object. */
export function userIdFromUnknown(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return '';
  const o = raw as Record<string, unknown>;
  for (const key of ['user_id', 'userId', 'id']) {
    const value = o[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  if (o.user && typeof o.user === 'object') {
    return userIdFromUnknown(o.user);
  }
  return '';
}

/**
 * Best-effort identity refresh. Tries BFF `/api/session` then `/api/me`.
 * Cached identity is kept on transient failures; explicit auth denial clears it.
 * This cache only controls presentation. The BFF remains the authorization boundary.
 */
export function refreshCurrentUserId(): Promise<string> {
  if (pendingIdentity) return pendingIdentity;
  const request = refreshIdentity(identityGeneration).finally(() => {
    if (pendingIdentity === request) pendingIdentity = null;
  });
  pendingIdentity = request;
  return request;
}

async function refreshIdentity(generation: number): Promise<string> {
  for (const path of IDENTITY_PATHS) {
    try {
      const res = await fetch(path, { headers: { Accept: 'application/json' } });
      if (generation !== identityGeneration) return getCurrentUserId();
      if (res.status === 401 || res.status === 403) {
        clearCurrentSession();
        return '';
      }
      if (!res.ok) continue;
      const body = await res.json();
      if (generation !== identityGeneration) return getCurrentUserId();
      const id = userIdFromUnknown(body);
      if (id) {
        writeUserId(id);
        writeRoles(rolesFromUnknown(body));
        notifySession();
        return id;
      }
    } catch {
      /* try next path */
    }
    if (generation !== identityGeneration) return getCurrentUserId();
  }
  return getCurrentUserId();
}
