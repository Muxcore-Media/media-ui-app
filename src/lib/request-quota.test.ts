import { describe, expect, it } from 'vitest';
import { requestQuotaMessage } from './request-quota';
import type { RequestPolicy } from '../api/client';

const base: RequestPolicy = {
  maxPendingPerUser: 0,
  maxPerWeek: 0,
  autoApproveUsers: [],
  pendingUsed: 0,
  weekUsed: 0,
  remainingPending: -1,
  remainingWeek: -1,
  canRequest: true,
  autoApprove: false,
  canEdit: false,
  code: '',
  reason: '',
};

describe('requestQuotaMessage', () => {
  it('is empty when unlimited', () => {
    expect(requestQuotaMessage(base)).toBe('');
  });

  it('summarizes remaining caps', () => {
    expect(
      requestQuotaMessage({
        ...base,
        maxPendingPerUser: 3,
        remainingPending: 1,
        maxPerWeek: 5,
        remainingWeek: 4,
      }),
    ).toBe('1 of 3 pending left · 4 of 5 this week');
  });

  it('prefers the server reason when blocked', () => {
    expect(
      requestQuotaMessage({
        ...base,
        canRequest: false,
        reason: 'Weekly request limit reached.',
      }),
    ).toBe('Weekly request limit reached.');
  });
});
