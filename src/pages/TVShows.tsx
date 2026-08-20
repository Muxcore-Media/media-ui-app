import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import TmdbSearch from '../components/TmdbSearch'
import { getPreferences } from '../lib/userdata'
import type { TVShow } from '../types'

type SortKey = 'title' | 'year' | 'rating'

export default function TVShows() {
  const pageSize = getPreferences().display.libraryPageSize
  const [items, setItems] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState<SortKey>('title')
  const [readyOnly, setReadyOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listTVShows(1, pageSize)
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
  }, [pageSize])

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const m of items) for (const g of m.genres) set.add(g)
    return [...set].sort()
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = items.filter((m) => {
      if (readyOnly && !m.has_file) return false
      if (genre && !m.genres.includes(genre)) return false
      if (q && !m.title.toLowerCase().includes(q)) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      if (sort === 'year') return (b.year || 0) - (a.year || 0)
      if (sort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0)
      return a.title.localeCompare(b.title)
    })
    return rows
  }, [items, query, genre, sort, readyOnly])

  const recommended = useMemo(
    () =>
      [...items]
        .filter((m) => m.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 12),
    [items],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TV Shows</h1>
        <p className="text-sm text-[var(--muted)]">
          Series library with filter/sort. Request series from TMDB here — they will not be added as movies.
        </p>
      </div>
      <TmdbSearch />

      {!loading && recommended.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recommended</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommended.map((item) => (
              <MediaCard key={`rec-${item.id}`} item={item} type="tv" />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-[var(--muted)]">Filter</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title…"
            className="block rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--muted)]">Genre</span>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="block rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            <option value="">All</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--muted)]">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="block rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
          >
            <option value="title">Title</option>
            <option value="year">Year</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
          Ready only
        </label>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p className="rounded-md border border-red-500/40 bg-[var(--surface)] px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No TV library items yet. Request series from search above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} type="tv" />
          ))}
        </div>
      )}
    </div>
  )
}
