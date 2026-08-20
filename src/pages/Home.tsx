import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import {
  continueWatching,
  getPreferences,
  listFavorites,
  pullUserdataFromServer,
  resolveNextUp,
  type FavoriteEntry,
  type NextUpEntry,
  type ProgressEntry,
} from '../lib/userdata'
import type { MediaRequest, Movie, TVShow } from '../types'

export default function Home() {
  const prefs = getPreferences()
  const [requests, setRequests] = useState<MediaRequest[]>([])
  const [readyMovies, setReadyMovies] = useState<Movie[]>([])
  const [readyShows, setReadyShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [nextUp, setNextUp] = useState<NextUpEntry[]>([])
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([])
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const recommended = useMemo(
    () =>
      [...allMovies]
        .filter((m) => m.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12),
    [allMovies],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Prefer server progress for continue-watching / next-up before painting rows.
        await pullUserdataFromServer()
        if (cancelled) return
        setProgress(continueWatching(12))
        setFavorites(listFavorites().slice(0, 12))
        const derived = await resolveNextUp((id) => api.getTVShow(id), 12)
        if (cancelled) return
        setNextUp(derived)
        const [list, movies, shows] = await Promise.all([
          api.listRequests(),
          api.listMovies(1, 24),
          api.listTVShows(1, 24),
        ])
        if (cancelled) return
        setRequests(list.slice(0, 12))
        setReadyMovies(movies.items.filter((m) => m.has_file).slice(0, 12))
        setAllMovies(movies.items)
        setReadyShows(shows.items.filter((s) => s.has_file).slice(0, 12))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load home')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const showReadyFallback =
    prefs.home.showNextUp && nextUp.length === 0 && (readyMovies.length > 0 || readyShows.length > 0)

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Continue watching, next up from your progress, favorites, and ready titles — MuxCore’s native
          stand-in for the Jellyfin home screen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/search"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
          >
            Search
          </Link>
          <Link
            to="/movies"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            Movies
          </Link>
          <Link
            to="/tv"
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
          >
            TV
          </Link>
        </div>
      </section>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="rounded-md border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {prefs.home.showContinueWatching && progress.length > 0 && (
        <section className="space-y-3" data-testid="home-continue">
          <h2 className="text-xl font-semibold">Continue watching</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {progress.map((p) => (
              <li key={p.id}>
                <Link
                  to={
                    p.stream_url
                      ? `/player?src=${encodeURIComponent(p.stream_url)}&title=${encodeURIComponent(p.title)}&id=${encodeURIComponent(p.id)}&kind=${encodeURIComponent(p.kind)}`
                      : p.href
                  }
                  className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--accent)]"
                >
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                    {p.poster_url ? (
                      <img src={p.poster_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {p.durationSec > 0
                        ? `${Math.round((p.positionSec / p.durationSec) * 100)}% · resume`
                        : 'Resume'}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-[var(--surface-2)]">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{
                          width: `${
                            p.durationSec > 0
                              ? Math.min(100, (p.positionSec / p.durationSec) * 100)
                              : 5
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prefs.home.showNextUp && nextUp.length > 0 && (
        <section className="space-y-3" data-testid="home-next-up">
          <h2 className="text-xl font-semibold">Next up</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nextUp.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.href}
                  className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[var(--accent)]"
                >
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                    {n.poster_url ? (
                      <img src={n.poster_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.title}</p>
                    <p className="text-xs text-[var(--muted)]">{n.subtitle || 'Next up'}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recommended</h2>
            <Link to="/movies" className="text-sm text-[var(--accent)]">
              Movies
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommended.map((m) => (
              <MediaCard key={m.id} item={m} type="movie" />
            ))}
          </div>
        </section>
      )}

      {prefs.home.showFavorites && favorites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Favorites</h2>
            <Link to="/favorites" className="text-sm text-[var(--accent)]">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {favorites.map((f) => (
              <MediaCard
                key={f.id}
                type={f.kind === 'tv' ? 'tv' : 'movie'}
                item={{
                  id: f.id,
                  title: f.title,
                  year: f.year || 0,
                  overview: '',
                  runtime: 0,
                  vote_average: 0,
                  genres: [],
                  poster_url: f.poster_url || '',
                  has_file: false,
                  stream_url: '',
                  created_at: '',
                }}
              />
            ))}
          </div>
        </section>
      )}

      {showReadyFallback && (
        <section className="space-y-3" data-testid="home-ready">
          <h2 className="text-xl font-semibold">Ready to play</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {readyMovies.map((item) => (
              <MediaCard key={`m-${item.id}`} item={item} type="movie" />
            ))}
            {readyShows.map((item) => (
              <MediaCard key={`t-${item.id}`} item={item} type="tv" />
            ))}
          </div>
        </section>
      )}

      {prefs.home.showRecentRequests && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Recent requests</h2>
          {!loading && requests.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No requests yet. Search to add one.</p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-[var(--surface-2)]">
                  {req.poster ? (
                    <img
                      src={
                        req.poster.startsWith('http') || req.poster.startsWith('/')
                          ? req.poster.startsWith('/') && !req.poster.startsWith('/images')
                            ? `https://image.tmdb.org/t/p/w185${req.poster}`
                            : req.poster
                          : req.poster
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{req.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {req.year || '—'} · {req.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
