import { describe, expect, it } from 'vitest';
import { normalizePasswordResets } from './password-resets';

describe('password resets', () => {
  it('normalizes household reset rows', () => {
    const next = normalizePasswordResets({
      available: true,
      count: 1,
      requests: [{ id: 'req1', username: 'alice', note: 'lost phone', user_id: 'u1', user: true }],
    });
    expect(next.requests[0]).toMatchObject({ id: 'req1', username: 'alice', userId: 'u1', user: true });
  });

  it('treats missing auth users as unmatched', () => {
    const next = normalizePasswordResets({
      available: true,
      requests: [{ id: 'req2', username: 'ghost' }],
    });
    expect(next.requests[0].user).toBe(false);
  });
});
