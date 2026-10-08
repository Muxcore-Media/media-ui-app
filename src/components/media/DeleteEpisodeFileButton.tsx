import { useOperatorAccess } from '../../hooks/useOperatorAccess';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api/client';

export function DeleteEpisodeFileButton({
  id,
  onRemoved,
}: {
  id: string;
  onRemoved?: () => void;
}) {
  const { canOperate } = useOperatorAccess();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!canOperate || !id || busy) return;
    if (!window.confirm('Delete this episode file from disk?')) return;
    setBusy(true);
    try {
      await api.removeEpisodeFile({ id, deleteFiles: true });
      onRemoved?.();
    } finally {
      setBusy(false);
    }
  }

  if (!canOperate) return null;

  return (
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
  );
}
