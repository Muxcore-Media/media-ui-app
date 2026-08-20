import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearQueue, continueWatching, dequeue, listFavorites, listQueue, type QueueItem } from '../lib/userdata'

/** Jellyfin-style play queue with durable userdata + resume/favorites seed. */
export default function Queue() {
  const [queue, setQueue] = useState(() => listQueue())
  const seeded = useMemo(() => {
    const fromProgress = continueWatching(20).map(
      (p): QueueItem => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        href: p.stream_url
          ? `/player?src=${encodeURIComponent(p.stream_url)}&title=${encodeURIComponent(p.title)}&id=${encodeURIComponent(p.id)}&kind=${encodeURIComponent(p.kind)}`
          : p.href,
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
          <h1 className="text-2xl font-bold">Queue</h1>
          <p className="text-sm text-[var(--muted)]">
            Explicit queue (synced via userdata), or continue-watching + favorites when empty.
          </p>
        </div>
        {queue.length > 0 && (
          <button type="button" onClick={clear} className="text-sm text-red-300">
            Clear queue
          </button>
        )}
      </div>
      {display.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Queue empty. Play something, add to queue from a detail page, or add favorites.{' '}
          <Link to="/search" className="text-[var(--accent)]">
            Search
          </Link>
        </p>
      ) : (
        <ol className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {display.map((item, i) => (
            <li key={`${item.id}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  <span className="mr-2 text-[var(--muted)]">{i + 1}.</span>
                  {item.title}
                </p>
                <p className="text-xs text-[var(--muted)]">{item.kind}</p>
              </div>
              <div className="flex gap-3">
                <Link to={item.href} className="text-sm text-[var(--accent)]">
                  Open
                </Link>
                {queue.some((q) => q.id === item.id) && (
                  <button type="button" className="text-sm text-[var(--muted)]" onClick={() => remove(item.id)}>
                    Remove
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
