import { describe, expect, it } from 'vitest';
import {
  credentialCreationOptions,
  normalizePasskeyBegin,
  normalizePasskeys,
  passkeyLabel,
} from './passkeys';

describe('normalizePasskeys', () => {
  it('maps snake_case credential rows', () => {
    expect(
      normalizePasskeys({
        available: true,
        passkeys: [{ id: 'cred1', credential_type: 'public-key', created_at: '2026-09-08T00:00:00Z' }],
      }),
    ).toEqual({
      available: true,
      passkeys: [
        {
          id: 'cred1',
          credentialType: 'public-key',
          transports: '',
          createdAt: '2026-09-08T00:00:00Z',
          lastUsedAt: '',
        },
      ],
    });
  });
});

describe('normalizePasskeyBegin', () => {
  it('keeps creation options and challenge', () => {
    const options = { publicKey: { challenge: 'abc' } };
    expect(normalizePasskeyBegin({ available: true, options, challenge: 'abc' })).toEqual({
      available: true,
      options,
      challenge: 'abc',
    });
  });
});

describe('passkeyLabel', () => {
  it('uses the created date when present', () => {
    expect(passkeyLabel({
      id: 'c1',
      credentialType: 'public-key',
      transports: '',
      createdAt: '2026-09-08T00:00:00Z',
      lastUsedAt: '',
    })).toMatch(/Passkey added/);
  });
});

describe('credentialCreationOptions', () => {
  it('decodes challenge and user id as ArrayBuffers', () => {
    const opts = credentialCreationOptions({
      publicKey: {
        challenge: 'YQ',
        user: { id: 'dXNlcg', name: 'sam', displayName: 'Sam' },
        pubKeyCredParams: [],
      },
    });
    expect(opts.publicKey?.user.name).toBe('sam');
    expect(opts.publicKey?.challenge).toBeInstanceOf(ArrayBuffer);
    expect(opts.publicKey?.user.id).toBeInstanceOf(ArrayBuffer);
  });
});
