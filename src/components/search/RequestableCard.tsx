import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { tmdbImageUrl } from '../../lib/tmdbImages'
import type { SearchResult } from '../../types'

export default function RequestableCard({
  item,
  requested,
  onRequest,
  returnTo,
}: {
  item: SearchResult
  requested?: string
  onRequest: (item: SearchResult) => void
  returnTo?: string
}) {
  const poster = tmdbImageUrl(item.poster, 'w342')
  const href = `/discover/${item.mediaType}/${item.id}${returnTo ? `?return=${encodeURIComponent(returnTo)}` : ''}`

  return (
    <article
      className="group flex overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition hover:border-[var(--accent-color)]/40 hover:bg-[var(--bg-elevated-2)]"
      data-testid={`requestable-${item.mediaType}-${item.id}`}
    >
      <Link
        to={href}
        className="flex min-w-0 flex-1 gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-color)]"
      >
        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--bg-elevated-2)] sm:h-36 sm:w-28">
          {poster ? (
            <img src={poster} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--text-tertiary)]">
              No poster
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{item.mediaType === 'tv' ? 'TV' : 'Movie'}</Badge>
            {item.year ? <span className="text-xs text-[var(--text-tertiary)]">{item.year}</span> : null}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent-color)]">
            {item.title}
          </h3>
          {item.overview ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">{item.overview}</p>
          ) : null}
          {item.voteAvg > 0 ? (
            <p className="text-xs text-[var(--text-tertiary)]">Rating {item.voteAvg.toFixed(1)}</p>
          ) : null}
        </div>
      </Link>
      <div className="flex shrink-0 flex-col justify-center border-l border-[var(--border-subtle)] px-3">
        {requested ? (
          <Badge tone="success">{requested}</Badge>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRequest(item)
            }}
            className="rounded-[var(--radius-sm)] bg-[var(--accent-color)] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[var(--accent-hover)]"
          >
            Request
          </button>
        )}
      </div>
    </article>
  )
}
