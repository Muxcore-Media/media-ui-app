import { useEffect, useState, type ChangeEvent } from 'react';
import { api } from '../../api/client';
import { artworkTypeLabel, type ItemArtwork } from '../../lib/item-artwork';
import { canManageLibrary } from '../../lib/session';

function readFileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read artwork'));
    reader.readAsDataURL(file);
  });
}

export function ArtworkCard({
  kind,
  id,
}: {
  kind: 'movie' | 'tv' | 'artist';
  id: string;
}) {
  const canEdit = canManageLibrary();
  const [items, setItems] = useState<ItemArtwork[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [kindType, setKindType] = useState('poster');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .listItemArtwork(kind, id)
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
  }, [kind, id]);

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const data = await readFileData(file);
      const next = await api.replaceItemArtwork(kind, id, {
        type: kindType,
        filename: file.name,
        data,
      });
      setAvailable(true);
      setItems((cur) => {
        const rest = cur.filter((row) => row.type !== next.type);
        return next.url || next.id ? [next, ...rest] : rest;
      });
      setFlash(`${artworkTypeLabel(next.type || kindType)} replaced`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not replace artwork');
    } finally {
      setBusy(false);
    }
  }

  if (available === false && !canEdit) return null;

  return (
    <section className="min-w-0 space-y-2" data-testid="item-artwork">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Artwork</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        Posters and backdrops stored for this title, like Radarr/Sonarr Media.
      </p>
      {error ? <p className="text-sm text-[var(--danger-color)]">{error}</p> : null}
      {flash ? <p className="text-sm text-[var(--text-secondary)]">{flash}</p> : null}
      {available === true && items.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No artwork yet.</p>
      ) : null}
      <ul className="flex flex-wrap gap-3" data-testid="item-artwork-list">
        {items.map((row) => (
          <li key={row.id || row.url} className="w-24 space-y-1">
            {row.url ? (
              <img
                src={row.url}
                alt={artworkTypeLabel(row.type)}
                className="h-36 w-24 rounded-[var(--radius-md)] object-cover"
              />
            ) : null}
            <p className="text-xs text-[var(--text-tertiary)]">{artworkTypeLabel(row.type)}</p>
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="item-artwork-replace">
          <label className="text-sm text-[var(--text-secondary)]">
            <span className="sr-only">Artwork type</span>
            <select
              className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-transparent px-2 py-1"
              value={kindType}
              aria-label="Artwork type"
              onChange={(e) => setKindType(e.target.value)}
            >
              <option value="poster">Poster</option>
              {kind === 'artist' ? null : <option value="background">Backdrop</option>}
            </select>
          </label>
          <label className="text-sm text-[var(--text-tertiary)]">
            <span className="sr-only">Upload artwork</span>
            <input
              type="file"
              accept="image/*"
              disabled={busy || !id}
              aria-label="Upload artwork"
              onChange={(e) => void onUpload(e)}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
