import { type FormEvent, useState } from 'react'
import { api, posterURL } from '../api/client'
import Spinner from './Spinner'
import type { SearchResult } from '../types'

export default function TmdbSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setMessage(null)
    try {
      const found = await api.search(q)
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
      const res = await api.requestTitle({
        tmdbId: result.id,
        title: result.title,
        year: result.year,
        overview: result.overview,
        poster: result.poster,
        mediaType: result.mediaType,
      })
      const kind = result.mediaType === 'tv' ? 'series' : 'movie'
      setMessage(`Requested “${result.title}” as ${kind} (${res.status})`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex w-full max-w-md gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies and TV (e.g. When Calls the Heart)…"
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
                key={`${r.mediaType}-${r.id}`}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="relative aspect-[2/3] bg-[var(--surface-2)]">
                  {r.poster ? (
                    <img
                      src={posterURL(r.poster, r.mediaType)}
                      alt={r.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {r.mediaType === 'tv' ? 'TV' : 'Movie'}
                  </span>
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
                    {r.mediaType === 'tv' ? 'Request series' : 'Request movie'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
