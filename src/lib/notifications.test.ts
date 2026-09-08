import { describe, expect, it } from 'vitest';
import { normalizeNotifications, notifyChannelLabel, notifyWriteBody } from './notifications';

describe('notifications', () => {
  it('normalizes household Connect channels without inventing secrets', () => {
    const next = normalizeNotifications({
      available: true,
      channels: [
        { id: 'discord', enabled: true, description: 'Discord', last_error: '' },
        { id: '' },
      ],
    });
    expect(next.channels).toHaveLength(1);
    expect(next.channels[0].id).toBe('discord');
    expect(notifyChannelLabel(next.channels[0])).toBe('discord · Discord');
  });

  it('soft-fails when notification-default is down', () => {
    expect(normalizeNotifications({ available: false, channels: [] })).toEqual({
      available: false,
      channels: [],
    });
  });

  it('writes snake_case configure bodies', () => {
    expect(notifyWriteBody({ channel: 'slack', webhookUrl: 'https://hooks.example/s' })).toEqual({
      channel: 'slack',
      webhook_url: 'https://hooks.example/s',
      smtp_host: undefined,
      smtp_port: undefined,
      smtp_user: undefined,
      smtp_pass: undefined,
      smtp_from: undefined,
      to: undefined,
      enabled: undefined,
    });
  });
});
