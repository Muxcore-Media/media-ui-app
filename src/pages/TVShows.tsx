import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Tv } from 'lucide-react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import { PosterGrid, PosterGridSkeleton } from '../components/media/PosterGrid'
import { Shelf, ShelfItem } from '../components/media/Shelf'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { isWatchable } from '../lib/acquisition'
import { getPreferences } from '../lib/userdata'
import type { TVShow } from '../types'

type SortKey = 'title' | 'year' | 'rating'

export default function TVShows() {
  const pageSize = getPreferences().display.libraryPageSize
  const [items, setItems] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState<SortKey>('title')

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

  const watchable = useMemo(() => items.filter(isWatchable), [items])
  const inProgressCount = items.length - watchable.length

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const m of watchable) for (const g of m.genres) set.add(g)
    return [...set].sort()
  }, [watchable])

  const filtered = useMemo(() => {
    let rows = watchable.filter((m) => {
      if (genre && !m.genres.includes(genre)) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      if (sort === 'year') return (b.year || 0) - (a.year || 0)
      if (sort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0)
      return a.title.localeCompare(b.title)
    })
    return rows
  }, [watchable, genre, sort])

  const recommended = useMemo(
    () =>
      [...watchable]
        .filter((m) => m.vote_average > 0)
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 16),
    [watchable],
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">TV Shows</h1>
        <p className="text-sm text-[var(--text-secondary)]">Browse series you can watch now.</p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {!loading && inProgressCount > 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          {inProgressCount} {inProgressCount === 1 ? 'series is' : 'series are'} still downloading.{' '}
          <Link to="/requests" className="font-medium text-[var(--accent-color)] hover:underline">
            View in progress
          </Link>
        </p>
      )}

      {!loading && !error && recommended.length > 0 && (
        <Shelf title="Recommended">
          {recommended.map((item) => (
            <ShelfItem key={`rec-${item.id}`}>
              <MediaCard item={item} type="tv" />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
          <label className="space-y-1 text-sm">
            <span className="text-[var(--text-tertiary)]">Genre</span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="block rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 text-sm"
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
            <span className="text-[var(--text-tertiary)]">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="block rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-3 py-2 text-sm"
            >
              <option value="title">Title</option>
              <option value="year">Year</option>
              <option value="rating">Rating</option>
            </select>
          </label>
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Library ({filtered.length})</h2>
        {loading ? (
          <PosterGridSkeleton />
        ) : error ? null : filtered.length === 0 ? (
          <EmptyState
            icon={Tv}
            title={genre ? 'No matches' : undefined}
            message={
              genre
                ? 'No TV shows match this genre. Try another filter or clear the genre selection.'
                : 'No TV shows ready to watch yet. Use search in the header to find and request series.'
            }
            action={
              !genre ? (
                <Link to="/search" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
                  Search titles
                </Link>
              ) : undefined
            }
            testId="tv-empty"
          />
        ) : (
          <PosterGrid>
            {filtered.map((item) => (
              <MediaCard key={item.id} item={item} type="tv" />
            ))}
          </PosterGrid>
        )}
      </section>
    </div>
  )
}
