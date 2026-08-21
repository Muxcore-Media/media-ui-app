import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Library } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { ShelfSkeleton } from '../components/ui/Skeleton'
import type { LibraryListResponse, LibraryRow } from '../types'

type Props = {
  title: string
  description: string
  load: () => Promise<LibraryListResponse>
  primaryLabel: (row: LibraryRow) => string
  secondaryLabel?: (row: LibraryRow) => string
  emptyReadyMessage: string
  rowHref?: (row: LibraryRow) => string
}

export default function LibrarySection({
  title,
  description,
  load,
  primaryLabel,
  secondaryLabel,
  emptyReadyMessage,
  rowHref,
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
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      {loading ? (
        <ShelfSkeleton count={4} />
      ) : error ? (
        <p
          className="rounded-[var(--radius-md)] border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--danger-color)]"
          data-testid="library-error"
        >
          {error}
        </p>
      ) : comingSoon || !available ? (
        <div
          className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-14 text-center"
          data-testid="library-coming-soon"
        >
          <Clock className="h-7 w-7 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="font-semibold text-[var(--text-primary)]">Coming soon</p>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            {message ||
              `${title} isn't available yet. Check back soon.`}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] px-4 py-14 text-center" data-testid="library-empty">
          <Library className="h-7 w-7 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">{emptyReadyMessage}</p>
        </div>
      ) : (
        <ul
          className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
          data-testid="library-list"
        >
          {items.map((row) => {
            const href = rowHref?.(row)
            return (
              <li key={row.id} className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-[var(--bg-elevated-2)]">
                <div className="min-w-0">
                  {href ? (
                    <Link to={href} className="truncate font-medium text-[var(--accent-color)] hover:underline">
                      {primaryLabel(row)}
                    </Link>
                  ) : (
                    <p className="truncate font-medium text-[var(--text-primary)]">{primaryLabel(row)}</p>
                  )}
                  {secondaryLabel ? (
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{secondaryLabel(row)}</p>
                  ) : null}
                </div>
                {row.year ? <Badge tone="neutral" className="shrink-0">{row.year}</Badge> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
