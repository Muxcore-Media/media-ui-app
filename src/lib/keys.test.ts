import { describe, expect, it } from 'vitest';
import { apiKeyLabel, keyWriteBody, normalizeCreatedAPIKey, normalizeKeys } from './keys';

describe('normalizeKeys', () => {
  it('maps household API keys without a secret', () => {
    const next = normalizeKeys({
      available: true,
      keys: [{ id: 'tok1', name: 'laptop', prefix: 'mct_abc', user_id: 'u1', username: 'pat' }],
    });
    expect(next.keys[0]).toMatchObject({ id: 'tok1', name: 'laptop', userId: 'u1', username: 'pat' });
    expect(apiKeyLabel(next.keys[0])).toContain('laptop');
  });

  it('soft-fails when auth is unlinked', () => {
    expect(normalizeKeys({ available: false, keys: [] })).toEqual({ available: false, keys: [] });
  });
});

describe('normalizeCreatedAPIKey', () => {
  it('keeps the copy-once secret', () => {
    const next = normalizeCreatedAPIKey({
      token: { id: 'tok-new', name: 'laptop' },
      secret: 'mct_copyonce',
    });
    expect(next.secret).toBe('mct_copyonce');
    expect(next.key.id).toBe('tok-new');
  });
});

describe('keyWriteBody', () => {
  it('sends user_id for another household account', () => {
    expect(keyWriteBody({ name: 'tv', userId: 'u2' })).toEqual({ name: 'tv', user_id: 'u2', scopes: undefined });
  });
});
