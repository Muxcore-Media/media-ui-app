import { useState } from 'react';
import { Flag } from 'lucide-react';
import { api } from '../../api/client';
import { featureEnabled, useCapabilities } from '../../lib/capabilities';
import type { MediaIssueKind } from '../../types';
import { Button } from '../ui/Button';

const KINDS: { id: MediaIssueKind; label: string }[] = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'subtitles', label: 'Subtitles' },
  { id: 'wrong', label: 'Wrong title' },
  { id: 'other', label: 'Other' },
];

export function ReportIssueButton({
  title,
  mediaType,
  mediaId,
  tmdbId,
  variant = 'button',
}: {
  title: string;
  mediaType: string;
  mediaId?: string;
  tmdbId?: number;
  /** `icon` is the compact player OSD control. */
  variant?: 'button' | 'icon';
}) {
  const { caps } = useCapabilities();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MediaIssueKind>('video');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!featureEnabled(caps, 'issues')) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.reportIssue({ kind, mediaType, mediaId, tmdbId, title, message });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send report');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <span className="text-sm text-[var(--text-secondary)]" role="status">
        Issue reported
      </span>
    );
  }

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        aria-label={open ? 'Cancel report' : 'Report an issue'}
        aria-expanded={open}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--player-fg)] transition hover:bg-[var(--player-chip-hover)]"
        onClick={() => setOpen((v) => !v)}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
      </button>
    ) : (
      <Button variant="secondary" icon={<Flag className="h-4 w-4" aria-hidden="true" />} onClick={() => setOpen((v) => !v)}>
        {open ? 'Cancel report' : 'Report issue'}
      </Button>
    );

  return (
    <div className={variant === 'icon' ? 'relative' : 'space-y-2'} data-testid="report-issue">
      {trigger}
      {open ? (
        <div
          className={`space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 ${
            variant === 'icon'
              ? 'absolute right-0 z-20 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] text-left shadow-lg'
              : 'max-w-md'
          }`}
        >
          <label className="block text-xs text-[var(--text-tertiary)]">
            What is wrong?
            <select
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as MediaIssueKind)}
            >
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--text-tertiary)]">
            Details (optional)
            <textarea
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1.5 text-sm"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {error ? <p className="text-xs text-[var(--danger-color)]">{error}</p> : null}
          <Button size="sm" disabled={busy} onClick={() => void submit()}>
            {busy ? 'Sending…' : 'Send report'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
