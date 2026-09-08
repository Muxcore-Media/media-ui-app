import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import { api, type RequestPolicy } from '../../api/client';
import { requestQuotaMessage } from '../../lib/request-quota';
import { featureEnabled, useCapabilities } from '../../lib/capabilities';

export function RequestQuotaBanner() {
  const { caps } = useCapabilities();
  const [policy, setPolicy] = useState<RequestPolicy | null>(null);

  useEffect(() => {
    if (!featureEnabled(caps, 'request')) return;
    let cancelled = false;
    const load = api.getRequestPolicy;
    if (typeof load !== 'function') return;
    void load()
      .then((p) => {
        if (!cancelled) setPolicy(p);
      })
      .catch(() => {
        if (!cancelled) setPolicy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [caps]);

  if (!featureEnabled(caps, 'request') || !policy) return null;
  const message = requestQuotaMessage(policy);
  if (!message) return null;

  return (
    <div
      className={`flex gap-3 rounded-[var(--radius-md)] border p-3 text-sm ${
        policy.canRequest
          ? 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          : 'border-[var(--warning-color,#f5a623)]/35 bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
      }`}
      data-testid="request-quota"
      role="status"
    >
      <Ticket className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
