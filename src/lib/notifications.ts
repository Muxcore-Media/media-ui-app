export const NOTIFY_CHANNELS = ['discord', 'slack', 'webhook', 'email'] as const;

export type NotifyChannelId = (typeof NOTIFY_CHANNELS)[number];

export type NotifyChannel = {
  id: NotifyChannelId | string;
  enabled: boolean;
  description: string;
  lastError: string;
  lastSuccessAt: string;
};

export type NotificationsStatus = {
  available: boolean;
  channels: NotifyChannel[];
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeNotifyChannel(raw: unknown): NotifyChannel {
  const rec = asRecord(raw);
  return {
    id: String(rec.id ?? ''),
    enabled: rec.enabled !== false,
    description: String(rec.description ?? ''),
    lastError: String(rec.last_error ?? rec.lastError ?? ''),
    lastSuccessAt: String(rec.last_success_at ?? rec.lastSuccessAt ?? ''),
  };
}

export function normalizeNotifications(raw: unknown): NotificationsStatus {
  const rec = asRecord(raw);
  const rows = Array.isArray(rec.channels) ? rec.channels : [];
  return {
    available: rec.available === true,
    channels: rows.map(normalizeNotifyChannel).filter((row) => row.id),
  };
}

export function notifyChannelLabel(ch: NotifyChannel): string {
  const name = ch.id || 'channel';
  const state = ch.enabled ? 'on' : 'off';
  return ch.description ? `${name} · ${ch.description}` : `${name} (${state})`;
}

export function notifyWriteBody(input: {
  channel: string;
  webhookUrl?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  to?: string;
  enabled?: boolean;
}): Record<string, unknown> {
  return {
    channel: input.channel,
    webhook_url: input.webhookUrl,
    smtp_host: input.smtpHost,
    smtp_port: input.smtpPort,
    smtp_user: input.smtpUser,
    smtp_pass: input.smtpPass,
    smtp_from: input.smtpFrom,
    to: input.to,
    enabled: input.enabled,
  };
}
