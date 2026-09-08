import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { renameChangedCount, type RenamePreviewItem } from '../../lib/rename';

export function PreviewRename({
  kind,
  id,
}: {
  kind: 'movie' | 'tv';
  id: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [items, setItems] = useState<RenamePreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .previewRename(kind === 'movie' ? { movieId: id } : { tvId: id })
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setItems(next.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load rename preview');
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  async function onRename() {
    setBusy(true);
    setError(null);
    try {
      const next = await api.applyRename(kind === 'movie' ? { movieId: id } : { tvId: id });
      setAvailable(true);
      setItems(next.items);
      if (next.errors) {
        setError(`Renamed ${next.renamed}, ${next.errors} failed`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setBusy(false);
    }
  }

  if (available === false || available === null) return null;
  if (items.length === 0) return null;

  const changed = renameChangedCount(items);

  return (
    <section
      className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
      data-testid="preview-rename"
    >
      <h2 className="font-semibold text-[var(--text-primary)]">Preview Rename</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        {changed
          ? `${changed} file${changed === 1 ? '' : 's'} do not match the household naming template.`
          : 'Files already match the household naming template.'}
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {items.map((row) => (
          <li
            key={row.fileId || row.episodeId || row.currentPath}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm"
          >
            <p className="truncate text-[var(--text-tertiary)]" title={row.currentPath}>
              {row.currentPath.split('/').pop() || row.currentPath}
            </p>
            <p className="truncate text-[var(--text-primary)]" title={row.newPath}>
              → {row.newFilename || row.newPath.split('/').pop() || row.newPath}
            </p>
          </li>
        ))}
      </ul>
      {changed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRename()}
          className="rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {busy ? 'Renaming…' : `Rename ${changed} file${changed === 1 ? '' : 's'}`}
        </button>
      ) : null}
    </section>
  );
}
