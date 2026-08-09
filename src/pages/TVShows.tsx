import { useEffect, useState } from 'react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import type { TVShow } from '../types'

export default function TVShows() {
  const [items, setItems] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await api.listTVShows()
      if (!cancelled) {
        setItems(list.items)
        setLoading(false)
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
        <p className="text-sm text-[var(--muted)]">Series library from the TV module HTTP API.</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No TV library items yet. The consumer JSON API is not available from media-tvshows HTTP today.
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
