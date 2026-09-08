import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatMovieFileSize, movieFileLabel, type MovieLibraryFile } from '../../lib/item-files';
import { canManageLibrary } from '../../lib/session';

export function MovieFilesCard({
  id,
  onEmpty,
}: {
  id: string;
  onEmpty?: () => void;
}) {
  const canEdit = canManageLibrary();
  const [items, setItems] = useState<MovieLibraryFile[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .listMovieFiles(id)
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setItems(next.items);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onRemove(fileId: string) {
    if (!id || !fileId || busyId) return;
    if (!window.confirm('Delete this movie file from disk? The title stays in the library.')) return;
    setBusyId(fileId);
    setError(null);
    try {
      await api.deleteMovieFile(id, fileId);
      const next = items.filter((row) => row.id !== fileId);
      setItems(next);
      if (next.length === 0) onEmpty?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete file');
    } finally {
      setBusyId('');
    }
  }

  if (available !== true || items.length === 0) return null;

  return (
    <section className="w-full space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3" data-testid="movie-files-card">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Files</h3>
      {error ? (
        <p className="text-xs text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2" data-testid="movie-file-list">
        {items.map((file) => (
          <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{movieFileLabel(file)}</p>
              {file.sizeBytes > 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">{formatMovieFileSize(file.sizeBytes)}</p>
              ) : null}
            </div>
            {canEdit ? (
              <button
                type="button"
                disabled={Boolean(busyId)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger-color)] disabled:opacity-40"
                aria-label={`Delete ${file.filename || file.id}`}
                onClick={() => void onRemove(file.id)}
              >
                {busyId === file.id ? 'Deleting…' : 'Delete'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
