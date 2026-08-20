import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { Movie } from '../types'

/** Studio browse from collection_name / genre buckets (Jellyfin studios parity). */
export default function Studios() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('studio') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movies, setMovies] = useState<Movie[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.listMovies(1, 500)
        if (!cancelled) setMovies(res.items)
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

  const studios = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of movies) {
      const keys =
        m.collection_name?.trim()
          ? [m.collection_name.trim()]
          : m.genres.length
            ? m.genres
            : ['Unknown']
      for (const k of keys) counts.set(k, (counts.get(k) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [movies])

  const filtered = useMemo(() => {
    if (!selected) return []
    return movies.filter((m) => {
      if (m.collection_name?.trim() === selected) return true
      return m.genres.includes(selected)
    })
  }, [movies, selected])

  return (
    <div className="space-y-6" data-testid="studios-page">
      <div>
        <h1 className="text-2xl font-bold">Studios & collections</h1>
        <p className="text-sm text-[var(--muted)]">
          Browse by collection or genre studio bucket (Jellyfin studios surface).
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="rounded-md border border-red-500/40 bg-[var(--surface)] px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !selected && (
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {studios.map(([name, count]) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => setParams({ studio: name })}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left hover:border-[var(--accent)]"
              >
                <span className="font-medium">{name}</span>
                <span className="text-xs text-[var(--muted)]">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && selected && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setParams({})}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              ← All studios
            </button>
            <h2 className="text-lg font-semibold">{selected}</h2>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No titles in this studio.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((m) => (
                <MediaCard key={m.id} item={m} type="movie" />
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            Also see <Link className="text-[var(--accent)]" to="/collections">Collections</Link>.
          </p>
        </section>
      )}
    </div>
  )
}
