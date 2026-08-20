import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { MusicAlbum, MusicArtistDetail } from '../types'

export default function MusicArtist() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<MusicArtistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [lyrics, setLyrics] = useState<{ found: boolean; text: string; title?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const d = await api.getMusicArtist(id)
        if (!cancelled) setDetail(d)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load artist')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!playing) {
      setLyrics(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const l = await api.getTrackLyrics(playing)
        if (!cancelled) setLyrics(l)
      } catch {
        if (!cancelled) setLyrics({ found: false, text: '' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [playing])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }
  if (!detail) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--muted)]">{error || 'Artist not found'}</p>
        <Link to="/music" className="text-[var(--accent)]">
          Back to music
        </Link>
      </div>
    )
  }

  const artist = detail.artist
  const albums: MusicAlbum[] = detail.albums || []

  return (
    <div className="space-y-8" data-testid="music-artist-page">
      <div>
        <Link to="/music" className="text-sm text-[var(--accent)]">
          ← Music
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{artist.name}</h1>
        <p className="text-sm text-[var(--muted)]">
          {albums.length} album{albums.length === 1 ? '' : 's'}
          {artist.path ? ` · ${artist.path}` : ''}
        </p>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No albums for this artist yet.</p>
      ) : (
        albums.map((al) => (
          <section key={al.id} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {al.title}
              {al.year ? <span className="text-sm font-normal text-[var(--muted)]"> · {al.year}</span> : null}
            </h2>
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              {(al.tracks || []).map((t, i) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 text-[var(--muted)]">{i + 1}.</span>
                    <span className="font-medium">{t.title}</span>
                    {t.path ? <p className="truncate text-xs text-[var(--muted)]">{t.path}</p> : null}
                  </div>
                  {t.stream_url || t.path ? (
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
              {(al.tracks || []).length === 0 && (
                <li className="px-4 py-3 text-sm text-[var(--muted)]">No tracks scanned for this album.</li>
              )}
            </ul>
            {playing &&
              al.tracks?.some((t) => t.id === playing) &&
              (() => {
                const track = al.tracks!.find((t) => t.id === playing)!
                const src = track.stream_url || ''
                return (
                  <div className="space-y-2">
                    {src ? (
                      <audio className="w-full" controls autoPlay src={src} />
                    ) : (
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                        Track “{track.title}” is on disk at <code className="text-[var(--text)]">{track.path}</code>.
                      </div>
                    )}
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Lyrics
                      </div>
                      {lyrics?.found && lyrics.text ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[var(--text)]">
                          {lyrics.text}
                        </pre>
                      ) : (
                        <p className="text-[var(--muted)]">No .lrc/.txt beside the track file yet.</p>
                      )}
                    </div>
                  </div>
                )
              })()}
          </section>
        ))
      )}
    </div>
  )
}
