import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import { getProgress, isFavorite, toggleFavorite, upsertProgress, enqueue } from '../lib/userdata'
import type { Movie } from '../types'

export default function MovieDetail() {
  const { id = '' } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null)
  const [fav, setFav] = useState(false)
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setJellyfinURL(null)
      try {
        const item = await api.getMovie(id)
        if (!cancelled) {
          setMovie(item)
          setFav(isFavorite(item.id))
          setWatched(Boolean(getProgress(item.id)?.watched))
        }
        const jf = await api.jellyfinPlayURL(id)
        if (!cancelled) setJellyfinURL(jf)
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

  const playTo = movie.has_file && movie.stream_url
    ? `/player?src=${encodeURIComponent(movie.stream_url)}&title=${encodeURIComponent(movie.title)}&id=${encodeURIComponent(movie.id)}&kind=movie&poster=${encodeURIComponent(movie.poster_url || '')}&back=${encodeURIComponent(`/movies/${movie.id}`)}`
    : null

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
            {watched ? ' · watched' : ''}
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
        {movie.collection_name && movie.collection_id ? (
          <p className="text-sm">
            Collection:{' '}
            <Link to="/collections" className="text-[var(--accent)]">
              {movie.collection_name}
            </Link>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {playTo ? (
            <Link
              to={playTo}
              className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
            >
              Play
            </Link>
          ) : (
            <p className="text-sm text-[var(--muted)]">Not available to stream yet.</p>
          )}
          <button
            type="button"
            onClick={() => {
              enqueue({
                id: movie.id,
                kind: 'movie',
                title: movie.title,
                href: playTo || `/movies/${movie.id}`,
                stream_url: movie.stream_url,
                poster_url: movie.poster_url,
              })
            }}
            className="inline-flex rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            Add to queue
          </button>
          <button
            type="button"
            onClick={() => {
              const on = toggleFavorite({
                id: movie.id,
                kind: 'movie',
                title: movie.title,
                poster_url: movie.poster_url,
                href: `/movies/${movie.id}`,
                year: movie.year,
              })
              setFav(on)
            }}
            className="inline-flex rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            {fav ? '★ Favorited' : '☆ Favorite'}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !watched
              upsertProgress({
                id: movie.id,
                kind: 'movie',
                title: movie.title,
                poster_url: movie.poster_url,
                href: `/movies/${movie.id}`,
                stream_url: movie.stream_url,
                positionSec: next ? 0 : getProgress(movie.id)?.positionSec || 0,
                durationSec: (movie.runtime || 0) * 60,
                watched: next,
              })
              setWatched(next)
            }}
            className="inline-flex rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            {watched ? 'Mark unwatched' : 'Mark watched'}
          </button>
          {jellyfinURL && (
            <a
              href={jellyfinURL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--accent-2)] hover:border-[var(--accent)]"
            >
              Open in Jellyfin
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
