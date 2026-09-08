import { describe, expect, it } from 'vitest';
import { normalizeUsers, primaryRole, userRoleLabel } from './users';

describe('household users', () => {
  it('normalizes auth-local user rows', () => {
    const next = normalizeUsers({
      available: true,
      users: [
        { id: 'u1', username: 'pat', roles: ['viewer'], totp_enabled: true, created_at: '2026-09-08T00:00:00Z' },
        { id: '' },
      ],
    });
    expect(next.users).toHaveLength(1);
    expect(next.users[0].totpEnabled).toBe(true);
    expect(primaryRole(next.users[0])).toBe('viewer');
    expect(userRoleLabel(next.users[0])).toBe('viewer');
  });

  it('soft-fails when user admin is down', () => {
    expect(normalizeUsers({ available: false, users: [] })).toEqual({ available: false, users: [] });
  });
});
