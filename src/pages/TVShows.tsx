import { useEffect, useState } from 'react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { TVShow } from '../types'

export default function TVShows() {
  const [items, setItems] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TV Shows</h1>
        <p className="text-sm text-[var(--muted)]">Series library via mediauiprox BFF (`/api/tv`).</p>
      </div>
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
    </div>
  )
}
