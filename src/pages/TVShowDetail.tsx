import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { TVShow } from '../types'

export default function TVShowDetail() {
  const { id = '' } = useParams()
  const [show, setShow] = useState<TVShow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const item = await api.getTVShow(id)
      if (!cancelled) {
        setShow(item)
        setLoading(false)
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

  if (!show) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--muted)]">TV show not found.</p>
        <Link to="/tv" className="text-[var(--accent)]">
          Back to TV
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {show.poster_url ? (
          <img src={show.poster_url} alt={show.title} className="w-full object-cover" />
        ) : (
          <div className="flex aspect-[2/3] items-center justify-center text-sm text-[var(--muted)]">No poster</div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">{show.title}</h1>
          <p className="text-[var(--muted)]">
            {show.year || '—'}
            {show.vote_average > 0 ? ` · ${show.vote_average.toFixed(1)}` : ''}
            {show.status ? ` · ${show.status}` : ''}
          </p>
        </div>
        <p className="max-w-3xl leading-relaxed text-[var(--muted)]">{show.overview || 'No overview.'}</p>
        {show.seasons && show.seasons.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Seasons</h2>
            <ul className="space-y-2">
              {show.seasons.map((season) => (
                <li key={season.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
                  {season.name || `Season ${season.season_number}`} · {season.episode_count} episodes
                </li>
              ))}
            </ul>
          </div>
        )}
        {show.stream_url ? (
          <Link
            to={`/player?src=${encodeURIComponent(show.stream_url)}&title=${encodeURIComponent(show.title)}`}
            className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Play
          </Link>
        ) : null}
      </div>
    </div>
  )
}
