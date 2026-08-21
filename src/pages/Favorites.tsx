import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import MediaCard from '../components/MediaCard'
import { PosterGrid } from '../components/media/PosterGrid'
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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Favorites</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Movies and shows you&apos;ve saved to watch later.
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          onClick={() => setTick((n) => n + 1)}
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] py-16 text-center">
          <Heart className="h-8 w-8 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">
            No favorites yet. Use the star on a movie or TV detail page.
          </p>
          <Link to="/movies" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
            Browse movies
          </Link>
        </div>
      ) : (
        <PosterGrid>
          {items.map((f) => (
            <MediaCard key={f.id} item={asCardItem(f)} type={f.kind === 'tv' ? 'tv' : 'movie'} />
          ))}
        </PosterGrid>
      )}
    </div>
  )
}
