import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, friendlyFetchError } from '../../api/client';
import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { ActionNote } from '../operator/ActionNote';
import { Button } from '../ui/Button';

export function RemoveLibraryButton({
  kind,
  id,
  title,
  hasFile,
  onRemoved,
}: {
  kind: 'movie' | 'tv' | 'artist' | 'author' | 'book' | 'series' | 'issue' | 'audiobook';
  id: string;
  title: string;
  hasFile?: boolean;
  onRemoved?: () => void;
}) {
  const { canOperate } = useOperatorAccess();
  const [open, setOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeLibraryItem({ kind, id, deleteFiles });
      onRemoved?.();
    } catch (err) {
      setError(friendlyFetchError(err, 'Could not remove from library'));
    } finally {
      setBusy(false);
    }
  }

  // Removal and file deletion are operator actions (admin/manager) on the BFF.
  if (!canOperate) return <ActionNote message={error} testId="remove-library-note" />;

  if (!open) {
    return (
      <Button
        variant="danger"
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        disabled={!id}
        onClick={() => setOpen(true)}
        data-testid="remove-library"
      >
        Remove
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3" data-testid="remove-library-confirm">
      <p className="text-sm text-[var(--text-primary)]">
        Remove <span className="font-semibold">{title || 'this title'}</span> from the library?
      </p>
      {hasFile ? (
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            data-testid="remove-library-delete-files"
          />
          Also delete files on disk
        </label>
      ) : null}
      <ActionNote message={error} testId="remove-library-note" />
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Removing…' : deleteFiles ? 'Remove and delete files' : 'Remove from library'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
