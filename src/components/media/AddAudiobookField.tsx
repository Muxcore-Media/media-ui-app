import { useState, type FormEvent } from 'react';
import { canManageLibrary } from '../../lib/session';

export function AddAudiobookField({
  onAdd,
}: {
  onAdd: (input: { author: string; title: string; year?: number }) => Promise<void>;
}) {
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canManageLibrary()) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nextAuthor = author.trim();
    const nextTitle = title.trim();
    if (!nextAuthor || !nextTitle || busy) return;
    const parsedYear = Number.parseInt(year, 10);
    setBusy(true);
    setError(null);
    try {
      await onAdd({
        author: nextAuthor,
        title: nextTitle,
        year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined,
      });
      setAuthor('');
      setTitle('');
      setYear('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add audiobook');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void submit(e)} data-testid="add-audiobook">
      <label className="min-w-[10rem] flex-1 text-xs text-[var(--text-secondary)]">
        Author
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Patrick Rothfuss"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="min-w-[12rem] flex-1 text-xs text-[var(--text-secondary)]">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Name of the Wind"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="w-24 text-xs text-[var(--text-secondary)]">
        Year
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
          placeholder="2007"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !author.trim() || !title.trim()}
        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] hover:border-[var(--accent-color)] disabled:opacity-50"
      >
        {busy ? 'Adding…' : 'Add audiobook'}
      </button>
      {error ? <p className="w-full text-xs text-[var(--danger-color)]">{error}</p> : null}
    </form>
  );
}
