export type HouseholdUser = {
  id: string;
  username: string;
  roles: string[];
  totpEnabled: boolean;
  createdAt: string;
};

export type UsersResponse = {
  available: boolean;
  users: HouseholdUser[];
};

export function normalizeHouseholdUser(raw: unknown): HouseholdUser {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rolesRaw = rec.roles;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.filter((role): role is string => typeof role === 'string' && role.trim() !== '')
    : typeof rolesRaw === 'string' && rolesRaw.trim()
      ? [rolesRaw.trim()]
      : [];
  return {
    id: String(rec.id ?? ''),
    username: String(rec.username ?? ''),
    roles,
    totpEnabled: rec.totp_enabled === true || rec.totpEnabled === true,
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function normalizeUsers(raw: unknown): UsersResponse {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.users) ? rec.users : [];
  return {
    available: rec.available === true,
    users: rows.map(normalizeHouseholdUser).filter((row) => row.id || row.username),
  };
}

export function primaryRole(user: HouseholdUser): string {
  return user.roles[0] || 'user';
}

export function userRoleLabel(user: HouseholdUser): string {
  return user.roles.length ? user.roles.join(', ') : 'user';
}
