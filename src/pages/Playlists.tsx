import { type FormEvent, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ListMusic, Play, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  listFavorites,
  listPlaylists,
  savePlaylists,
  type FavoriteEntry,
  type Playlist,
} from '../lib/userdata';
import { getParentalState, isItemRestricted } from '../lib/parental';

export default function Playlists() {
  const nameInputId = useId();
  const [playlists, setPlaylists] = useState<Playlist[]>(() => listPlaylists());
  const favorites = useMemo(() => listFavorites(), []);
  const parentalState = useMemo(() => getParentalState(), []);
  const anyRestriction = parentalState.anyRestriction;

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

  function deletePlaylist(playlistId: string) {
    persist(playlists.filter((p) => p.id !== playlistId));
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

  function removeItem(playlistId: string, itemId: string) {
    persist(
      playlists.map((p) =>
        p.id === playlistId ? { ...p, itemIds: p.itemIds.filter((id) => id !== itemId) } : p,
      ),
    );
  }

  function moveItem(playlistId: string, itemId: string, direction: 'up' | 'down') {
    persist(
      playlists.map((p) => {
        if (p.id !== playlistId) return p;
        const ids = [...p.itemIds];
        const idx = ids.indexOf(itemId);
        if (idx < 0) return p;
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= ids.length) return p;
        [ids[idx], ids[target]] = [ids[target], ids[idx]];
        return { ...p, itemIds: ids };
      }),
    );
  }

  /** First item in a playlist that has a playable href (allowed by parental filter). */
  function firstPlayableHref(playlist: Playlist): string | null {
    for (const id of playlist.itemIds) {
      const fav = favById.get(id);
      if (!fav?.href) continue;
      if (anyRestriction && isItemRestricted({ content_rating: fav.content_rating }, parentalState)) continue;
      return fav.href;
    }
    return null;
  }

  return (
    <div className="space-y-6" data-testid="playlists-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Playlists</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Create playlists from your favorites and keep them synced across your devices.
        </p>
        {anyRestriction && (
          <p className="mt-1 text-xs text-[var(--warning-color)]" role="note">
            Parental filter active — playback respects content preferences.
          </p>
        )}
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
            {playlists.map((p) => {
              const playHref = firstPlayableHref(p);
              return (
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
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{p.itemIds.length} items</Badge>
                      {playHref && (
                        <Link
                          to={playHref}
                          aria-label={`Play ${p.name}`}
                          className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--accent-color)] px-2.5 py-1 text-xs font-semibold text-black transition hover:bg-[var(--accent-hover)]"
                          data-testid={`playlist-play-${p.id}`}
                        >
                          <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          Play
                        </Link>
                      )}
                      <button
                        type="button"
                        aria-label={`Delete playlist ${p.name}`}
                        onClick={() => deletePlaylist(p.id)}
                        className="text-[var(--text-tertiary)] transition hover:text-[var(--danger-color)]"
                        data-testid={`playlist-delete-${p.id}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <ul
                    className="space-y-1 text-sm"
                    aria-label={`${p.name} tracks`}
                    data-testid={`playlist-items-${p.id}`}
                  >
                    {p.itemIds.map((id, idx) => {
                      const f = favById.get(id);
                      const allowed = !anyRestriction || !isItemRestricted(
                        { content_rating: f?.content_rating },
                        parentalState,
                      );
                      return (
                        <li key={id} className="flex items-center gap-2">
                          <div className="flex shrink-0 flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveItem(p.id, id, 'up')}
                              aria-label={`Move ${f?.title ?? id} up`}
                              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === p.itemIds.length - 1}
                              onClick={() => moveItem(p.id, id, 'down')}
                              aria-label={`Move ${f?.title ?? id} down`}
                              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <span className="flex-1">
                            {f && allowed ? (
                              <Link
                                to={f.href}
                                className="text-[var(--accent-text)] hover:underline"
                              >
                                {f.title}
                              </Link>
                            ) : f && !allowed ? (
                              <span
                                className="text-[var(--text-tertiary)]"
                                title="Hidden by parental filter"
                              >
                                {f.title}
                              </span>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">{id}</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(p.id, id)}
                            aria-label={`Remove ${f?.title ?? id} from ${p.name}`}
                            className="shrink-0 text-[var(--text-tertiary)] transition hover:text-[var(--danger-color)]"
                            data-testid={`playlist-remove-item-${id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
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
                      {favorites
                        .filter((f) => !p.itemIds.includes(f.id))
                        .map((f) => (
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
