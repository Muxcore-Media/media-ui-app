import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
        <h1 className="text-2xl font-bold">Playlists</h1>
        <p className="text-sm text-[var(--muted)]">
          Playlists sync with BFF userdata (local + durable). Seed items from favorites.
        </p>
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="New playlist name"
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
          Create
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No playlists yet.</p>
      ) : (
        <div className="space-y-4">
          {playlists.map((p) => (
            <section key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <h2 className="font-semibold">{p.name}</h2>
              <ul className="space-y-1 text-sm">
                {p.itemIds.map((id) => {
                  const f = favById.get(id)
                  return (
                    <li key={id}>
                      {f ? (
                        <Link to={f.href} className="text-[var(--accent)]">
                          {f.title}
                        </Link>
                      ) : (
                        id
                      )}
                    </li>
                  )
                })}
                {p.itemIds.length === 0 && (
                  <li className="text-[var(--muted)]">Empty — add from favorites below.</li>
                )}
              </ul>
              {favorites.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {favorites.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => addFavorite(p.id, f.id)}
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
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
