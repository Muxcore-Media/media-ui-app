import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid'
import type { Movie } from '../types'

/** Home Videos library via BFF `?library=homevideos` (path prefixes / tags; heuristic when config empty). */
export default function HomeVideos() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listMovies(1, 200, { library: 'homevideos' })
        if (!cancelled) {
          setMovies(list.items)
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

  return (
    <div className="space-y-6" data-testid="homevideos-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Home Videos</h1>
        <p className="text-sm text-[var(--text-secondary)]">Personal videos from your library.</p>
      </div>
      {loading && <PosterGridSkeleton />}
      {error && <p className="text-sm text-[var(--danger-color)]">{error}</p>}
      {!loading && movies.length === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          No home videos yet. Browse{' '}
          <Link to="/movies" className="text-[var(--accent-color)]">
            Movies
          </Link>{' '}
          to find other titles.
        </p>
      )}
      <PosterGrid>
        {movies.map((item) => (
          <MediaCard key={item.id} item={item} type="movie" />
        ))}
      </PosterGrid>
    </div>
  )
}
