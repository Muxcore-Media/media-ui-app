import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, Play, Star } from 'lucide-react'
import type { Movie, TVShow } from '../types'
import { Badge } from './ui/Badge'

type Item = Movie | TVShow

/**
 * Poster-driven library card (AGENTS.md §5 Cards): graceful image fallback, hover
 * scale + elevation with a "Play" quick action reveal, Ready badge, and a rating chip.
 */
export default function MediaCard({
  item,
  type,
}: {
  item: Item
  type: 'movie' | 'tv'
}) {
  const [imgError, setImgError] = useState(false)
  const to = type === 'movie' ? `/movies/${item.id}` : `/tv/${item.id}`
  const hasPoster = Boolean(item.poster_url) && !imgError

  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-elevated-2)] shadow-md transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-2xl">
        {hasPoster ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.06]"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--bg-elevated-2)] to-[var(--bg-elevated)] text-[var(--text-tertiary)]">
            <Film className="h-8 w-8" aria-hidden="true" />
            <span className="px-2 text-center text-xs leading-snug">No poster</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          {item.has_file && <Badge tone="accent">Available</Badge>}
          {item.vote_average > 0 && (
            <Badge tone="neutral" className="ml-auto">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {item.vote_average.toFixed(1)}
            </Badge>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent-color)]">
          {item.title}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)]">{item.year || '—'}</p>
      </div>
    </Link>
  )
}
