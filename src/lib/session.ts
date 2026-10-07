/** Current household user id for salted parental PIN hashes (admin-ui contract). */

const USER_ID_KEY = 'muxcore.session.userId.v1';
const ROLES_KEY = 'muxcore.session.roles.v1';

const IDENTITY_PATHS = ['/api/session', '/api/me'] as const;

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
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return rolesFromUnknown({ roles: parsed });
  } catch {
    return [];
  }
}

/** Persist household roles (tests and identity refresh). Empty clears the cache. */
export function setCurrentRoles(roles: string[]): void {
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

function hasAdminOrManager(roles: string[]): boolean {
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
 * Cached id is kept when neither endpoint yields a user id.
 */
export async function refreshCurrentUserId(): Promise<string> {
  const cached = getCurrentUserId();
  for (const path of IDENTITY_PATHS) {
    try {
      const res = await fetch(path, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const body = await res.json();
      const id = userIdFromUnknown(body);
      if (id) {
        setCurrentUserId(id);
        setCurrentRoles(rolesFromUnknown(body));
        return id;
      }
    } catch {
      /* try next path */
    }
  }
  return cached;
}
