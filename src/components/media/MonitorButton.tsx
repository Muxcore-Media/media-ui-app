import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
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
  const [busy, setBusy] = useState(false);
  const on = Boolean(monitored);

  async function toggle() {
    if (!id || busy) return;
    setBusy(true);
    try {
      const next = !on;
      await api.setMonitored({ kind, id, monitored: next });
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)] disabled:opacity-50"
        disabled={busy || !id}
        onClick={() => void toggle()}
      >
        {on ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
        {on ? 'Monitored' : 'Unmonitored'}
      </button>
    );
  }

  return (
    <Button
      variant={on ? 'primary' : 'secondary'}
      icon={on ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
      disabled={busy || !id}
      onClick={() => void toggle()}
    >
      {on ? 'Monitoring' : 'Monitor'}
    </Button>
  );
}
