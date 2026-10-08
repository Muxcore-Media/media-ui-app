import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { ActionNote } from '../operator/ActionNote';

export function DeleteMovieFileButton({
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
    if (!canOperate || !id || busy) return;
    if (!window.confirm('Delete this movie file from disk? The title stays in the library.')) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeMovieFile({ id, deleteFiles: true });
      onRemoved?.();
    } catch (err) {
      setError(friendlyFetchError(err, 'Could not delete file'));
    } finally {
      setBusy(false);
    }
  }

  if (!canOperate) return <ActionNote message={error} testId="delete-movie-file-note" />;

  return (
    <>
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)] hover:text-[var(--danger-color)] disabled:opacity-50"
      disabled={busy || !id}
      onClick={() => void remove()}
      data-testid="delete-movie-file"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      Delete file
    </button>
    <ActionNote message={error} testId="delete-movie-file-note" />
    </>
  );
}
