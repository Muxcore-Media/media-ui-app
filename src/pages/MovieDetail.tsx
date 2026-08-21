import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ExternalLink, ListPlus, Play, Star } from 'lucide-react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import { DetailHero } from '../components/media/DetailHero'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { getProgress, isFavorite, toggleFavorite, upsertProgress, enqueue } from '../lib/userdata'
import { buildMoviePlayerHref } from '../lib/playHref'
import type { Movie } from '../types'

export default function MovieDetail() {
  const { id = '' } = useParams()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null)
  const [fav, setFav] = useState(false)
  const [watched, setWatched] = useState(false)
  const [queued, setQueued] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setJellyfinURL(null)
      setQueued(false)
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
        <p className="text-[var(--text-secondary)]">{error || 'We couldn\u2019t find this movie.'}</p>
        <Link to="/movies" className="text-[var(--accent-color)]">
          Back to movies
        </Link>
      </div>
    )
  }

  const playTo = movie.has_file && movie.stream_url ? buildMoviePlayerHref(movie) : null

  return (
    <div className="space-y-8">
      <DetailHero
        backdropUrl={movie.backdrop_url}
        posterUrl={movie.poster_url}
        title={movie.title}
        tagline={movie.tagline}
        overview={movie.overview || 'No overview.'}
        meta={
          <>
            {movie.has_file && <Badge tone="accent">Available</Badge>}
            {watched && <Badge tone="neutral">Watched</Badge>}
            {movie.vote_average > 0 && (
              <Badge tone="neutral">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                {movie.vote_average.toFixed(1)}
              </Badge>
            )}
            <span>{movie.year || '—'}</span>
            {movie.runtime ? <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span> : null}
            {movie.genres.length > 0 && <span>{movie.genres.slice(0, 3).join(' · ')}</span>}
          </>
        }
        actions={
          <>
            {playTo ? (
              <Link
                to={playTo}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent-color)] px-5 text-sm font-semibold text-black transition hover:bg-[var(--accent-hover)]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Play
              </Link>
            ) : (
              <p className="flex items-center text-sm text-[var(--text-tertiary)]">Not available to stream yet.</p>
            )}
            <Button
              variant="secondary"
              icon={<ListPlus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                enqueue({
                  id: movie.id,
                  kind: 'movie',
                  title: movie.title,
                  href: playTo || `/movies/${movie.id}`,
                  stream_url: movie.stream_url,
                  poster_url: movie.poster_url,
                })
                setQueued(true)
              }}
            >
              {queued ? 'Queued' : 'Add to queue'}
            </Button>
            <Button
              variant={fav ? 'primary' : 'secondary'}
              icon={<Star className={fav ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" />}
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
            >
              {fav ? 'Favorited' : 'Favorite'}
            </Button>
            <Button
              variant="secondary"
              icon={<Check className="h-4 w-4" aria-hidden="true" />}
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
            >
              {watched ? 'Mark unwatched' : 'Mark watched'}
            </Button>
            {jellyfinURL && (
              <a
                href={jellyfinURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--accent-color)] transition hover:border-[var(--accent-color)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open in linked app
              </a>
            )}
          </>
        }
      />

      {movie.collection_name && movie.collection_id ? (
        <p className="px-4 text-sm text-[var(--text-secondary)] sm:px-0">
          Part of{' '}
          <Link to="/collections" className="font-medium text-[var(--accent-color)]">
            {movie.collection_name}
          </Link>
        </p>
      ) : null}
    </div>
  )
}
