export const GUARD_RULE_TYPES = [
  'concurrent_streams',
  'geo_restriction',
  'impossible_travel',
  'simultaneous_locations',
  'device_velocity',
  'account_inactivity',
] as const;

export type GuardRuleType = (typeof GUARD_RULE_TYPES)[number];

export type GuardRule = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  params: Record<string, string>;
};

export type GuardViolation = {
  id: string;
  ruleId: string;
  ruleType: string;
  userId: string;
  userName: string;
  summary: string;
  severity: string;
  acknowledged: boolean;
  createdAt: string;
};

export type GuardTrust = {
  userId: string;
  userName: string;
  score: number;
  updatedAt: string;
};

export type GuardCatalog = {
  available: boolean;
  rules: GuardRule[];
  violations: GuardViolation[];
  trust: GuardTrust[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asParams(raw: unknown): Record<string, string> {
  const rec = asRecord(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (!key) continue;
    out[key] = String(value ?? '');
  }
  return out;
}

function asRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

export function normalizeGuardRule(raw: unknown): GuardRule {
  const row = asRecord(raw);
  return {
    id: String(row.id ?? ''),
    type: String(row.type ?? ''),
    name: String(row.name ?? ''),
    enabled: row.enabled === true,
    params: asParams(row.params),
  };
}

export function normalizeGuardCatalog(raw: Record<string, unknown> | null | undefined): GuardCatalog {
  return {
    available: raw?.available === true,
    rules: asRows(raw?.rules).map(normalizeGuardRule).filter((row) => row.id || row.name),
    violations: asRows(raw?.violations).map((row) => ({
      id: String(row.id ?? ''),
      ruleId: String(row.ruleId ?? row.rule_id ?? ''),
      ruleType: String(row.ruleType ?? row.rule_type ?? ''),
      userId: String(row.userId ?? row.user_id ?? ''),
      userName: String(row.userName ?? row.user_name ?? ''),
      summary: String(row.summary ?? ''),
      severity: String(row.severity ?? ''),
      acknowledged: row.acknowledged === true,
      createdAt: String(row.createdAt ?? row.created_at ?? ''),
    })).filter((row) => row.id),
    trust: asRows(raw?.trust).map((row) => ({
      userId: String(row.userId ?? row.user_id ?? ''),
      userName: String(row.userName ?? row.user_name ?? ''),
      score: Number(row.score) || 0,
      updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    })).filter((row) => row.userId || row.userName),
  };
}

export function guardRuleTypeLabel(type: string): string {
  switch (type) {
    case 'concurrent_streams':
      return 'Concurrent streams';
    case 'geo_restriction':
      return 'Geo restriction';
    case 'impossible_travel':
      return 'Impossible travel';
    case 'simultaneous_locations':
      return 'Simultaneous locations';
    case 'device_velocity':
      return 'Device velocity';
    case 'account_inactivity':
      return 'Account inactivity';
    default:
      return type || 'Rule';
  }
}

export function guardParamsText(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([key]) => key)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export function parseGuardParams(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

export function guardRuleLabel(rule: GuardRule): string {
  const state = rule.enabled ? 'on' : 'off';
  return `${rule.name} · ${guardRuleTypeLabel(rule.type)} · ${state}`;
}
