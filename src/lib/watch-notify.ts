export const WATCH_NOTIFY_EVENTS = [
  'playback.started',
  'playback.stopped',
  'guard.violation',
  'media.request.ready',
] as const;

export const WATCH_NOTIFY_DESTINATION_TYPES = ['discord', 'slack', 'webhook', 'apprise'] as const;

export type WatchNotifyEvent = (typeof WATCH_NOTIFY_EVENTS)[number];
export type WatchNotifyDestinationType = (typeof WATCH_NOTIFY_DESTINATION_TYPES)[number];

export type WatchNotifyFilters = {
  userIds: string[];
  platforms: string[];
  mediaTypes: string[];
  transcodeOnly: boolean;
  minDurationSec: number;
};

export type WatchNotifyRule = {
  id: string;
  name: string;
  enabled: boolean;
  eventType: string;
  titleTemplate: string;
  messageTemplate: string;
  severity: string;
  filters: WatchNotifyFilters;
  destinationIds: string[];
};

export type WatchNotifyDestination = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
  events: string[];
};

export type WatchNotifyCatalog = {
  available: boolean;
  rules: WatchNotifyRule[];
  destinations: WatchNotifyDestination[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

function asStrings(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((row) => String(row ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function asConfig(raw: unknown): Record<string, string> {
  const rec = asRecord(raw);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (!key) continue;
    out[key] = String(value ?? '');
  }
  return out;
}

export function normalizeWatchNotifyFilters(raw: unknown): WatchNotifyFilters {
  const rec = asRecord(raw);
  return {
    userIds: asStrings(rec.userIds ?? rec.user_ids),
    platforms: asStrings(rec.platforms),
    mediaTypes: asStrings(rec.mediaTypes ?? rec.media_types),
    transcodeOnly: rec.transcodeOnly === true || rec.transcode_only === true,
    minDurationSec: Number(rec.minDurationSec ?? rec.min_duration_sec) || 0,
  };
}

export function normalizeWatchNotifyRule(raw: unknown): WatchNotifyRule {
  const row = asRecord(raw);
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    enabled: row.enabled !== false,
    eventType: String(row.eventType ?? row.event_type ?? ''),
    titleTemplate: String(row.titleTemplate ?? row.title_template ?? ''),
    messageTemplate: String(row.messageTemplate ?? row.message_template ?? ''),
    severity: String(row.severity ?? 'info'),
    filters: normalizeWatchNotifyFilters(row.filters),
    destinationIds: asStrings(row.destinationIds ?? row.destination_ids),
  };
}

export function normalizeWatchNotifyDestination(raw: unknown): WatchNotifyDestination {
  const row = asRecord(raw);
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    type: String(row.type ?? ''),
    enabled: row.enabled !== false,
    config: asConfig(row.config),
    events: asStrings(row.events),
  };
}

export function normalizeWatchNotifyCatalog(raw: Record<string, unknown> | null | undefined): WatchNotifyCatalog {
  return {
    available: raw?.available === true,
    rules: asRows(raw?.rules).map(normalizeWatchNotifyRule).filter((row) => row.id || row.name),
    destinations: asRows(raw?.destinations)
      .map(normalizeWatchNotifyDestination)
      .filter((row) => row.id || row.name),
  };
}

export function watchNotifyEventLabel(eventType: string): string {
  switch (eventType) {
    case 'playback.started':
      return 'Playback started';
    case 'playback.stopped':
      return 'Playback stopped';
    case 'guard.violation':
      return 'Guard violation';
    case 'media.request.ready':
      return 'Request ready';
    default:
      return eventType || 'Watch event';
  }
}

export function watchNotifyRuleLabel(rule: WatchNotifyRule): string {
  const state = rule.enabled ? 'on' : 'off';
  return `${rule.name || 'Rule'} · ${watchNotifyEventLabel(rule.eventType)} · ${state}`;
}

export function watchNotifyDestinationLabel(dest: WatchNotifyDestination): string {
  const state = dest.enabled ? 'on' : 'off';
  return `${dest.name || dest.type || 'Destination'} · ${dest.type} · ${state}`;
}

export function csvList(values: string[]): string {
  return values.join(', ');
}

export function parseCsvList(raw: string): string[] {
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}
