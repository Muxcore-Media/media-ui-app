import { useState, type FormEvent } from 'react';
import { canManageLibrary } from '../../lib/session';

export function AddArtistField({
  onAdd,
  nameLabel = 'Artist name',
  submitLabel = 'Add artist',
  testId = 'add-artist',
  placeholder = 'Daft Punk',
}: {
  onAdd: (input: { name: string }) => Promise<void>;
  nameLabel?: string;
  submitLabel?: string;
  testId?: string;
  placeholder?: string;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canManageLibrary()) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const nextName = name.trim();
    if (!nextName || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd({ name: nextName });
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${submitLabel.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void submit(e)} data-testid={testId}>
      <label className="min-w-[12rem] flex-1 text-xs text-[var(--text-secondary)]">
        {nameLabel}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-text)] hover:border-[var(--accent-color)] disabled:opacity-50"
      >
        {busy ? 'Adding…' : submitLabel}
      </button>
      {error ? <p className="w-full text-xs text-[var(--danger-color)]">{error}</p> : null}
    </form>
  );
}
