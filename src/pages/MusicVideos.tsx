import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Music2 } from 'lucide-react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import type { Movie } from '../types'

/** Music videos library via BFF `?library=musicvideos` (path prefixes / tags; heuristic when config empty). */
export default function MusicVideos() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listMovies(1, 200, { library: 'musicvideos' })
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
    <div className="space-y-6" data-testid="musicvideos-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Music Videos</h1>
        <p className="text-sm text-[var(--text-secondary)]">Music videos from your library.</p>
      </div>
      {loading && <PosterGridSkeleton />}
      {error && <ErrorBanner message={error} />}
      {!loading && !error && movies.length === 0 && (
        <EmptyState
          icon={Music2}
          message="No music videos in your library yet."
          action={
            <Link to="/movies" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
              Browse movies
            </Link>
          }
        />
      )}
      {!error && movies.length > 0 && (
        <PosterGrid>
          {movies.map((item) => (
            <MediaCard key={item.id} item={item} type="movie" />
          ))}
        </PosterGrid>
      )}
    </div>
  )
}
