import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListMusic, Plus } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { listFavorites, listPlaylists, savePlaylists, type FavoriteEntry, type Playlist } from '../lib/userdata'

export default function Playlists() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => listPlaylists())
  const favorites = useMemo(() => listFavorites(), [])
  const favById = useMemo(() => {
    const m = new Map<string, FavoriteEntry>()
    for (const f of favorites) m.set(f.id, f)
    return m
  }, [favorites])

  function persist(next: Playlist[]) {
    setPlaylists(next)
    savePlaylists(next)
  }

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const name = String(fd.get('name') || '').trim()
    if (!name) return
    persist([...playlists, { id: crypto.randomUUID(), name, itemIds: [] }])
    ;(e.target as HTMLFormElement).reset()
  }

  function addFavorite(playlistId: string, itemId: string) {
    persist(
      playlists.map((p) =>
        p.id === playlistId && !p.itemIds.includes(itemId)
          ? { ...p, itemIds: [...p.itemIds, itemId] }
          : p,
      ),
    )
  }

  return (
    <div className="space-y-6" data-testid="playlists-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Playlists</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Create playlists from your favorites and keep them synced across your devices.
        </p>
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2">
        <input
          name="name"
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

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] py-14 text-center">
          <ListMusic className="h-7 w-7 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">No playlists yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((p) => (
            <section
              key={p.id}
              className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-[var(--text-primary)]">{p.name}</h2>
                <Badge tone="neutral">{p.itemIds.length} items</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {p.itemIds.map((id) => {
                  const f = favById.get(id)
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
                  )
                })}
                {p.itemIds.length === 0 && (
                  <li className="text-[var(--text-tertiary)]">Empty — add from favorites below.</li>
                )}
              </ul>
              {favorites.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
    </div>
  )
}
