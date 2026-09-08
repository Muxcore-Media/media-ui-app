import { useEffect, useState } from 'react';
import { Check, Download, LoaderCircle } from 'lucide-react';
import { featureEnabled, useCapabilities } from '../../lib/capabilities';
import {
  downloadOfflineTitle,
  getOfflineTitle,
  type OfflineTitle,
} from '../../lib/offline-library';

type Props = {
  id: string;
  title: string;
  kind: string;
  src?: string;
  poster?: string;
  href?: string;
  compact?: boolean;
};

export function OfflineDownloadButton({ id, title, kind, src, poster, href, compact }: Props) {
  const { caps } = useCapabilities();
  const [row, setRow] = useState<OfflineTitle | null>(() => getOfflineTitle(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRow(getOfflineTitle(id));
  }, [id]);

  if (!featureEnabled(caps, 'offline') || !src) return null;

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      setRow(await downloadOfflineTitle({ id, title, kind, src: src!, poster, href }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setRow(getOfflineTitle(id));
    } finally {
      setBusy(false);
    }
  }

  const ready = row?.status === 'ready';
  const label = busy || row?.status === 'downloading' ? 'Saving…' : ready ? 'Saved offline' : 'Save offline';

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        data-testid="offline-download"
        disabled={busy || ready}
        aria-label={`${label} ${title}`}
        onClick={() => void onSave()}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-color)] disabled:opacity-70'
            : 'inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-color)] disabled:opacity-70'
        }
      >
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : ready ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </button>
      {error ? (
        <span className="text-xs text-[var(--danger-color)]" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
