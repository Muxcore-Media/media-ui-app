import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Music2, Pause, Play } from 'lucide-react'
import { api } from '../api/client'
import { ShelfSkeleton } from '../components/ui/Skeleton'
import { ErrorBanner } from '../components/ui/ErrorBanner'
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

  const filteredTracks = tracks

  if (loading) {
    return (
      <div className="space-y-6" data-testid="music-page">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Music</h1>
        </div>
        <ShelfSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="music-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Music</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Browse artists, albums, and songs. Save favorites to playlists.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('artists')}
          className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition ${tab === 'artists' ? 'bg-[var(--accent-color)] text-black' : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          Artists
        </button>
        <button
          type="button"
          onClick={() => setTab('songs')}
          className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition ${tab === 'songs' ? 'bg-[var(--accent-color)] text-black' : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          Songs
        </button>
        <Link
          to="/playlists"
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Playlists →
        </Link>
      </div>

      {error && <ErrorBanner message={error} />}
      {!available && (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-14 text-center">
          <Music2 className="h-7 w-7 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">{message || 'Music isn\u2019t available yet.'}</p>
        </div>
      )}

      {available && tab === 'artists' && (
        <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {items.length === 0 && <li className="px-4 py-6 text-sm text-[var(--text-secondary)]">No artists yet.</li>}
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]">
              <div>
                <Link to={`/music/${a.id}`} className="font-medium text-[var(--accent-color)] hover:underline">
                  {a.name || a.title || a.id}
                </Link>
                {a.monitored === false ? (
                  <p className="text-xs text-[var(--text-tertiary)]">Unavailable</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {available && tab === 'songs' && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Use the header search to find songs across your library.
          </p>
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {filteredTracks.length === 0 && (
              <li className="px-4 py-6 text-sm text-[var(--text-secondary)]">No songs yet.</li>
            )}
            {filteredTracks.slice(0, 200).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition hover:bg-[var(--bg-elevated-2)]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--text-primary)]">{t.title}</p>
                  <p className="truncate text-xs text-[var(--text-tertiary)]">
                    {t.artistName} · {t.albumTitle}
                  </p>
                </div>
                {t.stream_url ? (
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-color)] transition hover:bg-[var(--bg-elevated-2)]"
                    aria-label={playing === t.id ? `Hide ${t.title}` : `Play ${t.title}`}
                    onClick={() => setPlaying(playing === t.id ? null : t.id)}
                  >
                    {playing === t.id ? <Pause className="h-4 w-4 fill-current" aria-hidden="true" /> : <Play className="h-4 w-4 fill-current" aria-hidden="true" />}
                  </button>
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">No file</span>
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
