import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { LibraryRow } from '../types'

type FlatTrack = {
  id: string
  title: string
  artistId: string
  artistName: string
  albumTitle: string
  stream_url?: string
}

export default function Music() {
  const [items, setItems] = useState<LibraryRow[]>([])
  const [tracks, setTracks] = useState<FlatTrack[]>([])
  const [tab, setTab] = useState<'artists' | 'songs'>('artists')
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listMusic()
        if (cancelled) return
        setItems(list.items)
        setAvailable(list.available !== false)
        setMessage(list.message || null)
        const flat: FlatTrack[] = []
        for (const a of list.items.slice(0, 40)) {
          try {
            const d = await api.getMusicArtist(a.id)
            for (const al of d.albums || []) {
              for (const t of al.tracks || []) {
                flat.push({
                  id: t.id,
                  title: t.title,
                  artistId: a.id,
                  artistName: String(a.name || d.artist?.name || ''),
                  albumTitle: al.title,
                  stream_url: t.stream_url,
                })
              }
            }
          } catch {
            /* skip artist */
          }
        }
        if (!cancelled) setTracks(flat)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load music')
          setAvailable(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredTracks = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return tracks
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.artistName.toLowerCase().includes(needle) ||
        t.albumTitle.toLowerCase().includes(needle),
    )
  }, [tracks, q])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="music-page">
      <div>
        <h1 className="text-2xl font-bold">Music</h1>
        <p className="text-sm text-[var(--muted)]">
          Artists, albums, songs, and playlists (see Playlists). HTTP stream + lyrics on artist pages.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('artists')}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === 'artists' ? 'bg-[var(--accent)] font-semibold text-black' : 'border border-[var(--border)]'}`}
        >
          Artists
        </button>
        <button
          type="button"
          onClick={() => setTab('songs')}
          className={`rounded-md px-3 py-1.5 text-sm ${tab === 'songs' ? 'bg-[var(--accent)] font-semibold text-black' : 'border border-[var(--border)]'}`}
        >
          Songs
        </button>
        <Link to="/playlists" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
          Playlists →
        </Link>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {!available && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--muted)]">
          {message || 'Music module unavailable.'}
        </div>
      )}

      {available && tab === 'artists' && (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {items.length === 0 && (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">No artists yet.</li>
          )}
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link to={`/music/${a.id}`} className="font-medium text-[var(--accent)]">
                  {a.name || a.title || a.id}
                </Link>
                {a.path && <p className="text-xs text-[var(--muted)]">{a.path}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {available && tab === 'songs' && (
        <div className="space-y-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter songs…"
            className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {filteredTracks.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--muted)]">No songs scanned yet.</li>
            )}
            {filteredTracks.slice(0, 200).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {t.artistName} · {t.albumTitle}
                  </p>
                </div>
                {t.stream_url ? (
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold"
                    onClick={() => setPlaying(playing === t.id ? null : t.id)}
                  >
                    {playing === t.id ? 'Hide' : 'Play'}
                  </button>
                ) : (
                  <span className="text-xs text-[var(--muted)]">No file</span>
                )}
              </li>
            ))}
          </ul>
          {playing &&
            (() => {
              const t = filteredTracks.find((x) => x.id === playing)
              return t?.stream_url ? <audio className="w-full" controls autoPlay src={t.stream_url} /> : null
            })()}
        </div>
      )}
    </div>
  )
}
