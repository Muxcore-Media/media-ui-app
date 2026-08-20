import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import type { Episode, TVShow } from '../types'

type UpcomingRow = {
  show: TVShow
  episode: Episode
  air: string
}

export default function Upcoming() {
  const [shows, setShows] = useState<TVShow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.listTVShows(1, 100)
        const detailed: TVShow[] = []
        for (const s of list.items.slice(0, 40)) {
          try {
            detailed.push(await api.getTVShow(s.id))
          } catch {
            detailed.push(s)
          }
        }
        if (!cancelled) setShows(detailed)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const out: UpcomingRow[] = []
    const now = Date.now()
    const horizon = now + 1000 * 60 * 60 * 24 * 120
    for (const show of shows) {
      for (const season of show.seasons || []) {
        for (const ep of season.episodes || []) {
          if (!ep.air_date) continue
          const t = Date.parse(ep.air_date)
          if (!Number.isFinite(t)) continue
          if (t >= now - 1000 * 60 * 60 * 24 * 14 && t <= horizon) {
            out.push({ show, episode: ep, air: ep.air_date })
          }
        }
      }
    }
    return out.sort((a, b) => a.air.localeCompare(b.air))
  }, [shows])

  const view = useMemo(() => {
    const base = new Date()
    base.setDate(1)
    base.setMonth(base.getMonth() + monthOffset)
    const y = base.getFullYear()
    const m = base.getMonth()
    const label = base.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    const byDay = new Map<string, UpcomingRow[]>()
    for (const r of rows) {
      const d = new Date(r.air)
      if (d.getFullYear() !== y || d.getMonth() !== m) continue
      const key = r.air.slice(0, 10)
      const arr = byDay.get(key) || []
      arr.push(r)
      byDay.set(key, arr)
    }
    return { label, byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])) }
  }, [rows, monthOffset])

  return (
    <div className="space-y-6" data-testid="upcoming-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Upcoming</h1>
          <p className="text-sm text-[var(--muted)]">
            TV calendar from episode air dates (Jellyfin upcoming).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-sm"
            onClick={() => setMonthOffset((n) => n - 1)}
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-sm font-medium">{view.label}</span>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1 text-sm"
            onClick={() => setMonthOffset((n) => n + 1)}
          >
            →
          </button>
        </div>
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && view.byDay.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No air dates in {view.label}.{' '}
          <Link to="/tv" className="text-[var(--accent)]">
            Browse TV
          </Link>
        </p>
      )}
      <div className="space-y-4">
        {view.byDay.map(([day, dayRows]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--muted)]">{day}</h2>
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              {dayRows.map((r) => (
                <li key={`${r.show.id}-${r.episode.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.show.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      S{String(r.episode.season_number).padStart(2, '0')}E
                      {String(r.episode.episode_number).padStart(2, '0')}
                      {r.episode.title ? ` · ${r.episode.title}` : ''}
                    </p>
                  </div>
                  <Link to={`/tv/${r.show.id}`} className="text-sm text-[var(--accent)]">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
