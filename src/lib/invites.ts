export type HouseholdInvite = {
  id: string;
  prefix: string;
  createdBy: string;
  role: string;
  maxUses: number;
  useCount: number;
  expiresAt: string;
  revoked: boolean;
  joinUrl: string;
};

export type InvitesResponse = {
  available: boolean;
  invites: HouseholdInvite[];
};

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeInvite(raw: unknown): HouseholdInvite {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: String(rec.id ?? ''),
    prefix: String(rec.prefix ?? ''),
    createdBy: String(rec.created_by ?? rec.createdBy ?? ''),
    role: String(rec.role ?? 'user'),
    maxUses: asNumber(rec.max_uses ?? rec.maxUses),
    useCount: asNumber(rec.use_count ?? rec.useCount),
    expiresAt: String(rec.expires_at ?? rec.expiresAt ?? ''),
    revoked: rec.revoked === true,
    joinUrl: String(rec.join_url ?? rec.joinUrl ?? ''),
  };
}

export function normalizeInvites(raw: unknown): InvitesResponse {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(rec.invites) ? rec.invites : [];
  return {
    available: rec.available === true,
    invites: rows.map(normalizeInvite).filter((row) => row.id),
  };
}

export function inviteUsesLabel(invite: HouseholdInvite): string {
  if (invite.maxUses <= 0) return `${invite.useCount} used (unlimited)`;
  return `${invite.useCount}/${invite.maxUses} used`;
}
