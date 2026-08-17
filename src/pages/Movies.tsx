import { useEffect, useState } from 'react'
import { api } from '../api/client'
import MediaCard from '../components/MediaCard'
import Spinner from '../components/Spinner'
import TmdbSearch from '../components/TmdbSearch'
import type { Movie } from '../types'

export default function Movies() {
  const [items, setItems] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listMovies()
        if (!cancelled) {
          setItems(list.items)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load movies')
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
        <h1 className="text-2xl font-bold">Movies</h1>
        <p className="text-sm text-[var(--muted)]">
          Library grid plus TMDB search. TV series (like When Calls the Heart) request into the TV library.
        </p>
      </div>
      <TmdbSearch />

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
            No library items from the movies API yet. Use search to request titles.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} type="movie" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
