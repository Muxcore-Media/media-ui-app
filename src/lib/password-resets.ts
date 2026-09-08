export type PasswordResetRequest = {
  id: string;
  username: string;
  note: string;
  createdAt: string;
  userId: string;
  user: boolean;
};

export type PasswordResetsResponse = {
  available: boolean;
  count: number;
  requests: PasswordResetRequest[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizePasswordReset(raw: unknown): PasswordResetRequest {
  const rec = asRecord(raw);
  const userId = String(rec.user_id ?? rec.userId ?? '');
  return {
    id: String(rec.id ?? ''),
    username: String(rec.username ?? ''),
    note: String(rec.note ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
    userId,
    user: rec.user === true || userId !== '',
  };
}

export function normalizePasswordResets(raw: unknown): PasswordResetsResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.requests) ? rec.requests : [];
  const requests = rows.map(normalizePasswordReset).filter((row) => row.id || row.username);
  return {
    available: rec.available === true,
    count: typeof rec.count === 'number' ? rec.count : requests.length,
    requests,
  };
}
