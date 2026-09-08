export type MaintainerCandidate = {
  id: string;
  itemId: string;
  title: string;
  year: number;
  tmdbId: number;
  imdbId: string;
  scope: string;
  status: string;
  arrAction: string;
  sizeBytes: number;
  addedAt: string;
  actAfter: string;
  error: string;
  collection: string;
};

export type MaintainerRun = {
  id: string;
  kind: string;
  status: string;
  candidatesFound: number;
  actionsTaken: number;
  actionsFailed: number;
  dryRun: boolean;
  error: string;
  startedAt: string;
  completedAt: string;
};

export type MaintainerStorage = {
  path: string;
  freePercent: number;
  freeBytes: number;
  totalBytes: number;
  libraryBytes: number;
  itemCount: number;
};

export type MaintainerRule = {
  id: string;
  name: string;
  enabled: boolean;
  scope: string;
  outcome: string;
  arrAction: string;
  definitionJson: string;
  autoActEnabled: boolean;
  autoActDelayDays: number;
  maxActionsPerRun: number;
  collectionId: string;
};

export type MaintainerCollection = {
  id: string;
  name: string;
  enabled: boolean;
  graceDays: number;
  arrAction: string;
  leavingSoonEnabled: boolean;
  leavingSoonLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type MaintainerStatus = {
  available: boolean;
  candidates: MaintainerCandidate[];
  total: number;
  runs: MaintainerRun[];
  storage: MaintainerStorage[];
  rules: MaintainerRule[];
  protections: MaintainerProtection[];
  collections: MaintainerCollection[];
  exclusions: MaintainerExclusion[];
  rulesTotal: number;
};

export type MaintainerProtection = {
  id: string;
  itemId: string;
  title: string;
  reason: string;
  scope: string;
  expiresAt: string;
  createdAt: string;
};

export type HouseholdRuleInput = {
  name: string;
  preset: 'stale_unwatched' | 'last_watched';
  days: number;
  scope: 'movie' | 'series';
  action: 'delete' | 'unmonitor';
  collectionId?: string;
};

export type HouseholdCollectionInput = {
  name: string;
  graceDays: number;
  action?: 'delete' | 'unmonitor';
  leavingSoonEnabled?: boolean;
  leavingSoonLabel?: string;
};

export type MaintainerExclusion = {
  id: string;
  name: string;
  type: string;
  listUrl: string;
  hasApiKey: boolean;
  tmdbIds: number[];
  tmdbCount: number;
  lastSynced: string;
  createdAt: string;
};

export type HouseholdExclusionInput = {
  name: string;
  type: 'local' | 'trakt' | 'mdblist' | 'justwatch';
  listUrl?: string;
  apiKey?: string;
  tmdbIdsText?: string;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeMaintainerCandidate(raw: unknown): MaintainerCandidate {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    itemId: String(rec.item_id ?? rec.itemId ?? ''),
    title: String(rec.title ?? ''),
    year: asNumber(rec.year),
    tmdbId: asNumber(rec.tmdb_id ?? rec.tmdbId),
    imdbId: String(rec.imdb_id ?? rec.imdbId ?? ''),
    scope: String(rec.scope ?? ''),
    status: String(rec.status ?? ''),
    arrAction: String(rec.arr_action ?? rec.arrAction ?? ''),
    sizeBytes: asNumber(rec.size_bytes ?? rec.sizeBytes),
    addedAt: String(rec.added_at ?? rec.addedAt ?? ''),
    actAfter: String(rec.act_after ?? rec.actAfter ?? ''),
    error: String(rec.error ?? ''),
    collection: String(rec.collection ?? ''),
  };
}

export function normalizeMaintainerRun(raw: unknown): MaintainerRun {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    kind: String(rec.kind ?? ''),
    status: String(rec.status ?? ''),
    candidatesFound: asNumber(rec.candidates_found ?? rec.candidatesFound),
    actionsTaken: asNumber(rec.actions_taken ?? rec.actionsTaken),
    actionsFailed: asNumber(rec.actions_failed ?? rec.actionsFailed),
    dryRun: rec.dry_run === true || rec.dryRun === true,
    error: String(rec.error ?? ''),
    startedAt: String(rec.started_at ?? rec.startedAt ?? ''),
    completedAt: String(rec.completed_at ?? rec.completedAt ?? ''),
  };
}

export function normalizeMaintainerStorage(raw: unknown): MaintainerStorage {
  const rec = asRecord(raw);
  return {
    path: String(rec.path ?? ''),
    freePercent: asNumber(rec.free_percent ?? rec.freePercent),
    freeBytes: asNumber(rec.free_bytes ?? rec.freeBytes),
    totalBytes: asNumber(rec.total_bytes ?? rec.totalBytes),
    libraryBytes: asNumber(rec.library_bytes ?? rec.libraryBytes),
    itemCount: asNumber(rec.item_count ?? rec.itemCount),
  };
}

export function normalizeMaintainerRule(raw: unknown): MaintainerRule {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    enabled: rec.enabled === true,
    scope: String(rec.scope ?? ''),
    outcome: String(rec.outcome ?? ''),
    arrAction: String(rec.arr_action ?? rec.arrAction ?? ''),
    definitionJson: String(rec.definition_json ?? rec.definitionJson ?? ''),
    autoActEnabled: rec.auto_act_enabled === true || rec.autoActEnabled === true,
    autoActDelayDays: asNumber(rec.auto_act_delay_days ?? rec.autoActDelayDays),
    maxActionsPerRun: asNumber(rec.max_actions_per_run ?? rec.maxActionsPerRun),
    collectionId: String(rec.collection_id ?? rec.collectionId ?? ''),
  };
}

