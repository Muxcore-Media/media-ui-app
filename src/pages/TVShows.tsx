import { type FormEvent, useEffect, useState } from 'react'
import { api, posterURL } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { SearchResult, TVShow } from '../types'

export default function TVShows() {
  const [items, setItems] = useState<TVShow[]>([])
  const [results, setResults] = useState<SearchResult[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listTVShows()
        if (!cancelled) {
          setItems(list.items)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load TV shows')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setMessage(null)
    try {
      const found = await api.search(q, 'tv')
      setResults(found)
      if (found.length === 0) setMessage('No TMDB matches.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function onRequest(result: SearchResult) {
    setMessage(null)
    try {
      const res = await api.requestTV({
        tmdbId: result.id,
        title: result.title,
        year: result.year,
        overview: result.overview,
        poster: result.poster,
      })
      setMessage(`Requested “${result.title}” (${res.status})`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">TV Shows</h1>
          <p className="text-sm text-[var(--muted)]">
            Series library via mediauiprox BFF (`/api/tv`). Search uses request-media (works offline with TMDB_FIXTURE=1).
          </p>
        </div>
        <form onSubmit={onSearch} className="flex w-full max-w-md gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search series (e.g. Breaking Bad)…"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Search
          </button>
        </form>
      </div>

      {message && (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{message}</p>
      )}

      {searching && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {results.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Search results</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((r) => (
              <li
                key={r.id}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="aspect-[2/3] bg-[var(--surface-2)]">
                  {r.poster ? (
                    <img
                      src={posterURL(r.poster, 'tv')}
                      alt={r.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold">{r.title}</h3>
                  <p className="text-xs text-[var(--muted)]">
                    {r.year || '—'}
                    {r.voteAvg > 0 ? ` · ${r.voteAvg.toFixed(1)}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRequest(r)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-xs font-medium hover:border-[var(--accent)]"
                  >
                    Request
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Library</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : error ? (
          <p className="rounded-md border border-red-500/40 bg-[var(--surface)] px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No TV library items yet. Request series or import from the admin UI.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} type="tv" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
