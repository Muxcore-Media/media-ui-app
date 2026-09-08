import { describe, expect, it } from 'vitest';
import { inviteUsesLabel, normalizeInvites } from './invites';

describe('household invites', () => {
  it('normalizes invite admin rows', () => {
    const res = normalizeInvites({
      available: true,
      invites: [
        {
          id: 'inv1',
          prefix: 'abcd',
          created_by: 'sam',
          role: 'viewer',
          max_uses: 1,
          use_count: 0,
          expires_at: '2026-09-15T00:00:00Z',
          join_url: 'https://media.example/invite/tok',
        },
      ],
    });
    expect(res.available).toBe(true);
    expect(res.invites[0]?.role).toBe('viewer');
    expect(inviteUsesLabel(res.invites[0]!)).toBe('0/1 used');
  });

  it('soft-fails when auth-local is unlinked', () => {
    expect(normalizeInvites({ available: false, invites: [] })).toEqual({ available: false, invites: [] });
  });
});
