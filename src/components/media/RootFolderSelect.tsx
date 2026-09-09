import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { rootLabel, type LibraryRoot } from '../../lib/roots';

export function RootFolderSelect({
  kind,
  id,
  value,
  onChange,
}: {
  kind: 'movie' | 'tv' | 'artist' | 'author' | 'audiobook' | 'series';
  id: string;
  value?: string;
  onChange?: (next: string) => void;
}) {
  const [roots, setRoots] = useState<LibraryRoot[]>([]);
  const [picked, setPicked] = useState<LibraryRoot | null>(null);
  const [busy, setBusy] = useState(false);
  const catalogKind =
    kind === 'movie'
      ? 'movies'
      : kind === 'tv'
        ? 'tv'
        : kind === 'author'
          ? 'books'
          : kind === 'audiobook'
            ? 'audiobooks'
            : kind === 'series'
              ? 'comics'
              : 'music';

  useEffect(() => {
    let cancelled = false;
    void api
      .listRoots(catalogKind)
      .then((catalog) => {
        if (!cancelled) setRoots(catalog.roots);
      })
      .catch(() => {
        if (!cancelled) setRoots([]);
      });
    void api.pickRoot?.(catalogKind)
      ?.then((res) => {
        if (!cancelled) setPicked(res.root);
      })
      .catch(() => {
        if (!cancelled) setPicked(null);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogKind]);

  if (roots.length === 0) return null;

  function assign(next: string) {
    if (!next || !id) return;
    setBusy(true);
    void api
      .setRootFolder({ kind, id, rootFolderPath: next })
      .then(() => onChange?.(next))
      .finally(() => setBusy(false));
  }

  const showAssignDefault = !value && Boolean(picked?.path);

  return (
    <div className="inline-flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
      <label className="inline-flex items-center gap-2">
        <span className="sr-only">Root folder</span>
        <select
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          disabled={busy || !id}
          value={value || ''}
          aria-label="Root folder"
          onChange={(e) => assign(e.target.value)}
        >
          <option value="">Root folder</option>
          {roots.map((root) => (
            <option key={root.id || root.path} value={root.path}>
              {rootLabel(root)}
            </option>
          ))}
        </select>
      </label>
      {showAssignDefault ? (
        <button
          type="button"
          disabled={busy || !id}
          data-testid="assign-default-root"
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          onClick={() => assign(picked?.path || '')}
        >
          Assign default
          {picked ? ` (${picked.name || picked.path})` : ''}
        </button>
      ) : null}
    </div>
  );
}