export function normalizeMaintainerCollection(raw: unknown): MaintainerCollection {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    enabled: rec.enabled !== false,
    graceDays: asNumber(rec.grace_days ?? rec.graceDays),
    arrAction: String(rec.arr_action ?? rec.arrAction ?? ''),
    leavingSoonEnabled: rec.leaving_soon_enabled !== false && rec.leavingSoonEnabled !== false,
    leavingSoonLabel: String(rec.leaving_soon_label ?? rec.leavingSoonLabel ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
    updatedAt: String(rec.updated_at ?? rec.updatedAt ?? ''),
  };
}

export function normalizeMaintainerProtection(raw: unknown): MaintainerProtection {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    itemId: String(rec.item_id ?? rec.itemId ?? ''),
    title: String(rec.title ?? ''),
    reason: String(rec.reason ?? ''),
    scope: String(rec.scope ?? ''),
    expiresAt: String(rec.expires_at ?? rec.expiresAt ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function householdProtectionBody(input: {
  itemId: string;
  title: string;
  scope: 'movie' | 'series';
  reason?: string;
}): Record<string, unknown> {
  return {
    item_id: input.itemId.trim(),
    title: input.title.trim(),
    scope: input.scope,
    reason: input.reason?.trim() || 'Household favorite',
  };
}

export function householdRuleBody(input: HouseholdRuleInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    preset: input.preset,
    days: input.days > 0 ? input.days : 90,
    scope: input.scope,
    action: input.action,
    collection_id: input.collectionId?.trim() || '',
  };
}

export function householdCollectionBody(input: HouseholdCollectionInput): Record<string, unknown> {
  return {
    name: input.name.trim() || 'Leaving soon',
    grace_days: input.graceDays > 0 ? input.graceDays : 7,
    action: input.action ?? 'delete',
    leaving_soon_enabled: input.leavingSoonEnabled !== false,
    leaving_soon_label: input.leavingSoonLabel?.trim() || 'Leaving Soon',
  };
}

export function normalizeMaintainerExclusion(raw: unknown): MaintainerExclusion {
  const rec = asRecord(raw);
  const ids = Array.isArray(rec.tmdb_ids) ? rec.tmdb_ids : Array.isArray(rec.tmdbIds) ? rec.tmdbIds : [];
  const tmdbIds = ids.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  return {
    id: String(rec.id ?? ''),
    name: String(rec.name ?? ''),
    type: String(rec.type ?? ''),
    listUrl: String(rec.list_url ?? rec.listUrl ?? ''),
    hasApiKey: rec.has_api_key === true || rec.hasApiKey === true,
    tmdbIds,
    tmdbCount: asNumber(rec.tmdb_count ?? rec.tmdbCount) || tmdbIds.length,
    lastSynced: String(rec.last_synced ?? rec.lastSynced ?? ''),
    createdAt: String(rec.created_at ?? rec.createdAt ?? ''),
  };
}

export function householdExclusionBody(input: HouseholdExclusionInput): Record<string, unknown> {
  return {
    name: input.name.trim() || 'Never delete list',
    type: input.type,
    list_url: input.listUrl?.trim() || '',
    api_key: input.apiKey?.trim() || '',
    tmdb_ids_text: input.tmdbIdsText?.trim() || '',
  };
}

export function normalizeMaintainerStatus(raw: unknown): MaintainerStatus {
  const rec = asRecord(raw);
  const candidates = Array.isArray(rec.candidates) ? rec.candidates : [];
  const runs = Array.isArray(rec.runs) ? rec.runs : [];
  const storage = Array.isArray(rec.storage) ? rec.storage : [];
  const rules = Array.isArray(rec.rules) ? rec.rules : [];
  const protections = Array.isArray(rec.protections) ? rec.protections : [];
  const collections = Array.isArray(rec.collections) ? rec.collections : [];
  const exclusions = Array.isArray(rec.exclusions) ? rec.exclusions : [];
  const normalizedRules = rules.map(normalizeMaintainerRule).filter((row) => row.id || row.name);
  return {
    available: rec.available === true,
    candidates: candidates.map(normalizeMaintainerCandidate).filter((row) => row.id || row.title),
    total: asNumber(rec.total),
    runs: runs.map(normalizeMaintainerRun).filter((row) => row.id || row.kind),
    storage: storage.map(normalizeMaintainerStorage).filter((row) => row.path),
    rules: normalizedRules,
    protections: protections.map(normalizeMaintainerProtection).filter((row) => row.id || row.itemId),
    collections: collections.map(normalizeMaintainerCollection).filter((row) => row.id || row.name),
    exclusions: exclusions.map(normalizeMaintainerExclusion).filter((row) => row.id || row.name),
    rulesTotal: asNumber(rec.rules_total ?? rec.rulesTotal) || normalizedRules.length,
  };
}

export function maintainerStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'leaving_soon':
      return 'Leaving soon';
    case 'approved':
      return 'Approved';
    case 'postponed':
      return 'Postponed';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return status || 'Unknown';
  }
}

export function maintainerActionLabel(action: string): string {
  switch (action) {
    case 'delete':
      return 'Delete';
    case 'unmonitor':
      return 'Unmonitor';
    case 'unmonitor_only':
      return 'Unmonitor only';
    case 'remove_if_empty':
      return 'Remove if empty';
    case 'do_nothing':
      return 'Do nothing';
    case 'move':
      return 'Move';
    case 'change_quality_profile':
      return 'Change quality';
    default:
      return action || 'Action';
  }
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1);
  return `${i === 0 ? String(Math.round(v)) : rounded} ${units[i]}`;
}
