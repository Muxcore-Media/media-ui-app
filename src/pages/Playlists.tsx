import { type FormEvent, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListMusic, Plus } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  listFavorites,
  listPlaylists,
  savePlaylists,
  type FavoriteEntry,
  type Playlist,
} from '../lib/userdata';

export default function Playlists() {
  const nameInputId = useId();
  const [playlists, setPlaylists] = useState<Playlist[]>(() => listPlaylists());
  const favorites = useMemo(() => listFavorites(), []);
  const favById = useMemo(() => {
    const m = new Map<string, FavoriteEntry>();
    for (const f of favorites) m.set(f.id, f);
    return m;
  }, [favorites]);

  function persist(next: Playlist[]) {
    setPlaylists(next);
    savePlaylists(next);
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    persist([...playlists, { id: crypto.randomUUID(), name, itemIds: [] }]);
    (e.target as HTMLFormElement).reset();
  }

  function addFavorite(playlistId: string, itemId: string) {
    persist(
      playlists.map((p) =>
        p.id === playlistId && !p.itemIds.includes(itemId)
          ? { ...p, itemIds: [...p.itemIds, itemId] }
          : p,
      ),
    );
  }

  return (
    <div className="space-y-6" data-testid="playlists-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Playlists</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Create playlists from your favorites and keep them synced across your devices.
        </p>
      </header>

      <section className="space-y-3" aria-labelledby="playlists-create-heading">
        <h2
          id="playlists-create-heading"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Create playlist
        </h2>
        <form onSubmit={onCreate} className="flex flex-wrap gap-2">
          <label htmlFor={nameInputId} className="sr-only">
            New playlist name
          </label>
          <input
            id={nameInputId}
            name="name"
            required
            placeholder="New playlist name"
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-color)]"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create
          </button>
        </form>
      </section>

      <section className="space-y-4" aria-labelledby="playlists-list-heading">
        <h2
          id="playlists-list-heading"
          className="text-lg font-semibold text-[var(--text-primary)]"
        >
          Your playlists ({playlists.length})
        </h2>
        {playlists.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="No playlists yet"
            message="Create a playlist above, then add titles from your favorites."
            testId="playlists-empty"
          />
        ) : (
          <div className="space-y-4">
            {playlists.map((p) => (
              <section
                key={p.id}
                className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                aria-labelledby={`playlist-${p.id}-heading`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3
                    id={`playlist-${p.id}-heading`}
                    className="font-semibold text-[var(--text-primary)]"
                  >
                    {p.name}
                  </h3>
                  <Badge tone="neutral">{p.itemIds.length} items</Badge>
                </div>
                <ul className="space-y-1 text-sm" aria-label={`${p.name} tracks`}>
                  {p.itemIds.map((id) => {
                    const f = favById.get(id);
                    return (
                      <li key={id}>
                        {f ? (
                          <Link to={f.href} className="text-[var(--accent-color)] hover:underline">
                            {f.title}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">{id}</span>
                        )}
                      </li>
                    );
                  })}
                  {p.itemIds.length === 0 && (
                    <li className="text-[var(--text-tertiary)]">
                      Empty — add from favorites below.
                    </li>
                  )}
                </ul>
                {favorites.length > 0 && (
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={`Add favorites to ${p.name}`}
                  >
                    {favorites.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => addFavorite(p.id, f.id)}
                        className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)] transition hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
                      >
                        + {f.title}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
