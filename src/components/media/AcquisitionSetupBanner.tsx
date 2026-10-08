import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { api } from '../../api/client';
import { featureEnabled, useCapabilities } from '../../lib/capabilities';
import { canManageAcquisition } from '../../lib/session';
import {
  acquisitionFallbackMessage,
  type AcquisitionStatus,
} from '../../lib/acquisition-status';

/** Shown when requests work but nothing can grab (no live indexer + downloader). */
export function AcquisitionSetupBanner() {
  const { caps } = useCapabilities();
  const [status, setStatus] = useState<AcquisitionStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAcquisition()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  if (status?.ready) return null;
  if (!status) {
    const grabbing =
      featureEnabled(caps, 'acquisition') ||
      featureEnabled(caps, 'activity') ||
      featureEnabled(caps, 'releases') ||
      featureEnabled(caps, 'debrid');
    if (grabbing) return null;
  }

  const message = status?.message?.trim() || acquisitionFallbackMessage();

  return (
    <div
      className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--warning-color,#f5a623)]/35 bg-[var(--bg-elevated)] p-3 text-sm text-[var(--text-secondary)]"
      data-testid="acquisition-setup"
      role="status"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-color,#f5a623)]" aria-hidden="true" />
      <p>
        {message}
        {canManageAcquisition() && featureEnabled(caps, 'acquisition') && (
          <>
            {' '}
            <Link to="/settings/acquisition" className="text-[var(--accent-text)] hover:underline">
              Check acquisition
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
