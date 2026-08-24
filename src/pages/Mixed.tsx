import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Clapperboard } from 'lucide-react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
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
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Mixed</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Movies and TV shows in one place.{' '}
          <Link to="/search" className="text-[var(--accent-color)]">
            Search everything
          </Link>
        </p>
      </div>
      <div className="relative max-w-md">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]"
          aria-hidden="true"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter…"
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 pl-9 text-sm outline-none focus:border-[var(--accent-color)]"
        />
      </div>
      {loading ? (
        <PosterGridSkeleton />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : movieRows.length === 0 && showRows.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          message={needle ? 'No titles match your filter.' : 'No movies or TV shows in your library yet.'}
          action={
            <Link to="/search" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
              Search
            </Link>
          }
        />
      ) : (
        <PosterGrid>
          {movieRows.map((item) => (
            <MediaCard key={`m-${item.id}`} item={item} type="movie" />
          ))}
          {showRows.map((item) => (
            <MediaCard key={`t-${item.id}`} item={item} type="tv" />
          ))}
        </PosterGrid>
      )}
    </div>
  )
}
