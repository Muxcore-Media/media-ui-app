import { useState, type FormEvent } from 'react';
import { canManageLibrary } from '../../lib/session';

export function AddAlbumField({
  onAdd,
  titleLabel = 'Album title',
  submitLabel = 'Add album',
  testId = 'add-album',
  titlePlaceholder = 'Discovery',
}: {
  onAdd: (input: { title: string; year?: number }) => Promise<void>;
  titleLabel?: string;
  submitLabel?: string;
  testId?: string;
  titlePlaceholder?: string;
}) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canManageLibrary()) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || busy) return;
    const parsedYear = Number.parseInt(year, 10);
    setBusy(true);
    setError(null);
    try {
      await onAdd({
        title: nextTitle,
        year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined,
      });
      setTitle('');
      setYear('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${submitLabel.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void submit(e)} data-testid={testId}>
      <label className="min-w-[12rem] flex-1 text-xs text-[var(--text-secondary)]">
        {titleLabel}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="w-24 text-xs text-[var(--text-secondary)]">
        Year
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
          placeholder="2001"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)] hover:border-[var(--accent-color)] disabled:opacity-50"
      >
        {busy ? 'Adding…' : submitLabel}
      </button>
      {error ? <p className="w-full text-xs text-[var(--danger-color)]">{error}</p> : null}
    </form>
  );
}
