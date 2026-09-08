import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';

export function RefreshMetadataButton({
  kind,
  id,
  onRefreshed,
}: {
  kind: 'movie' | 'tv' | 'artist';
  id: string;
  onRefreshed?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function refresh() {
    if (!id || busy) return;
    setBusy(true);
    try {
      await api.refreshLibraryItem({ kind, id });
      setDone(true);
      onRefreshed?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="secondary"
      icon={<RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />}
      disabled={busy || !id}
      onClick={() => void refresh()}
      data-testid="refresh-metadata"
    >
      {done ? 'Refreshed' : 'Refresh metadata'}
    </Button>
  );
}
