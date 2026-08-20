import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { Movie } from '../types'

/** Home Videos library via BFF `?library=homevideos` (path prefixes / tags; heuristic when config empty). */
export default function HomeVideos() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [filterMode, setFilterMode] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listMovies(1, 200, { library: 'homevideos' })
        if (!cancelled) {
          setMovies(list.items)
          setFilterMode(list.filter_mode)
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

  const modeHint =
    filterMode === 'config'
      ? 'Filtered by library path prefixes / tags from MEDIA_UI_LIBRARY_PATHS_FILE.'
      : 'Title/personal-file heuristic fallback (configure homevideos path prefixes to disable).'

  return (
    <div className="space-y-6" data-testid="homevideos-page">
      <div>
        <h1 className="text-2xl font-bold">Home Videos</h1>
        <p className="text-sm text-[var(--muted)]">{modeHint}</p>
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && movies.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No home videos matched yet. Point a root folder at Home Videos in{' '}
          <code className="text-xs">library-paths.json</code>, tag items <code className="text-xs">homevideo</code>, or browse{' '}
          <Link to="/movies" className="text-[var(--accent)]">
            Movies
          </Link>
          .
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((item) => (
          <MediaCard key={item.id} item={item} type="movie" />
        ))}
      </div>
    </div>
  )
}
