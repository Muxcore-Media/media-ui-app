import { useState } from 'react';
import { canManageLibrary } from '../../lib/session';

export function ImportFileField({
  onImport,
}: {
  onImport: (path: string) => Promise<void>;
}) {
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canManageLibrary()) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = path.trim();
    if (!next || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onImport(next);
      setPath('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void submit(e)}>
      <label className="min-w-[12rem] flex-1 text-xs text-[var(--text-secondary)]">
        File path
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/library/Title/file.epub"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !path.trim()}
        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] hover:border-[var(--accent-color)] disabled:opacity-50"
      >
        {busy ? 'Importing…' : 'Import file'}
      </button>
      {error ? <p className="w-full text-xs text-[var(--danger-color)]">{error}</p> : null}
    </form>
  );
}
