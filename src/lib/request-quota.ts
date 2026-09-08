import type { RequestPolicy } from '../api/client';

/** Human copy for remaining household request quota. Empty when unlimited and allowed. */
export function requestQuotaMessage(policy: RequestPolicy): string {
  if (!policy.canRequest && policy.reason) return policy.reason;
  const parts: string[] = [];
  if (policy.maxPendingPerUser > 0) {
    const left = Math.max(0, policy.remainingPending);
    parts.push(`${left} of ${policy.maxPendingPerUser} pending left`);
  }
  if (policy.maxPerWeek > 0) {
    const left = Math.max(0, policy.remainingWeek);
    parts.push(`${left} of ${policy.maxPerWeek} this week`);
  }
  if (parts.length === 0) return '';
  return parts.join(' · ');
}
