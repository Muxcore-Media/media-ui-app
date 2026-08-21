import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, Download, Search } from 'lucide-react'
import { api } from '../api/client'
import {
  detailHrefForRequest,
  groupInProgressByPhase,
  mergeInProgressEntries,
  posterUrlForRequest,
  requestStatusLabel,
  requestStatusTone,
  type InProgressEntry,
} from '../lib/acquisition'
import { Badge } from '../components/ui/Badge'

function entryTitle(entry: InProgressEntry): string {
  return entry.source === 'request' ? entry.request.title : entry.item.title
}

function entryYear(entry: InProgressEntry): number | undefined {
  return entry.source === 'request' ? entry.request.year : entry.item.year
}

function entryPoster(entry: InProgressEntry): string {
  if (entry.source === 'request') return posterUrlForRequest(entry.request.poster)
  return entry.item.poster_url || ''
}

function entryStatus(entry: InProgressEntry): string {
  if (entry.source === 'request') return entry.request.status
  return 'added'
}

function entryHref(entry: InProgressEntry): string | null {
  if (entry.source === 'request') {
    return detailHrefForRequest(entry.request)
  }
  return entry.kind === 'tv' ? `/tv/${entry.item.id}` : `/movies/${entry.item.id}`
}

function entryKey(entry: InProgressEntry): string {
  if (entry.source === 'request') return `req-${entry.request.id}`
  return `lib-${entry.kind}-${entry.item.id}`
}

function InProgressCard({ entry }: { entry: InProgressEntry }) {
  const href = entryHref(entry)
  const status = entryStatus(entry)
  const poster = entryPoster(entry)
  const kindLabel = entry.source === 'request' ? (entry.request.itemType === 'tv' ? 'TV Show' : 'Movie') : entry.kind === 'tv' ? 'TV Show' : 'Movie'

  const body = (
    <>
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-[var(--bg-elevated-2)]">
        {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate font-medium text-[var(--text-primary)]">{entryTitle(entry)}</p>
        <p className="text-xs text-[var(--text-tertiary)]">
          {kindLabel}
          {entryYear(entry) ? ` · ${entryYear(entry)}` : ''}
        </p>
        <Badge tone={requestStatusTone(status)}>{requestStatusLabel(status)}</Badge>
      </div>
    </>
  )

  if (!href) {
    return (
      <li className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
        {body}
      </li>
    )
  }

  return (
    <li>
      <Link
        to={href}
        className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 transition hover:border-[var(--accent-color)]/40 hover:bg-[var(--bg-elevated-2)]"
      >
        {body}
      </Link>
    </li>
  )
}

function PhaseSection({
  title,
  icon,
  entries,
  testId,
}: {
  title: string
  icon: ReactNode
  entries: InProgressEntry[]
  testId: string
}) {
  if (entries.length === 0) return null
  return (
    <section className="space-y-3" data-testid={testId}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {title} <span className="text-[var(--text-tertiary)]">({entries.length})</span>
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <InProgressCard key={entryKey(entry)} entry={entry} />
        ))}
      </ul>
    </section>
  )
}

/** Titles being requested, searched, or downloaded — kept out of main library feeds. */
export default function InProgress() {
  const [entries, setEntries] = useState<InProgressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [requests, movies, shows] = await Promise.all([
          api.listRequests().catch(() => []),
          api.listMovies(1, 200).catch(() => ({ items: [] })),
          api.listTVShows(1, 200).catch(() => ({ items: [] })),
        ])
        if (cancelled) return
        setEntries(mergeInProgressEntries(requests, movies.items, shows.items))
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load in-progress titles')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const grouped = useMemo(() => groupInProgressByPhase(entries), [entries])

  return (
    <div className="space-y-8" data-testid="in-progress-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">In progress</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Titles you&apos;ve requested that aren&apos;t ready to watch yet. Your main library only shows what you can play now.
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--text-secondary)]">Loading…</p>}
      {error && (
        <p className="rounded-md border border-[var(--danger-color)]/40 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--danger-color)]">
          {error}
        </p>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] py-16 text-center">
          <Clock3 className="h-8 w-8 text-[var(--text-tertiary)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">Nothing in progress right now.</p>
          <Link to="/search" className="text-sm font-medium text-[var(--accent-color)] hover:underline">
            Search to add titles
          </Link>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-10">
          <PhaseSection
            title="Downloading"
            icon={<Download className="h-5 w-5 text-[var(--accent-color)]" aria-hidden="true" />}
            entries={grouped.downloading}
            testId="in-progress-downloading"
          />
          <PhaseSection
            title="Searching"
            icon={<Search className="h-5 w-5 text-[var(--warning-color,#f5a623)]" aria-hidden="true" />}
            entries={grouped.searching}
            testId="in-progress-searching"
          />
          <PhaseSection
            title="Requested"
            icon={<Clock3 className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />}
            entries={grouped.requested}
            testId="in-progress-requested"
          />
        </div>
      )}
    </div>
  )
}
