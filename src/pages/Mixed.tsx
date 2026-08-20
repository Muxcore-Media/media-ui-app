import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { Movie, TVShow } from '../types'

/** Jellyfin “mixed” library: movies + TV in one grid. */
export default function Mixed() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [m, t] = await Promise.all([api.listMovies(1, 100), api.listTVShows(1, 100)])
        if (!cancelled) {
          setMovies(m.items)
          setShows(t.items)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const needle = q.trim().toLowerCase()
  const movieRows = movies.filter((m) => !needle || m.title.toLowerCase().includes(needle))
  const showRows = shows.filter((s) => !needle || s.title.toLowerCase().includes(needle))

  return (
    <div className="space-y-6" data-testid="mixed-page">
      <div>
        <h1 className="text-2xl font-bold">Mixed</h1>
        <p className="text-sm text-[var(--muted)]">
          Movies and TV in one view (Jellyfin mixed library).{' '}
          <Link to="/search" className="text-[var(--accent)]">
            Global search
          </Link>
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter…"
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movieRows.map((item) => (
            <MediaCard key={`m-${item.id}`} item={item} type="movie" />
          ))}
          {showRows.map((item) => (
            <MediaCard key={`t-${item.id}`} item={item} type="tv" />
          ))}
        </div>
      )}
    </div>
  )
}
