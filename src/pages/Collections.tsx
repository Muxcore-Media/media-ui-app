import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { Movie } from '../types'

type Collection = { id: string; name: string; items: Movie[]; source: 'tmdb' | 'genre' }

/** Box sets from media-movies collections RPC, with genre groups as fallback. */
export default function Collections() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [serverCols, setServerCols] = useState<{ id: string; name: string; movie_count: number }[]>([])
  const [detail, setDetail] = useState<{ id: string; name: string; movies: Movie[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [list, cols] = await Promise.all([
          api.listMovies(1, 200),
          api.listCollections().catch(() => ({ items: [] as { id: string; name: string; movie_count: number }[] })),
        ])
        if (!cancelled) {
          setMovies(list.items)
          setServerCols(cols.items || [])
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

  const genreCollections = useMemo(() => {
    const map = new Map<string, Movie[]>()
    for (const m of movies) {
      for (const g of m.genres.length ? m.genres : ['Uncategorized']) {
        const arr = map.get(g) || []
        arr.push(m)
        map.set(g, arr)
      }
    }
    const out: Collection[] = [...map.entries()]
      .filter(([, items]) => items.length >= 2)
      .map(([name, items]) => ({
        id: 'genre-' + name.toLowerCase().replace(/\s+/g, '-'),
        name,
        items: items.slice(0, 24),
        source: 'genre' as const,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return out
  }, [movies])

  async function openServerCollection(id: string) {
    try {
      const d = await api.getCollection(id)
      setDetail(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open collection')
    }
  }

  return (
    <div className="space-y-8" data-testid="collections-page">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-sm text-[var(--muted)]">
          TMDB box sets from media-movies, plus genre groups as a browse aid.
        </p>
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {detail && (
        <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{detail.name}</h2>
            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {detail.movies.map((item) => (
              <MediaCard key={item.id} item={item} type="movie" />
            ))}
          </div>
        </section>
      )}

      {!loading && serverCols.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Box sets</h2>
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {serverCols.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openServerCollection(c.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--bg)]"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[var(--muted)]">{c.movie_count} titles</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && genreCollections.length === 0 && serverCols.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No collections yet. Refresh metadata so TMDB collection fields populate, or browse{' '}
          <Link to="/movies" className="text-[var(--accent)]">
            Movies
          </Link>
          .
        </p>
      )}

      {genreCollections.map((c) => (
        <section key={c.id} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {c.name}{' '}
            <span className="text-sm font-normal text-[var(--muted)]">(genre · {c.items.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {c.items.map((item) => (
              <MediaCard key={item.id} item={item} type="movie" />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
