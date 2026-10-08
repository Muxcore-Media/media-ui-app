import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { ActionNote } from '../operator/ActionNote';
import { Button } from '../ui/Button';

type Kind = 'movie' | 'tv' | 'season' | 'episode' | 'artist' | 'album' | 'author' | 'book' | 'series' | 'issue' | 'audiobook';

export function MonitorButton({
  kind,
  id,
  monitored,
  onChange,
  compact,
}: {
  kind: Kind;
  id: string;
  monitored?: boolean;
  onChange?: (next: boolean) => void;
  compact?: boolean;
}) {
  const { canOperate } = useOperatorAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const on = Boolean(monitored);

  async function toggle() {
    if (!canOperate || !id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = !on;
      await api.setMonitored({ kind, id, monitored: next });
      onChange?.(next);
    } catch (err) {
      setError(friendlyFetchError(err, 'Could not change monitoring'));
    } finally {
      setBusy(false);
    }
  }

  // After a 403 correction the control is gone but the polite explanation stays.
  if (!canOperate) return <ActionNote message={error} testId="monitor-note" />;

  if (compact) {
    return (
      <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)] disabled:opacity-50"
        disabled={busy || !id}
        onClick={() => void toggle()}
      >
        {on ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
        {on ? 'Monitored' : 'Unmonitored'}
      </button>
      <ActionNote message={error} testId="monitor-note" />
      </>
    );
  }

  return (
    <div className="space-y-1">
    <Button
      variant={on ? 'primary' : 'secondary'}
      icon={on ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
      disabled={busy || !id}
      onClick={() => void toggle()}
    >
      {on ? 'Monitoring' : 'Monitor'}
    </Button>
    <ActionNote message={error} testId="monitor-note" />
    </div>
  );
}
