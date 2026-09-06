/** Current household user id for salted parental PIN hashes (admin-ui contract). */

const USER_ID_KEY = 'muxcore.session.userId.v1';

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
      const id = userIdFromUnknown(await res.json());
      if (id) {
        setCurrentUserId(id);
        return id;
      }
    } catch {
      /* try next path */
    }
  }
  return cached;
}
