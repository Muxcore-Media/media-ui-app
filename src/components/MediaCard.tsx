import { Link } from 'react-router-dom'
import type { Movie, TVShow } from '../types'

type Item = Movie | TVShow

export default function MediaCard({
  item,
  type,
}: {
  item: Item
  type: 'movie' | 'tv'
}) {
  const to = type === 'movie' ? `/movies/${item.id}` : `/tv/${item.id}`
  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_var(--accent)]"
    >
      <div className="relative aspect-[2/3] bg-[var(--surface-2)]">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No poster</div>
        )}
        {item.has_file && (
          <span className="absolute left-2 top-2 rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-black">
            Ready
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        <p className="text-xs text-[var(--muted)]">
          {item.year || '—'}
          {item.vote_average > 0 ? ` · ${item.vote_average.toFixed(1)}` : ''}
        </p>
      </div>
    </Link>
  )
}
