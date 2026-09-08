export type HouseholdAPIKey = {
  id: string;
  name: string;
  prefix: string;
  userId: string;
  username: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
};

export type KeysResponse = {
  available: boolean;
  keys: HouseholdAPIKey[];
};

export type CreatedAPIKey = {
  key: HouseholdAPIKey;
  secret: string;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeHouseholdAPIKey(raw: unknown): HouseholdAPIKey {
  const rec = asRecord(raw);
  const scopes = Array.isArray(rec.scopes) ? rec.scopes.map(String).filter(Boolean) : [];
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    prefix: String(rec.prefix ?? ''),
    userId: String(rec.user_id ?? rec.userId ?? ''),
    username: String(rec.username ?? ''),
    scopes,
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
    lastUsed: String(rec.last_used ?? rec.lastUsed ?? ''),
  };
}

export function normalizeKeys(raw: unknown): KeysResponse {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.keys) ? rec.keys : Array.isArray(rec.tokens) ? rec.tokens : [];
  return {
    available: rec.available === true,
    keys: rows.map(normalizeHouseholdAPIKey).filter((row) => row.id),
  };
}

export function normalizeCreatedAPIKey(raw: unknown): CreatedAPIKey {
  const rec = asRecord(raw);
  return {
    key: normalizeHouseholdAPIKey(rec.token ?? rec.key),
    secret: String(rec.secret ?? ''),
  };
}

export function apiKeyLabel(key: HouseholdAPIKey): string {
  const who = key.username || key.userId;
  return who ? `${key.name || key.prefix || key.id} · ${who}` : key.name || key.prefix || key.id || 'API key';
}

export function keyWriteBody(input: { name: string; userId?: string; scopes?: string[] }): Record<string, unknown> {
  return {
    name: input.name,
    user_id: input.userId,
    scopes: input.scopes,
  };
}
