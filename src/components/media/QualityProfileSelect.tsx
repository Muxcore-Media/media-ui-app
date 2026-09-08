import { useEffect, useState } from 'react';
import { api } from '../../api/client';
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
  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
  }, []);

  if (profiles.length === 0) return null;

  return (
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
          void api
            .setQualityProfile({ kind, id, qualityProfileId: next })
            .then(() => onChange?.(next))
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
  );
}
