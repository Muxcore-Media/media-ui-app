import { Link } from 'react-router-dom'
import MediaCard from '../components/MediaCard'
import { listFavorites, type FavoriteEntry } from '../lib/userdata'
import { useMemo, useState } from 'react'
import type { Movie, TVShow } from '../types'

function asCardItem(f: FavoriteEntry): Movie | TVShow {
  return {
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
  }
}

export default function Favorites() {
  const [tick, setTick] = useState(0)
  const items = useMemo(() => {
    void tick
    return listFavorites()
  }, [tick])

  return (
    <div className="space-y-6" data-testid="favorites-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Favorites</h1>
          <p className="text-sm text-[var(--muted)]">
            Titles you marked as favorites. Synced via server userdata when the BFF is online.
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No favorites yet. Use the heart on a movie or TV detail page.{' '}
          <Link to="/movies" className="text-[var(--accent)]">
            Browse movies
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((f) => (
            <MediaCard
              key={f.id}
              item={asCardItem(f)}
              type={f.kind === 'tv' ? 'tv' : 'movie'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
