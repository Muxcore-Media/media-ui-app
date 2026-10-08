import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { ActionNote } from '../operator/ActionNote';
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
  const { canOperate } = useOperatorAccess();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (!canOperate || !id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.refreshLibraryItem({ kind, id });
      setDone(true);
      onRefreshed?.();
    } catch (err) {
      setError(friendlyFetchError(err, 'Could not refresh metadata'));
    } finally {
      setBusy(false);
    }
  }

  if (!canOperate) return <ActionNote message={error} testId="refresh-metadata-note" />;

  return (
    <div className="space-y-1">
    <Button
      variant="secondary"
      icon={<RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />}
      disabled={busy || !id}
      onClick={() => void refresh()}
      data-testid="refresh-metadata"
    >
      {done ? 'Refreshed' : 'Refresh metadata'}
    </Button>
    <ActionNote message={error} testId="refresh-metadata-note" />
    </div>
  );
}
