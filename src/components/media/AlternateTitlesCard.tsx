import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { type AlternateTitle } from '../../lib/alternate-titles';
import { canManageLibrary } from '../../lib/session';

export function AlternateTitlesCard({
  kind,
  id,
}: {
  kind: 'movie' | 'tv';
  id: string;
}) {
  const canEdit = canManageLibrary();
  const [titles, setTitles] = useState<AlternateTitle[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [nextTitle, setNextTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const next = await api.listAlternateTitles(kind, id);
    setAvailable(next.available);
    setTitles(next.titles);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .listAlternateTitles(kind, id)
      .then((next) => {
        if (cancelled) return;
        setAvailable(next.available);
        setTitles(next.titles);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (available === false) return null;

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const title = nextTitle.trim();
    if (!title || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      await api.addAlternateTitle(kind, id, title);
      setNextTitle('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add title');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(titleId: string) {
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteAlternateTitle(kind, id, titleId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove title');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-w-0 space-y-2" data-testid="alternate-titles">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Alternate titles</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Extra names used to match grabs and imports, like Radarr/Sonarr alternate titles.
      </p>
      {error ? (
        <p className="text-sm text-[var(--danger-color)]" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-1" data-testid="alternate-title-list">
        {titles.map((row) => (
          <li key={row.id || row.title} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-[var(--text-secondary)]">
              {row.title}
              {row.user ? '' : ` · ${row.source || 'catalog'}`}
            </span>
            {canEdit && row.user ? (
              <button
                type="button"
                disabled={busy}
                className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger-color)]"
                onClick={() => void onRemove(row.id)}
              >
                Remove title
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void onAdd(e)}>
          <label className="min-w-0 flex-1 space-y-1 text-sm">
            <span className="text-[var(--text-secondary)]">Add title</span>
            <input
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-[var(--text-primary)]"
              value={nextTitle}
              aria-label="New alternate title"
              onChange={(e) => setNextTitle(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !nextTitle.trim()}
            className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            Add title
          </button>
        </form>
      ) : null}
    </section>
  );
}
