import { useEffect, useState } from 'react'
import Spinner from '../components/Spinner'
import type { LibraryListResponse, LibraryRow } from '../types'

type Props = {
  title: string
  description: string
  load: () => Promise<LibraryListResponse>
  primaryLabel: (row: LibraryRow) => string
  secondaryLabel?: (row: LibraryRow) => string
  emptyReadyMessage: string
}

export default function LibrarySection({
  title,
  description,
  load,
  primaryLabel,
  secondaryLabel,
  emptyReadyMessage,
}: Props) {
  const [items, setItems] = useState<LibraryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [comingSoon, setComingSoon] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await load()
        if (cancelled) return
        setItems(list.items)
        setAvailable(list.available !== false)
        setComingSoon(Boolean(list.coming_soon) || list.available === false)
        setMessage(list.message || null)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load library')
          setItems([])
          setAvailable(false)
          setComingSoon(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <div className="space-y-6" data-testid={`${title.toLowerCase()}-page`}>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <p
          className="rounded-md border border-red-500/40 bg-[var(--surface)] px-3 py-2 text-sm text-red-300"
          data-testid="library-error"
        >
          {error}
        </p>
      ) : comingSoon || !available ? (
        <div
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-6 space-y-2"
          data-testid="library-coming-soon"
        >
          <p className="font-semibold">Coming soon</p>
          <p className="text-sm text-[var(--muted)]">
            {message ||
              `This section called the live ${title.toLowerCase()} API; the module is not reachable yet. Enable the library-plus spool tag to populate it.`}
          </p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]" data-testid="library-empty">
          {emptyReadyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]" data-testid="library-list">
          {items.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{primaryLabel(row)}</p>
                {secondaryLabel ? (
                  <p className="text-xs text-[var(--muted)] truncate">{secondaryLabel(row)}</p>
                ) : null}
              </div>
              {row.year ? (
                <span className="shrink-0 text-xs text-[var(--muted)]">{row.year}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
