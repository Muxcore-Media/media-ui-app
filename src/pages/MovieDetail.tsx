import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { Movie } from '../types'

export default function MovieDetail() {
  const { id = '' } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const item = await api.getMovie(id)
        if (!cancelled) setMovie(item)
      } catch (err) {
        if (!cancelled) {
          setMovie(null)
          setError(err instanceof Error ? err.message : 'Failed to load movie')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--muted)]">{error || 'Movie not found in library API.'}</p>
        <Link to="/movies" className="text-[var(--accent)]">
          Back to movies
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} className="w-full object-cover" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center text-sm text-[var(--muted)]">No poster</div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="text-[var(--muted)]">
            {movie.year || '—'}
            {movie.runtime ? ` · ${movie.runtime} min` : ''}
            {movie.vote_average > 0 ? ` · ${movie.vote_average.toFixed(1)}` : ''}
          </p>
        </div>
        {movie.tagline && <p className="italic text-[var(--accent-2)]">{movie.tagline}</p>}
        <p className="max-w-3xl leading-relaxed text-[var(--muted)]">{movie.overview || 'No overview.'}</p>
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <span key={g} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                {g}
              </span>
            ))}
          </div>
        )}
        {movie.has_file && movie.stream_url ? (
          <Link
            to={`/player?src=${encodeURIComponent(movie.stream_url)}&title=${encodeURIComponent(movie.title)}`}
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Play
          </Link>
        ) : (
          <p className="text-sm text-[var(--muted)]">Not available to stream yet.</p>
        )}
      </div>
    </div>
  )
}
