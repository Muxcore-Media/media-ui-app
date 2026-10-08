import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { ActionNote } from '../operator/ActionNote';

export function DeleteEpisodeFileButton({
  id,
  onRemoved,
}: {
  id: string;
  onRemoved?: () => void;
}) {
  const { canOperate } = useOperatorAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!id || busy) return;
    if (!window.confirm('Delete this episode file from disk?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeEpisodeFile({ id, deleteFiles: true });
      onRemoved?.();
    } catch (err) {
      setError(friendlyFetchError(err, 'Could not delete the file'));
    } finally {
      setBusy(false);
    }
  }

  // Deleting files from disk is an operator action (admin/manager) on the BFF.
  if (!canOperate) return <ActionNote message={error} testId="delete-file-note" />;

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--danger-color)] disabled:opacity-50"
        disabled={busy || !id}
        onClick={() => void remove()}
        data-testid="delete-episode-file"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete file
      </button>
      <ActionNote message={error} testId="delete-file-note" />
    </>
  );
}
