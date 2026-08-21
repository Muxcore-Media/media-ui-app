import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListMusic, Play, Trash2, X } from 'lucide-react'
import { clearQueue, continueWatching, dequeue, listFavorites, listQueue, type QueueItem } from '../lib/userdata'
import { buildProgressPlayerHref } from '../lib/playHref'

/** Jellyfin-style play queue with durable userdata + resume/favorites seed. */
export default function Queue() {
  const [queue, setQueue] = useState(() => listQueue())
  const seeded = useMemo(() => {
    const fromProgress = continueWatching(20).map(
      (p): QueueItem => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        href: buildProgressPlayerHref(p) || p.href,
        stream_url: p.stream_url,
        poster_url: p.poster_url,
      }),
    )
    const fromFav = listFavorites().slice(0, 20).map(
      (f): QueueItem => ({
        id: f.id,
        kind: f.kind,
        title: f.title,
        href: f.href,
        poster_url: f.poster_url,
      }),
    )
    return { fromProgress, fromFav }
  }, [])

  const display = queue.length > 0 ? queue : [...seeded.fromProgress, ...seeded.fromFav]

  function remove(id: string) {
    dequeue(id)
    setQueue(listQueue())
  }

  function clear() {
    clearQueue()
    setQueue([])
  }

  return (
    <div className="space-y-6" data-testid="queue-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Queue</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            What you&apos;re watching next. When empty, we&apos;ll suggest picks from continue watching and favorites.
          </p>
        </div>
        {queue.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--danger-color)] hover:underline"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear queue
          </button>
        )}
      </div>
      {display.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] py-16 text-center">
          <ListMusic className="h-8 w-8 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">
            Queue empty. Play something, add to queue from a detail page, or add favorites.
          </p>
          <Link to="/search" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
            Search
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {display.map((item, i) => (
            <li key={`${item.id}-${i}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated-2)]">
                {item.poster_url ? (
                  <img src={item.poster_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--text-primary)]">
                  <span className="mr-2 text-[var(--text-tertiary)]">{i + 1}.</span>
                  {item.title}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">{item.kind === 'tv' ? 'TV Show' : 'Movie'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={item.href}
                  aria-label={`Open ${item.title}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent-color)] transition hover:bg-[var(--bg-elevated-2)]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                </Link>
                {queue.some((q) => q.id === item.id) && (
                  <button
                    type="button"
                    aria-label={`Remove ${item.title} from queue`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg-elevated-2)] hover:text-[var(--text-primary)]"
                    onClick={() => remove(item.id)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
