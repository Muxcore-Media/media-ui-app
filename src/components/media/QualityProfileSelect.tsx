import { useEffect, useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { ActionNote } from '../operator/ActionNote';
import type { QualityProfile } from '../../lib/formats';

export function QualityProfileSelect({
  kind,
  id,
  value,
  onChange,
}: {
  kind: 'movie' | 'tv' | 'artist';
  id: string;
  value?: string;
  onChange?: (next: string) => void;
}) {
  const { canOperate } = useOperatorAccess();
  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Changing a quality profile is an operator action (admin/manager) on the BFF.
    if (!canOperate) return;
    let cancelled = false;
    void api
      .getFormats()
      .then((catalog) => {
        if (!cancelled) setProfiles(catalog.profiles);
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canOperate]);

  if (!canOperate) return <ActionNote message={error} testId="quality-profile-note" />;
  if (profiles.length === 0) return null;

  return (
    <div className="space-y-1">
      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span className="sr-only">Quality profile</span>
        <select
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          disabled={busy || !id}
          value={value || ''}
          aria-label="Quality profile"
          onChange={(e) => {
            const next = e.target.value;
            if (!next) return;
            setBusy(true);
            setError(null);
            void api
              .setQualityProfile({ kind, id, qualityProfileId: next })
              .then(() => onChange?.(next))
              .catch((err) => setError(friendlyFetchError(err, 'Could not change the quality profile')))
              .finally(() => setBusy(false));
          }}
        >
          <option value="">Quality profile</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <ActionNote message={error} testId="quality-profile-note" />
    </div>
  );
}
