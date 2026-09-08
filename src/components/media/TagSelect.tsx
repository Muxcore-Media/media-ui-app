import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { canManageTags } from '../../lib/session';
import { tagLabel, type LibraryTag } from '../../lib/tags';

export function TagSelect({
  kind,
  id,
}: {
  kind: 'movie' | 'tv';
  id: string;
}) {
  const canEdit = canManageTags();
  const [catalog, setCatalog] = useState<LibraryTag[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listTags(kind), api.getItemTags(kind, id)])
      .then(([all, mine]) => {
        if (cancelled) return;
        setAvailable(all.available !== false);
        setCatalog(all.tags.filter((t) => !t.media || t.media === kind));
        setSelected(mine.tags.map((t) => t.id).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(false);
          setCatalog([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (!available || catalog.length === 0) return null;

  async function toggle(tagId: string) {
    if (!canEdit || busy) return;
    const next = selected.includes(tagId) ? selected.filter((x) => x !== tagId) : [...selected, tagId];
    setBusy(true);
    try {
      await api.setItemTags(kind, id, next);
      setSelected(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="min-w-0" data-testid="item-tags">
      <legend className="sr-only">Tags</legend>
      <div className="flex flex-wrap gap-2">
        {catalog.map((tag) => {
          const on = selected.includes(tag.id);
          return (
            <label
              key={tag.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                on
                  ? 'border-[var(--accent-color)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={busy || !canEdit}
                aria-label={`Tag ${tagLabel(tag)}`}
                onChange={() => void toggle(tag.id)}
              />
              {tagLabel(tag)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
