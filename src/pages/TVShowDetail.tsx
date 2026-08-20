import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import { enqueue, isFavorite, toggleFavorite } from '../lib/userdata'
import type { TVShow } from '../types'

export default function TVShowDetail() {
  const { id = '' } = useParams()
  const [show, setShow] = useState<TVShow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jellyfinURL, setJellyfinURL] = useState<string | null>(null)
  const [fav, setFav] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setJellyfinURL(null)
      try {
        const item = await api.getTVShow(id)
        if (!cancelled) {
          setShow(item)
          setFav(isFavorite(item.id))
        }
        const jf = await api.jellyfinPlayURL(id)
        if (!cancelled) setJellyfinURL(jf)
      } catch (err) {
        if (!cancelled) {
          setShow(null)
          setError(err instanceof Error ? err.message : 'Failed to load TV show')
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

  if (!show) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--muted)]">{error || 'TV show not found.'}</p>
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
            {show.has_file ? ' · files available' : ''}
          </p>
        </div>
        <p className="max-w-3xl leading-relaxed text-[var(--muted)]">{show.overview || 'No overview.'}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const on = toggleFavorite({
                id: show.id,
                kind: 'tv',
                title: show.title,
                poster_url: show.poster_url,
                href: `/tv/${show.id}`,
                year: show.year,
              })
              setFav(on)
            }}
            className="inline-flex rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            {fav ? '★ Favorited' : '☆ Favorite'}
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
        {show.seasons && show.seasons.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Episodes</h2>
            {show.seasons.map((season) => (
              <div key={season.id} className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--muted)]">
                  {season.name || `Season ${season.season_number}`}
                </h3>
                <ul className="space-y-2">
                  {season.episodes.map((ep) => {
                    const epTitle = `${show.title} S${ep.season_number}E${ep.episode_number}`
                    const playTo =
                      ep.has_file && ep.stream_url
                        ? `/player?src=${encodeURIComponent(ep.stream_url)}&title=${encodeURIComponent(epTitle)}&id=${encodeURIComponent(ep.id)}&kind=episode&poster=${encodeURIComponent(show.poster_url || '')}&back=${encodeURIComponent(`/tv/${show.id}`)}`
                        : null
                    return (
                      <li
                        key={ep.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            S{String(ep.season_number).padStart(2, '0')}E
                            {String(ep.episode_number).padStart(2, '0')}
                          </span>
                          {ep.title ? ` · ${ep.title}` : ''}
                        </div>
                        {playTo ? (
                          <div className="flex gap-2">
                            <Link
                              to={playTo}
                              className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black"
                            >
                              Play
                            </Link>
                            <button
                              type="button"
                              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-semibold"
                              onClick={() =>
                                enqueue({
                                  id: ep.id,
                                  kind: 'episode',
                                  title: epTitle,
                                  href: playTo,
                                  stream_url: ep.stream_url,
                                  poster_url: show.poster_url,
                                })
                              }
                            >
                              Queue
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">No file</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No season metadata yet.</p>
        )}
      </div>
    </div>
  )
}
