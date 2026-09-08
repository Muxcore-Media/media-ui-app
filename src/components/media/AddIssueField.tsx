import { useState, type FormEvent } from 'react';
import { canManageLibrary } from '../../lib/session';

export function AddIssueField({
  onAdd,
}: {
  onAdd: (input: { title: string; number?: string; year?: number }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canManageLibrary()) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nextTitle = title.trim();
    const nextNumber = number.trim();
    if ((!nextTitle && !nextNumber) || busy) return;
    const parsedYear = Number.parseInt(year, 10);
    setBusy(true);
    setError(null);
    try {
      await onAdd({
        title: nextTitle || `#${nextNumber}`,
        number: nextNumber || undefined,
        year: Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : undefined,
      });
      setTitle('');
      setNumber('');
      setYear('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add issue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void submit(e)} data-testid="add-issue">
      <label className="w-20 text-xs text-[var(--text-secondary)]">
        Number
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="1"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="min-w-[12rem] flex-1 text-xs text-[var(--text-secondary)]">
        Issue title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Romance Dawn"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="w-24 text-xs text-[var(--text-secondary)]">
        Year
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          inputMode="numeric"
          placeholder="1997"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || (!title.trim() && !number.trim())}
        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-color)] hover:border-[var(--accent-color)] disabled:opacity-50"
      >
        {busy ? 'Adding…' : 'Add issue'}
      </button>
      {error ? <p className="w-full text-xs text-[var(--danger-color)]">{error}</p> : null}
    </form>
  );
}
