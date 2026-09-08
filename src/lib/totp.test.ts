import { describe, expect, it } from 'vitest';
import { normalizeTOTP } from './totp';

describe('normalizeTOTP', () => {
  it('maps snake_case enable payload', () => {
    expect(
      normalizeTOTP({
        available: true,
        enabled: true,
        secret: 'SECRETBASE32',
        qr_code_url: 'otpauth://totp/MuxCore:sam',
      }),
    ).toEqual({
      available: true,
      enabled: true,
      verified: false,
      secret: 'SECRETBASE32',
      qrCodeUrl: 'otpauth://totp/MuxCore:sam',
    });
  });

  it('soft-fails closed when the blob is missing', () => {
    expect(normalizeTOTP(undefined)).toEqual({
      available: true,
      enabled: false,
      verified: false,
      secret: '',
      qrCodeUrl: '',
    });
  });
});
